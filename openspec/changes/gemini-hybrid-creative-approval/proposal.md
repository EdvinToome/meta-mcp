## Why
The current Meta publishing flow assumes an image already exists (`image_path` or `image_hash`) and does not manage creative generation, review, or approval inside the workflow. We need an end-to-end path from creative idea to publish-ready asset while preserving operator control.

We want to standardize on Gemini API for generation, support hybrid image creation strategies, and enforce explicit human approval before any generated image is used in Meta publishing.
We also want hardened prompt construction that produces more consistent, production-ready outputs similar to the practical gains users report from Higgsfield workflows.

## What Changes
- Add a Gemini-first creative generation workflow as a pre-publish stage in the Meta ad builder flow.
- Implement Gemini generation as a project-owned module in this plugin (no third-party Gemini MCP dependency in runtime path).
- Add a mandatory approval gate for generated candidates.
- Add hybrid generation support with parallel mode execution in one batch:
  - full generation (image with text)
  - visual-only generation (no text) with manual text overlay step
  - ability to request N candidates per mode (`full_count`, `visual_only_count`)
- Preserve and formalize bypass mode:
  - if operator provides finished `image_path` or reusable `image_hash`, skip generation entirely.
- Add stateful review lifecycle for candidate management:
  - submit generation batch
  - collect candidates
  - operator selects / rerolls / edits prompt
  - proceed only after explicit selection
- Add prompt transparency and operator control:
  - show exact prompt used for each candidate
  - allow prompt edit + rerun
  - allow start-over with a fresh batch
- Add prompt hardening profile for Gemini generation:
  - composition directives (subject hierarchy, negative space, focal priority)
  - camera and lighting directives (angle, lens style, lighting intent)
  - rendering quality directives (material detail, artifact avoidance)
  - text rendering directives for `full` mode (short overlays, legibility, placement constraints)
  - strict `no_text` enforcement for `visual_only` mode
- Move Notion template library into local skill resources and internalize `static-banner` patterns into project-owned skills.
- Ensure full parity for both plugin hosts:
  - Codex plugin flow
  - Claude Code plugin flow
- Keep generation separate from publish:
  - Gemini creative generation/review runs in a separate MCP flow before Meta publish.
  - `run_structured_ad_build` stays publish-only and still requires final image input.

## Scope
In scope:
- Workflow and tool contract changes needed to orchestrate generation + review + selection.
- Approval-state semantics and guardrails.
- Integration design for Gemini generation calls and async status handling.
- Batch async mode policy for cost/latency tradeoff (default sync for interactive review, async batch for non-urgent queues).
- Prompt-hardening strategy that emulates high-performing wrapper behavior without third-party runtime dependencies.
- Operator UX contract for Codex and Claude skills.
- Local skill/resource packaging strategy for template library and examples.

Out of scope:
- Implementing OCR scoring and advanced automated image ranking heuristics.
- Replacing existing Meta publishing primitives (`run_structured_ad_build`, upload tools).
- Video generation.

## Expected Outcome
Operators can run one consistent flow:
- idea -> generated candidates -> explicit selection -> Meta publish
while still supporting:
- finished-image-first flows that bypass generation.

This reduces manual glue work, enforces approval safety, keeps the current deterministic Meta publishing path intact, and avoids remote Notion dependency at runtime.

## Risks and Mitigations
- Risk: provider lock-in to Gemini.
  - Mitigation: accepted for this change; no multi-provider fallback path.
- Risk: longer turnaround due to approval gate.
  - Mitigation: compact review batches and clear selection commands.
- Risk: text quality variability in full generation mode.
  - Mitigation: hybrid path with visual-only generation + manual overlay.
- Risk: context bloat from large template libraries.
  - Mitigation: index-first template loading with per-template lazy resource reads.
- Risk: Gemini outage or quota failure blocks pipeline.
  - Mitigation: fail closed with explicit error and resumable state; operator can retry later or supply manual image.
