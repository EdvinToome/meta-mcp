## Overview
This change introduces a Creative Generation + Review stage before Meta publish execution, with Gemini as the default image generation provider. The existing deterministic publish path remains the source of truth for campaign/ad-set/creative/ad creation.

The design adds orchestration and approval state, not replacement of existing Meta build primitives.

## Goals
- Gemini API is first-class/default for generation.
- Gemini API is required for generated flow (fail closed if unavailable).
- Gemini integration is project-owned within this plugin (no third-party Gemini MCP in runtime path).
- Runtime stack remains Node/TypeScript MCP in this repo; no Python FastMCP service for core generation flow.
- Full operator approval required for generated images.
- Hybrid generation supported, including simultaneous full + visual-only runs.
- Operator can configure candidate volume per mode.
- Existing direct-image flow remains supported and explicit.
- Full host parity for Codex and Claude plugin flows.
- Prompt hardening improves consistency and output quality in a Higgsfield-like way using local rules.

## Non-Goals
- Automated copywriting changes (current ad-copy-writer remains).
- Automated post-processing typography engine in this change.
- Multi-provider routing or runtime fallback.
- Third-party Gemini MCP dependency for core generation flow.
- Python FastMCP sidecar for Gemini generation orchestration.

## Proposed Flow

### A) Bypass (no generation)
1. Operator supplies `image_path` or `image_hash`.
2. System marks creative source as `operator_provided`.
3. Skip all generation/review states.
4. Continue with existing upload/build flow.

### B) Generated flow (approval required)
1. Operator supplies creative idea + generation plan:
   - `full_count` (>=0)
   - `visual_only_count` (>=0)
   - at least one count > 0
2. Operator or agent runs Gemini generation MCP flow first.
3. Gemini generation MCP creates one batch with both mode lanes in parallel.
4. System returns/persists batch id and candidate ids.
4. System gathers completed candidates.
5. System enters `awaiting_approval` state.
6. Operator reviews candidates with exact prompt used per candidate.
7. Operator selects one candidate (or requests reroll/edit/start-over).
7. Only after explicit select:
   - `full`: use selected output directly.
   - `visual_only`: operator performs text overlay externally and provides final image path.
8. System uploads final image to Meta and executes existing structured build.

## State Model

```text
idle
  -> generation_submitted
  -> generation_in_progress
  -> review_ready
  -> awaiting_approval
      -> approved_candidate_selected
      -> (reroll_requested -> generation_submitted)
      -> (prompt_edit_requested -> generation_submitted)
      -> (start_over_requested -> generation_submitted)
  -> final_asset_ready
  -> publish_executed
```

Guardrail:
- Transition to `final_asset_ready` is blocked until explicit operator approval exists.

## Hybrid Mode Semantics

### `full`
- Prompt requests complete creative including overlay text.
- Output candidate is directly reviewable for publish use.

### `visual_only`
- Prompt forbids text overlays and prioritizes composition space for overlay.
- Operator adds final text in external editor (Figma/Canva/etc).
- Operator returns final image file path for publish continuation.

### Parallel Hybrid Execution
- Both lanes can run in the same batch.
- Candidate ids are mode-prefixed (example: `full_c03`, `visual_c02`).
- Review payload must preserve mode and prompt lineage.

## Async Batch Policy
- Interactive mode (default):
  - Use direct Gemini generation for fast review loops.
  - Target: lowest turnaround for `select/reroll/edit` cycles.
- Deferred mode (cost-optimized):
  - Use Gemini async batch jobs for non-urgent generation queues.
  - Target: lower cost with accepted delay.
- Policy selector:
  - `generation_mode = interactive | deferred_batch`
  - default is `interactive` unless operator explicitly chooses deferred queue behavior.
- Consistent review contract:
  - both modes must emit the same candidate/review payload shape.

## Interfaces and Contracts

### New orchestration contracts (conceptual)
- `create_creative_generation_batch`
  - inputs: provider=`gemini`, concept/template info, brand DNA context, aspect ratios, `full_count`, `visual_only_count`
  - output: `batch_id`, candidate placeholders

- `get_creative_generation_batch_status`
  - inputs: `batch_id`
  - output: candidate statuses + preview paths/urls

- `review_creative_batch`
  - inputs: `batch_id`
  - output: compact review payload (ids, artifacts, mode, exact_prompt, metadata)

- `approve_creative_candidate`
  - inputs: `batch_id`, `candidate_id`
  - output: approved candidate metadata, locked selection

- `provide_final_overlay_asset` (visual-only path)
  - inputs: `batch_id`, `candidate_id`, `final_image_path`
  - output: `final_asset_path`

- `edit_candidate_prompt`
  - inputs: `batch_id`, `candidate_id`, `prompt_delta`
  - output: new candidate submission id linked to parent candidate

- `restart_generation_batch`
  - inputs: `batch_id`, optional new template/concept knobs
  - output: replacement batch id (or new generation round within same batch lineage)

These contracts are orchestration-level and can be realized as MCP tools and/or internal action modules.
For provider integration, use internal action modules in this plugin for Gemini calls, not external Gemini MCP servers.

## Prompt Construction
Prompt construction uses layered inputs:
1. Template structure from the Notion-derived template taxonomy.
2. Brand constraints from `brand_dna_copy.yaml` and `brand_dna_visual.yaml`.
3. Product/context facts from page facts and operator brief.
4. Mode directives (`full` vs `visual_only`).
5. Prompt hardening directives pack (composition, camera, lighting, quality, constraints).

Prompt output must be deterministic in shape (structured slots) to support reroll/edit loops.
Prompt lineage must be persisted per candidate:
- `template_id`
- `template_version`
- `base_prompt`
- `final_prompt`
- `prompt_edits[]`

### Prompt Hardening Profile (Higgsfield-like)
Use a local hardening layer before Gemini submission:
- Composition block:
  - primary subject definition
  - secondary elements with priority order
  - negative space reservation zones
  - framing/aspect-specific layout notes
- Camera + lighting block:
  - angle and distance
  - lens look/style hint
  - lighting intent and contrast target
- Quality block:
  - detail/fidelity targets
  - artifact suppression directives
  - clean background/edge guidance when needed
- Mode block:
  - `full`: short explicit overlay text instruction, max text length and placement anchors
  - `visual_only`: explicit no-text/no-letterforms constraint
- Negative constraints block:
  - disallow common AI slop artifacts
  - disallow irrelevant objects/brand conflicts

This layer is deterministic and local. It does not depend on third-party prompt enhancers.

## Approval UX Contract
When in `awaiting_approval`, assistant must not publish.
Expected operator actions:
- `select <candidate_id>`
- `reroll <candidate_id>`
- `edit <candidate_id>: <instruction>`
- `reject all`
- `start over`

For `visual_only`, after `select`, system requests final composed image path and remains blocked until provided.

## Integration with Existing Build
No breaking change to `run_structured_ad_build` contract is required.
- Existing requirement (`image_path` or `image_hash`) remains.
- New generation/review stage produces one of those required inputs.

Builder entry behavior:
- `run_structured_ad_build` remains publish-only and requires final image input (`image_path` or `image_hash`).
- If image input does not exist, operator/agent must complete Gemini generation + approval flow first, then call publish.

Host parity requirement:
- The same behavior contract applies in Codex and Claude plugin packaging.
- Skill naming and orchestration semantics must remain aligned across both hosts.

## Data and Persistence
Persist minimal batch metadata for resumability:
- batch id, provider, mode
- candidate ids, statuses, artifact references
- selected candidate id
- final asset path/hash
- approval timestamp
- exact prompt per candidate + prompt edit history

Storage can be local runtime metadata aligned with existing host-local config patterns (non-tracked files).

## Failure Handling
- Gemini unavailable (auth/quota/outage): fail batch immediately, keep resumable state, return explicit blocking error.
- Gemini request failure per candidate: mark candidate failed, allow reroll within Gemini only.
- Partial batch success: allow review on successful candidates unless failure reason is provider-unavailable class.
- Approval timeout/user pause: batch remains resumable.
- Invalid overlay asset path: fail fast, keep state in `awaiting_approval`.

No fallback rule:
- Do not auto-route to other providers.
- Do not silently downgrade generation mode.
- If generation cannot proceed with Gemini, stop and require operator action.

## Security and Compliance
- No business tokens, account ids, or domain secrets in tracked repo files.
- Keep generated artifacts and runtime metadata in local, non-tracked paths.
- Preserve existing publishing validation and Meta compliance checks.

## Local Skill and Resource Strategy
Template and prompt content currently sourced from Notion must be vendored into local, project-owned skill resources.

Recommended structure:
```text
agents/{host}/skills/gemini-creative-builder/SKILL.md
agents/{host}/skills/gemini-creative-builder/templates/index.yaml
agents/{host}/skills/gemini-creative-builder/templates/{template_id}.md
agents/{host}/skills/gemini-creative-builder/examples/{template_id}/*
```

Rules:
- `index.yaml` contains compact metadata only (id, title, tags, file path, example refs).
- Subagent loads only selected templates/resources, not full library.
- `static-banner` heuristics are absorbed into project skill modules (no external runtime dependency).
- Notion becomes authoring source only; runtime reads local resources.
- Prefer skill supporting files (template docs + examples) over MCP resource endpoints for normal operation to reduce runtime complexity.
- Use MCP resources only if we need remote browsing UX for binary examples; otherwise keep examples as local files referenced from `SKILL.md`.
