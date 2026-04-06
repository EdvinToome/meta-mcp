#!/usr/bin/env node

import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";

const SERVER_NAME = "meta-marketing-plugin";

function getClaudeConfigPath() {
  const home = os.homedir();
  if (process.platform === "darwin") {
    return path.join(
      home,
      "Library",
      "Application Support",
      "Claude",
      "claude_desktop_config.json"
    );
  }
  if (process.platform === "win32") {
    return path.join(
      home,
      "AppData",
      "Roaming",
      "Claude",
      "claude_desktop_config.json"
    );
  }
  return path.join(home, ".config", "Claude", "claude_desktop_config.json");
}

function checkBinary(command) {
  execSync(`${command} --version`, { stdio: "ignore" });
}

function loadServerConfig(configPath) {
  const payload = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const server = payload.mcpServers?.[SERVER_NAME];
  if (!server) {
    throw new Error(`Missing mcpServers.${SERVER_NAME} in ${configPath}`);
  }
  return server;
}

function assertServer(server) {
  if (server.command !== "node") {
    throw new Error(`Expected command "node", got "${server.command || ""}"`);
  }
  if (!Array.isArray(server.args) || !server.args[0]) {
    throw new Error("Server args are missing");
  }
  const launchPath = server.args[0];
  if (!path.isAbsolute(launchPath)) {
    throw new Error("Launch script path must be absolute");
  }
  if (!fs.existsSync(launchPath)) {
    throw new Error(`Launch script not found: ${launchPath}`);
  }

  const pluginRoot = path.resolve(path.dirname(launchPath), "..");
  const buildEntry = path.join(pluginRoot, "build", "index.js");
  const localMcpJson = path.join(pluginRoot, ".mcp.json");

  if (!fs.existsSync(buildEntry)) {
    throw new Error(`Build entry not found: ${buildEntry}`);
  }
  if (!fs.existsSync(localMcpJson)) {
    throw new Error(`Local mcp json not found: ${localMcpJson}`);
  }
  if (!server.env?.META_ACCESS_TOKEN) {
    throw new Error("META_ACCESS_TOKEN is missing in Claude MCP config");
  }
}

function main() {
  checkBinary("node");
  checkBinary("npm");

  const configPath = getClaudeConfigPath();
  if (!fs.existsSync(configPath)) {
    throw new Error(`Claude config not found: ${configPath}`);
  }

  const server = loadServerConfig(configPath);
  assertServer(server);

  console.log("Health check passed");
  console.log(`Claude config: ${configPath}`);
  console.log(`MCP server: ${SERVER_NAME}`);
  console.log(`Launch script: ${server.args[0]}`);
}

try {
  main();
} catch (error) {
  console.error(`Health check failed: ${error.message}`);
  process.exit(1);
}
