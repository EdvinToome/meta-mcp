---
name: site-profiles-manager
description: Create, update, and validate project site profile records.
---

Use this when editing `.claude/meta-marketing-plugin/site-profiles.local.json`.

Reference:
- `SITE_PROFILES.md`

Workflow:
1. Read current project profile JSON.
2. Add or update requested profile fields.
3. Preserve unrelated profiles unchanged.
4. Return a concise change summary.
