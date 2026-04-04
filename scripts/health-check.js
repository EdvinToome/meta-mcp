#!/usr/bin/env node

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

function getClaudeConfigPath() {
  const platform = os.platform();

  switch (platform) {
    case "darwin": // macOS
      return path.join(
        os.homedir(),
        "Library",
        "Application Support",
        "Claude",
        "claude_desktop_config.json"
      );
    case "win32": // Windows
      return path.join(
        os.homedir(),
        "AppData",
        "Roaming",
        "Claude",
        "claude_desktop_config.json"
      );
    case "linux": // Linux
      return path.join(
        os.homedir(),
        ".config",
        "Claude",
        "claude_desktop_config.json"
      );
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

function checkConfiguration() {
  console.log("🔍 Meta Marketing API MCP Server Health Check\n");

  // Check Node.js version
  try {
    const version = execSync("node --version", { encoding: "utf8" }).trim();
    console.log(`✅ Node.js version: ${version}`);

    const majorVersion = parseInt(version.substring(1).split(".")[0]);
    if (majorVersion < 18) {
      console.log("⚠️  Warning: Node.js 18+ is recommended");
    }
  } catch (error) {
    console.log("❌ Node.js not found");
    return false;
  }

  // Check npm
  try {
    const version = execSync("npm --version", { encoding: "utf8" }).trim();
    console.log(`✅ npm version: ${version}`);
  } catch (error) {
    console.log("❌ npm not found");
    return false;
  }

  // Check Claude Desktop configuration
  const configPath = getClaudeConfigPath();
  console.log(`\n📁 Checking Claude Desktop configuration: ${configPath}`);

  if (!fs.existsSync(configPath)) {
    console.log("❌ Claude Desktop configuration file not found");
    console.log("   Run: npm run setup to create configuration");
    return false;
  }

  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

    if (!config.mcpServers) {
      console.log("❌ No MCP servers configured");
      return false;
    }

    if (!config.mcpServers.meta) {
      console.log("❌ Meta MCP server not configured");
      console.log("   Available servers:", Object.keys(config.mcpServers));
      return false;
    }

    const serverConfig = config.mcpServers.meta;
    console.log("✅ Meta MCP server configuration found");

    // Check environment variables
    if (!serverConfig.env || !serverConfig.env.META_ACCESS_TOKEN) {
      console.log("❌ META_ACCESS_TOKEN not configured");
      return false;
    }

    console.log("✅ META_ACCESS_TOKEN configured");

    // Check if optional OAuth variables are set
    if (serverConfig.env.META_APP_ID) {
      console.log("✅ OAuth configuration detected (META_APP_ID)");
    }
  } catch (error) {
    console.log("❌ Invalid JSON in configuration file");
    console.log("   Error:", error.message);
    return false;
  }

  // Test server command
  console.log("\n🚀 Testing MCP server command...");
  try {
    const command = config.mcpServers.meta.command;
    const args = config.mcpServers.meta.args;

    console.log(`Command: ${command} ${args.join(" ")}`);

    // Test if command exists
    if (command === "npx") {
      execSync("npx --version", { stdio: "ignore" });
      console.log("✅ npx command available");
    } else if (command === "node") {
      const scriptPath = args[0];
      if (fs.existsSync(scriptPath)) {
        console.log("✅ Local script file exists");
      } else {
        console.log("❌ Local script file not found:", scriptPath);
        return false;
      }
    }
  } catch (error) {
    console.log("❌ Server command not available");
    return false;
  }

  // Check logs directory
  console.log("\n📋 Checking Claude Desktop logs...");
  const logsPath =
    os.platform() === "darwin"
      ? path.join(os.homedir(), "Library", "Logs", "Claude")
      : os.platform() === "win32"
      ? path.join(os.homedir(), "AppData", "Roaming", "Claude", "logs")
      : path.join(os.homedir(), ".local", "share", "Claude", "logs");

  if (fs.existsSync(logsPath)) {
    console.log(`✅ Logs directory exists: ${logsPath}`);

    // Look for recent MCP logs
    try {
      const files = fs.readdirSync(logsPath);
      const mcpLogs = files.filter((f) => f.includes("mcp"));

      if (mcpLogs.length > 0) {
        console.log(`✅ Found ${mcpLogs.length} MCP log file(s)`);
        console.log("   Recent logs:", mcpLogs.slice(-3));
      } else {
        console.log(
          "⚠️  No MCP log files found (this is normal if server hasn't been used)"
        );
      }
    } catch (error) {
      console.log("⚠️  Could not read logs directory");
    }
  } else {
    console.log(
      "⚠️  Logs directory not found (this is normal for new installations)"
    );
  }

  return true;
}

function printTroubleshootingTips() {
  console.log("\n🔧 Troubleshooting Tips:");
  console.log(
    "1. Make sure Claude Desktop is completely closed and reopened after configuration changes"
  );
  console.log("2. Check logs for error messages:");

  if (os.platform() === "darwin") {
    console.log("   tail -f ~/Library/Logs/Claude/mcp*.log");
  } else if (os.platform() === "win32") {
    console.log('   type "%APPDATA%\\Claude\\logs\\mcp*.log"');
  }

  console.log("3. Test the server manually:");
  console.log("   npx -y @edvintoome/meta-mcp");
  console.log("4. Verify your Meta access token is valid:");
  console.log(
    '   curl -G -d "access_token=YOUR_TOKEN" "https://graph.facebook.com/v23.0/me"'
  );
  console.log("5. If problems persist, run: npm run setup");
}

function main() {
  const isHealthy = checkConfiguration();

  if (isHealthy) {
    console.log("\n🎉 Health check passed! Your MCP server should be working.");
    console.log("\nNext steps:");
    console.log("1. Make sure Claude Desktop is running");
    console.log(
      '2. Test by asking: "Check the health of the Meta Marketing API server"'
    );
    console.log('3. Try: "List my ad accounts"');
  } else {
    console.log("\n❌ Health check failed. Please fix the issues above.");
    printTroubleshootingTips();
  }
}

main();
