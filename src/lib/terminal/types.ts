import { ReactNode } from "react";

export type OutputBlock = {
  id: string;
  type: "command" | "output" | "error" | "system";
  content: ReactNode | string;
};

export type InputMode = "command" | "password" | "prompt";

export type TerminalState = {
  history: OutputBlock[];
  cwd: string;
  inputMode: InputMode;
  isProcessing: boolean;
  promptPrefix: string;
};

export type TerminalContextType = {
  state: TerminalState;
  dispatch: React.Dispatch<TerminalAction>;
  executeCommand: (cmd: string) => Promise<void>;
  clearHistory: () => void;
  appendOutput: (content: ReactNode | string, type?: OutputBlock["type"]) => void;
};

export type TerminalAction =
  | { type: "APPEND_BLOCK"; payload: OutputBlock }
  | { type: "CLEAR_HISTORY" }
  | { type: "SET_CWD"; payload: string }
  | { type: "SET_INPUT_MODE"; payload: InputMode }
  | { type: "SET_PROCESSING"; payload: boolean }
  | { type: "SET_PROMPT_PREFIX"; payload: string };
