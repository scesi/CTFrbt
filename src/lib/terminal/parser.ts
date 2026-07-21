import { CommandContext } from "./commands";

// A simple mechanism to hold state during multi-step prompts (like login)
let activePromptCallback: ((input: string) => void) | null = null;

export const setTerminalPrompt = (
  ctx: CommandContext,
  prefix: string,
  mode: "prompt" | "password",
  callback: (input: string) => void
) => {
  ctx.dispatch({ type: "SET_PROMPT_PREFIX", payload: prefix });
  ctx.dispatch({ type: "SET_INPUT_MODE", payload: mode });
  activePromptCallback = callback;
};

export const clearTerminalPrompt = (ctx: CommandContext) => {
  ctx.dispatch({ type: "SET_PROMPT_PREFIX", payload: "" });
  ctx.dispatch({ type: "SET_INPUT_MODE", payload: "command" });
  activePromptCallback = null;
};

export async function parseCommand(input: string, ctx: CommandContext) {
  // If we are waiting for a specific prompt response (like a password)
  if (ctx.state.inputMode !== "command" && activePromptCallback) {
    const callback = activePromptCallback;
    // Do not clear immediately if the callback needs to trigger another prompt, 
    // the callback will handle it, or we clear it by default.
    clearTerminalPrompt(ctx);
    callback(input);
    return;
  }

  // Parse standard commands
  const parts = input.trim().match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  if (parts.length === 0) return;

  const cmd = (parts[0] as string).toLowerCase();
  const args = parts.slice(1).map(arg => (arg as string).replace(/^"|"$/g, '')); // Strip quotes

  // Dynamic import to avoid circular dependencies if needed, or just import registry
  const { COMMAND_REGISTRY } = await import("./commands");

  const handler = COMMAND_REGISTRY[cmd];

  if (!handler) {
    ctx.appendOutput(`command not found: ${cmd}`, "error");
    return;
  }

  await handler(args, ctx);
}
