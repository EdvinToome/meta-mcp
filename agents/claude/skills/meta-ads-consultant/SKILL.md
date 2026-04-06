---
name: meta-ads-consultant
description: Diagnose account issues from live Meta metrics and give concrete fixes.
---

Use this for issue diagnosis and performance debugging in Claude.

Read:
- `.claude/meta-marketing-plugin/site-profiles.local.json`
- `.claude/meta-marketing-plugin/brand_dna.yaml`

Workflow:
1. Resolve account from `site_profile`.
2. Pull live metrics first.
3. For simple metric pulls, answer directly.
4. Use docs only when platform behavior is ambiguous.
5. Return:
   - `Verdict`
   - `Facts`
   - `Likely causes`
   - `Actions now`

Rules:
- Facts before inference.
- Use Meta MCP tools only.
