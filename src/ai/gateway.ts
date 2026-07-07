import { createGateway } from "ai";

/**
 * Single source of truth for the model + gateway construction.
 * All agents import from here so swapping models is a one-line change.
 */
export const MODEL_ID = "openai/gpt-5.1-instant";

export function createModel(apiKey: string) {
  return createGateway({ apiKey })(MODEL_ID);
}
