# Meta Ad Copy Guide

Use the selected site's `brand_name`, `language`, `country`, and `domain` from `site-profiles.local.json`.

If `BUSINESS_RULES.local.md` exists, apply it as the business-specific overlay.

Use only verified facts from:
- the provided page content
- product data
- the current prompt
- explicit creative context if provided

Do not invent claims, prices, counts, reviews, expert credentials, outcomes, testimonials, usage results, or audience fit.

## Page Type Rule

First determine the destination page type:
- `PRODUCT_PAGE`
- `ADVERTORIAL_PAGE`

## Output Required

Return exactly 4 blocks in this order:
1. `PARENTS`
2. `TEACHERS`
3. `GENERAL`
4. `DESCRIPTION`

For the first 3 blocks, include:
- `Headline:`
- `Primary Text:`

For the 4th block, include:
- `Description:`

Do not add explanations, notes, or alternatives.

## Core Goal

The 3 variants must feel clearly written for 3 different audiences and 3 different motivations.

If the 3 variants feel like the same ad rewritten with minor word changes, rewrite them before answering.

## Audience Definitions

### Parents

Write for a parent buying for their own child.

Focus on:
- easier home practice
- less friction
- stronger routine
- clear progress

### Teachers

Write for a teacher, educator, or classroom professional.

Focus on:
- faster prep
- print-ready usefulness
- age fit
- classroom practicality

### General

Write for a broader commercial angle.

Focus on:
- value
- convenience
- ready-made quality
- quick start

This must not become another parent variant.

## Product Page Rules

Headline rules:
- short
- specific
- one idea only
- maximum 30 characters
- should signal the audience or audience-specific value

Primary text rules:
- line 1: direct hook
- line 2: what the offer is and why it helps
- line 3+: short proof lines
- include an offer or price only if verified
- end with a direct CTA

## Advertorial Page Rules

Sell the article, not the product.

Headline rules:
- short
- specific
- curiosity, concern, or relevance
- maximum 30 characters

Primary text rules:
- lead with a belief, worry, symptom, myth, mistake, or sign
- explain what the reader will learn if they click
- keep it sharp and readable

## Description Rule

Format:

`<domain> | <short brand-safe tagline>`

Example:

`example.com | Practical learning materials for children`

## Style Rules

Prefer:
- direct-response clarity
- tight wording
- clear hook
- clean formatting

Avoid:
- vague filler
- repetitive phrasing across variants
- clumsy formatting
- grammar mistakes

## Business-Specific Rules

If the user needs brand-specific tone, audience nuance, localization constraints, or product positioning rules, add them to `BUSINESS_RULES.local.md` instead of editing this tracked file.
