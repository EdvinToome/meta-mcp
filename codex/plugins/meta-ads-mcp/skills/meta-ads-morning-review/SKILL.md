---
name: meta-ads-morning-review
description: Review yesterday's Meta ad performance for the active site profiles in this workspace, anchor conclusions in trailing 7-day performance, and return a readable daily summary with compact ad metric blocks plus Good, Bad, Risks, and Actions.
---

# Meta Ads Morning Review

Use this skill for the daily Meta Ads performance review in this workspace.

Read before reviewing:
- `~/.meta-mcp/site-profiles.local.json` if it exists
- `../../site-profiles.example.json`

Workflow:
1. Review the active workspace profiles only.
2. Focus on ads that actually delivered yesterday. Ignore rejected ads, broken builds, missing structures, and other non-performance noise unless it directly changes performance interpretation.
3. Use native Meta tools to fetch:
   - ad-level yesterday performance
   - trailing 7-day performance for the same ads, campaigns, or account context
4. Use yesterday as the freshness check and the trailing 7-day view as the decision anchor.
5. Return plain text with exactly these sections, in this order:
   - `Review Day`
   - `Overall`
   - `Performance`
   - `What is good`
   - `What is bad`
   - `Risks`
   - `Actions`
6. Keep it concise, specific, and operator-friendly.

Rules:
- Prefer the native Meta tools available in this workspace.
- For reporting, use `list_ads` and `get_insights` whenever available.
- Use the Meta Ads MCP tools directly. Do not replace them with shell commands, raw Graph API calls, or `list_mcp_resources`.
- If the Meta Ads MCP tools are missing in the current session, stop and say the Meta Ads MCP server is not loaded correctly. Tell the user to restart Codex or reload the plugin instead of continuing with a shell-only fallback.
- Do not use shell commands for Meta API operations.
- Do not invent profiles, IDs, domains, geo targets, or campaign facts.
- Do not mention Meta billing or payment issues.
- Do not spend words on rejected, broken, or non-running ads unless they materially distort the performance reading.

Metric rules:
- The review day is yesterday. Print it explicitly as `Review Day: YYYY-MM-DD`.
- Start `Overall` with a one-line verdict for yesterday such as `GOOD`, `MIXED`, or `WEAK`, then explain that verdict using the 7-day context.
- Never anchor recommendations on one day alone. A single strong or weak day is not enough to recommend scaling or cutting unless the 7-day trend supports it.
- If yesterday conflicts with the trailing 7-day trend, say that directly and follow the 7-day trend in the recommendation.
- Report ad-level entries only for ads with non-zero spend yesterday.
- Sort the `Performance` section by yesterday spend descending.
- Use website traffic metrics, not aggregate `clicks`.
- For click-based efficiency, prefer website click metrics from website action rows such as `link_click`. Do not silently substitute top-level `clicks`.
- If website click metrics are unavailable for an ad, say `n/a` for website CPC and website CTR instead of using `All clicks`.
- Include these metrics for every ad entry:
  - `Spend`
  - `Impressions`
  - `CPM`
  - `Website CPC`
  - `Website CTR`
  - `ROAS`
  - `Conv. Value`
  - `7d context`
- `7d context` should be short and decision-oriented, for example `7d strong`, `7d weakening`, `7d stable`, or `7d inconsistent`.
- If ROAS or conversion value are unavailable from the live tool output for a row, show `n/a` instead of inventing them.

Section rules:
- `Overall` should summarize yesterday totals, then explain whether yesterday confirms or diverges from the trailing 7-day trend.
- `What is good` should cover durable strengths, not just yesterday spikes.
- `What is bad` should cover genuine underperformance, not one-day noise.
- `Risks` should focus on performance risks such as falling efficiency, rising CPM, weak website click quality, unstable conversion value, or overreaction risk from small samples.
- `Actions` should be concrete and conservative. Only recommend budget increases when both yesterday and the trailing 7-day picture support scaling. Only recommend cuts when weakness is persistent or cost has clearly deteriorated over multiple days.

Formatting rules:
- Use readable plain text.
- Add simple visual cues with text labels, for example `GOOD:`, `BAD:`, `RISK:`, `ACTION:`.
- Do not use markdown tables, ASCII tables, code blocks, or pipe-delimited rows in `Performance`.
- Format `Performance` as repeated compact ad blocks using this exact pattern:
  `1. <ad name>`
  `Spend <value> | Impr <value> | CPM <value>`
  `Web CPC <value> | Web CTR <value> | ROAS <value> | Conv. value <value> | 7d <value>`
- Keep each metric line short enough to wrap cleanly in Telegram.
- Use blank lines between ad entries.
- Keep numbers easy to scan. Use currency symbols, percentages, and one or two decimals where appropriate.
