import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { ExtractTargetPageFactsSchema } from "../types/mcp-tools";

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function registerContentTools(server: McpServer) {
  server.tool(
    "extract_target_page_facts",
    ExtractTargetPageFactsSchema.shape,
    async ({ target_url, max_items }) => {
      try {
        const response = await fetch(target_url, {
          headers: {
            "user-agent": "meta-mcp-extractor/1.0",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch target URL: ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        const seen = new Set<string>();
        const keywords: string[] = [];

        $("script, style, noscript, svg, iframe").remove();

        $("h1, h2, h3, strong").each((_, element) => {
          const text = cleanText($(element).text());
          if (!text || seen.has(text)) {
            return;
          }
          seen.add(text);
          keywords.push(text);
        });

        const payload = {
          target_url,
          keywords: keywords.slice(0, max_items),
          count: Math.min(keywords.length, max_items),
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(payload),
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";

        return {
          content: [
            {
              type: "text",
              text: `Error extracting target page facts: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
