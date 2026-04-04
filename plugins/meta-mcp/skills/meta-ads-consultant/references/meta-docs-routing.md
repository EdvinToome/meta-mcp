# Meta Docs Routing

Use Context7 for official Meta docs before falling back to web search.

- Default library ID: `/websites/developers_facebook_marketing-api`
- Use `mcp__context7__resolve_library_id` only if that ID stops working or you need a different Meta doc set.
- Use `mcp__context7__query_docs` for the official answer.
- Query by topic. Do not paste a Meta docs URL into the workflow unless the user explicitly asks for the link.
- Use web search after that for practitioner discussion, forum heuristics, or prompt ideas.

## Topic Queries

- `Marketing API overview ad account campaign ad set ad structure permissions`
  Use when: you need the official object model for ad account, campaign, ad set, ad, permissions, or the high-level Marketing API surface.

- `Insights API overview metrics levels reporting structure`
  Use when: you need the official starting point for Insights API concepts, metric retrieval, levels, and reporting structure.

- `Insights API getting started object insights fields breakdowns level`
  Use when: you need the exact `/{object}/insights` pattern, fields, breakdowns, and level selection for diagnosis.

- `ad optimization basics monitoring analytics CTR CPC ROAS spend`
  Use when: you need the official monitoring and optimization framing for CTR, CPC, spend, ROAS, purchase signals, and time-window comparisons.

- `adcreative reference object_story_spec CTA body headline link page instagram_actor_id`
  Use when: you need the official creative object shape, `object_story_spec`, CTA fields, body, headline, link, page, or Instagram actor requirements.

- `ad account adcreatives fields creation constraints`
  Use when: you need account-level creative field coverage and creation constraints on ad creative payloads.

- `ad creative previews placement render page association constraints`
  Use when: you need official preview behavior, placement render checks, or page-association constraints for creatives.

- `audiences reference custom audience lookalike supported edges audience management`
  Use when: you need custom audience or lookalike reference details, supported edges, or audience management facts.

- `enhanced website custom audiences pixel website retargeting event rules`
  Use when: you need website retargeting rules, pixel-backed custom audience setup, or event-driven audience logic.

- `advantage catalog ads get started product sets creative tags dynamic product ads`
  Use when: you need official catalog ad or dynamic product ad setup, creative tags, product sets, or Advantage catalog ad behavior.

- `advantage shopping campaigns cross channel conversion template_url_spec deep linking catalog tracking`
  Use when: you need catalog creative details such as `template_url_spec`, deep linking, or pixel-linked catalog tracking.

- `Meta Pixel installation browser events event firing basics`
  Use when: you need browser-side event setup, pixel installation, or event firing basics.

- `Conversions API end to end implementation deduplication event matching browser server`
  Use when: you need server-side event setup, browser plus server deduplication, event matching, or tracking recovery guidance.

## Query Pattern

Use this shape:

- library ID: `/websites/developers_facebook_marketing-api`
- topic query: one line from `Topic Queries`
- optional suffix: the exact field, endpoint, or constraint you need

Example:

- base query: `adcreative reference object_story_spec CTA body headline link page instagram_actor_id`
- refined query: `adcreative reference object_story_spec CTA body headline link page instagram_actor_id image_hash page_id requirements`

## Routing Rules

- Live account diagnosis: use Meta tools first, then these docs if a metric or platform behavior needs an official definition.
- Burn or daily spend reads: use Meta tools only and skip docs lookup.
- Creative quality review: use the creative itself first, then ad creative reference or previews docs if a field or placement constraint matters.
- Audience questions: use audiences docs before giving targeting rules.
- Tracking questions: use Pixel docs for browser events and Conversions API docs for server events.
- Catalog or product feed questions: use catalog and Advantage shopping docs before giving dynamic ad guidance.
