## Host Parity Acceptance Checklist

- Codex can run Gemini generation MCP tools end-to-end.
- Claude can run Gemini generation MCP tools end-to-end.
- Both hosts expose the same tool names and argument shapes.
- Both hosts can launch dedicated Gemini MCP (`launch-gemini-server.js`).
- Both hosts keep Meta publish flow separate (`run_structured_ad_build` unchanged).

## Rollout Sequence

1. Internal validation in local environments (Codex + Claude).
2. Controlled users with `generation_mode=interactive`.
3. Controlled users with `generation_mode=deferred_batch`.
4. Default enablement for generation MCP in plugin setup scripts.

## Change Readiness Checklist

- Build passes (`npm run build`).
- Gemini tools return deterministic review payloads.
- Prompt lineage is persisted per candidate.
- Approval and audit fields are persisted.
- Fail-closed behavior is confirmed for missing key/auth/quota classes.
- Local skill templates are available for both hosts.

## Deferred Batch Operational Policy

- Mode flag: `generation_mode=deferred_batch`.
- Queue behavior: batch is submitted immediately and generated on status/review polling.
- Operator message: explicitly state deferred mode may take longer and requires follow-up status checks.
- Retry window: rerun by `restart_generation_batch` when deferred lane fails.
- No provider fallback: failures remain blocking until retried or replaced with manual image input.
