---
name: meta-ads-consultant
description: Diagnose account issues from live Meta metrics and give concrete fixes.
---

Use this for issue diagnosis, burn checks, and performance debugging.

Read:
- `~/.meta-marketing-plugin/site-profiles.local.json`

Workflow:
1. Resolve account from `site_profile`.
2. Pull live metrics first with Meta MCP tools.
3. For quick metric requests, answer directly without docs lookup.
4. For ambiguous platform behavior, consult official docs once, then continue.
5. Return:
   - `Verdict`
   - `Facts`
   - `Likely causes`
   - `Actions now`

Rules:
- Facts first, inference second.
- No shell fallback for Meta API operations.
