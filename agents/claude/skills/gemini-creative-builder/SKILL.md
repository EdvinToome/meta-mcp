---
name: gemini-creative-builder
description: Orchestrate prompt planning and Gemini image generation for ad creatives.
---

Use this when no final image exists and you need prompt planning + generation.

Structure (progressive disclosure):
- `SKILL.md` for workflow rules
- `gemini-prompt-builder` subagent for prompt planning

Runtime rules:
- Use Gemini MCP tools only for image generation flow.
- No fallback provider.
- Stop on `gemini_unavailable`, `gemini_auth_failed`, `gemini_quota_exceeded`.
- Gemini generation tools are:
  - `health_check`
  - `create_image`
- `create_image.generation_mode` must be `default` or `async`. Async mode delays generation and returns result in 2-15 min.
- `create_image.resolution` must be `1K`, `2K`, or `4K`.

Default behavior:
- Use three-phase flow:
  1) template selection
  2) prompt planning
  3) generation execution
  
Inputs:
1. Landing page URL                                                                                           
2. Offer being promoted                                                                                                               
3. Audience and country/language                                                                                                      
4. Campaign objective such as leads, purchases, traffic, awareness                                                                    
5. Awareness stage such as cold, warm, retargeting                                                                                    
6. Optional primary angle you want to test                                                                                                     
7. Optional CTA text                                                                                                                           
8. Optional proof type such as review, stat, authority, product demo, before/after                                                             
9. Optional reference images if any: product screenshots, brand assets, prior creatives, photos                                                                                            
10. Aspect ratio: for example 1:1, 4:5, 9:16, or 1.91:1   

Execution sequence:
1. Read:
   - `~/.meta-marketing-plugin/brand_dna_copy.yaml`
   - `~/.meta-marketing-plugin/brand_dna_visual.yaml`
   - `agents/claude/skills/gemini-prompt-builder/assets/template-library/index.yaml`
2. Call `extract_target_page_facts` for `target_url`.
3. Select TOP 3 templates based on initial user input. Stop and ask user to select the template.
4. Spawn the `gemini-prompt-builder` subagent to create gemini prompts. Do not replace this with local planning.
5. Return the subagent plan:
   - `creative_brief`
   - `base_prompt_full`
   - `base_prompt_visual_only`
   - `variants[]` with `hook`, `proof_style`, `layout_tension`, `full_prompt`, `visual_only_prompt` `reference_images_to_use`, and `recommended_attempts`
6. Show user brief version of each variant and ask 
   - which variants to execute
   - attempts per variant
   - use recommended reference images or override 
   - visual_only and full prompt attempts
   - resolution
   - aspect ratio
   - generation mode
7. Run `health_check` once before the first generation call.
8. For each selected variant, call `create_image` per prompt type needed:
   - Full mode call:
     - `prompt = variant.full_prompt`
   - Visual-only mode call:
     - `prompt = variant.visual_only_prompt`
   - Shared params for every call:
     - `count` from attempts (or explicit user override)
     - `aspect_ratio` from user choice (default `1:1`)
     - `attachments` from required reference images when needed; otherwise `[]`
     - `generation_mode` default `default` (use `async` only if user asks)
     - `resolution` default `1K` (use `2K`/`4K` when requested)
9. Return generated images folder path, the images themselves and variant used for their generation.
