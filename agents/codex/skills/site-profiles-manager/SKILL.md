---
name: site-profiles-manager
description: Create, update, and validate global site profile records.
---

Use this when editing `~/.meta-marketing-plugin/site-profiles.local.json`.

Reference:
- `SITE_PROFILES.md`

Workflow:
1. Read current global profile JSON.
2. Add or update profile fields requested by the user.
3. Keep schema and field names consistent.
4. Preserve unrelated profiles unchanged.
5. Return a concise change summary.
