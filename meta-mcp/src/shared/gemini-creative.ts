import os from "os";
import path from "path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import { parse } from "yaml";
import {
  NANO_BANANA_PLAYBOOK,
  STATIC_BANNER_HEURISTICS,
  TEMPLATE_LIBRARY,
} from "./gemini-prompt-knowledge.js";
import type {
  CreateCreativeGenerationBatchParams,
  RestartGenerationBatchParams,
} from "../types/mcp-tools.js";

const RUNTIME_DIR = path.join(os.homedir(), ".meta-marketing-plugin");
const BATCH_STORE_PATH = path.join(
  RUNTIME_DIR,
  "gemini-creative-batches.local.json"
);
const ASSET_ROOT = path.join(RUNTIME_DIR, "generated-creatives");
const GEMINI_MODEL = process.env.GEMINI_IMAGE_MODEL || "imagen-4.0-generate-001";

type CandidateMode = "full" | "visual_only";
type BatchState =
  | "generation_submitted"
  | "generation_in_progress"
  | "review_ready"
  | "awaiting_approval"
  | "approved_candidate_selected"
  | "final_asset_ready";

interface CandidateRecord {
  candidate_id: string;
  mode: CandidateMode;
  status: "pending" | "ready" | "failed" | "approved";
  image_path?: string;
  error?: string;
  base_prompt: string;
  final_prompt: string;
  prompt_edits: string[];
  parent_candidate_id?: string;
}

interface BatchRecord {
  batch_id: string;
  state: BatchState;
  generation_mode: "interactive" | "deferred_batch";
  created_at: string;
  updated_at: string;
  request: CreateCreativeGenerationBatchParams;
  brand_dna_context: string[];
  candidates: CandidateRecord[];
  approved_candidate_id?: string;
  approval_timestamp?: string;
  final_overlay_image_path?: string;
}

interface BatchStore {
  batches: Record<string, BatchRecord>;
}

const DEFAULT_STORE: BatchStore = { batches: {} };

function nowIso() {
  return new Date().toISOString();
}

async function readStore(): Promise<BatchStore> {
  try {
    const raw = await readFile(BATCH_STORE_PATH, "utf8");
    return JSON.parse(raw) as BatchStore;
  } catch {
    return DEFAULT_STORE;
  }
}

async function writeStore(store: BatchStore) {
  await mkdir(RUNTIME_DIR, { recursive: true });
  await writeFile(BATCH_STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      JSON.stringify({
        code: "gemini_unavailable",
        message:
          "Gemini API key is missing. Set GEMINI_API_KEY to continue generation.",
      })
    );
  }
  return new GoogleGenAI({ apiKey });
}

function normalizeGeminiError(error: unknown): Error {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("quota") || message.includes("resource_exhausted")) {
      return new Error(
        JSON.stringify({
          code: "gemini_quota_exceeded",
          message: error.message,
        })
      );
    }
    if (
      message.includes("api key") ||
      message.includes("unauthorized") ||
      message.includes("permission")
    ) {
      return new Error(
        JSON.stringify({
          code: "gemini_auth_failed",
          message: error.message,
        })
      );
    }
    return new Error(
      JSON.stringify({
        code: "gemini_unavailable",
        message: error.message,
      })
    );
  }
  return new Error(
    JSON.stringify({
      code: "gemini_unavailable",
      message: "Unknown Gemini error",
    })
  );
}

function buildBasePrompt(
  request: CreateCreativeGenerationBatchParams,
  mode: CandidateMode,
  brandDnaContext: string[]
) {
  const overlayInstructions =
    request.overlay_text && request.overlay_text.length > 0
      ? request.overlay_text.map((line) => `- ${line}`).join("\n")
      : "- Keep overlay concise and legible";

  const modeBlock =
    mode === "full"
      ? [
          "MODE: full creative with text overlay",
          "TEXT RULES:",
          "- Keep text short and punchy",
          "- Max 8 words per line",
          "- Keep strong contrast and clear hierarchy",
          overlayInstructions,
        ].join("\n")
      : [
          "MODE: visual only (strict no text)",
          "NO_TEXT RULES:",
          "- No words, letters, logos, glyph-like marks, or pseudo typography",
          "- Keep clean negative space for external text overlay",
        ].join("\n");

  const normalizedTemplateId = (request.template_id || "").trim().toLowerCase();
  const template =
    TEMPLATE_LIBRARY[normalizedTemplateId] || TEMPLATE_LIBRARY.offer_promotion;

  return [
    `CONCEPT: ${request.concept}`,
    request.creative_description
      ? `CREATIVE_DESCRIPTION: ${request.creative_description}`
      : "",
    request.template_id ? `TEMPLATE_ID: ${request.template_id}` : "",
    `ASPECT_RATIO: ${request.aspect_ratio}`,
    `LANGUAGE_CONTEXT: ${request.language}`,
    `COUNTRY_CONTEXT: ${request.country}`,
    "BRAND_DNA:",
    ...brandDnaContext.map((line) => `- ${line}`),
    `TEMPLATE: ${template.title}`,
    "TEMPLATE_RULES:",
    ...template.instructions.map((rule) => `- ${rule}`),
    "NANO_BANANA_PLAYBOOK:",
    ...NANO_BANANA_PLAYBOOK.workflow.map((rule) => `- ${rule}`),
    "PROMPT_STRUCTURE:",
    ...NANO_BANANA_PLAYBOOK.promptStructure.map((rule) => `- ${rule}`),
    "STATIC_BANNER_SCROLL_STOP:",
    ...STATIC_BANNER_HEURISTICS.scrollStop.map((rule) => `- ${rule}`),
    "STATIC_BANNER_RULES:",
    ...STATIC_BANNER_HEURISTICS.mandatoryRules.map((rule) => `- ${rule}`),
    "COMPOSITION:",
    "- Define clear primary subject focus",
    "- Add secondary elements only if they support the main message",
    "- Reserve negative space for conversion-oriented overlays",
    "CAMERA_AND_LIGHTING:",
    "- Use deliberate camera angle and focal depth",
    "- Set cinematic but realistic lighting",
    "QUALITY:",
    "- High detail, clean edges, no artifact clutter",
    "- Avoid distorted anatomy and malformed objects",
    "NEGATIVE_CONSTRAINTS:",
    "- No gibberish text",
    "- No watermark-like marks",
    "- No random brand symbols",
    modeBlock,
  ]
    .filter(Boolean)
    .join("\n");
}

function flattenBrandDna(source: string, payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return [] as string[];
  }
  const objectPayload = payload as Record<string, unknown>;
  return Object.entries(objectPayload)
    .slice(0, 12)
    .map(([key, value]) => {
      if (typeof value === "string" || typeof value === "number") {
        return `${source}.${key}: ${String(value)}`;
      }
      if (Array.isArray(value)) {
        const preview = value
          .slice(0, 4)
          .map((item) => String(item))
          .join(", ");
        return `${source}.${key}: ${preview}`;
      }
      return `${source}.${key}: [structured]`;
    });
}

async function loadBrandDnaContext() {
  const root = path.join(os.homedir(), ".meta-marketing-plugin");
  const files = [
    { source: "copy", file: path.join(root, "brand_dna_copy.yaml") },
    { source: "visual", file: path.join(root, "brand_dna_visual.yaml") },
  ];

  const context: string[] = [];
  for (const item of files) {
    try {
      const raw = await readFile(item.file, "utf8");
      const payload = parse(raw);
      context.push(...flattenBrandDna(item.source, payload));
    } catch {
      // Local runtime files are optional at generation schema level.
    }
  }
  return context;
}

async function ensureAssetDir(batchId: string) {
  const dir = path.join(ASSET_ROOT, batchId);
  await mkdir(dir, { recursive: true });
  return dir;
}

async function generateLane(
  batch: BatchRecord,
  mode: CandidateMode,
  count: number
): Promise<CandidateRecord[]> {
  if (count <= 0) {
    return [];
  }

  const promptOverride =
    mode === "full" ? batch.request.full_prompt : batch.request.visual_only_prompt;
  const prompt =
    promptOverride?.trim() ||
    buildBasePrompt(batch.request, mode, batch.brand_dna_context);
  const ai = getGeminiClient();
  const response = await ai.models.generateImages({
    model: GEMINI_MODEL,
    prompt,
    config: {
      numberOfImages: count,
      aspectRatio: batch.request.aspect_ratio,
    },
  });

  const generated = response.generatedImages || [];
  const assetDir = await ensureAssetDir(batch.batch_id);

  return Promise.all(
    generated.map(async (item, index) => {
      const candidateId = `${mode === "full" ? "full" : "visual"}_c${String(
        index + 1
      ).padStart(2, "0")}`;
      const imagePath = path.join(assetDir, `${candidateId}.png`);
      const imageBytes = item.image?.imageBytes;

      if (!imageBytes) {
        return {
          candidate_id: candidateId,
          mode,
          status: "failed" as const,
          error: "Gemini did not return image bytes",
          base_prompt: prompt,
          final_prompt: prompt,
          prompt_edits: [],
        };
      }

      await writeFile(imagePath, Buffer.from(imageBytes, "base64"));
      return {
        candidate_id: candidateId,
        mode,
        status: "ready" as const,
        image_path: imagePath,
        base_prompt: prompt,
        final_prompt: prompt,
        prompt_edits: [],
      };
    })
  );
}

async function runBatchGeneration(batch: BatchRecord) {
  batch.state = "generation_in_progress";
  batch.updated_at = nowIso();

  let fullCandidates: CandidateRecord[] = [];
  let visualCandidates: CandidateRecord[] = [];
  try {
    [fullCandidates, visualCandidates] = await Promise.all([
      generateLane(batch, "full", batch.request.full_count ?? 0),
      generateLane(batch, "visual_only", batch.request.visual_only_count ?? 0),
    ]);
  } catch (error) {
    throw normalizeGeminiError(error);
  }

  batch.candidates = [...fullCandidates, ...visualCandidates];
  batch.state = "awaiting_approval";
  batch.updated_at = nowIso();
}

async function requireBatch(batchId: string) {
  const store = await readStore();
  const batch = store.batches[batchId];
  if (!batch) {
    throw new Error(`Unknown batch_id: ${batchId}`);
  }
  return { store, batch };
}

function reviewPayload(batch: BatchRecord) {
  return {
    batch_id: batch.batch_id,
    state: batch.state,
    generation_mode: batch.generation_mode,
    approved_candidate_id: batch.approved_candidate_id,
    approval_timestamp: batch.approval_timestamp,
    final_overlay_image_path: batch.final_overlay_image_path,
    candidates: batch.candidates.map((candidate) => ({
      candidate_id: candidate.candidate_id,
      mode: candidate.mode,
      status: candidate.status,
      image_path: candidate.image_path,
      error: candidate.error,
      exact_prompt: candidate.final_prompt,
      base_prompt: candidate.base_prompt,
      prompt_edits: candidate.prompt_edits,
      parent_candidate_id: candidate.parent_candidate_id,
    })),
  };
}

export async function createCreativeGenerationBatch(
  params: CreateCreativeGenerationBatchParams
) {
  const fullCount = params.full_count ?? 1;
  const visualOnlyCount = params.visual_only_count ?? 0;

  if (fullCount + visualOnlyCount <= 0) {
    throw new Error("full_count + visual_only_count must be greater than 0");
  }

  const brandDnaContext = await loadBrandDnaContext();
  const batchId = `batch_${randomUUID()}`;
  const record: BatchRecord = {
    batch_id: batchId,
    state: "generation_submitted",
    generation_mode: params.generation_mode ?? "interactive",
    created_at: nowIso(),
    updated_at: nowIso(),
    request: {
      ...params,
      full_count: fullCount,
      visual_only_count: visualOnlyCount,
    },
    brand_dna_context: brandDnaContext,
    candidates: [],
  };

  if (record.generation_mode === "interactive") {
    try {
      await runBatchGeneration(record);
    } catch (error) {
      throw normalizeGeminiError(error);
    }
  }

  const store = await readStore();
  store.batches[batchId] = record;
  await writeStore(store);

  return reviewPayload(record);
}

export async function getCreativeGenerationBatchStatus(batchId: string) {
  const { store, batch } = await requireBatch(batchId);

  if (batch.generation_mode === "deferred_batch" && batch.candidates.length === 0) {
    try {
      await runBatchGeneration(batch);
    } catch (error) {
      throw normalizeGeminiError(error);
    }
    store.batches[batchId] = batch;
    await writeStore(store);
  }

  return reviewPayload(batch);
}

export async function reviewCreativeBatch(batchId: string) {
  return getCreativeGenerationBatchStatus(batchId);
}

export async function approveCreativeCandidate(
  batchId: string,
  candidateId: string
) {
  const { store, batch } = await requireBatch(batchId);
  const candidate = batch.candidates.find((item) => item.candidate_id === candidateId);

  if (!candidate) {
    throw new Error(`Unknown candidate_id: ${candidateId}`);
  }

  candidate.status = "approved";
  batch.approved_candidate_id = candidateId;
  batch.approval_timestamp = nowIso();
  batch.state = "approved_candidate_selected";
  batch.updated_at = nowIso();
  store.batches[batchId] = batch;
  await writeStore(store);

  return {
    batch_id: batchId,
    approved_candidate_id: candidateId,
    mode: candidate.mode,
    image_path: candidate.image_path,
    state: batch.state,
    approval_timestamp: batch.approval_timestamp,
  };
}

export async function provideFinalOverlayAsset(
  batchId: string,
  candidateId: string,
  finalImagePath: string
) {
  const { store, batch } = await requireBatch(batchId);
  if (batch.approved_candidate_id !== candidateId) {
    throw new Error("Candidate must be approved before final overlay handoff");
  }

  batch.final_overlay_image_path = finalImagePath;
  batch.state = "final_asset_ready";
  batch.updated_at = nowIso();
  store.batches[batchId] = batch;
  await writeStore(store);

  return {
    batch_id: batchId,
    candidate_id: candidateId,
    final_image_path: finalImagePath,
    state: batch.state,
  };
}

export async function editCandidatePrompt(
  batchId: string,
  candidateId: string,
  promptDelta: string
) {
  const { store, batch } = await requireBatch(batchId);
  const candidate = batch.candidates.find((item) => item.candidate_id === candidateId);
  if (!candidate) {
    throw new Error(`Unknown candidate_id: ${candidateId}`);
  }

  const ai = getGeminiClient();
  const mergedPrompt = `${candidate.final_prompt}\nPROMPT_DELTA:\n${promptDelta}`;
  let response;
  try {
    response = await ai.models.generateImages({
      model: GEMINI_MODEL,
      prompt: mergedPrompt,
      config: {
        numberOfImages: 1,
        aspectRatio: batch.request.aspect_ratio,
      },
    });
  } catch (error) {
    throw normalizeGeminiError(error);
  }
  const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
  if (!imageBytes) {
    throw new Error("Gemini did not return image bytes for prompt edit rerun");
  }

  const assetDir = await ensureAssetDir(batch.batch_id);
  const nextIndex = batch.candidates.length + 1;
  const childId = `${candidate.mode === "full" ? "full" : "visual"}_c${String(
    nextIndex
  ).padStart(2, "0")}`;
  const imagePath = path.join(assetDir, `${childId}.png`);
  await writeFile(imagePath, Buffer.from(imageBytes, "base64"));

  const child: CandidateRecord = {
    candidate_id: childId,
    mode: candidate.mode,
    status: "ready",
    image_path: imagePath,
    base_prompt: candidate.base_prompt,
    final_prompt: mergedPrompt,
    prompt_edits: [...candidate.prompt_edits, promptDelta],
    parent_candidate_id: candidate.candidate_id,
  };

  batch.candidates.push(child);
  batch.state = "awaiting_approval";
  batch.updated_at = nowIso();
  store.batches[batchId] = batch;
  await writeStore(store);

  return {
    batch_id: batchId,
    parent_candidate_id: candidateId,
    candidate: {
      candidate_id: child.candidate_id,
      mode: child.mode,
      image_path: child.image_path,
      exact_prompt: child.final_prompt,
      prompt_edits: child.prompt_edits,
    },
    state: batch.state,
  };
}

export async function restartGenerationBatch(
  params: RestartGenerationBatchParams
) {
  const { batch } = await requireBatch(params.batch_id);
  const request: CreateCreativeGenerationBatchParams = {
    ...batch.request,
    concept: params.concept || batch.request.concept,
    template_id: params.template_id || batch.request.template_id,
    full_count: params.full_count ?? batch.request.full_count,
    visual_only_count: params.visual_only_count ?? batch.request.visual_only_count,
    generation_mode: params.generation_mode || batch.request.generation_mode,
  };

  return createCreativeGenerationBatch(request);
}

export async function resolveApprovedCandidateAsset(params: {
  batchId: string;
  approvedCandidateId: string;
}) {
  const { batch } = await requireBatch(params.batchId);
  if (batch.approved_candidate_id !== params.approvedCandidateId) {
    throw new Error("Provided candidate is not approved for this batch");
  }
  const candidate = batch.candidates.find(
    (item) => item.candidate_id === params.approvedCandidateId
  );
  if (!candidate) {
    throw new Error("Approved candidate record not found");
  }
  return {
    mode: candidate.mode,
    image_path: candidate.image_path,
    final_overlay_image_path: batch.final_overlay_image_path,
  };
}
