import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CreateImageSchema } from "../../../meta-mcp/src/types/mcp-tools.js";
import { createImage } from "../shared/gemini-creative.js";

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
    "create_image",
    "Create one or more images with Gemini.",
    CreateImageSchema.shape,
    async (params) => {
      try {
        return text(await createImage(params));
      } catch (error) {
        console.error("create_image failed:", error);
        return errorText(`Error creating image: ${getErrorMessage(error)}`);
      }
    }
  );
}
