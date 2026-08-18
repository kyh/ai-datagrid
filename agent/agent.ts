import { createGateway } from "ai";
import { defineAgent, defineDynamic } from "eve";
import { z } from "zod";

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
 * model with the caller's own AI Gateway key. Otherwise the bare model id
 * routes through the server's AI_GATEWAY_API_KEY (or Vercel OIDC). The
 * resolver MUST hang off `step.started`: session/turn-scoped
 * selections have to be serializable, and only step-scoped selections may
 * return a live provider instance.
 */
export default defineAgent({
  model: defineDynamic({
    events: {
      "step.started": (_event, ctx) => {
        const auth = ctx.session.auth.current ?? ctx.session.auth.initiator;
        const gatewayApiKey = z.string().min(1).safeParse(auth?.attributes["gatewayApiKey"]);
        if (!gatewayApiKey.success) {
          return MODEL_ID; // fall back to the server-credentialed model
        }
        return createGateway({ apiKey: gatewayApiKey.data })(MODEL_ID);
      },
    },
  }),
  // eve 0.27 removed `limits.maxSubagentDepth`: the built-in `agent` tool is
  // root-only, so a delegated child session can no longer delegate again.
  // The instructions forbid delegation outright, and the UI bridge unwraps
  // `subagent.event` so a stray delegated tool call still lands in the UI.
});
