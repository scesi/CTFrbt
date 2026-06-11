"use client";

import React, { createContext, useReducer, useContext, useCallback } from "react";
import { TerminalAction, TerminalContextType, TerminalState, OutputBlock } from "./types";
import { parseCommand } from "./parser";
import { useSession } from "next-auth/react";

const ASCII_ART = `  ██████╗████████╗███████╗██████╗ ██████╗ ████████╗
 ██╔════╝╚══██╔══╝██╔════╝██╔══██╗██╔══██╗╚══██╔══╝
 ██║        ██║   █████╗  ██████╔╝██████╔╝   ██║   
 ██║        ██║   ██╔══╝  ██╔══██╗██╔══██╗   ██║   
 ╚██████╗   ██║   ██║     ██║  ██║██████╔╝   ██║   
  ╚═════╝   ╚═╝   ╚═╝     ╚═╝  ╚═╝╚═════╝    ╚═╝`;

const initialState: TerminalState = {
  history: [
    {
      id: "init-1",
      type: "system",
      content: (
        <div style={{ marginBottom: "15px" }}>
          <div
            style={{
              padding: "20px",
              border: "1px solid var(--border)",
              maxWidth: "fit-content",
              marginBottom: "15px"
            }}
          >
            <pre
              style={{
                fontSize: "12px",
                color: "var(--fg-dim)",
                lineHeight: 1.5,
                margin: 0
              }}
            >
              {ASCII_ART}
            </pre>
          </div>
          <div style={{ color: "var(--neon-green)" }}>
            CTFrbt STEVENOS v1.0.4 initialized.<br />
            Type &apos;help&apos; to see available commands.
          </div>
        </div>
      ),
    },
  ],
  cwd: "~",
  inputMode: "command",
  isProcessing: false,
  promptPrefix: "",
};

function terminalReducer(state: TerminalState, action: TerminalAction): TerminalState {
  switch (action.type) {
    case "APPEND_BLOCK":
      return { ...state, history: [...state.history, action.payload] };
    case "CLEAR_HISTORY":
      return { ...state, history: [] };
    case "SET_CWD":
      return { ...state, cwd: action.payload };
    case "SET_INPUT_MODE":
      return { ...state, inputMode: action.payload };
    case "SET_PROCESSING":
      return { ...state, isProcessing: action.payload };
    case "SET_PROMPT_PREFIX":
      return { ...state, promptPrefix: action.payload };
    default:
      return state;
  }
}

const TerminalContext = createContext<TerminalContextType | undefined>(undefined);

export function TerminalProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(terminalReducer, initialState);
  const { data: session } = useSession();

  const appendOutput = useCallback((content: React.ReactNode | string, type: OutputBlock["type"] = "output") => {
    dispatch({
      type: "APPEND_BLOCK",
      payload: {
        id: crypto.randomUUID(),
        type,
        content,
      },
    });
  }, []);

  const clearHistory = useCallback(() => {
    dispatch({ type: "CLEAR_HISTORY" });
  }, []);

  const executeCommand = useCallback(
    async (cmdInput: string) => {
      const trimmed = cmdInput.trim();
      if (!trimmed) return;

      // Echo command back to terminal
      appendOutput(`${session?.user?.alias || "guest"}@ctfrbt:${state.cwd}$ ${trimmed}`, "command");

      dispatch({ type: "SET_PROCESSING", payload: true });

      try {
        await parseCommand(trimmed, { state, dispatch, appendOutput, clearHistory, session });
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Command failed";
        appendOutput(`Error: ${msg}`, "error");
      } finally {
        dispatch({ type: "SET_PROCESSING", payload: false });
      }
    },
    [state, appendOutput, clearHistory, session]
  );

  return (
    <TerminalContext.Provider value={{ state, dispatch, executeCommand, clearHistory, appendOutput }}>
      {children}
    </TerminalContext.Provider>
  );
}

export function useTerminal() {
  const context = useContext(TerminalContext);
  if (context === undefined) {
    throw new Error("useTerminal must be used within a TerminalProvider");
  }
  return context;
}
