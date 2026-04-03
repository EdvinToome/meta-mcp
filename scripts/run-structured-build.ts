import fs from "node:fs/promises";
import process from "node:process";
import { MetaApiClient } from "../src/meta-client.js";
import { runStructuredAdBuildAction } from "../src/shared/structured-build.js";
import { RunStructuredAdBuildSchema } from "../src/types/mcp-tools.js";
import { AuthManager } from "../src/utils/auth.js";

async function readInput() {
  const inputPath = process.argv[2];

  if (inputPath) {
    return fs.readFile(inputPath, "utf8");
  }

  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) {
    throw new Error(
      "Provide a JSON file path as the first argument or pipe JSON into stdin."
    );
  }

  return Buffer.concat(chunks).toString("utf8");
}

function formatIssues(
  issues: Array<{ path: (string | number)[]; message: string }>
) {
  return issues
    .map((issue) => {
      const path = issue.path.length ? issue.path.join(".") + ": " : "";
      return path + issue.message;
    })
    .join("; ");
}

async function main() {
  const raw = await readInput();
  const payload = JSON.parse(raw);
  const parsed = RunStructuredAdBuildSchema.safeParse(payload);

  if (!parsed.success) {
    console.error(
      "Invalid structured build input: " + formatIssues(parsed.error.issues)
    );
    process.exit(1);
  }

  const client = new MetaApiClient(AuthManager.fromEnvironment());
  const result = await runStructuredAdBuildAction(client, parsed.data);
  const text = result.content[0]?.text || "{}";
  console.log(text);

  if (result.isError) {
    process.exit(1);
  }
}

main().catch((error) => {
  const message =
    error instanceof Error ? error.message : "Unknown error occurred";
  console.error(message);
  process.exit(1);
});
