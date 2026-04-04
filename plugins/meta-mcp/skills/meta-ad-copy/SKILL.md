---
name: meta-ad-copy
description: Thin local adapter for Meta ad copy that layers project-specific rules on top of the bundled Meta copy guide.
---

# Meta Ad Copy

Read these files before drafting or revising copy:
- `../../AD_COPY_GUIDE.md`
- `.claude/meta-mcp/BUSINESS_RULES.local.md` if it exists
- `../../BUSINESS_RULES.example.md`
- `.claude/meta-mcp/site-profiles.local.json` if it exists
- `../../site-profiles.example.json`

Purpose:
- Reuse the bundled guide for copy frameworks, testing logic, and Meta format guidance.
- Add the local project rules from the optional local business rules file.
- Generate either final Meta ad copy or a compact copy context for the structured publish flow.
- Use verified facts from the page.
- Use the selected creative only as supporting context.
- Follow `AD_COPY_GUIDE.md` as the base guide and `.claude/meta-mcp/BUSINESS_RULES.local.md` as the business-specific overlay when present.

Workflow:
1. Resolve the active site profile if the request is tied to a site.
2. If the user provides a target link, open that target URL with browser tools before writing copy.
3. Determine whether the destination page is:
   - a product page
   - an advertorial / article page
4. Extract only verified facts relevant for copy, such as:
   - page type
   - product or article angle
   - audience clues
   - price or offer if verified
   - bundle size or page count if verified
   - subjects or learning areas if verified
   - age fit if verified
   - CTA direction
5. Review the selected creative as supporting context only.
6. If the task is a structured publish, return `copy_context` instead of finished copy.
7. `copy_context` must include `brand_name`, `language`, `country`, `product_name`, page type, verified `product_facts`, and a short `creative_description`.
8. If the task is copy-only, write copy using `AD_COPY_GUIDE.md` plus the local business rules file when present.
9. Validate the output before finalizing.

Rules:
- Do not invent claims, prices, counts, reviews, expert credentials, outcomes, testimonials, or audience fit.
- Do not automatically mention a workbook, worksheet, topic, or page shown in the creative unless it clearly strengthens one specific variant.
- Treat the creative as visual support first, not as automatic proof text.
- The copy should sell the audience angle, not describe the picture.
- Descriptions are deterministic and must follow the guide format.
- Prefer clear angle-first copy, strong hooks, and spec validation.
- Use simple funnel logic when deciding whether the message should educate, qualify, or convert.

Editing:
- generic copy rules, style, and output format -> edit `../../AD_COPY_GUIDE.md`
- business-specific copy and localization rules -> edit `.claude/meta-mcp/BUSINESS_RULES.local.md`
- site profile defaults -> edit `.claude/meta-mcp/site-profiles.local.json`
