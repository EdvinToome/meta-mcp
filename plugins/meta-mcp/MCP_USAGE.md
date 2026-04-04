# Meta MCP Usage (Claude)

Use this order so Claude uses the right tools and does not over-query docs:

1. `health_check`
2. `get_capabilities`
3. Meta data tools (`get_insights`, `list_ads`, `list_campaigns`, `get_campaign_performance`, and related read/write tools)
4. `mcp__context7__query_docs` only when you need an official Meta definition or API constraint
5. Web search only for practitioner heuristics after Context7

Rules:
- For burn, spend, and routine KPI reads, use Meta data tools only.
- Do not call Context7 for every request.
- Keep docs lookups narrow: one targeted topic query for the specific constraint.
