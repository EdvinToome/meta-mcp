import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MetaApiClient } from "../meta-client.js";
import {
  ListCampaignsSchema,
  CreateCampaignSchema,
  UpdateCampaignSchema,
  DeleteCampaignSchema,
  ListAdSetsSchema,
  CreateAdSetSchema,
  CreateAdSchema,
  RunStructuredAdBuildSchema,
} from "../types/mcp-tools";
import {
  createAdAction,
  createAdSetEnhancedAction,
  createCampaignAction,
} from "../shared/meta-v1-actions.js";
import { runStructuredAdBuildAction } from "../shared/structured-build.js";

export function setupCampaignTools(
  server: McpServer,
  metaClient: MetaApiClient
) {
  registerCampaignTools(server, metaClient);
}

export function registerCampaignTools(
  server: McpServer,
  metaClient: MetaApiClient
) {
  // List Campaigns Tool
  server.tool(
    "list_campaigns",
    "Retrieve a paginated list of all campaigns for a Meta ad account. Filter by status (e.g., ACTIVE, PAUSED) and view key campaign details including budget, objective, and timing. Use this to audit or select campaigns for further actions.",
    ListCampaignsSchema.shape,
    async ({ account_id, status, limit, after, verbose }) => {
      try {
        const result = await metaClient.getCampaigns(account_id, {
          status: status ? [status] : undefined,
          limit,
          after,
        });

        const campaigns = result.data.map((campaign) =>
          verbose
            ? {
                id: campaign.id,
                name: campaign.name,
                objective: campaign.objective,
                status: campaign.status,
                effective_status: campaign.effective_status,
                created_time: campaign.created_time,
                updated_time: campaign.updated_time,
                start_time: campaign.start_time,
                stop_time: campaign.stop_time,
                daily_budget: campaign.daily_budget,
                lifetime_budget: campaign.lifetime_budget,
                budget_remaining: campaign.budget_remaining,
              }
            : {
                id: campaign.id,
                name: campaign.name,
                objective: campaign.objective,
                status: campaign.status,
                daily_budget: campaign.daily_budget,
                lifetime_budget: campaign.lifetime_budget,
              },
        );

        const response = {
          campaigns,
          pagination: {
            has_next_page: result.hasNextPage,
            has_previous_page: result.hasPreviousPage,
            next_cursor: result.paging?.cursors?.after,
            previous_cursor: result.paging?.cursors?.before,
          },
          total_count: campaigns.length,
          verbose: Boolean(verbose),
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response),
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
              text: `Error listing campaigns: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Create Campaign Tool
  server.tool(
    "create_campaign",
    "Create a new Meta ad campaign. Specify the objective, name, and either a daily or lifetime budget (not both). Optionally set start/stop times, special ad categories, and bid strategy. The campaign will be created in PAUSED status unless otherwise specified. Returns the new campaign ID and summary.",
    CreateCampaignSchema.shape,
    async (params) => createCampaignAction(metaClient, params)
  );

  // Update Campaign Tool
  server.tool(
    "update_campaign",
    "Update an existing campaign’s settings. Change the name, status, budget, or schedule. Only the provided fields will be updated. Use this to optimize or pause/resume campaigns as needed.",
    UpdateCampaignSchema.shape,
    async ({
      campaign_id,
      name,
      status,
      daily_budget,
      lifetime_budget,
      start_time,
      stop_time,
    }) => {
      try {
        const updates: Record<string, string | number> = {};

        if (name) updates.name = name;
        if (status) updates.status = status;
        if (daily_budget) updates.daily_budget = daily_budget;
        if (lifetime_budget) updates.lifetime_budget = lifetime_budget;
        if (start_time) updates.start_time = start_time;
        if (stop_time) updates.stop_time = stop_time;

        if (Object.keys(updates).length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "Error: No updates provided. Please specify at least one field to update.",
              },
            ],
            isError: true,
          };
        }

        await metaClient.updateCampaign(campaign_id, updates);

        const response = {
          success: true,
          campaign_id,
          message: `Campaign ${campaign_id} updated successfully`,
          updates_applied: updates,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2),
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
              text: `Error updating campaign: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Pause Campaign Tool
  server.tool(
    "pause_campaign",
    "Instantly pause a campaign to stop ad delivery and spending. Use for emergency stops, budget control, or temporary suspensions. Requires the campaign ID.",
    DeleteCampaignSchema.shape,
    async ({ campaign_id }) => {
      try {
        await metaClient.updateCampaign(campaign_id, { status: "PAUSED" });

        const response = {
          success: true,
          campaign_id,
          message: `Campaign ${campaign_id} paused successfully`,
          new_status: "PAUSED",
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2),
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
              text: `Error pausing campaign: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Resume Campaign Tool
  server.tool(
    "resume_campaign",
    "Reactivate a previously paused campaign to resume ad delivery and spending. Requires the campaign ID.",
    DeleteCampaignSchema.shape,
    async ({ campaign_id }) => {
      try {
        await metaClient.updateCampaign(campaign_id, { status: "ACTIVE" });

        const response = {
          success: true,
          campaign_id,
          message: `Campaign ${campaign_id} resumed successfully`,
          new_status: "ACTIVE",
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2),
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
              text: `Error resuming campaign: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Delete Campaign Tool
  server.tool(
    "delete_campaign",
    "Permanently delete a campaign and all its associated ad sets and ads. This action cannot be undone. Requires the campaign ID.",
    DeleteCampaignSchema.shape,
    async ({ campaign_id }) => {
      try {
        await metaClient.deleteCampaign(campaign_id);

        const response = {
          success: true,
          campaign_id,
          message: `Campaign ${campaign_id} deleted successfully`,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2),
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
              text: `Error deleting campaign: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // List Ad Sets Tool
  server.tool(
    "list_ad_sets",
    "List all ad sets for a given campaign or ad account. Filter by status and paginate results. Returns ad set details including budget, targeting, and optimization settings.",
    ListAdSetsSchema.shape,
    async ({ campaign_id, account_id, status, limit, after, verbose }) => {
      try {
        if (!campaign_id && !account_id) {
          return {
            content: [
              {
                type: "text",
                text: "Error: Either campaign_id or account_id must be provided",
              },
            ],
            isError: true,
          };
        }

        const result = await metaClient.getAdSets({
          campaignId: campaign_id,
          accountId: account_id,
          status,
          limit,
          after,
        });

        const adSets = result.data.map((adSet) =>
          verbose
            ? {
                id: adSet.id,
                name: adSet.name,
                campaign_id: adSet.campaign_id,
                status: adSet.status,
                effective_status: adSet.effective_status,
                created_time: adSet.created_time,
                updated_time: adSet.updated_time,
                start_time: adSet.start_time,
                end_time: adSet.end_time,
                daily_budget: adSet.daily_budget,
                lifetime_budget: adSet.lifetime_budget,
                bid_amount: adSet.bid_amount,
                billing_event: adSet.billing_event,
                optimization_goal: adSet.optimization_goal,
              }
            : {
                id: adSet.id,
                name: adSet.name,
                campaign_id: adSet.campaign_id,
                status: adSet.status,
                daily_budget: adSet.daily_budget,
                lifetime_budget: adSet.lifetime_budget,
                optimization_goal: adSet.optimization_goal,
              },
        );

        const response = {
          ad_sets: adSets,
          pagination: {
            has_next_page: result.hasNextPage,
            has_previous_page: result.hasPreviousPage,
            next_cursor: result.paging?.cursors?.after,
            previous_cursor: result.paging?.cursors?.before,
          },
          total_count: adSets.length,
          verbose: Boolean(verbose),
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response),
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
              text: `Error listing ad sets: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Campaign Readiness Check Tool
  server.tool(
    "check_campaign_readiness",
    "Check if a campaign is ready for ad set creation. Returns a readiness report with issues, requirements, and recommendations based on campaign status, objective, and budget. Use before creating ad sets to avoid common errors.",
    DeleteCampaignSchema.shape, // Reusing for campaign_id param
    async ({ campaign_id }) => {
      try {
        const campaign = await metaClient.getCampaign(campaign_id);

        const readinessCheck = {
          campaign_id,
          campaign_name: campaign.name,
          objective: campaign.objective,
          status: campaign.status,
          is_ready: true,
          issues: [] as string[],
          requirements: [] as string[],
          recommendations: [] as string[],
        };

        // Check campaign status
        if (campaign.status === "PAUSED") {
          readinessCheck.issues.push("Campaign is currently paused");
          readinessCheck.requirements.push(
            "Resume campaign before creating ad sets"
          );
        }

        // Check objective-specific requirements
        if (
          campaign.objective === "OUTCOME_LEADS" ||
          campaign.objective === "CONVERSIONS"
        ) {
          readinessCheck.requirements.push(
            "Facebook Pixel may be required for conversion tracking"
          );
          readinessCheck.requirements.push(
            "Lead form or conversion events should be configured"
          );
        }

        // Check budget setup
        if (!campaign.daily_budget && !campaign.lifetime_budget) {
          readinessCheck.issues.push("No budget configured on campaign");
          readinessCheck.requirements.push(
            "Set campaign budget or use ad set level budgets"
          );
        }

        // Provide objective-specific optimization recommendations
        const objectiveMap: Record<
          string,
          {
            recommended_optimization: string[];
            recommended_billing: string[];
            min_budget: number;
          }
        > = {
          OUTCOME_LEADS: {
            recommended_optimization: [
              "LEAD_GENERATION",
              "OFFSITE_CONVERSIONS",
            ],
            recommended_billing: ["IMPRESSIONS", "CLICKS"],
            min_budget: 500,
          },
          OUTCOME_TRAFFIC: {
            recommended_optimization: ["LINK_CLICKS", "LANDING_PAGE_VIEWS"],
            recommended_billing: ["LINK_CLICKS", "IMPRESSIONS"],
            min_budget: 100,
          },
          OUTCOME_SALES: {
            recommended_optimization: ["CONVERSIONS", "OFFSITE_CONVERSIONS"],
            recommended_billing: ["IMPRESSIONS", "CLICKS"],
            min_budget: 1000,
          },
        };

        const objectiveData = objectiveMap[campaign.objective];
        if (objectiveData) {
          readinessCheck.recommendations.push(
            `For ${
              campaign.objective
            }, use optimization_goal: ${objectiveData.recommended_optimization.join(
              " or "
            )}`
          );
          readinessCheck.recommendations.push(
            `Recommended billing_event: ${objectiveData.recommended_billing.join(
              " or "
            )}`
          );
          readinessCheck.recommendations.push(
            `Minimum daily budget: $${objectiveData.min_budget / 100} (${
              objectiveData.min_budget
            } cents)`
          );
        }

        readinessCheck.is_ready = readinessCheck.issues.length === 0;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(readinessCheck, null, 2),
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
              text: `Error checking campaign readiness: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Enhanced Create Ad Set Tool with better validation
  server.tool(
    "create_ad_set_enhanced",
    "Create a new ad set with advanced validation and helpful error messages. Specify campaign, name, budget (daily or lifetime), optimization goal, billing event, targeting, and promoted object if required by the campaign objective. Returns the new ad set ID and summary, or detailed error guidance if creation fails.",
    CreateAdSetSchema.shape,
    async (params) => createAdSetEnhancedAction(metaClient, params)
  );

  // List Ads Tool
  server.tool(
    "list_ads",
    "List all ads for a given campaign, ad set, or ad account. Filter by status and paginate results. Returns ad details including creative, status, and timing.",
    ListAdSetsSchema.shape,
    async ({ campaign_id, account_id, status, limit, after }) => {
      try {
        if (!campaign_id && !account_id) {
          return {
            content: [
              {
                type: "text",
                text: "Error: Either campaign_id or account_id must be provided",
              },
            ],
            isError: true,
          };
        }

        const result = await metaClient.getAds({
          campaignId: campaign_id,
          accountId: account_id,
          status,
          limit,
          after,
        });

        const ads = result.data.map((ad) => ({
          id: ad.id,
          name: ad.name,
          adset_id: ad.adset_id,
          campaign_id: ad.campaign_id,
          status: ad.status,
          effective_status: ad.effective_status,
          created_time: ad.created_time,
          updated_time: ad.updated_time,
          creative: ad.creative,
        }));

        const response = {
          ads,
          pagination: {
            has_next_page: result.hasNextPage,
            has_previous_page: result.hasPreviousPage,
            next_cursor: result.paging?.cursors?.after,
            previous_cursor: result.paging?.cursors?.before,
          },
          total_count: ads.length,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2),
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
              text: `Error listing ads: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Create Ad Tool
  server.tool(
    "create_ad",
    "Create a new ad within an ad set by attaching an existing creative ID. Use this after create_ad_creative to complete the delivery object.",
    CreateAdSchema.shape,
    async (params) => createAdAction(metaClient, params)
  );

  server.tool(
    "run_structured_ad_build",
    "Run a deterministic full Meta build from one structured payload. This creates the campaign, dynamic creative ad set, uses the provided structured copy variants, creates the multi-variant creative, and creates the final ad together so the asset feed creative and ad set shape always match.",
    RunStructuredAdBuildSchema.shape,
    async (params) => runStructuredAdBuildAction(metaClient, params)
  );

  // Get Campaign Details Tool
  server.tool(
    "get_campaign",
    "Retrieve full details for a specific campaign by ID. Returns all campaign fields including status, objective, budget, and timing.",
    DeleteCampaignSchema.shape,
    async ({ campaign_id }) => {
      try {
        const campaign = await metaClient.getCampaign(campaign_id);

        const response = {
          campaign: {
            id: campaign.id,
            name: campaign.name,
            objective: campaign.objective,
            status: campaign.status,
            effective_status: campaign.effective_status,
            created_time: campaign.created_time,
            updated_time: campaign.updated_time,
            start_time: campaign.start_time,
            stop_time: campaign.stop_time,
            daily_budget: campaign.daily_budget,
            lifetime_budget: campaign.lifetime_budget,
            budget_remaining: campaign.budget_remaining,
            account_id: campaign.account_id,
          },
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2),
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
              text: `Error getting campaign details: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // List Ad Sets for Campaign Tool
  server.tool(
    "list_campaign_ad_sets",
    "List all ad sets within a specific campaign. Returns ad set details and a summary of active/paused counts and total daily budget.",
    DeleteCampaignSchema.shape, // Reusing for campaign_id param
    async ({ campaign_id }) => {
      try {
        const result = await metaClient.getAdSets({
          campaignId: campaign_id,
          limit: 50,
        });

        const adSets = result.data.map((adSet) => ({
          id: adSet.id,
          name: adSet.name,
          status: adSet.status,
          effective_status: adSet.effective_status,
          optimization_goal: adSet.optimization_goal,
          billing_event: adSet.billing_event,
          daily_budget: adSet.daily_budget,
          lifetime_budget: adSet.lifetime_budget,
          created_time: adSet.created_time,
          targeting: adSet.targeting,
        }));

        const response = {
          campaign_id,
          ad_sets: adSets,
          total_count: adSets.length,
          summary: {
            active_count: adSets.filter(
              (as) => as.effective_status === "ACTIVE"
            ).length,
            paused_count: adSets.filter(
              (as) => as.effective_status === "PAUSED"
            ).length,
            total_daily_budget: adSets.reduce(
              (sum, as) => sum + (Number(as.daily_budget) || 0),
              0
            ),
          },
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2),
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
              text: `Error listing ad sets for campaign: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Meta API Parameter Reference Tool
  server.tool(
    "get_meta_api_reference",
    "Get a reference guide for valid Meta Marketing API parameters, including allowed optimization goals, billing events, and their valid combinations. Use this to troubleshoot parameter errors or to construct valid requests.",
    {},
    async () => {
      const reference = {
        optimization_goals: {
          description: "Available optimization goals for ad sets",
          values: [
            "REACH",
            "IMPRESSIONS",
            "CLICKS",
            "UNIQUE_CLICKS",
            "APP_INSTALLS",
            "OFFSITE_CONVERSIONS",
            "CONVERSIONS",
            "LINK_CLICKS",
            "POST_ENGAGEMENT",
            "PAGE_LIKES",
            "EVENT_RESPONSES",
            "MESSAGES",
            "APP_DOWNLOADS",
            "LANDING_PAGE_VIEWS",
            "LEAD_GENERATION",
            "QUALITY_LEAD",
            "QUALITY_CALL",
            "THRUPLAY",
            "VIDEO_VIEWS",
          ],
        },
        billing_events: {
          description: "Available billing events for ad sets",
          values: [
            "APP_INSTALLS",
            "CLICKS",
            "IMPRESSIONS",
            "LINK_CLICKS",
            "NONE",
            "OFFER_CLAIMS",
            "PAGE_LIKES",
            "POST_ENGAGEMENT",
            "THRUPLAY",
            "PURCHASE",
            "LISTING_INTERACTION",
          ],
        },
        valid_combinations: {
          description:
            "Common valid optimization_goal + billing_event combinations",
          combinations: [
            {
              optimization_goal: "LINK_CLICKS",
              billing_event: "IMPRESSIONS",
              use_case: "Website traffic",
            },
            {
              optimization_goal: "LINK_CLICKS",
              billing_event: "LINK_CLICKS",
              use_case: "Pay per click",
            },
            {
              optimization_goal: "LANDING_PAGE_VIEWS",
              billing_event: "IMPRESSIONS",
              use_case: "Page views",
            },
            {
              optimization_goal: "CONVERSIONS",
              billing_event: "IMPRESSIONS",
              use_case: "Conversions with pixel",
            },
            {
              optimization_goal: "LEAD_GENERATION",
              billing_event: "IMPRESSIONS",
              use_case: "Lead forms",
            },
            {
              optimization_goal: "REACH",
              billing_event: "IMPRESSIONS",
              use_case: "Brand awareness",
            },
            {
              optimization_goal: "POST_ENGAGEMENT",
              billing_event: "IMPRESSIONS",
              use_case: "Social engagement",
            },
            {
              optimization_goal: "VIDEO_VIEWS",
              billing_event: "IMPRESSIONS",
              use_case: "Video marketing",
            },
          ],
        },
        campaign_objectives: {
          description: "Campaign objectives and their requirements",
          objectives: {
            OUTCOME_TRAFFIC: {
              description: "Drive website traffic",
              recommended_optimization: ["LINK_CLICKS", "LANDING_PAGE_VIEWS"],
              requires_promoted_object: true,
              promoted_object_fields: ["page_id", "pixel_id"],
            },
            OUTCOME_LEADS: {
              description: "Generate leads",
              recommended_optimization: ["LEAD_GENERATION", "CONVERSIONS"],
              requires_promoted_object: true,
              promoted_object_fields: ["pixel_id", "custom_event_type"],
            },
            OUTCOME_SALES: {
              description: "Drive purchases",
              recommended_optimization: ["CONVERSIONS", "OFFSITE_CONVERSIONS"],
              requires_promoted_object: true,
              promoted_object_fields: ["pixel_id", "custom_event_type"],
            },
            OUTCOME_ENGAGEMENT: {
              description: "Increase engagement",
              recommended_optimization: ["POST_ENGAGEMENT", "PAGE_LIKES"],
              requires_promoted_object: true,
              promoted_object_fields: ["page_id"],
            },
          },
        },
        troubleshooting_tips: {
          invalid_parameter: [
            "Check that optimization_goal and billing_event are compatible",
            "Ensure campaign objective matches ad set optimization goal",
            "Verify promoted_object is provided for campaigns that require it",
            "Check that budget is in cents (multiply dollars by 100)",
          ],
          permission_errors: [
            "Verify you have admin access to the Facebook Page",
            "Check that the Facebook Pixel is installed and accessible",
            "Ensure the campaign exists and you have permission to modify it",
          ],
          common_mistakes: [
            "Using CONVERSIONS without Facebook Pixel setup",
            "Mixing incompatible optimization goals with billing events",
            "Forgetting to resume paused campaigns before creating ad sets",
            "Not providing promoted_object for conversion campaigns",
          ],
        },
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(reference, null, 2),
          },
        ],
      };
    }
  );

  // Quick Fix Suggestions Tool
  server.tool(
    "get_quick_fixes",
    "Get targeted troubleshooting tips for common Meta Ads API errors. Provide an error message to receive likely causes, suggestions, and next steps for resolution.",
    {
      error_message: z
        .string()
        .describe("The error message you received from the API"),
    },
    async ({ error_message }) => {
      const fixes = {
        error_message,
        suggestions: [] as string[],
        likely_causes: [] as string[],
        next_steps: [] as string[],
      };

      const errorLower = error_message.toLowerCase();

      // Invalid parameter errors
      if (errorLower.includes("invalid parameter")) {
        fixes.likely_causes.push(
          "Parameter combination is not supported by Meta API"
        );
        fixes.suggestions.push(
          "Use 'get_meta_api_reference' tool to see valid parameter combinations"
        );
        fixes.suggestions.push(
          "Check that optimization_goal and billing_event are compatible"
        );
        fixes.suggestions.push(
          "Verify campaign objective matches your ad set parameters"
        );
        fixes.next_steps.push(
          "Run 'check_campaign_readiness' on your campaign first"
        );
      }

      // Permission errors
      if (
        errorLower.includes("permission") ||
        errorLower.includes("does not exist")
      ) {
        fixes.likely_causes.push(
          "Insufficient permissions or object doesn't exist"
        );
        fixes.suggestions.push(
          "Verify you have admin access to the Facebook Page"
        );
        fixes.suggestions.push("Check that campaign/ad set IDs are correct");
        fixes.suggestions.push("Ensure the object hasn't been deleted");
        fixes.next_steps.push("Use 'list_campaigns' to verify campaign exists");
      }

      // Billing event errors
      if (errorLower.includes("billing_event")) {
        fixes.likely_causes.push(
          "Invalid billing event for the optimization goal"
        );
        fixes.suggestions.push(
          "Use IMPRESSIONS as billing_event (most compatible)"
        );
        fixes.suggestions.push(
          "Check valid combinations with 'get_meta_api_reference'"
        );
        fixes.next_steps.push(
          "Try optimization_goal: LINK_CLICKS with billing_event: IMPRESSIONS"
        );
      }

      // Optimization goal errors
      if (errorLower.includes("optimization_goal")) {
        fixes.likely_causes.push(
          "Optimization goal not supported for campaign objective"
        );
        fixes.suggestions.push("Match optimization goal to campaign objective");
        fixes.suggestions.push(
          "For OUTCOME_TRAFFIC: use LINK_CLICKS or LANDING_PAGE_VIEWS"
        );
        fixes.suggestions.push(
          "For OUTCOME_LEADS: use LEAD_GENERATION or CONVERSIONS"
        );
        fixes.next_steps.push(
          "Run 'check_campaign_readiness' to see recommendations"
        );
      }

      // Budget errors
      if (errorLower.includes("budget")) {
        fixes.likely_causes.push(
          "Budget amount too low or incorrectly formatted"
        );
        fixes.suggestions.push(
          "Ensure budget is in cents (multiply dollars by 100)"
        );
        fixes.suggestions.push(
          "Minimum daily budget is usually $1.00 (100 cents)"
        );
        fixes.suggestions.push(
          "Provide either daily_budget OR lifetime_budget, not both"
        );
        fixes.next_steps.push("Try daily_budget: 500 (for $5.00 daily)");
      }

      // If no specific matches, provide general guidance
      if (fixes.suggestions.length === 0) {
        fixes.suggestions.push(
          "Use 'get_meta_api_reference' for parameter guidance"
        );
        fixes.suggestions.push(
          "Run 'check_campaign_readiness' before creating ad sets"
        );
        fixes.suggestions.push(
          "Try simpler parameters first (LINK_CLICKS + IMPRESSIONS)"
        );
        fixes.next_steps.push(
          "Share the full error message for more specific help"
        );
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(fixes, null, 2),
          },
        ],
      };
    }
  );

  // Account Setup Verification Tool
  server.tool(
    "verify_account_setup",
    "Verify that a Meta ad account is ready for ad creation. Checks for account access, payment method, Facebook pages, and active campaigns. Returns a setup status, recommendations, and warnings.",
    {
      account_id: z.string().describe("Meta Ad Account ID to verify"),
    },
    async ({ account_id }) => {
      try {
        const verification = {
          account_id,
          setup_status: "checking",
          components: {
            account_access: { status: "unknown", details: "" },
            payment_method: { status: "unknown", details: "" },
            facebook_pages: { status: "unknown", details: "", count: 0 },
            active_campaigns: { status: "unknown", details: "", count: 0 },
          },
          recommendations: [] as string[],
          warnings: [] as string[],
        };

        // Check account access
        try {
          const account = await metaClient.getAdAccount(account_id);
          verification.components.account_access = {
            status: "success",
            details: `Account "${account.name}" accessible`,
          };
        } catch (error) {
          verification.components.account_access = {
            status: "error",
            details: "Cannot access account - check permissions",
          };
          verification.warnings.push("Account access issues detected");
        }

        // Check for active campaigns
        try {
          const campaigns = await metaClient.getCampaigns(account_id, {
            limit: 10,
          });
          verification.components.active_campaigns = {
            status: campaigns.data.length > 0 ? "success" : "warning",
            details: `Found ${campaigns.data.length} campaigns`,
            count: campaigns.data.length,
          };

          if (campaigns.data.length === 0) {
            verification.recommendations.push(
              "Create your first campaign to start advertising"
            );
          }
        } catch (error) {
          verification.components.active_campaigns = {
            status: "error",
            details: "Cannot retrieve campaigns",
            count: 0,
          };
        }

        // Check payment methods (this might require additional permissions)
        try {
          const funding = await metaClient.getFundingSources(account_id);
          verification.components.payment_method = {
            status: funding.length > 0 ? "success" : "warning",
            details:
              funding.length > 0
                ? "Payment method configured"
                : "No payment method found",
          };

          if (funding.length === 0) {
            verification.warnings.push(
              "No payment method configured - required for ad delivery"
            );
            verification.recommendations.push(
              "Add a payment method in Meta Business Manager"
            );
          }
        } catch (error) {
          verification.components.payment_method = {
            status: "unknown",
            details: "Cannot check payment methods (insufficient permissions)",
          };
        }

        // Overall status
        const hasErrors = Object.values(verification.components).some(
          (c) => c.status === "error"
        );
        const hasWarnings = Object.values(verification.components).some(
          (c) => c.status === "warning"
        );

        if (hasErrors) {
          verification.setup_status = "needs_attention";
        } else if (hasWarnings) {
          verification.setup_status = "mostly_ready";
        } else {
          verification.setup_status = "ready";
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(verification, null, 2),
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
              text: `Error verifying account setup: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
