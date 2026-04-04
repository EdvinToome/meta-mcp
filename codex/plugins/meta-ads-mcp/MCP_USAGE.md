# Meta MCP Usage

Use this note before reaching for longer references.

## Default Rule

- Prefer the Meta MCP tools first.
- Use the smallest tool call that answers the question.
- Do not query Context7 or load strategy references for simple live reads.

## Fast Reads

For spend, burn, impressions, clicks, CPC, CPM, CTR, ROAS, or conversion value:

- Read the site profiles file first to resolve the account.
- Use `mcp__meta_ads_mcp__get_insights` first.
- Request only the fields you need, for example `["spend"]`.
- Use `level: "account"` unless the user asked for campaign, ad set, or ad detail.
- Return the number directly before offering deeper breakdowns.

## Breakdowns

- If the user asks for campaign, ad set, or ad detail, keep `get_insights` and change `level`.
- Use `list_ads`, `list_campaigns`, or `list_ad_sets` only when you need names, IDs, or filtering context.
- Use `compare_performance` only for actual comparisons between entities or periods.

## Docs

- Use Context7 only when:
  - the user asks what a metric or field means
  - the tool response is ambiguous
  - you need an official Meta constraint before making a claim

## Avoid

- Do not read `BUSINESS_RULES.local.md` for simple metric pulls.
- Do not open diagnosis playbooks for simple reads.
- Do not replace Meta MCP calls with shell commands or raw API calls.
