## 1. Change scaffolding
- [x] 1.1 Define change-level glossary and lifecycle states for generation/review/approval.
- [x] 1.2 Define canonical change config values (`provider=gemini`, `approval_required=true`, hybrid mode enum).
- [x] 1.3 Define generation volume knobs (`full_count`, `visual_only_count`) and validation rules.
- [x] 1.4 Define `generation_mode` enum (`interactive`, `deferred_batch`) with default `interactive`.

## 2. Orchestration contracts
- [x] 2.1 Specify input/output schema for generation batch creation.
- [x] 2.2 Specify input/output schema for batch status and review payload.
- [x] 2.3 Specify input/output schema for candidate approval and selection lock.
- [x] 2.4 Specify input/output schema for visual-only final asset handoff.
- [x] 2.5 Specify schema for prompt edit + candidate rerun.
- [x] 2.6 Specify schema for full batch restart.
- [x] 2.7 Specify provider integration boundary: internal Gemini module/actions only, no third-party Gemini MCP dependency.
- [x] 2.8 Confirm runtime architecture decision: implement in existing Node/TypeScript MCP server, not Python FastMCP.

## 3. Prompt pipeline design
- [x] 3.1 Define template slot model mapped to Notion template library categories.
- [x] 3.2 Define merge rules for `brand_dna_copy.yaml` and `brand_dna_visual.yaml` into generation prompt.
- [x] 3.3 Define mode-specific prompt directives (`full` vs `visual_only`).
- [x] 3.4 Define reroll and prompt-edit delta strategy.
- [x] 3.5 Define prompt lineage persistence model (base prompt, final prompt, prompt edits).
- [x] 3.6 Define prompt hardening profile blocks (composition, camera, lighting, quality, negative constraints).
- [x] 3.7 Define `full` mode text-overlay hardening constraints (max overlay length, placement anchors, legibility intent).
- [x] 3.8 Define strict `visual_only` no-text hardening constraints.

## 4. Approval gate behavior
- [x] 4.1 Define hard gate rule: no publish before explicit approval.
- [x] 4.2 Define operator command contract for select/reroll/edit/reject.
- [x] 4.3 Define resume behavior after interrupted sessions.
- [x] 4.4 Add `start over` behavior and lifecycle transitions.

## 5. Existing flow compatibility
- [x] 5.1 Define bypass criteria when `image_path` or `image_hash` is provided.
- [x] 5.2 Define handoff from approved candidate/final overlay asset to existing Meta upload/build flow.
- [x] 5.3 Validate no required changes to deterministic structured publish contract.
- [x] 5.4 Define pre-publish orchestration behavior: run separate Gemini MCP generation/review flow before `run_structured_ad_build` when image is missing.

## 6. Observability and error policy
- [x] 6.1 Define structured status and error codes for generation/review stages.
- [x] 6.2 Define partial-failure handling in multi-candidate batches.
- [x] 6.3 Define audit fields for approval events.
- [x] 6.4 Define required review payload fields including exact generation prompt per candidate.
- [x] 6.5 Define explicit provider-unavailable blocking errors (`gemini_unavailable`, `gemini_auth_failed`, `gemini_quota_exceeded`) and required operator guidance text.

## 7. Codex and Claude plugin parity
- [x] 7.1 Define mirrored skill contracts and behavior parity requirements for Codex and Claude hosts.
- [x] 7.2 Define host-specific packaging paths and install/update expectations.
- [x] 7.3 Define host parity acceptance checklist.

## 8. Local skill/resource migration
- [x] 8.1 Define local template library format (`index + per-template files`) migrated from Notion.
- [x] 8.2 Define local example image resource structure and lookup strategy.
- [x] 8.3 Define lightweight loading policy to avoid context bloat (index-first, lazy load selected templates only).
- [x] 8.4 Define project-owned replacement for external `static-banner` skill patterns.
- [x] 8.5 Define source-of-truth policy between Notion and local resources.

## 9. Rollout plan
- [x] 9.1 Define incremental rollout sequence (internal only -> controlled users -> default).
- [x] 9.2 Define fail-closed policy when Gemini is unavailable (no fallback provider, no silent downgrade).
- [x] 9.3 Define acceptance checklist for declaring the change ready for implementation.
- [x] 9.4 Define deferred-batch operational policy (queue limits, expected SLA, retry window, operator messaging).
