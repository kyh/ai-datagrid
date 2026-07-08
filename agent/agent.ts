import { createGateway } from "ai";
import { defineAgent, defineDynamic } from "eve";

// Relative import: agent/ is compiled by eve, which resolves plain relative
// paths but not tsconfig `@/*` aliases.
import { MODEL_ID } from "../src/lib/gateway";

/**
 * Runtime config for this app's agent. Identity comes from package.json
 * `name`; tools are discovered from `agent/tools/*.ts`
 * (filename = tool name); the system prompt is `agent/instructions.md`.
 *
 * BYO-key: when the channel verifier (agent/channels/eve.ts) admitted a
 * bearer token, the dynamic model resolver builds a per-session gateway
 * model with the caller's own AI Gateway key. Otherwise the string
 * `fallback` routes through the server's AI_GATEWAY_API_KEY (or Vercel
 * OIDC). The resolver MUST hang off `step.started`: session/turn-scoped
 * selections have to be serializable, and only step-scoped selections may
 * return a live provider instance.
 */
export default defineAgent({
  model: defineDynamic({
    fallback: MODEL_ID,
    events: {
      "step.started": (_event, ctx) => {
        const auth = ctx.session.auth.current ?? ctx.session.auth.initiator;
        const gatewayApiKey = auth?.attributes["gatewayApiKey"];
        if (typeof gatewayApiKey !== "string" || gatewayApiKey.length === 0) {
          return null; // fall back to the server-credentialed model
        }
        return createGateway({ apiKey: gatewayApiKey })(MODEL_ID);
      },
    },
  }),
  limits: {
    // eve 0.22 rejects 0 here (positive integers only), so the built-in
    // `agent` self-delegation tool cannot be removed by config. Depth 1
    // bounds the damage (a child session cannot delegate again); the
    // instructions forbid delegation outright, and the chat bridge unwraps
    // `subagent.event` so a stray delegated tool call still lands in the UI.
    maxSubagentDepth: 1,
  },
});
