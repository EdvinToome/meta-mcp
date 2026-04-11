import os from "os";
import path from "path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import type { CreateImageParams } from "../../../meta-mcp/src/types/mcp-tools.js";

const RUNTIME_DIR =
  process.env.PLUGIN_RUNTIME_DIR ?? path.join(os.homedir(), ".meta-marketing-plugin");
const ASSET_ROOT = path.join(RUNTIME_DIR, "generated-creatives");
const DEFAULT_GEMINI_IMAGE_MODEL = "gemini-3-pro-image-preview";

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      JSON.stringify({
        code: "gemini_unavailable",
        message: "Gemini API key is missing. Set GEMINI_API_KEY.",
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

function resolveMimeTypeFromRef(reference: string) {
  const extension = path.extname(reference.split("?")[0].toLowerCase());
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  return "image/png";
}

function isUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://");
}

async function loadAttachmentParts(attachments: string[]) {
  const parts = [];
  for (const attachment of attachments) {
    const mimeType = resolveMimeTypeFromRef(attachment);
    if (isUrl(attachment)) {
      const response = await fetch(attachment);
      if (!response.ok) {
        throw new Error(`Failed to fetch attachment: ${attachment} (${response.status})`);
      }
      const bytes = Buffer.from(await response.arrayBuffer()).toString("base64");
      parts.push({ inlineData: { data: bytes, mimeType } });
      continue;
    }
    const bytes = (await readFile(attachment)).toString("base64");
    parts.push({ inlineData: { data: bytes, mimeType } });
  }
  return parts;
}

function extractInlineImageBytes(response: unknown) {
  const candidates = (response as any)?.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error("Gemini returned no candidates");
  }
  for (const candidate of candidates) {
    const parts = candidate?.content?.parts;
    if (!Array.isArray(parts)) continue;
    for (const part of parts) {
      const data = part?.inlineData?.data;
      if (typeof data === "string" && data.length > 0) {
        return data;
      }
    }
  }
  throw new Error("Gemini did not return image bytes");
}

function serviceTierForMode(mode: CreateImageParams["generation_mode"]) {
  return mode === "async" ? "flex" : "standard";
}

function normalizeGeminiError(error: unknown): Error {
  if (!(error instanceof Error)) {
    return new Error(
      JSON.stringify({
        code: "gemini_unavailable",
        message: "Unknown Gemini error",
      })
    );
  }
  const message = error.message.toLowerCase();
  if (message.includes("quota") || message.includes("resource_exhausted")) {
    return new Error(
      JSON.stringify({
        code: "gemini_quota_exceeded",
        message: error.message,
      })
    );
  }
  if (message.includes("api key") || message.includes("unauthorized") || message.includes("permission")) {
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

function makeOutputDir() {
  const folder = `session_${new Date().toISOString().replace(/[:.]/g, "-")}_${randomUUID().slice(0, 8)}`;
  return path.join(ASSET_ROOT, folder);
}

export async function createImage(params: CreateImageParams) {
  const ai = getGeminiClient();
  const model = getGeminiImageModel();
  const outputDir = makeOutputDir();
  const attachmentParts = await loadAttachmentParts(params.attachments);
  const imagePaths: string[] = [];

  try {
    await mkdir(outputDir, { recursive: true });

    for (let index = 0; index < params.count; index += 1) {
      const response = await ai.models.generateContent({
        model,
        contents: [...attachmentParts, params.prompt],
        config: {
          responseModalities: ["IMAGE"],
          serviceTier: serviceTierForMode(params.generation_mode),
          imageConfig: {
            aspectRatio: params.aspect_ratio,
            imageSize: params.resolution,
          },
        },
      });

      const imageBytes = extractInlineImageBytes(response);
      const imagePath = path.join(outputDir, `image_${String(index + 1).padStart(2, "0")}.png`);
      await writeFile(imagePath, Buffer.from(imageBytes, "base64"));
      imagePaths.push(imagePath);
    }
  } catch (error) {
    console.error("Gemini create_image failed:", error);
    throw normalizeGeminiError(error);
  }

  return {
    model,
    count: params.count,
    aspect_ratio: params.aspect_ratio,
    generation_mode: params.generation_mode,
    resolution: params.resolution,
    output_dir: outputDir,
    images: imagePaths,
  };
}
