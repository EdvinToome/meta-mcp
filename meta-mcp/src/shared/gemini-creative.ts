import os from "os";
import path from "path";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { GoogleGenAI } from "@google/genai";
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
const SESSION_FOLDER = `session_${nowIso()
  .replace(/[:.]/g, "-")
  .replace("T", "_")
  .replace("Z", "")}_${randomUUID().slice(0, 8)}`;
const SESSION_OUTPUT_DIR = path.join(ASSET_ROOT, SESSION_FOLDER);
const DEFAULT_GEMINI_IMAGE_MODEL = "gemini-3-pro-image-preview";

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

function getGeminiImageModel() {
  const model = process.env.GEMINI_IMAGE_MODEL || DEFAULT_GEMINI_IMAGE_MODEL;
  if (!model.startsWith("gemini-")) {
    throw new Error(
      "Only gemini-* image models are supported. Set GEMINI_IMAGE_MODEL to a gemini image model."
    );
  }
  return model;
}

function extractInlineImageBytes(response: any): string | undefined {
  const candidates = response?.candidates || [];
  for (const candidate of candidates) {
    const parts = candidate?.content?.parts || [];
    for (const part of parts) {
      const data = part?.inlineData?.data;
      if (data) {
        return data;
      }
    }
  }
  return undefined;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetriableGeminiError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes("503") ||
    message.includes("500") ||
    message.includes("429") ||
    message.includes("resource_exhausted") ||
    message.includes("unavailable") ||
    message.includes("timeout") ||
    message.includes("deadline exceeded")
  );
}

async function withGeminiRetry<T>(operation: () => Promise<T>) {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetriableGeminiError(error) || attempt === maxAttempts) {
        throw error;
      }
      await sleep(400 * 2 ** (attempt - 1));
    }
  }
  throw new Error("Gemini retry loop failed unexpectedly");
}

function looksLikeUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://");
}

function resolveMimeTypeFromRef(reference: string) {
  const extension = path.extname(reference.split("?")[0].toLowerCase());
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  return "image/png";
}

async function loadReferenceImageParts(referenceImages: string[] | undefined) {
  if (!referenceImages || referenceImages.length === 0) {
    return [];
  }

  const parts = [];
  for (const referenceImage of referenceImages) {
    const mimeType = resolveMimeTypeFromRef(referenceImage);
    if (looksLikeUrl(referenceImage)) {
      const response = await fetch(referenceImage);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch reference image: ${referenceImage} (${response.status})`
        );
      }
      const bytes = Buffer.from(await response.arrayBuffer()).toString("base64");
      parts.push({ inlineData: { data: bytes, mimeType } });
      continue;
    }

    const bytes = (await readFile(referenceImage)).toString("base64");
    parts.push({ inlineData: { data: bytes, mimeType } });
  }
  return parts;
}

async function generateImageBytesBatch(params: {
  ai: GoogleGenAI;
  model: string;
  prompt: string;
  count: number;
  aspectRatio: string;
  referenceImages?: string[];
}) {
  const referenceParts = await loadReferenceImageParts(params.referenceImages);
  const jobs = Array.from({ length: params.count }, async () => {
    const response = await withGeminiRetry(() =>
      params.ai.models.generateContent({
        model: params.model,
        contents: [...referenceParts, params.prompt],
        config: {
          responseModalities: ["IMAGE"],
          imageConfig: {
            aspectRatio: params.aspectRatio,
          },
        },
      })
    );
    return extractInlineImageBytes(response);
  });

  return Promise.all(jobs);
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

async function ensureAssetDir() {
  await mkdir(SESSION_OUTPUT_DIR, { recursive: true });
  return SESSION_OUTPUT_DIR;
}

function getReadyPrompt(request: CreateCreativeGenerationBatchParams, mode: CandidateMode) {
  const prompt = mode === "full" ? request.full_prompt : request.visual_only_prompt;
  if (!prompt) {
    throw new Error(
      mode === "full"
        ? "full_prompt is required when full_count is greater than 0"
        : "visual_only_prompt is required when visual_only_count is greater than 0"
    );
  }
  return prompt;
}

async function generateLane(
  batch: BatchRecord,
  mode: CandidateMode,
  count: number
): Promise<CandidateRecord[]> {
  if (count <= 0) {
    return [];
  }

  const prompt = getReadyPrompt(batch.request, mode);
  const ai = getGeminiClient();
  const model = getGeminiImageModel();
  const generated = await generateImageBytesBatch({
    ai,
    model,
    prompt,
    count,
    aspectRatio: batch.request.aspect_ratio,
    referenceImages: batch.request.reference_images,
  });
  const assetDir = await ensureAssetDir();

  return Promise.all(
    Array.from({ length: count }, async (_, index) => {
      const candidateId = `${mode === "full" ? "full" : "visual"}_c${String(
        index + 1
      ).padStart(2, "0")}`;
      const imagePath = path.join(assetDir, `${batch.batch_id}_${candidateId}.png`);
      const imageBytes = generated[index];

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
    output_folder: SESSION_OUTPUT_DIR,
    all_image_paths: batch.candidates
      .map((candidate) => candidate.image_path)
      .filter((imagePath): imagePath is string => Boolean(imagePath)),
    all_exact_prompts: batch.candidates.map((candidate) => ({
      candidate_id: candidate.candidate_id,
      exact_prompt: candidate.final_prompt,
    })),
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
  if (candidate.status !== "ready" || !candidate.image_path) {
    throw new Error("Candidate is not ready for approval");
  }

  for (const item of batch.candidates) {
    if (item.candidate_id !== candidateId && item.status === "approved") {
      item.status = "ready";
    }
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
  const candidate = batch.candidates.find((item) => item.candidate_id === candidateId);
  if (!candidate) {
    throw new Error("Approved candidate record not found");
  }
  if (candidate.mode !== "visual_only") {
    throw new Error("Final overlay asset is only valid for visual-only candidates");
  }
  if (!path.isAbsolute(finalImagePath)) {
    throw new Error("final_image_path must be an absolute path");
  }
  await access(finalImagePath);

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
  const model = getGeminiImageModel();
  let generated: Array<string | undefined>;
  try {
    generated = await generateImageBytesBatch({
      ai,
      model,
      prompt: mergedPrompt,
      count: 1,
      aspectRatio: batch.request.aspect_ratio,
      referenceImages: batch.request.reference_images,
    });
  } catch (error) {
    throw normalizeGeminiError(error);
  }
  const imageBytes = generated[0];
  if (!imageBytes) {
    throw new Error("Gemini did not return image bytes for prompt edit rerun");
  }

  const assetDir = await ensureAssetDir();
  const nextIndex = batch.candidates.length + 1;
  const childId = `${candidate.mode === "full" ? "full" : "visual"}_c${String(
    nextIndex
  ).padStart(2, "0")}`;
  const imagePath = path.join(assetDir, `${batch.batch_id}_${childId}.png`);
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
