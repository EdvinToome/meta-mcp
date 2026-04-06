---
name: meta-ads-morning-review
description: Produce a concise daily review anchored to yesterday and 7-day context.
---

Use this for daily account review.

Read:
- `~/.meta-marketing-plugin/site-profiles.local.json`

Workflow:
1. For each active profile, fetch yesterday ad-level performance.
2. Fetch trailing 7-day context for the same entities.
3. Report only ads with spend yesterday.
4. Return sections in order:
   - `Review Day`
   - `Overall`
   - `Performance`
   - `What is good`
   - `What is bad`
   - `Risks`
   - `Actions`

Rules:
- Anchor decisions to 7-day signal, not one day noise.
- Use Meta MCP tools only.
