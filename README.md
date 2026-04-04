# Meta Marketing API MCP Server

A Meta Ads MCP server plus agent bundle for Codex and Claude Code. The package provides the Meta API server, skill prompts, Claude slash commands, and local workspace initialization for site profiles and business-specific rules.

## ⚡ Quick Start

### 1) Install
```bash
npm install -g @edvintoome/meta-mcp
```

### 2) Configure (Claude Desktop / Cursor)
Create or edit your MCP config:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

Minimal config:
```json
{
  "mcpServers": {
    "meta": {
      "command": "npx",
      "args": ["-y", "@edvintoome/meta-mcp"],
      "env": {
        "META_ACCESS_TOKEN": "your_access_token_here"
      }
    }
  }
}
```

If your app requires `appsecret_proof`, add `META_APP_SECRET`:
```json
{
  "mcpServers": {
    "meta": {
      "command": "npx",
      "args": ["-y", "@edvintoome/meta-mcp"],
      "env": {
        "META_ACCESS_TOKEN": "your_access_token_here",
        "META_APP_SECRET": "your_app_secret"
      }
    }
  }
}
```

### 3) Restart your client
- **Claude Desktop**: quit and reopen
- **Cursor**: restart the IDE

### 4) Verify
Restart your MCP client, then call the `health_check` tool from the client.

## Agent Bundle

This repo now ships as a Meta Ads agent bundle around the local `meta-ads-mcp` MCP server.

Bundled skills:
- `meta-ads-builder`
- `meta-ads-consultant`
- `meta-ads-morning-review`
- `meta-ad-copy`
- supporting `ad-creative`
- supporting `paid-ads`

Tracked starter files:
- [site-profiles.example.json](./site-profiles.example.json)
- [BUSINESS_RULES.example.md](./BUSINESS_RULES.example.md)

Local runtime files:
- `site-profiles.local.json`
- `BUSINESS_RULES.local.md`

Create the local runtime files with:

```bash
npm run init:workspace
```

## Claude Marketplace

This repo now also exposes a Claude marketplace at `.claude-plugin/marketplace.json` and a self-contained Claude plugin at `plugins/meta-mcp`.

One-command installer for Claude Code Desktop:

```bash
curl -fsSL https://raw.githubusercontent.com/EdvinToome/meta-mcp/main/scripts/install-claude-desktop.sh | bash -s -- --project /absolute/path/to/project
```

If you omit the flags below, the installer asks for them interactively:
- `--meta-token <token>`
- `--site-profiles-file /absolute/path/to/site-profiles.local.json`
- `--business-rules-file /absolute/path/to/BUSINESS_RULES.local.md`

To test the marketplace locally in Claude Code:

```bash
claude plugin validate .
claude plugin marketplace add .
```

To install from GitHub after pushing this repo:

```text
/plugin marketplace add https://github.com/EdvinToome/meta-mcp
/plugin install meta-mcp@meta-mcp-marketplace
```

After installing the plugin in Claude Code:
1. Run `/meta-mcp-init` once per project.
2. Fill `.claude/meta-mcp/site-profiles.local.json`.
3. Fill `.claude/meta-mcp/BUSINESS_RULES.local.md`.
4. Make sure the global Claude MCP server named `meta` is installed.

## Codex Plugin

Codex plugin discovery now uses the Codex bundle under `codex/plugins/meta-ads-mcp`.

The global marketplace at `~/.agents/plugins/marketplace.json` should point at the installed bundle in `~/.codex/plugins/meta-ads-mcp`.

If you want it available outside this repo too, run:

```bash
npm run setup:codex-plugin
```

Or use the curl installer directly:

```bash
curl -fsSL https://raw.githubusercontent.com/EdvinToome/meta-mcp/main/scripts/install-codex-plugin.sh | bash
```

That installer:
- copies `codex/plugins/meta-ads-mcp` into `~/.codex/plugins/meta-ads-mcp`
- writes `~/.agents/plugins/marketplace.json`
- keeps the local runtime config under `~/.meta-mcp`
- stages the local Meta runtime into the plugin bundle and launches the `meta-ads-mcp` MCP server from there

## Codex + Meta Skills

This repo ships repo-local skills under `skills/`.

Use `npm run setup:codex-plugin` to install the Codex plugin bundle and bootstrap any missing local Meta config:
- copies `codex/plugins/meta-ads-mcp` into `~/.codex/plugins/meta-ads-mcp`
- writes `~/.agents/plugins/marketplace.json`
- stages `build/` and the runtime npm deps into `~/.codex/plugins/meta-ads-mcp`
- creates `~/.meta-mcp/meta.env`, `site-profiles.local.json`, and `BUSINESS_RULES.local.md` only when they are missing
- keeps the bundled Meta skills and commands inside the plugin bundle so Codex can load them directly

Why this split works:
- the skills are the orchestration layer
- the MCP server is the execution layer that talks to Meta
- keeping the skills inside the plugin bundle means Codex loads one self-contained install

After setup, restart Codex and use prompts like:

```text
Use $meta-ads-builder to publish a paused Meta ad from /absolute/path/to/image.jpg for the selected site profile
```

The builder skill will:
- call `health_check` and `get_capabilities`
- resolve the matching site profile from `~/.meta-mcp/site-profiles.local.json`
- prepare explicit `copy_context` and `copy_variants` in the agent layer before the structured build call
- use the selected image or enumerate image candidates from your working folder
- persist `meta-ads-brief.json` and `meta-ads-result.json` in the working folder

The consultant and morning-review skills use the same MCP server and site profiles for diagnosis, daily reporting, creative feedback, and optimization advice.

## 🚀 Features

### **Campaign Management**
- ✅ Create, update, pause, resume, and delete campaigns
- ✅ Support for all campaign objectives (traffic, conversions, awareness, etc.)
- ✅ Budget management and scheduling
- ✅ Ad set creation with advanced targeting
- ✅ Individual ad management

### **Analytics & Reporting**
- 📊 Performance insights with customizable date ranges
- 📈 Multi-object performance comparison
- 📋 Data export in CSV/JSON formats
- 🎯 Attribution modeling and conversion tracking
- 📅 Daily performance trends analysis

### **Audience Management**
- 👥 Custom audience creation and management
- 🎯 Lookalike audience generation
- 📏 Audience size estimation
- 🔍 Targeting recommendations and insights
- 🏥 Audience health monitoring

### **Creative Management**
- 🎨 Ad creative creation and management
- 👁️ Cross-platform ad previews
- 🧪 A/B testing setup and guidance
- 📸 Creative performance analysis

### **Enterprise Features**
- 🔐 Secure OAuth 2.0 authentication
- ⚡ Automatic rate limiting with exponential backoff
- 🔄 Pagination support for large datasets
- 🛡️ Comprehensive error handling
- 📚 Rich MCP resources for contextual data access
- 🌐 Multi-account support

## 📦 Installation & Setup

### Option 1: Direct Installation (Recommended)
```bash
npm install -g @edvintoome/meta-mcp
```

### Option 2: From Source
```bash
git clone https://github.com/EdvinToome/meta-mcp.git
cd meta-mcp
npm install
npm run build
```

### Option 3: Automated Setup (Easiest)
```bash
# Clone the repository first
git clone https://github.com/EdvinToome/meta-mcp.git
cd meta-mcp

# Run the interactive setup
npm run setup
```

The setup script will:
- ✅ Check system requirements
- ✅ Validate your Meta access token
- ✅ Create Claude Desktop configuration
- ✅ Install dependencies
- ✅ Test the connection

### Codex Setup

If you want Codex to use this MCP server together with the bundled Meta skills:

```bash
npm run setup:codex-plugin
```

The installer uses a local source setup:
- Codex plugin bundle target: `~/.codex/plugins/meta-ads-mcp`
- MCP server name: `meta`
- local Meta config: `~/.meta-mcp/*`

### Claude Code Setup

Claude Code can use the same repo directly:

- `CLAUDE.md` provides project instructions
- `.claude/commands/` provides ready-to-use slash commands
- the global Claude MCP config should expose a `meta` server with `META_ACCESS_TOKEN`
- project-local business data should live in `.claude/meta-mcp/site-profiles.local.json` and `.claude/meta-mcp/BUSINESS_RULES.local.md`

Example commands after opening the repo in Claude Code:
- `/meta-ads-builder`
- `/meta-ads-consultant`
- `/meta-ads-morning-review`
- `/meta-ad-copy`

To install the Meta bundle into another Claude Code project:

```bash
npm run setup:claude -- --project /absolute/path/to/project
```

That installer:
- writes the global Claude `meta` MCP server into Claude Desktop config
- installs Meta slash commands under `.claude/commands`
- links the Meta skills and profile docs under `.claude/meta-mcp`
- creates editable `.claude/meta-mcp/site-profiles.local.json` and `.claude/meta-mcp/BUSINESS_RULES.local.md` if they do not exist
- appends a small managed Meta section to the target `CLAUDE.md`

If you are using the published package instead of a clone:

```bash
npx -y @edvintoome/meta-mcp install-claude --project /absolute/path/to/project
```

After installation:
1. Edit `.claude/meta-mcp/site-profiles.local.json`
2. Edit `.claude/meta-mcp/BUSINESS_RULES.local.md`
3. Restart Claude Code Desktop
4. Open the project in Claude Code and run `/meta-ads-builder`

## 🔧 Configuration Guide

### Step 1: Get Meta Access Token
1. Create a Meta App at [developers.facebook.com](https://developers.facebook.com/)
2. Add Marketing API product
3. Generate an access token with `ads_read` and `ads_management` permissions
4. If your app requires `appsecret_proof`, set `META_APP_SECRET` (see below)
5. (Optional) Set up OAuth for automatic token refresh

![CleanShot 2025-06-17 at 15 52 35@2x](https://github.com/user-attachments/assets/160a260f-8f1b-44de-9041-f684a47e4a9d)

### Step 2: Configure Claude Desktop

#### Find your configuration file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

If the file doesn't exist, create it with the following content:

#### Basic Configuration (Token-based):
```json
{
  "mcpServers": {
    "meta": {
      "command": "npx",
      "args": ["-y", "@edvintoome/meta-mcp"],
      "env": {
        "META_ACCESS_TOKEN": "your_access_token_here"
      }
    }
  }
}
```

#### Advanced Configuration (with OAuth + appsecret_proof):
```json
{
  "mcpServers": {
    "meta": {
      "command": "npx",
      "args": ["-y", "@edvintoome/meta-mcp"],
      "env": {
        "META_ACCESS_TOKEN": "your_access_token_here",
        "META_APP_ID": "your_app_id",
        "META_APP_SECRET": "your_app_secret",
        "META_AUTO_REFRESH": "true",
        "META_BUSINESS_ID": "your_business_id"
      }
    }
  }
}
```

#### Local Development Configuration:
If you've cloned the repository locally:
```json
{
  "mcpServers": {
    "meta": {
      "command": "node",
      "args": ["/absolute/path/to/meta-mcp/build/index.js"],
      "env": {
        "META_ACCESS_TOKEN": "your_access_token_here"
      }
    }
  }
}
```

#### Codex Local Configuration:

Codex discovers this plugin through `~/.agents/plugins/marketplace.json`.
The installed bundle at `~/.codex/plugins/meta-ads-mcp` includes the `.mcp.json` that launches the `meta-ads-mcp` MCP server, so you do not add a server block to `~/.codex/config.toml`.

If you are setting up the repo for local development, use `npm run setup:codex-plugin` to create missing `~/.meta-mcp/*` files and install the skills.

### Step 3: Configure for Cursor

Cursor uses the same MCP configuration as Claude Desktop. Add the configuration to your Cursor settings:

1. Open Cursor Settings
2. Go to "Extensions" > "Claude"
3. Add the MCP server configuration in the JSON settings

### Step 4: Restart Your Client
- **Claude Desktop**: Completely quit and restart the application
- **Cursor**: Restart the IDE

### Step 5: Verify Setup
```bash
# Verify from your MCP client by calling the health_check tool
```

## 🔍 Troubleshooting

### Common Issues

#### 1. "Command not found" or "npx" errors
```bash
# Install Node.js if not installed
# macOS: brew install node
# Windows: Download from nodejs.org
# Linux: Use your package manager

# Verify installation
node --version
npm --version
npx --version
```

#### 2. Permission errors
```bash
# Fix npm permissions (macOS/Linux)
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}

# Or install without sudo
npm config set prefix ~/.npm-global
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

#### 3. Meta API connection issues
```bash
# Test your token manually
curl -G \
  -d "access_token=YOUR_ACCESS_TOKEN" \
  "https://graph.facebook.com/v23.0/me/adaccounts"
```
If the response says `appsecret_proof` is required, set `META_APP_SECRET` in your MCP server environment.

#### 4. Check Claude Desktop logs
- **macOS**: `~/Library/Logs/Claude/mcp*.log`
- **Windows**: `%APPDATA%\Claude\logs\mcp*.log`

```bash
# macOS/Linux - View logs
tail -f ~/Library/Logs/Claude/mcp*.log

# Windows - View logs
type "%APPDATA%\Claude\logs\mcp*.log"
```

#### 5. Test the server manually
```bash
# Test the MCP server directly
npx -y @edvintoome/meta-mcp

# Or if installed locally
node build/index.js
```

### Debug Mode
Enable debug logging by adding to your environment:
```json
{
  "mcpServers": {
    "meta": {
      "command": "npx",
      "args": ["-y", "@edvintoome/meta-mcp"],
      "env": {
        "META_ACCESS_TOKEN": "your_access_token_here",
        "META_MCP_DEBUG": "1",
        "NODE_ENV": "development"
      }
    }
  }
}
```

## 🌐 Web Deployment (Vercel)

For web applications, you can deploy this server to Vercel and expose an HTTP MCP endpoint:

### Configuration:
1. Deploy to Vercel
2. Set environment variables in Vercel dashboard
3. Configure OAuth app in Meta Developer Console
4. Use the web endpoint: `https://your-project.vercel.app/api/mcp`

### MCP Client Configuration for Web:
```json
{
  "mcpServers": {
    "meta": {
      "url": "https://your-project.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer your_session_token"
      }
    }
  }
}
```

**Note**: You need to authenticate against your deployment to get a session token.

### Remote MCP Configuration (mcp-remote)
For Vercel deployments, use `mcp-remote` to bridge HTTP to stdio:
```json
{
  "mcpServers": {
    "meta": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://your-project.vercel.app/api/mcp",
        "--header",
        "Authorization:${META_AUTH_HEADER}"
      ],
      "env": {
        "META_AUTH_HEADER": "Bearer your_session_token_here"
      }
    }
  }
}
```

## 🛠️ Available Tools

This MCP server provides **25 comprehensive tools** across all major Meta advertising categories:

### 📊 Analytics & Insights (3 tools)
- **`get_insights`** - Get detailed performance metrics (impressions, clicks, ROAS, CTR, CPC, etc.)
- **`compare_performance`** - Side-by-side performance comparison of multiple campaigns/ads
- **`export_insights`** - Export performance data in JSON or CSV formats

### 📈 Campaign Management (4 tools)
- **`create_campaign`** - Create new advertising campaigns with full configuration (includes special_ad_categories)
- **`update_campaign`** - Modify existing campaigns (name, budget, status, etc.)
- **`pause_campaign`** - Pause active campaigns
- **`resume_campaign`** - Resume/activate paused campaigns

### 🎯 Ad Set Management (2 tools)
- **`create_ad_set`** - Create ad sets with detailed targeting, budgets, and optimization goals
- **`list_ad_sets`** - List and filter ad sets within campaigns

### 📱 Ad Management (2 tools)
- **`create_ad`** - Create individual ads within ad sets using creative IDs
- **`list_ads`** - List and filter ads by ad set, campaign, or account

### 👥 Audience Management (4 tools)
- **`list_audiences`** - List all custom audiences for an account
- **`create_custom_audience`** - Create custom audiences from various sources
- **`create_lookalike_audience`** - Generate lookalike audiences from source audiences
- **`get_audience_info`** - Get detailed information about specific audiences

### 🎨 Creative Management (2 tools)
- **`list_ad_creatives`** - List all ad creatives for an account
- **`create_ad_creative`** - Create new ad creatives with rich specifications (supports external image URLs)

### 🔧 Account & Basic Tools (3 tools)
- **`health_check`** - Comprehensive authentication and server status check
- **`get_ad_accounts`** - List accessible Meta ad accounts
- **`get_campaigns`** - List campaigns with filtering options

### 🔐 Authentication Tools (1 tool)
- **`get_token_info`** - Token validation and information retrieval

### 🩺 Diagnostic Tools (2 tools)
- **`diagnose_campaign_readiness`** - Check campaign status and identify ad set creation issues
- **`check_account_setup`** - Comprehensive account validation and setup verification

## 🛠️ Usage Examples

### Test the Connection
```
Check the health of the Meta Marketing API server and authentication status
```

### Analytics & Performance Insights  
```
Get detailed performance insights for my Deal Draft campaign including impressions, clicks, ROAS, and CTR for the last 30 days
```
```
Compare the performance of my top 3 campaigns side-by-side for the last quarter
```
```
Export campaign performance data for all my campaigns last month in CSV format
```

### Campaign Management
```
Create a new traffic campaign named "Holiday Sale 2024" with a $50 daily budget and OUTCOME_TRAFFIC objective
```
```
Update my existing campaign budget to $100 daily and change the name to "Black Friday Special"
```
```
Pause all campaigns that have a CPC above $2.00
```
```
Resume my paused "Summer Collection" campaign
```

### Complete Campaign Setup (Campaign → Ad Set → Ads)
```
Create a complete "Test 3" campaign setup: 1) Create the campaign with OUTCOME_LEADS objective, 2) Create an ad set targeting US users aged 25-45 interested in entrepreneurship, 3) Create 4 different ads using my existing creatives
```
```
Create an ad set for my existing campaign targeting women aged 30-50 in major US cities with interests in business and personal development
```
```
Create a new ad in my ad set using creative ID 123456 and name it "Headline Test A"
```

### Troubleshooting & Diagnostics
```
Diagnose my "Test 3" campaign to see if it's ready for ad set creation and identify any potential issues
```
```
Check my account setup to verify payment methods, business verification, and ad account permissions
```
```
Check why my ad set creation failed and get specific recommendations for my account setup
```

### Audience Management
```
List all my custom audiences and show their sizes and status
```
```
Create a custom audience named "Website Visitors" from people who visited my site
```
```
Create a 5% lookalike audience based on my "High Value Customers" audience targeting the US
```
```
Get detailed information about my "Newsletter Subscribers" audience including health status
```

### Creative Management
```
List all my ad creatives and show their performance data
```
```
Create a new ad creative for my holiday campaign with external image URL from my website and specific messaging
```

### Account Management
```
Show me all my accessible Meta ad accounts with their currencies and time zones
```
```
Get my current access token information including permissions and expiration
```

## 📚 Resources Access

The server provides rich contextual data through MCP resources:

- `meta://campaigns/{account_id}` - Campaign overview
- `meta://insights/account/{account_id}` - Performance dashboard
- `meta://audiences/{account_id}` - Audience insights
- `meta://audience-health/{account_id}` - Audience health report

## 🔧 Environment Variables

### Required
```bash
META_ACCESS_TOKEN=your_access_token_here
```

### Optional
```bash
META_APP_ID=your_app_id                    # For OAuth
META_APP_SECRET=your_app_secret            # For OAuth
META_BUSINESS_ID=your_business_id          # For business-specific operations
META_API_VERSION=v23.0                     # API version (default: v23.0)
META_API_TIER=standard                     # 'development' or 'standard'
META_AUTO_REFRESH=true                     # Enable automatic token refresh
META_REFRESH_TOKEN=your_refresh_token      # For token refresh
META_MCP_REQUEST_TIMEOUT_MS=30000          # Request timeout in ms (0 to disable)
META_MCP_DEBUG=1                           # Enable verbose MetaApiClient debug logs
```

## 📖 Documentation

- **All documentation is in this README** (setup, configuration, and tools)
- **[Example Configuration](examples/claude_desktop_config.json)** - Sample configuration file

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Claude AI     │◄──►│ MCP Server       │◄──►│ Meta Marketing  │
│                 │    │                  │    │ API             │
│ - Natural       │    │ - Authentication │    │                 │
│   Language      │    │ - Rate Limiting  │    │ - Campaigns     │
│ - Tool Calls    │    │ - Error Handling │    │ - Analytics     │
│ - Resource      │    │ - Data Transform │    │ - Audiences     │
│   Access        │    │ - Pagination     │    │ - Creatives     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Core Components

- **Meta API Client**: Handles authentication, rate limiting, and API communication
- **Tool Handlers**: 25 tools covering analytics, campaigns, ad sets, ads, audiences, creatives, and diagnostics
- **Resource Providers**: Contextual data access for AI understanding
- **Error Management**: Robust error handling with automatic retries
- **Rate Limiter**: Intelligent rate limiting with per-account tracking

## 🔒 Security & Best Practices

### Token Security
- ✅ Environment variable configuration
- ✅ No token logging or exposure
- ✅ Automatic token validation
- ✅ Secure credential management

### API Management
- ✅ Rate limit compliance
- ✅ Exponential backoff retries
- ✅ Request validation
- ✅ Error boundary protection

### Data Privacy
- ✅ Meta data use policy compliance
- ✅ No persistent data storage
- ✅ Secure API communication
- ✅ Audit trail support

## ⚡ Performance

### Rate Limits
- **Development Tier**: 60 API calls per 5 minutes
- **Standard Tier**: 9000 API calls per 5 minutes
- **Automatic Management**: Built-in rate limiting and retry logic

### Optimization
- 🚀 Concurrent request processing
- 📦 Efficient pagination handling
- 🎯 Smart data caching
- ⚡ Minimal memory footprint

## 🧪 Testing

Run the test suite:
```bash
npm test
```

Test with example client:
```bash
npx tsx examples/client-example.ts
```

Health check:
```bash
# In Claude:
Check the health of the Meta Marketing API server
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and add tests
4. Run the test suite: `npm test`
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🆘 Support

- **Documentation**: See this README
- **Issues**: Open an issue on GitHub
- **Meta API**: Refer to [Meta Marketing API docs](https://developers.facebook.com/docs/marketing-apis/)
- **MCP Protocol**: See [Model Context Protocol specification](https://modelcontextprotocol.io/)

---

Built for reliable Meta Marketing API automation with MCP.
