# Diagnosis Playbook

Use this file for fast Meta ads diagnosis.

## Official Facts To Anchor On

- Meta insights can return `spend`, `impressions`, `ctr`, `cpc`, `frequency`, `purchase_roas`, website click metrics, and conversion-value metrics through the insights endpoint.
- Website metrics are more useful than aggregate clicks for traffic quality checks.
- Creative previews exist, so creative and placement fit should be treated as inspectable, not abstract.

## Metric Patterns

### High CPM + low CTR

Likely causes:
- weak hook or stale creative
- audience and message mismatch
- narrow or expensive audience
- placement mix that does not suit the asset

Check next:
- frequency trend
- quality or engagement rankings if available
- first impression of the creative in-feed

Default action:
- refresh the angle or hook first
- then review audience breadth and placements

### High CTR + weak LPV or weak outbound click quality

Likely causes:
- accidental or low-intent clicks
- misleading creative or CTA
- slow or broken landing page
- poor mobile experience

Default action:
- inspect the landing page on mobile
- tighten message match
- remove curiosity clicks that do not qualify intent

### Good CTR + low CVR or ROAS

Likely causes:
- offer or landing-page problem
- mismatch between ad promise and page reality
- wrong audience intent
- tracking gaps or wrong optimization event

Default action:
- inspect page speed, clarity, and checkout path
- verify optimization event
- compare page promise against ad promise line by line

### Low CTR + decent CVR

Likely causes:
- offer works for the few right people who click
- creative is not opening enough qualified demand

Default action:
- keep the offer
- test stronger hooks, new angles, and faster visual communication

### Frequency rising + CTR falling + CPC rising

Likely causes:
- creative fatigue
- audience saturation, especially in retargeting

Default action:
- rotate in new angles
- expand audience or reduce retargeting pressure
- do not keep raising budget into the same stale asset

### Engagement ranking high + conversion ranking low

Likely causes:
- ad is interesting but not qualified
- entertaining creative pulling the wrong click
- page or offer cannot cash the attention

Default action:
- make the ad more specific
- pre-qualify harder in the hook or headline
- tighten page match

### Conversion ranking good + CTR low

Likely causes:
- offer is strong once the right people click
- creative is too soft or too generic

Default action:
- keep the core promise
- expand hook volume without changing the offer

### ROAS unstable on low spend

Likely causes:
- sample too small
- one purchase swings the result

Default action:
- avoid strong scale or kill calls from tiny samples
- use leading indicators and longer windows

## Learning Phase

Use this as guidance, not dogma:
- 50 optimization events is a useful benchmark
- enough spend and event volume can reveal signal before the learning phase formally ends
- good creatives often show useful front-end signal early

Do not use "still learning" as the only explanation for weak performance.

## Creative Review Lens

Review every creative on:
- scroll-stop strength
- clarity in under 2 seconds
- proof and specificity
- audience fit
- feed-native feel
- CTA clarity
- landing-page match

If the ad is visually clean but says almost nothing specific, treat that as weak creative.
If the ad is attention-grabbing but attracts the wrong click, treat that as a qualification problem.
