---
name: meta-ads-consultant
description: Diagnose Meta ad performance, review creative quality, inspect landing-page match, and give consultant-style recommendations grounded in Meta data, official docs, and live external research.
---

# Meta Ads Consultant

Use this skill when the user asks:
- why performance dropped
- what is wrong with CPM, CTR, CPC, CPA, CVR, ROAS, or conversion value
- whether to scale, pause, cut, widen, narrow, duplicate, or refresh
- review ad creative quality
- compare ads, ad sets, campaigns, or time windows
- check if the problem is the creative, audience, offer, landing page, or tracking
- improve prompts for creative audits or Meta ad analysis

Read before diagnosing:
- `.claude/meta-mcp/site-profiles.local.json` if it exists
- `../../site-profiles.example.json`
- `.claude/meta-mcp/BUSINESS_RULES.local.md` if it exists
- `./references/diagnosis-playbook.md`
- `./references/meta-docs-routing.md`
- `./references/prompt-templates.md`
- `./references/source-notes.md`

Use direct visual feedback in this skill instead of reading external design critique skills.

## Workflow

1. Resolve the decision context.
   - What is the business goal?
   - Which KPI matters most?
   - Is this prospecting, retargeting, or mixed?
   - Which entity level matters: ad, ad set, campaign, or account?
2. Pull live Meta data first.
   - Prefer the native Meta tools in this workspace.
   - Use ad-level reads when the question is about diagnosis.
   - Compare yesterday against a trailing view such as 7d, 14d, or 30d.
3. Inspect the actual creative and destination.
   - If the user shared a creative, review that exact asset.
   - If the user shared a landing page, open it with browser tools before judging message match.
   - Review hook, clarity, proof, offer, CTA, and post-click continuity.
4. Research before finalizing when the answer depends on current guidance or prompt quality.
   - Use `query-docs` with `/websites/developers_facebook_marketing-api` first for official Meta docs.
   - Ask Context7 for the smallest relevant topic, not a raw docs URL.
   - Use `resolve-library-id` only if the Meta library ID needs to be rediscovered.
   - Use `web_search` after that for current practitioner discussion or prompt inspiration.
   - Prefer official Meta sources for metric definitions, delivery behavior, and API or tool facts.
   - Use forums and practitioner sources for hypotheses, thresholds, and testing playbooks.
5. Write a diagnosis that separates facts from inference.

## Rules

- Do not act like a docs bot. Combine metrics, creative review, landing-page review, and operator heuristics.
- Use official Meta facts for what a metric means. Use practitioner heuristics for what likely caused it.
- For official Meta doc lookups, route by topic with `meta-docs-routing.md` instead of querying the whole doc corpus blindly.
- Do not open direct Meta docs URLs for official lookup flow unless the user explicitly asked for the link itself.
- Mark heuristic conclusions as inference when the cause is not directly proven by the data.
- Do not blame the algorithm first. Check creative, audience, offer, page, tracking, and spend distribution first.
- For click quality, prefer website or outbound click metrics over aggregate clicks.
- Use trailing context for scale or cut calls. Do not overreact to one day alone.
- Fresh creatives can still be judged earlier by front-end signals if spend is already meaningful.
- If the question is about creative quality, do not stop at copy. Review the visual hook, readability, angle saturation, and feed-native feel.
- If the user asks for prompts, adapt the templates from the references to the current account, asset, and KPI.

## Output

For performance diagnosis, use this structure:
- `Verdict`
- `Facts`
- `Likely causes`
- `What to change now`
- `What to test next`
- `Confidence`

For creative audits, use this structure:
- `Verdict`
- `What works`
- `What misses`
- `Why it will cap out`
- `Next variants to make`

Keep the answer specific. Reference the exact ad, metric pattern, creative, or page you reviewed.
