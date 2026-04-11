import { MetaApiClient } from "../meta-client.js";
import { MetaValidationError } from "../utils/error-handler.js";
import type {
  AdAccount,
  AdCreative,
  AdSet,
  Campaign,
} from "../types/meta-api.js";
import type {
  CreateAdCreativeParams,
  CreateAdParams,
  CreateAdSetParams,
  CreateCampaignParams,
  UploadCreativeAssetParams,
} from "../types/mcp-tools.js";

type TextContent = {
  type: "text";
  text: string;
};

export type MetaToolResult = {
  content: TextContent[];
  isError?: true;
};

const textResult = (text: string): MetaToolResult => ({
  content: [{ type: "text", text }],
});

const jsonResult = (payload: unknown): MetaToolResult =>
  textResult(JSON.stringify(payload));

const errorResult = (text: string): MetaToolResult => ({
  content: [{ type: "text", text }],
  isError: true,
});

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown error occurred";

const uniqueTexts = (texts: string[]) => [...new Set(texts)];

const getCampaignBudgetState = (campaign: Campaign) =>
  campaign.daily_budget !== undefined || campaign.lifetime_budget !== undefined;

const normalizeBudget = (budget: number) => Math.round(budget);

const normalizeAdsManagerAccountId = (accountId: string) =>
  accountId.replace(/^act_/, "");

const buildCampaignAdsManagerUrl = (accountId: string, campaignId: string) =>
  `https://adsmanager.facebook.com/adsmanager/manage/campaigns/edit?act=${normalizeAdsManagerAccountId(accountId)}&nav_entry_point=bm_global_nav_shortcut&selected_campaign_ids=${campaignId}`;

const buildAdSetAdsManagerUrl = (
  accountId: string,
  campaignId: string,
  adSetId: string
) =>
  `https://adsmanager.facebook.com/adsmanager/manage/adsets/edit?act=${normalizeAdsManagerAccountId(accountId)}&nav_entry_point=bm_global_nav_shortcut&selected_campaign_ids=${campaignId}&selected_adset_ids=${adSetId}`;

const buildAdAdsManagerUrl = (
  accountId: string,
  campaignId: string,
  adSetId: string,
  adId: string
) =>
  `https://adsmanager.facebook.com/adsmanager/manage/ads/edit/standalone?act=${normalizeAdsManagerAccountId(accountId)}&nav_entry_point=bm_global_nav_shortcut&selected_campaign_ids=${campaignId}&selected_adset_ids=${adSetId}&selected_ad_ids=${adId}`;

type AttributionSpec = {
  event_type: string;
  window_days: number;
};

type PromotedObject = {
  page_id?: string;
  pixel_id?: string;
  smart_pse_enabled?: boolean;
  application_id?: string;
  object_store_url?: string;
  custom_event_type?: string;
};

type FlexibleAdText = {
  text: string;
  text_type: "primary_text" | "headline" | "description";
};

type CreateFlexibleAdParams = {
  ad_set_id: string;
  name: string;
  creative_name: string;
  page_id: string;
  instagram_user_id?: string;
  image_hashes: string[];
  link_url: string;
  call_to_action_type: string;
  primary_texts: string[];
  headlines: string[];
  descriptions: string[];
  status?: string;
};

type AdSetPayload = {
  name: string;
  optimization_goal: string;
  billing_event: string;
  status: string;
  daily_budget?: number;
  lifetime_budget?: number;
  bid_amount?: number;
  start_time?: string;
  end_time?: string;
  targeting?: Record<string, unknown>;
  promoted_object?: PromotedObject;
  attribution_spec?: AttributionSpec[];
  destination_type?: string;
  is_dynamic_creative?: boolean;
  use_new_app_click?: boolean;
  optimization_sub_event?: string;
  recurring_budget_semantics?: boolean;
};

function buildInvalidGoalMessage(
  optimizationGoal: string,
  billingEvent: string
) {
  return (
    `Error: Invalid optimization_goal (${optimizationGoal}) and billing_event (${billingEvent}) combination. Common valid combinations include:\n` +
    "- LINK_CLICKS + IMPRESSIONS\n" +
    "- LANDING_PAGE_VIEWS + IMPRESSIONS\n" +
    "- REACH + IMPRESSIONS\n" +
    "- CONVERSIONS + IMPRESSIONS\n" +
    "- OFFSITE_CONVERSIONS + IMPRESSIONS"
  );
}

function buildPromotedObjectError(objective: string) {
  let objectiveHelp = "";

  switch (objective) {
    case "OUTCOME_TRAFFIC":
      objectiveHelp =
        "For OUTCOME_TRAFFIC campaigns, provide:\n- page_id: Facebook Page ID to drive traffic to\n- pixel_id: Facebook Pixel ID for website tracking";
      break;
    case "OUTCOME_ENGAGEMENT":
      objectiveHelp =
        "For OUTCOME_ENGAGEMENT campaigns, provide:\n- page_id: Facebook Page ID to promote";
      break;
    case "OUTCOME_APP_PROMOTION":
      objectiveHelp =
        "For OUTCOME_APP_PROMOTION campaigns, provide:\n- application_id: App ID to promote\n- object_store_url: App store URL";
      break;
    case "OUTCOME_LEADS":
    case "OUTCOME_SALES":
      objectiveHelp =
        `For ${objective} campaigns, provide:\n- pixel_id: Facebook Pixel ID for conversion tracking\n- custom_event_type: Custom conversion event type`;
      break;
    default:
      objectiveHelp = "Provide the Meta promoted object required by this campaign objective.";
  }

  return `Error: Campaign with objective "${objective}" requires a promoted_object parameter.\n\n${objectiveHelp}\n\nExample: {"promoted_object": {"page_id": "your_page_id"}}`;
}

function buildCreativeApiError(errorData: Record<string, unknown>) {
  const metaError =
    typeof errorData.error === "object" && errorData.error
      ? (errorData.error as Record<string, unknown>)
      : undefined;

  if (!metaError) {
    return;
  }

  const message =
    typeof metaError.message === "string" ? metaError.message : "Unknown error";
  const code = typeof metaError.code === "number" ? metaError.code : undefined;
  const subcode =
    typeof metaError.error_subcode === "number"
      ? metaError.error_subcode
      : undefined;
  const fbTraceId =
    typeof metaError.fbtrace_id === "string" ? metaError.fbtrace_id : undefined;

  let guidance = "";

  if (code === 100) {
    switch (subcode) {
      case 33:
        guidance =
          "Account access issue. Verify your account ID includes 'act_' prefix and you have proper permissions.";
        break;
      case 1443048:
        guidance =
          "object_story_spec validation failed. Ensure page_id is correct and all required fields are provided.";
        break;
      case 3858082:
        guidance =
          "Standard Enhancements error. For v23.0, use individual feature controls instead of the legacy bundle approach.";
        break;
      case 1815809:
        guidance =
          "Asset feed variants must be unique. Remove duplicate bodies, headlines, or descriptions before creating the creative.";
        break;
      default:
        guidance =
          "Parameter validation error. Check all required fields and data formats.";
    }
  }

  return guidance
    ? `Error creating ad creative (Meta API v23.0): ${message}\n\nSpecific Guidance: ${guidance}${fbTraceId ? `\n\nFBTrace ID: ${fbTraceId}` : ""}`
    : `Error creating ad creative (Meta API v23.0): ${message}`;
}

function buildAdApiError(error: Error) {
  if (error instanceof MetaValidationError && error.errorCode === 100) {
    if (error.errorSubcode === 2061015) {
      return (
        "Error creating ad: flexible ad format requires creative.object_story_spec.link_data.link. " +
        "Set the destination link in the base creative spec and in the group CTA."
      );
    }

    if (error.errorSubcode === 3858355) {
      return (
        "Error creating ad: the first flexible asset group image or video must match the base creative spec. " +
        "Use the same image_hash or video_id in creative.object_story_spec and in the first creative_asset_groups_spec group."
      );
    }

    if (error.errorSubcode === 1885998) {
      return (
        "Error creating ad: this creative uses multiple text variants, so Meta treats it as a dynamic creative. " +
        "Create the ad set with is_dynamic_creative: true, then attach this creative there."
      );
    }

    if (error.errorSubcode === 1885702) {
      return (
        "Error creating ad: this ad set is dynamic creative, but the creative is a normal single-text creative. " +
        "Create the creative with messages/headlines/descriptions so Meta builds an asset_feed_spec dynamic creative before attaching it here."
      );
    }

    if (error.errorSubcode === 1885553) {
      return (
        "Error creating ad: this is a dynamic creative ad set, and Meta only allows one ad in it. " +
        "Reuse the existing ad or create a new dynamic creative ad set for another variant group."
      );
    }
  }

  return `Error creating ad: ${getErrorMessage(error)}`;
}

function buildAdSetApiError(error: Error) {
  let errorMessage = error.message;
  let errorDetails = "";
  let specificErrorInfo = "";

  try {
    const errorObject = JSON.parse(error.message) as {
      error?: {
        message?: string;
        code?: number;
        error_user_title?: string;
        error_user_msg?: string;
        error_data?: unknown;
      };
    };

    const metaError = errorObject.error;

    if (metaError) {
      errorMessage = metaError.message || errorMessage;
      errorDetails = metaError.error_user_title || metaError.error_user_msg || "";

      if (metaError.code === 100) {
        specificErrorInfo =
          "\n\nThis is usually caused by missing required fields or invalid field values.";
        if (metaError.error_data) {
          specificErrorInfo += `\nError data: ${JSON.stringify(metaError.error_data)}`;
        }
      } else if (metaError.code === 190) {
        specificErrorInfo =
          "\n\nThis indicates an access token issue. Please check your authentication.";
      } else if (metaError.code === 200) {
        specificErrorInfo =
          "\n\nThis indicates insufficient permissions for the operation.";
      }
    }
  } catch {
    return `Error creating ad set: ${error.message}`;
  }

  const fullErrorMessage = errorDetails
    ? `${errorMessage}\n\nAdditional details: ${errorDetails}${specificErrorInfo}`
    : `${errorMessage}${specificErrorInfo}`;

  return `Error creating ad set: ${fullErrorMessage}`;
}

export async function getAdAccountsAction(
  metaClient: MetaApiClient
): Promise<MetaToolResult> {
  try {
    const accounts = await metaClient.getAdAccounts();

    const accountsData = accounts.map((account) => ({
      id: account.id,
      name: account.name,
      account_status: account.account_status,
      currency: account.currency,
      timezone_name: account.timezone_name,
      balance: account.balance,
      business: account.business
        ? {
            id: account.business.id,
            name: account.business.name,
          }
        : null,
    }));

    return jsonResult({
      success: true,
      accounts: accountsData,
      total_accounts: accountsData.length,
      message: "Ad accounts retrieved successfully",
    });
  } catch (error) {
    return errorResult(`Error getting ad accounts: ${getErrorMessage(error)}`);
  }
}

export async function healthCheckAction(
  metaClient: MetaApiClient
): Promise<MetaToolResult> {
  try {
    const accounts = await metaClient.getAdAccounts();

    return jsonResult({
      status: "healthy",
      server_name: "Meta Marketing API Server",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      meta_api_connection: "connected",
      accessible_accounts: accounts.length,
      rate_limit_status: "operational",
      features: {
        campaign_management: true,
        analytics_reporting: true,
        audience_management: true,
        creative_management: true,
        real_time_insights: true,
      },
    });
  } catch (error) {
    return errorResult(
      JSON.stringify(
        {
          status: "unhealthy",
          server_name: "Meta Marketing API Server",
          version: "1.0.0",
          timestamp: new Date().toISOString(),
          error: getErrorMessage(error),
          meta_api_connection: "failed",
        },
        null,
        2
      )
    );
  }
}

export async function createCampaignAction(
  metaClient: MetaApiClient,
  params: CreateCampaignParams
): Promise<MetaToolResult> {
  const {
    account_id,
    name,
    objective,
    status,
    daily_budget,
    lifetime_budget,
    start_time,
    stop_time,
    special_ad_categories,
    bid_strategy,
    bid_cap,
    budget_optimization,
  } = params;

  try {
    if (daily_budget && lifetime_budget) {
      return errorResult(
        "Error: Cannot set both daily_budget and lifetime_budget. Choose one."
      );
    }

    const campaignData: {
      name: string;
      objective: string;
      status: string;
      daily_budget?: number;
      lifetime_budget?: number;
      start_time?: string;
      stop_time?: string;
      special_ad_categories?: string[];
      bid_strategy?: string;
      bid_cap?: number;
      is_budget_optimization_enabled?: boolean;
    } = {
      name,
      objective,
      status: status || "PAUSED",
    };

    if (daily_budget) campaignData.daily_budget = daily_budget;
    if (lifetime_budget) campaignData.lifetime_budget = lifetime_budget;
    if (start_time) campaignData.start_time = start_time;
    if (stop_time) campaignData.stop_time = stop_time;
    if (special_ad_categories) {
      campaignData.special_ad_categories = special_ad_categories;
    }
    campaignData.bid_strategy = bid_strategy || "LOWEST_COST_WITHOUT_CAP";
    if (bid_cap) campaignData.bid_cap = bid_cap;
    if (budget_optimization !== undefined) {
      campaignData.is_budget_optimization_enabled = budget_optimization;
    }

    const result = await metaClient.createCampaign(account_id, campaignData);
    const adsManagerUrl = buildCampaignAdsManagerUrl(account_id, result.id);

    return jsonResult({
      success: true,
      campaign_id: result.id,
      message: `Campaign "${name}" created successfully`,
      ads_manager_url: adsManagerUrl,
      details: {
        id: result.id,
        name,
        objective,
        status: status || "PAUSED",
        account_id,
        ads_manager_url: adsManagerUrl,
      },
    });
  } catch (error) {
    return errorResult(`Error creating campaign: ${getErrorMessage(error)}`);
  }
}

export async function createAdSetEnhancedAction(
  metaClient: MetaApiClient,
  params: CreateAdSetParams
): Promise<MetaToolResult> {
  const {
    campaign_id,
    name,
    daily_budget,
    lifetime_budget,
    optimization_goal,
    billing_event,
    bid_amount,
    start_time,
    end_time,
    targeting,
    promoted_object,
    attribution_spec,
    destination_type,
    is_dynamic_creative,
    use_new_app_click,
    configured_status,
    optimization_sub_event,
    recurring_budget_semantics,
  } = params;

  try {
    if (daily_budget && lifetime_budget) {
      return errorResult(
        "Error: Cannot set both daily_budget and lifetime_budget. Choose one."
      );
    }

    const validCombinations = new Set([
      "LINK_CLICKS:IMPRESSIONS",
      "LINK_CLICKS:LINK_CLICKS",
      "LANDING_PAGE_VIEWS:IMPRESSIONS",
      "IMPRESSIONS:IMPRESSIONS",
      "REACH:IMPRESSIONS",
      "POST_ENGAGEMENT:IMPRESSIONS",
      "PAGE_LIKES:IMPRESSIONS",
      "PAGE_LIKES:PAGE_LIKES",
      "VIDEO_VIEWS:IMPRESSIONS",
      "VIDEO_VIEWS:VIDEO_VIEWS",
      "CONVERSIONS:IMPRESSIONS",
      "OFFSITE_CONVERSIONS:IMPRESSIONS",
      "APP_INSTALLS:IMPRESSIONS",
    ]);

    if (!validCombinations.has(`${optimization_goal}:${billing_event}`)) {
      return errorResult(
        buildInvalidGoalMessage(optimization_goal, billing_event)
      );
    }

    const adSetData: AdSetPayload = {
      name,
      optimization_goal,
      billing_event,
      status: configured_status || "PAUSED",
    };

    if (daily_budget) {
      adSetData.daily_budget = normalizeBudget(daily_budget);
    }
    if (lifetime_budget) {
      adSetData.lifetime_budget = normalizeBudget(lifetime_budget);
      if (!start_time || !end_time) {
        const now = new Date();
        const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        adSetData.start_time = start_time || now.toISOString();
        adSetData.end_time = end_time || endDate.toISOString();
      }
    }

    if (bid_amount) adSetData.bid_amount = bid_amount;
    if (start_time) adSetData.start_time = start_time;
    if (end_time) adSetData.end_time = end_time;
    if (targeting) adSetData.targeting = targeting as Record<string, unknown>;

    let campaign: Campaign;
    try {
      campaign = await metaClient.getCampaign(campaign_id);
    } catch {
      return errorResult(
        `Error: Unable to fetch campaign details for campaign_id ${campaign_id}. Please verify the campaign exists and you have permission to access it.`
      );
    }

    const campaignHasBudget = getCampaignBudgetState(campaign);

    if (!daily_budget && !lifetime_budget && !campaignHasBudget) {
      return errorResult(
        "Error: Provide daily_budget or lifetime_budget, unless the parent campaign already has a campaign budget."
      );
    }

    if ((daily_budget || lifetime_budget) && campaignHasBudget) {
      return errorResult(
        "Error: This campaign already has a campaign budget, so the ad set must not include daily_budget or lifetime_budget."
      );
    }

    const requiresPromotedObject = [
      "OUTCOME_TRAFFIC",
      "OUTCOME_ENGAGEMENT",
      "OUTCOME_APP_PROMOTION",
      "OUTCOME_LEADS",
      "OUTCOME_SALES",
    ].includes(campaign.objective);

    if (requiresPromotedObject && !promoted_object) {
      return errorResult(buildPromotedObjectError(campaign.objective));
    }

    if (promoted_object) {
      adSetData.promoted_object = promoted_object as PromotedObject;
      if (
        campaign.objective === "OUTCOME_SALES" &&
        adSetData.promoted_object.pixel_id &&
        adSetData.promoted_object.custom_event_type &&
        adSetData.promoted_object.smart_pse_enabled === undefined
      ) {
        adSetData.promoted_object.smart_pse_enabled = false;
      }
    }

    const defaultAttributionSpec =
      campaign.objective === "OUTCOME_SALES"
        ? [
            { event_type: "CLICK_THROUGH", window_days: 7 },
            { event_type: "VIEW_THROUGH", window_days: 1 },
            { event_type: "ENGAGED_VIDEO_VIEW", window_days: 1 },
          ]
        : [{ event_type: "CLICK_THROUGH", window_days: 1 }];

    adSetData.attribution_spec = (
      attribution_spec || defaultAttributionSpec
    ).map((spec) => ({
      event_type: spec.event_type || "CLICK_THROUGH",
      window_days: spec.window_days || 1,
    }));

    if (campaign.objective === "OUTCOME_SALES") {
      adSetData.destination_type = destination_type || "UNDEFINED";
    } else if (destination_type) {
      adSetData.destination_type = destination_type;
    }
    if (is_dynamic_creative !== undefined) {
      adSetData.is_dynamic_creative = is_dynamic_creative;
    }
    if (use_new_app_click !== undefined) {
      adSetData.use_new_app_click = use_new_app_click;
    }
    if (optimization_sub_event) {
      adSetData.optimization_sub_event = optimization_sub_event;
    }
    if (recurring_budget_semantics !== undefined) {
      adSetData.recurring_budget_semantics = recurring_budget_semantics;
    }

    if (adSetData.targeting) {
      const normalizedTargeting = adSetData.targeting as Record<string, any>;
      const geoLocations = normalizedTargeting.geo_locations as
        | Record<string, unknown>
        | undefined;

      if (!geoLocations) {
        return errorResult(
          "Error: targeting.geo_locations is required. Choose a site profile or provide countries, regions, or cities explicitly."
        );
      }

      if (
        !geoLocations.countries &&
        !geoLocations.regions &&
        !geoLocations.cities
      ) {
        return errorResult(
          "Error: targeting.geo_locations must include countries, regions, or cities."
        );
      }

      if (!geoLocations.location_types) {
        geoLocations.location_types = ["home", "recent"];
      }

      if (
        campaign.objective === "OUTCOME_SALES" &&
        !normalizedTargeting.brand_safety_content_filter_levels
      ) {
        normalizedTargeting.brand_safety_content_filter_levels = [
          "FACEBOOK_RELAXED",
          "AN_RELAXED",
        ];
      }
      if (
        campaign.objective === "OUTCOME_SALES" &&
        !normalizedTargeting.targeting_automation
      ) {
        normalizedTargeting.targeting_automation = {
          advantage_audience: 1,
          individual_setting: {
            age: 1,
            gender: 1,
          },
        };
      }
      if (!normalizedTargeting.age_min) {
        normalizedTargeting.age_min = 18;
      }
      if (!normalizedTargeting.age_max) {
        normalizedTargeting.age_max = 65;
      }
    } else {
      return errorResult(
        "Error: targeting is required. Choose a site profile or provide geo targeting explicitly before creating an ad set."
      );
    }

    const result = await metaClient.createAdSet(campaign_id, adSetData);
    const adsManagerUrl = buildAdSetAdsManagerUrl(
      campaign.account_id,
      campaign_id,
      result.id
    );

    return jsonResult({
      success: true,
      ad_set_id: result.id,
      message: `Ad set "${name}" created successfully`,
      ads_manager_url: adsManagerUrl,
      details: {
        id: result.id,
        name,
        campaign_id,
        optimization_goal,
        billing_event,
        status: configured_status || "PAUSED",
        is_dynamic_creative: is_dynamic_creative || false,
        account_id: campaign.account_id,
        ads_manager_url: adsManagerUrl,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return errorResult(buildAdSetApiError(error));
    }
    return errorResult("Error creating ad set: Unknown error occurred");
  }
}

export async function uploadCreativeAssetAction(
  metaClient: MetaApiClient,
  params: UploadCreativeAssetParams
): Promise<MetaToolResult> {
  const { account_id, file_path, image_name } = params;

  try {
    if (!account_id.startsWith("act_")) {
      return errorResult(
        `Error: Account ID must include "act_" prefix. Use "act_${account_id}" instead.`
      );
    }

    const uploadResult = await metaClient.uploadImageFromFile(
      account_id,
      file_path,
      image_name
    );

    return jsonResult({
      success: true,
      message: "Local creative asset uploaded successfully to Meta",
      api_version: "v23.0",
      upload_details: {
        account_id,
        file_path,
        uploaded_name: uploadResult.name,
        image_hash: uploadResult.hash,
        meta_url: uploadResult.url,
      },
      usage_examples: {
        single_image_ads: {
          description: "Use the returned hash in create_ad_creative",
          example: {
            account_id,
            name: "My Creative",
            page_id: "YOUR_PAGE_ID",
            image_hash: uploadResult.hash,
            message: "Your ad text",
            headline: "Your headline",
            link_url: "https://your-website.com",
            call_to_action_type: "SHOP_NOW",
          },
        },
      },
      next_steps: [
        `Use the image_hash "${uploadResult.hash}" in create_ad_creative`,
        "The image is now stored in your Meta ad account library",
        "Test the creative with validate_creative_enhanced",
        "Create your ad creative using the hash instead of an external URL",
      ],
    });
  } catch (error) {
    return errorResult(
      `Error uploading creative asset: ${getErrorMessage(error)}`
    );
  }
}

export async function createAdCreativeAction(
  metaClient: MetaApiClient,
  params: CreateAdCreativeParams
): Promise<MetaToolResult> {
  const {
    account_id,
    name,
    page_id,
    headline,
    headlines,
    message,
    messages,
    picture,
    image_hash,
    video_id,
    call_to_action_type,
    link_url,
    description,
    descriptions,
    instagram_user_id,
    adlabels,
    enable_standard_enhancements,
    enhancement_features,
    attachment_style,
    caption,
  } = params;

  try {
    if (!account_id.startsWith("act_")) {
      return errorResult(
        `Error (Meta API Code 100, Subcode 33): Invalid account ID format. Must include "act_" prefix. Use "act_${account_id}" instead of "${account_id}".`
      );
    }

    if (!picture && !image_hash && !video_id) {
      return errorResult(
        "Error: Either picture (image URL), image_hash (pre-uploaded image), or video_id must be provided for the creative"
      );
    }

    if (picture && image_hash) {
      return errorResult(
        "Error: Cannot use both picture (external URL) and image_hash (uploaded image). Choose one method."
      );
    }

    const primaryTexts = uniqueTexts(
      messages?.length ? messages : message ? [message] : []
    );
    const titleTexts = uniqueTexts(
      headlines?.length ? headlines : headline ? [headline] : []
    );
    const descriptionTexts = uniqueTexts(
      descriptions?.length ? descriptions : description ? [description] : []
    );
    const useAssetFeedSpec =
      Boolean(messages?.length) ||
      Boolean(headlines?.length) ||
      Boolean(descriptions?.length);

    if (!primaryTexts.length) {
      return errorResult(
        "Error: Either message or messages must be provided for the creative"
      );
    }

    const object_story_spec: {
      page_id: string;
      link_data?: Record<string, unknown>;
      video_data?: Record<string, unknown>;
      instagram_user_id?: string;
    } = {
      page_id,
    };

    if (useAssetFeedSpec) {
      if (!primaryTexts.length) {
        return errorResult(
          "Error: Asset feed creatives require at least one primary text in message or messages"
        );
      }

      const asset_feed_spec: Record<string, unknown> = {
        bodies: primaryTexts.map((text) => ({ text })),
        link_urls: [
          {
            website_url: link_url,
            ...(caption ? { display_url: caption } : {}),
          },
        ],
        ad_formats: [video_id ? "SINGLE_VIDEO" : "SINGLE_IMAGE"],
      };

      if (call_to_action_type) {
        asset_feed_spec.call_to_action_types = [call_to_action_type];
      }
      if (titleTexts.length) {
        asset_feed_spec.titles = titleTexts.map((text) => ({ text }));
      }
      if (descriptionTexts.length) {
        asset_feed_spec.descriptions = descriptionTexts.map((text) => ({
          text,
        }));
      }
      if (picture) {
        asset_feed_spec.images = [{ url: picture }];
      } else if (image_hash) {
        asset_feed_spec.images = [{ hash: image_hash }];
      }
      if (video_id) {
        asset_feed_spec.videos = [{ video_id }];
      }

      const creativeData: {
        name: string;
        object_story_spec: typeof object_story_spec;
        asset_feed_spec: Record<string, unknown>;
        degrees_of_freedom_spec?: {
          creative_features_spec: Record<
            string,
            {
              enroll_status: "OPT_IN";
            }
          >;
        };
        adlabels?: Array<{ name: string }>;
      } = {
        name,
        object_story_spec,
        asset_feed_spec,
      };

      if (instagram_user_id) {
        object_story_spec.instagram_user_id = instagram_user_id;
      }

      if (enable_standard_enhancements && enhancement_features) {
        creativeData.degrees_of_freedom_spec = {
          creative_features_spec: {},
        };

        if (enhancement_features.enhance_cta) {
          creativeData.degrees_of_freedom_spec.creative_features_spec.enhance_cta =
            { enroll_status: "OPT_IN" };
        }
        if (enhancement_features.image_brightness_and_contrast) {
          creativeData.degrees_of_freedom_spec.creative_features_spec.image_brightness_and_contrast =
            { enroll_status: "OPT_IN" };
        }
        if (enhancement_features.text_improvements) {
          creativeData.degrees_of_freedom_spec.creative_features_spec.text_improvements =
            { enroll_status: "OPT_IN" };
        }
        if (enhancement_features.image_templates) {
          creativeData.degrees_of_freedom_spec.creative_features_spec.image_templates =
            { enroll_status: "OPT_IN" };
        }
      }

      if (adlabels?.length) {
        creativeData.adlabels = adlabels.map((label) => ({ name: label }));
      }

      const result = await metaClient.createAdCreative(account_id, creativeData);

      return jsonResult({
        success: true,
        creative_id: result.id,
        message: `Ad creative "${name}" created successfully with asset feed variants`,
        api_version: "v23.0",
        details: {
          id: result.id,
          name,
          page_id,
          headline,
          headlines: titleTexts,
          message,
          messages: primaryTexts,
          description,
          descriptions: descriptionTexts,
          picture,
          image_hash,
          video_id,
          call_to_action_type,
          link_url,
          account_id,
          instagram_user_id,
          v22_enhancements: enable_standard_enhancements,
          enhancement_features,
          creative_mode: "asset_feed_spec",
          requires_dynamic_creative_ad_set: true,
          recommended_ad_set_overrides: {
            is_dynamic_creative: true,
          },
        },
        next_steps: [
          "Create or use an ad set with is_dynamic_creative: true before attaching this creative",
          "Attach this creative as the single ad inside that dynamic creative ad set",
          "Preview the creative across different placements",
          "Test different variations for A/B testing",
          enable_standard_enhancements
            ? "Monitor enhancement performance in Meta Ads Manager"
            : "Consider enabling Standard Enhancements for better performance",
        ],
      });
    }

    if (link_url || picture || image_hash) {
      object_story_spec.link_data = {
        attachment_style: attachment_style || "link",
      };

      if (link_url) {
        object_story_spec.link_data.link = link_url;
      }
      if (picture) {
        object_story_spec.link_data.picture = picture;
      } else if (image_hash) {
        object_story_spec.link_data.image_hash = image_hash;
      }
      if (primaryTexts[0]) {
        object_story_spec.link_data.message = primaryTexts[0];
      }
      if (titleTexts[0]) {
        object_story_spec.link_data.name = titleTexts[0];
      }
      if (descriptionTexts[0]) {
        object_story_spec.link_data.description = descriptionTexts[0];
      }
      if (caption) {
        object_story_spec.link_data.caption = caption;
      }
      if (call_to_action_type) {
        object_story_spec.link_data.call_to_action = {
          type: call_to_action_type,
          value: { link: link_url },
        };
      }
    }

    if (video_id) {
      object_story_spec.video_data = { video_id };
      if (primaryTexts[0]) {
        object_story_spec.video_data.message = primaryTexts[0];
      }
      if (titleTexts[0]) {
        object_story_spec.video_data.title = titleTexts[0];
      }
      if (call_to_action_type) {
        object_story_spec.video_data.call_to_action = {
          type: call_to_action_type,
          value: { link: link_url },
        };
      }
    }

    if (instagram_user_id) {
      object_story_spec.instagram_user_id = instagram_user_id;
    }

    const creativeData: {
      name: string;
      object_story_spec: typeof object_story_spec;
      degrees_of_freedom_spec?: {
        creative_features_spec: Record<
          string,
          {
            enroll_status: "OPT_IN";
          }
        >;
      };
      adlabels?: Array<{ name: string }>;
    } = {
      name,
      object_story_spec,
    };

    if (enable_standard_enhancements && enhancement_features) {
      creativeData.degrees_of_freedom_spec = {
        creative_features_spec: {},
      };

      if (enhancement_features.enhance_cta) {
        creativeData.degrees_of_freedom_spec.creative_features_spec.enhance_cta =
          { enroll_status: "OPT_IN" };
      }
      if (enhancement_features.image_brightness_and_contrast) {
        creativeData.degrees_of_freedom_spec.creative_features_spec.image_brightness_and_contrast =
          { enroll_status: "OPT_IN" };
      }
      if (enhancement_features.text_improvements) {
        creativeData.degrees_of_freedom_spec.creative_features_spec.text_improvements =
          { enroll_status: "OPT_IN" };
      }
      if (enhancement_features.image_templates) {
        creativeData.degrees_of_freedom_spec.creative_features_spec.image_templates =
          { enroll_status: "OPT_IN" };
      }
    }

    if (adlabels?.length) {
      creativeData.adlabels = adlabels.map((label) => ({ name: label }));
    }

    const result = await metaClient.createAdCreative(account_id, creativeData);

    return jsonResult({
      success: true,
      creative_id: result.id,
      message: `Ad creative "${name}" created successfully with v23.0 features`,
      api_version: "v23.0",
      details: {
        id: result.id,
        name,
        page_id,
        headline: titleTexts[0],
        headlines: titleTexts,
        message: primaryTexts[0],
        messages: primaryTexts,
        description: descriptionTexts[0],
        descriptions: descriptionTexts,
        picture,
        image_hash,
        video_id,
        call_to_action_type,
        link_url,
        account_id,
        instagram_user_id,
        v22_enhancements: enable_standard_enhancements,
        enhancement_features,
      },
      next_steps: [
        "Use this creative in ad creation",
        "Preview the creative across different placements",
        "Test different variations for A/B testing",
        enable_standard_enhancements
          ? "Monitor enhancement performance in Meta Ads Manager"
          : "Consider enabling Standard Enhancements for better performance",
      ],
    });
  } catch (error) {
    if (error instanceof Error) {
      try {
        const errorData = JSON.parse(error.message) as Record<string, unknown>;
        const detailedMessage = buildCreativeApiError(errorData);
        if (detailedMessage) {
          return errorResult(detailedMessage);
        }
      } catch {
        // Keep the raw error message below.
      }
    }

    return errorResult(
      `Error creating ad creative: ${getErrorMessage(error)}`
    );
  }
}

export async function createAdAction(
  metaClient: MetaApiClient,
  params: CreateAdParams
): Promise<MetaToolResult> {
  const { ad_set_id, name, creative_id, status } = params;

  try {
    const adSet = await metaClient.getAdSet(ad_set_id);
    const campaign = await metaClient.getCampaign(adSet.campaign_id);
    const adData = {
      name,
      adset_id: ad_set_id,
      creative: { creative_id },
      status: status || "PAUSED",
    };

    const ad = await metaClient.createAd(ad_set_id, adData);
    const adsManagerUrl = buildAdAdsManagerUrl(
      campaign.account_id,
      campaign.id,
      ad_set_id,
      ad.id
    );

    return jsonResult({
      success: true,
      ad_id: ad.id,
      message: `Ad "${name}" created successfully`,
      ads_manager_url: adsManagerUrl,
      details: {
        id: ad.id,
        name: ad.name ?? name,
        ad_set_id,
        campaign_id: campaign.id,
        account_id: campaign.account_id,
        creative_id,
        status: ad.status ?? (status || "PAUSED"),
        ads_manager_url: adsManagerUrl,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return errorResult(buildAdApiError(error));
    }

    return errorResult("Error creating ad: Unknown error occurred");
  }
}

export async function createFlexibleAdAction(
  metaClient: MetaApiClient,
  params: CreateFlexibleAdParams
): Promise<MetaToolResult> {
  const {
    ad_set_id,
    name,
    creative_name,
    page_id,
    instagram_user_id,
    image_hashes,
    link_url,
    call_to_action_type,
    primary_texts,
    headlines,
    descriptions,
    status,
  } = params;

  const texts: FlexibleAdText[] = [
    ...primary_texts.map((text) => ({ text, text_type: "primary_text" as const })),
    ...headlines.map((text) => ({ text, text_type: "headline" as const })),
    ...descriptions.map((text) => ({ text, text_type: "description" as const })),
  ];
  const [baseImageHash] = image_hashes;

  try {
    const adSet = await metaClient.getAdSet(ad_set_id);
    const campaign = await metaClient.getCampaign(adSet.campaign_id);
    const adData = {
      name,
      adset_id: ad_set_id,
      creative: {
        name: creative_name,
        object_story_spec: {
          page_id,
          ...(instagram_user_id ? { instagram_user_id } : {}),
          link_data: {
            link: link_url,
            image_hash: baseImageHash,
            call_to_action: {
              type: call_to_action_type,
              value: { link: link_url },
            },
          },
        },
      },
      creative_asset_groups_spec: {
        groups: [
          {
            images: image_hashes.map((hash) => ({ hash })),
            texts,
            call_to_action: {
              type: call_to_action_type,
              value: { link: link_url },
            },
          },
        ],
      },
      status: status || "PAUSED",
    };

    const created = await metaClient.createAd(ad_set_id, adData);
    const ad = await metaClient.getAd(created.id);
    const adsManagerUrl = buildAdAdsManagerUrl(
      campaign.account_id,
      campaign.id,
      ad_set_id,
      ad.id
    );

    return jsonResult({
      success: true,
      ad_id: ad.id,
      message: `Ad "${name}" created successfully with flexible ad format`,
      ads_manager_url: adsManagerUrl,
      details: {
        id: ad.id,
        name: ad.name ?? name,
        ad_set_id,
        campaign_id: campaign.id,
        account_id: campaign.account_id,
        creative_id: ad.creative?.id,
        status: ad.status ?? (status || "PAUSED"),
        creative_mode: "flexible_ad_format",
        ads_manager_url: adsManagerUrl,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return errorResult(buildAdApiError(error));
    }

    return errorResult("Error creating ad: Unknown error occurred");
  }
}
