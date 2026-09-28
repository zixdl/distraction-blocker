import type { ActionResponse, RuntimeMessage } from "./types";

export async function sendMessage(
  message: RuntimeMessage,
): Promise<ActionResponse> {
  return chrome.runtime.sendMessage(message) as Promise<ActionResponse>;
}
