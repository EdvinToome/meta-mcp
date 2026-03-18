#!/usr/bin/env node

import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

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

function checkNodeVersion() {
  try {
    const version = execSync("node --version", { encoding: "utf8" }).trim();
    console.log(`✅ Node.js version: ${version}`);

    const majorVersion = parseInt(version.substring(1).split(".")[0]);
    if (majorVersion < 18) {
      console.log("⚠️  Warning: Node.js 18+ is recommended");
    }
    return true;
  } catch (error) {
    console.log(
      "❌ Node.js not found. Please install Node.js from https://nodejs.org/"
    );
    return false;
  }
}

function checkNpmVersion() {
  try {
    const version = execSync("npm --version", { encoding: "utf8" }).trim();
    console.log(`✅ npm version: ${version}`);
    return true;
  } catch (error) {
    console.log("❌ npm not found");
    return false;
  }
}

async function testMetaToken(token) {
  try {
    console.log("🔍 Testing Meta API token...");
    const response = await fetch(
      `https://graph.facebook.com/v23.0/me?access_token=${encodeURIComponent(token)}`
    );
    const result = await response.json();

    if (!response.ok || result.error) {
      console.log(
        `❌ Token validation failed: ${result.error?.message || "Unknown error"}`
      );
      return false;
    }

    console.log(`✅ Token valid for user: ${result.name || result.id}`);
    return true;
  } catch (error) {
    console.log(
      "⚠️  Could not validate token (network error). Proceeding anyway..."
    );
    return true;
  }
}

function createClaudeConfig(configPath, serverConfig) {
  let existingConfig = {};

  // Load existing config if it exists
  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, "utf8");
      existingConfig = JSON.parse(content);
      console.log("📖 Found existing Claude Desktop configuration");
    } catch (error) {
      console.log(
        "⚠️  Existing config file is invalid JSON. Creating backup..."
      );
      fs.copyFileSync(configPath, `${configPath}.backup`);
    }
  }

  // Merge configurations
  if (!existingConfig.mcpServers) {
    existingConfig.mcpServers = {};
  }

  existingConfig.mcpServers["meta-ads"] = serverConfig;

  // Create directory if it doesn't exist
  const configDir = path.dirname(configPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
    console.log(`📁 Created config directory: ${configDir}`);
  }

  // Write configuration
  fs.writeFileSync(configPath, JSON.stringify(existingConfig, null, 2));
  console.log(`✅ Configuration written to: ${configPath}`);
}

async function main() {
  console.log("🚀 Meta Marketing API MCP Server Setup\n");

  // Check system requirements
  console.log("📋 Checking system requirements...");
  const nodeOk = checkNodeVersion();
  const npmOk = checkNpmVersion();

  if (!nodeOk || !npmOk) {
    console.log(
      "\n❌ System requirements not met. Please install Node.js and npm first."
    );
    process.exit(1);
  }

  console.log("\n🔧 Configuration Setup");

  // Get Meta access token
  const accessToken = await question("📝 Enter your Meta Access Token: ");

  if (!accessToken.trim()) {
    console.log("❌ Access token is required");
    process.exit(1);
  }

  // Test the token
  const tokenValid = await testMetaToken(accessToken.trim());
  if (!tokenValid) {
    const proceed = await question(
      "⚠️  Token validation failed. Continue anyway? (y/N): "
    );
    if (proceed.toLowerCase() !== "y") {
      process.exit(1);
    }
  }

  // Optional OAuth configuration
  console.log("\n🔐 OAuth Configuration (Optional - press Enter to skip)");
  const appId = await question("App ID: ");
  const appSecret = await question("App Secret: ");
  const businessId = await question("Business ID: ");

  // Installation method
  console.log("\n📦 Installation Method");
  console.log("1. NPM global installation (recommended)");
  console.log("2. Local development (from source)");
  const installMethod = await question("Choose method (1 or 2): ");

  let serverConfig;

  if (installMethod === "2") {
    // Local development
    const projectPath = await question(
      "Enter absolute path to project directory: "
    );

    if (!fs.existsSync(path.join(projectPath, "build", "index.js"))) {
      console.log("⚠️  Build directory not found. Running build...");
      try {
        execSync("npm run build", { cwd: projectPath, stdio: "inherit" });
      } catch (error) {
        console.log('❌ Build failed. Please run "npm run build" manually');
        process.exit(1);
      }
    }

    serverConfig = {
      command: "node",
      args: [path.join(projectPath, "build", "index.js")],
      env: {
        META_ACCESS_TOKEN: accessToken.trim(),
      },
    };
  } else {
    // NPM global installation
    try {
      console.log("📦 Installing @edvintoome/meta-mcp globally...");
      execSync("npm install -g @edvintoome/meta-mcp", { stdio: "inherit" });
      console.log("✅ Installation completed");
    } catch (error) {
      console.log("⚠️  Global installation failed. Using npx instead...");
    }

    serverConfig = {
      command: "npx",
      args: ["-y", "@edvintoome/meta-mcp"],
      env: {
        META_ACCESS_TOKEN: accessToken.trim(),
      },
    };
  }

  // Add OAuth config if provided
  if (appId.trim()) {
    serverConfig.env.META_APP_ID = appId.trim();
  }
  if (appSecret.trim()) {
    serverConfig.env.META_APP_SECRET = appSecret.trim();
  }
  if (businessId.trim()) {
    serverConfig.env.META_BUSINESS_ID = businessId.trim();
  }

  // Add additional options
  const enableDebug = await question("Enable debug logging? (y/N): ");
  if (enableDebug.toLowerCase() === "y") {
    serverConfig.env.DEBUG = "mcp:*";
    serverConfig.env.NODE_ENV = "development";
  }

  // Create Claude Desktop configuration
  console.log("\n📝 Creating Claude Desktop configuration...");
  const configPath = getClaudeConfigPath();
  createClaudeConfig(configPath, serverConfig);

  // Display final instructions
  console.log("\n🎉 Setup Complete!");
  console.log("\nNext steps:");
  console.log("1. Restart Claude Desktop completely (Quit and reopen)");
  console.log(
    '2. Test the connection by asking: "Check the health of the Meta Marketing API server"'
  );

  console.log("\n📁 Configuration file location:");
  console.log(`   ${configPath}`);

  console.log("\n🔍 If you encounter issues:");
  console.log("1. Check the logs:");
  if (os.platform() === "darwin") {
    console.log("   tail -f ~/Library/Logs/Claude/mcp*.log");
  } else if (os.platform() === "win32") {
    console.log('   type "%APPDATA%\\Claude\\logs\\mcp*.log"');
  }
  console.log("2. Test the server manually:");
  if (installMethod === "2") {
    console.log(
      `   node ${path.join(
        await question("Project path: "),
        "build",
        "index.js"
      )}`
    );
  } else {
    console.log("   npx -y @edvintoome/meta-mcp");
  }

  console.log(
    "\n📚 For more help, see the troubleshooting section in README.md"
  );

  rl.close();
}

main().catch((error) => {
  console.error("❌ Setup failed:", error);
  process.exit(1);
});
