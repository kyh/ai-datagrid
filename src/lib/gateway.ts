import { createGateway } from "ai";

/**
 * Single source of truth for the model id. Imported (relatively) by the
 * agent config's dynamic model resolver AND the enrich_cells tool, which
 * builds its own gateway model for the per-cell generateObject fan-out.
 */
export const MODEL_ID = "openai/gpt-5.1-instant";

/**
 * Builds the gateway LanguageModel. With a key (the caller's BYO gateway
 * key from session auth) the model runs on that key; without one it falls
 * back to the ambient server credential (`AI_GATEWAY_API_KEY` env or
 * Vercel OIDC), matching the agent's fallback model routing.
 */
export function createModel(gatewayApiKey?: string) {
  const gateway =
    gatewayApiKey !== undefined && gatewayApiKey.length > 0
      ? createGateway({ apiKey: gatewayApiKey })
      : createGateway();
  return gateway(MODEL_ID);
}
