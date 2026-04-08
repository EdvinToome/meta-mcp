export const NANO_BANANA_PLAYBOOK = {
  workflow: [
    "Use brand DNA as a hard constraint for colors, typography feel, mood, and offer framing.",
    "Build prompts as standalone generation instructions with no missing variables.",
    "Prefer conversion-safe clarity over abstract art direction.",
    "For full mode, keep overlay copy short and high-contrast.",
    "For visual-only mode, reserve clear negative space for external text composition.",
  ],
  promptStructure: [
    "Brand identity modifier",
    "Template-specific composition",
    "Offer/message hierarchy",
    "Product realism and packaging fidelity",
    "Conversion and readability constraints",
    "Artifact suppression constraints",
  ],
};

export const STATIC_BANNER_HEURISTICS = {
  scrollStop: [
    "high visual contrast",
    "pattern disruption element",
    "extreme emotion or expression",
    "visual tension or incompleteness",
    "unusual color or lighting treatment",
  ],
  mandatoryRules: [
    "Use at least one scroll-stop mechanism.",
    "Keep one dominant visual claim per image.",
    "Reserve one overlay-safe zone for headline/CTA.",
    "Avoid clutter that harms mobile feed legibility.",
  ],
};

export const TEMPLATE_LIBRARY: Record<
  string,
  { title: string; instructions: string[] }
> = {
  headline: {
    title: "Headline",
    instructions: [
      "Top third large headline under 10 words.",
      "Subhead one sentence max.",
      "Product hero in lower half with crisp packaging fidelity.",
    ],
  },
  offer_promotion: {
    title: "Offer/Promotion",
    instructions: [
      "Split background with brand-primary and contrast block.",
      "Offer text dominates top 60%.",
      "Details and value-adds stay compact and clear.",
    ],
  },
  testimonials: {
    title: "Testimonials",
    instructions: [
      "Real environment and natural lighting.",
      "Quote card with 2-3 sentence review and attribution.",
      "Five-star marker must read instantly in feed.",
    ],
  },
  features_benefits: {
    title: "Features/Benefits Point-Out",
    instructions: [
      "Educational diagram layout on clean background.",
      "Product centered with clear callout connectors.",
      "Four concise benefit nodes only.",
    ],
  },
  social_proof: {
    title: "Social Proof",
    instructions: [
      "Trust stack: member count, stars, review card, featured-in line.",
      "Product remains central anchor.",
      "Avoid over-dense text blocks.",
    ],
  },
  us_vs_them: {
    title: "Us vs Them",
    instructions: [
      "Vertical split comparison with immediate left-right contrast.",
      "Right side (brand) visually cleaner and stronger.",
      "Use compact check/X lists with strong scanability.",
    ],
  },
  before_after_ugc: {
    title: "Before & After (UGC Native)",
    instructions: [
      "Keep UGC-native realism (phone camera, imperfect framing).",
      "Consistent person and setting across before/after panels.",
      "Timeframe cue should be explicit but short.",
    ],
  },
  press_editorial: {
    title: "Press/Editorial",
    instructions: [
      "Authority aesthetic with generous whitespace.",
      "Quote and attribution drive trust.",
      "Product appears lower third with elegant lighting.",
    ],
  },
  curiosity_gap: {
    title: "Curiosity Gap / Hook",
    instructions: [
      "Lead with provocative but clear hook statement.",
      "Intentionally open loop to drive curiosity.",
      "Avoid product clutter around hook area.",
    ],
  },
  ugly_postit: {
    title: "Native / Ugly Post-It Note Style",
    instructions: [
      "Deliberately imperfect framing and marker-style post-it copy.",
      "Real-world texture and slight camera grain.",
      "Product identity remains precise and recognizable.",
    ],
  },
};
