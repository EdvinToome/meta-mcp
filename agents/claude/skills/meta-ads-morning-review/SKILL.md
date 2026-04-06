---
name: meta-ads-morning-review
description: Produce a concise daily review anchored to yesterday and 7-day context.
---

Use this for daily account review in Claude.
Primary entry command: `/meta-ads-morning-review`.

Read:
- `.claude/meta-marketing-plugin/site-profiles.local.json`

Workflow:
1. Pull yesterday ad-level results for active profiles.
2. Pull 7-day context for the same entities.
3. Report only ads with spend yesterday.
4. Return sections:
   - `Review Day`
   - `Overall`
   - `Performance`
   - `What is good`
   - `What is bad`
   - `Risks`
   - `Actions`

Rules:
- Decisions follow 7-day signal.
- Use Meta MCP tools only.
