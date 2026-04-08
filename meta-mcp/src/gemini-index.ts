#!/usr/bin/env node

import os from "os";
import path from "path";
import { config } from "dotenv";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerGeminiGenerationTools } from "./tools/gemini-generation.js";

config({
  path: path.join(os.homedir(), ".meta-marketing-plugin", "meta.env"),
  quiet: true,
});

async function main() {
  try {
    const server = new McpServer({
      name: process.env.GEMINI_MCP_SERVER_NAME || "Gemini Creative MCP Server",
      version: process.env.GEMINI_MCP_SERVER_VERSION || "1.0.0",
    });

    registerGeminiGenerationTools(server);

    server.tool("health_check", {}, async () => ({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            server: "gemini-creative",
            gemini_api_key_present: Boolean(process.env.GEMINI_API_KEY),
          }),
        },
      ],
    }));

    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to start Gemini Creative MCP Server:", message);
    process.exit(1);
  }
}

main();
