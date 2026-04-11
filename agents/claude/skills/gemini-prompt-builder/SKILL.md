---
name: gemini-prompt-builder
description: Build deterministic Gemini image prompts and variant matrices before generation.
---

Use this when you want prompt planning first and image generation second.

Purpose:
- Build precise generation prompts from facts, brand DNA, prompt rules and template prompts.
- Produce variant matrix options for human selection.
- Do not generate images in this skill.

Inputs:
- `target_url`
- creative intent
- `template_id`
- country/language
- campaign objective such as leads, purchases or traffic
- awareness stage
- optional matrix size constraints
- reference images

Required workflow:
1. Call `extract_target_page_facts` for `target_url`.
2. Read:
   - `~/.meta-marketing-plugin/brand_dna_copy.yaml`
   - `~/.meta-marketing-plugin/brand_dna_visual.yaml`
   - `agents/claude/skills/gemini-prompt-builder/assets/template-library/index.yaml`
   - chosen template file from `agents/claude/skills/gemini-prompt-builder/assets/template-library/prompts/`
3. Call `extract_target_page_facts` for the target URL to get info about the product.
4. Build `creative_brief` object for generation schema.
5. Build:
   - `base_prompt_full`
   - `base_prompt_visual_only`
6. Create fully combined ready-to-send prompts for every variant and mode:
   - `variant.full_prompt`
   - `variant.visual_only_prompt`
7. Create a variant matrix by varying only:
   - hook
   - proof style
   - layout tension
8. Select reference images for each variation. Reference images usually include the product/influencer/founder or other brand assets. The images should be selected according to prompt context.
9. Return plan for manual selection before generation.

Output format (JSON):
```json
{
  "template_id": "template_15",
  "creative_brief": {
    "objective": "...",
    "audience": "...",
    "awareness_stage": "...",
    "angle": "...",
    "offer": "...",
    "proof_type": "...",
    "cta": "...",
    "landing_page": "https://..."
  },
  "base_prompt_full": "...",
  "base_prompt_visual_only": "...",
  "variants": [
    {
      "variant_id": "v1",
      "hook": "...",
      "proof_style": "...",
      "layout_tension": "...",
      "full_prompt": "Complete full-mode prompt ready to send directly to Gemini.",
      "visual_only_prompt": "Complete visual-only prompt ready to send directly to Gemini.",
      "reference_images_to_use": ["list of reference images to send to Gemini"]
      "recommended_attempts": 1
    }
  ],
  "notes_for_generation": "..."
}
```

Notes:
- Keep prompts specific about text placement, typography feel, color usage, and product fidelity.
- Keep metadata fields out of prompt body unless visually relevant.
- Do not return prompt deltas as the execution contract. The Gemini MCP receives final prompts only.
- Each variant must be unique. Do not propose minor differences between variants.


# Prompt rules:
## Universal Rule: Break Banner Blindness

**EVERY banner MUST include at least one scroll-stopping mechanism.** Users are in "scrolling coma" — feed autopilot where ads are invisible. The banner must jolt them out of it.

Apply one or more of these techniques to EVERY prompt you generate:

### 1. High Visual Contrast
- Clashing color pairs (neon on black, warm on cold, saturated on desaturated)
- Light subject on dark background or vice versa — avoid mid-tone-on-mid-tone
- Hard graphic edges, bold outlines, or color blocking that breaks the feed's visual rhythm

### 2. Pattern Disruption Element
- Something that "shouldn't be there": an object out of context, surreal scale, impossible physics
- Visual glitch, intentional imperfection, or raw texture that breaks the polished feed aesthetic
- Meme-native formats, handwritten scribbles over clean photos, sticky notes, arrows, circles drawn by hand

### 3. Extreme Emotion or Expression
- Exaggerated facial expression (shock, joy, disgust, disbelief) — faces with strong emotion stop scrolling
- Dynamic body language: mid-action, tension, urgency
- Eye contact with the viewer — direct gaze creates involuntary pause

### 4. Visual Tension or Incompleteness
- Cropped elements that make the brain want to "complete" the image
- Before/after juxtaposition, split frames, or visual contradiction
- Text that starts a thought but doesn't finish it (curiosity gap)

### 5. Unusual Color or Lighting
- Neon glow, duotone, infrared, inverted colors — anything that doesn't look like a stock photo
- Harsh flash (party/paparazzi aesthetic), dramatic rim lighting, colored gels
- Monochrome with a single accent color punch

### Proven Scroll-Stop Concepts (validated, all performed well)

These concept archetypes work and can be remixed for any product:

| Archetype | Example | Why it works |
|-----------|---------|-------------|
| **Neon object in void** | Glowing passport on black | Extreme light-dark contrast |
| **Stamp/mark on face** | Red "APPROVED" stamped on portrait | Confrontational + eye contact |
| **Object on fire** | Burning employment contract | Primal attention trigger |
| **LED/display board** | Airport departure board | Familiar format, bold yellow-on-black |
| **Chalk/handwritten on black** | Provocative text on blackboard | Maximum contrast + raw texture |
| **Flash celebration** | Harsh flash + confetti + screaming joy | Extreme emotion + UGC energy |
| **Split face duotone** | Cold blue vs warm gold halves | Visual tension + before/after |
| **Giant UI element** | Oversized push notification | Recognizable pattern + aspiration trigger |
| **Luxury flat-lay** | Red wax seal on white marble | Bold color accent on neutral |
| **Surreal metaphor** | Person underwater reaching for glowing object | Impossible scene = pattern disruption |
| **VIP exclusivity** | Velvet rope + golden light | Exclusivity trigger |
| **Breaking through** | Fist through glass wall | Action + empowerment |
| **Golden ticket** | Glowing metallic ticket on black | Magical + aspirational |
| **Paparazzi flash** | Red carpet + multi-camera flash | Celebrity energy + chaos |
| **Neon sign in dark** | Neon text on wet dark alley | Cyberpunk mood + reflections |
| **Ripping paper** | Tearing up rejection letter | Visceral defiance |
| **Biometric scan** | Green fingerprint scan approved | Tech aesthetic + green on black |
| **Astronaut/epic scale** | Astronaut reaching for Earth | Surreal + aspirational |
| **Door with light** | Golden light through keyhole/door | Mystery + chiaroscuro |
| **Megaphone/pop-art** | Red megaphone + comic-style burst | Pop-art energy + red on black |

### Anti-Patterns (underperformed — AVOID)

- Clean studio portraits with soft lighting
- Object flat-lays with neutral tones (passport on desk)
- Screenshot mockups (LinkedIn posts, iMessage threads) — too much detail, no visual punch
- Before/after splits with realistic desaturated tones — not enough contrast
- UI dashboard screenshots — too busy, no focal point
- Sticky notes / written lists — too subtle


### Additional Prompt Rules

- Every prompt MUST specify the scroll-stop mechanism explicitly
- Prefer single bold focal element over complex compositions
- Add to the end of final full prompt to not render placeholders, hex codes, QR codes, English fallback labels, or prompt tokens in final text.
- Add to the end of final full prompt to use product cover text exactly as source references; do not invent or alter cover titles.
- Add to the end of final full prompt to not invent product mockups, use only referenced images.
