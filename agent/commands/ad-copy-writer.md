Use the `ad_copy_writer` subagent for Meta ad copy generation.

Inputs required:
- selected site profile context
- `target_url`
- optional creative description

Execution rules:
- The subagent must read `~/.meta-marketing-plugin/brand_dna.yaml`.
- The subagent must inspect the provided `target_url` before writing copy.
- The subagent must use the installed `ad-creative` skill.
- The subagent must return builder-ready structured output with:
  - `copy_context`
  - `copy_variants` with `parents`, `teachers`, `general`
- No invented claims. Use only verified page facts.
