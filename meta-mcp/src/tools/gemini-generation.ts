import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ApproveCreativeCandidateSchema,
  CreateCreativeGenerationBatchSchema,
  EditCandidatePromptSchema,
  GenerationBatchIdSchema,
  ProvideFinalOverlayAssetSchema,
  RestartGenerationBatchSchema,
} from "../types/mcp-tools.js";
import {
  approveCreativeCandidate,
  createCreativeGenerationBatch,
  editCandidatePrompt,
  getCreativeGenerationBatchStatus,
  provideFinalOverlayAsset,
  restartGenerationBatch,
  reviewCreativeBatch,
} from "../shared/gemini-creative.js";

const text = (payload: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
});

const errorText = (message: string) => ({
  content: [{ type: "text" as const, text: message }],
  isError: true as const,
});

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error occurred";
}

export function registerGeminiGenerationTools(server: McpServer) {
  server.tool(
    "create_creative_generation_batch",
    "Create a Gemini generation batch for full and/or visual-only ad creative images. Fails closed if Gemini is unavailable.",
    CreateCreativeGenerationBatchSchema.shape,
    async (params) => {
      try {
        return text(await createCreativeGenerationBatch(params));
      } catch (error) {
        return errorText(
          `Error creating generation batch: ${getErrorMessage(error)}`
        );
      }
    }
  );

  server.tool(
    "get_creative_generation_batch_status",
    "Get current status and candidate list for a Gemini generation batch.",
    GenerationBatchIdSchema.shape,
    async ({ batch_id }) => {
      try {
        return text(await getCreativeGenerationBatchStatus(batch_id));
      } catch (error) {
        return errorText(`Error getting batch status: ${getErrorMessage(error)}`);
      }
    }
  );

  server.tool(
    "review_creative_batch",
    "Return a compact review payload including exact prompts and candidate paths.",
    GenerationBatchIdSchema.shape,
    async ({ batch_id }) => {
      try {
        return text(await reviewCreativeBatch(batch_id));
      } catch (error) {
        return errorText(`Error reviewing batch: ${getErrorMessage(error)}`);
      }
    }
  );

  server.tool(
    "approve_creative_candidate",
    "Approve one candidate in a generation batch to lock the publish selection.",
    ApproveCreativeCandidateSchema.shape,
    async ({ batch_id, candidate_id }) => {
      try {
        return text(await approveCreativeCandidate(batch_id, candidate_id));
      } catch (error) {
        return errorText(
          `Error approving candidate: ${getErrorMessage(error)}`
        );
      }
    }
  );

  server.tool(
    "provide_final_overlay_asset",
    "Attach a final manually composed image for an approved visual-only candidate.",
    ProvideFinalOverlayAssetSchema.shape,
    async ({ batch_id, candidate_id, final_image_path }) => {
      try {
        return text(
          await provideFinalOverlayAsset(batch_id, candidate_id, final_image_path)
        );
      } catch (error) {
        return errorText(
          `Error attaching final overlay image: ${getErrorMessage(error)}`
        );
      }
    }
  );

  server.tool(
    "edit_candidate_prompt",
    "Branch from an existing candidate with a prompt delta and generate a new candidate.",
    EditCandidatePromptSchema.shape,
    async ({ batch_id, candidate_id, prompt_delta }) => {
      try {
        return text(await editCandidatePrompt(batch_id, candidate_id, prompt_delta));
      } catch (error) {
        return errorText(
          `Error editing candidate prompt: ${getErrorMessage(error)}`
        );
      }
    }
  );

  server.tool(
    "restart_generation_batch",
    "Start a new generation batch based on a previous one with optional overrides.",
    RestartGenerationBatchSchema.shape,
    async (params) => {
      try {
        return text(await restartGenerationBatch(params));
      } catch (error) {
        return errorText(`Error restarting batch: ${getErrorMessage(error)}`);
      }
    }
  );
}
