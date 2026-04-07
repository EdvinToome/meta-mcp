import { MetaApiClient } from "../meta-client.js";
import type {
  RunStructuredAdBuildParams,
  StructuredAdBuildItemParams,
} from "../types/mcp-tools.js";
import type { MetaToolResult } from "./meta-v1-actions.js";
import {
  createAdAction,
  createAdCreativeAction,
  createAdSetEnhancedAction,
  createCampaignAction,
  uploadCreativeAssetAction,
} from "./meta-v1-actions.js";

const DESCRIPTION_PHRASES: Record<string, string> = {
  EE: "Parimad õppematerjalid lastele",
  ET: "Parimad õppematerjalid lastele",
  LT: "Geriausia mokymosi medžiaga vaikams",
};

const DESCRIPTION_PHRASES_BY_LANGUAGE: Record<string, string> = {
  et: "Parimad õppematerjalid lastele",
  lt: "Geriausia mokymosi medžiaga vaikams",
  lv: "Labakie macibu materiali berniem",
  pt: "Os melhores materiais de estudo para criancas",
  en: "Best study materials for children",
};

const jsonToolResult = (payload: unknown, isError = false): MetaToolResult => ({
  content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
  ...(isError ? { isError: true as const } : {}),
});

function formatLocalIso(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffsetMinutes = Math.abs(offsetMinutes);
  const offsetHours = Math.floor(absoluteOffsetMinutes / 60);
  const offsetRemainderMinutes = absoluteOffsetMinutes % 60;

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${sign}${pad(offsetHours)}:${pad(offsetRemainderMinutes)}`
  );
}

function buildDefaultStartTime() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(8, 0, 0, 0);
  return formatLocalIso(date);
}

function buildDeterministicDescription(build: StructuredAdBuildItemParams) {
  const domain = new URL(build.destination_url).hostname.replace(/^www\./, "");
  const languageCode = build.copy_context.language.toLowerCase().slice(0, 2);
  const countryCode = build.countries[0]?.toUpperCase() || "";
  const phrase =
    DESCRIPTION_PHRASES_BY_LANGUAGE[languageCode] ||
    DESCRIPTION_PHRASES[countryCode] ||
    "Best study materials for children";

  return `${domain} | ${phrase}`;
}

function buildDescriptionText(build: StructuredAdBuildItemParams) {
  const provided = build.copy_variants.description?.trim();
  if (provided) {
    return provided;
  }
  return buildDeterministicDescription(build);
}

function parseStepPayload(step: string, result: MetaToolResult) {
  const text = result.content[0]?.text || "";

  if (result.isError) {
    throw new Error(`${step}: ${text}`);
  }

  try {
    return JSON.parse(text) as Record<string, any>;
  } catch {
    throw new Error(`${step}: ${text}`);
  }
}

function validateBuild(build: StructuredAdBuildItemParams) {
  if (build.image_path && build.image_hash) {
    throw new Error(
      "Provide either image_path or image_hash for a structured build item, not both."
    );
  }

  if (!build.image_path && !build.image_hash) {
    throw new Error(
      "Structured build item requires image_path or image_hash."
    );
  }
}

async function runSingleBuild(
  metaClient: MetaApiClient,
  build: StructuredAdBuildItemParams
) {
  validateBuild(build);

  const status = build.status || "PAUSED";
  const budgetMinor = Math.round(build.daily_budget_major * 100);
  const descriptionText = buildDescriptionText(build);
  const startTime = build.start_time || buildDefaultStartTime();
  const copyVariants = build.copy_variants;
  let imageHash = build.image_hash;
  let upload: Record<string, any> | undefined;

  if (build.image_path) {
    upload = parseStepPayload(
      "upload_creative_asset",
      await uploadCreativeAssetAction(metaClient, {
        account_id: build.account_id,
        file_path: build.image_path,
        image_name: build.image_name,
      })
    );
    imageHash = upload.upload_details.image_hash;
  }

  const campaign = parseStepPayload(
    "create_campaign",
    await createCampaignAction(metaClient, {
      account_id: build.account_id,
      name: build.campaign_name,
      objective: "OUTCOME_SALES",
      status,
      daily_budget: budgetMinor,
      special_ad_categories: build.special_ad_categories,
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      budget_optimization: true,
    })
  );

  const adSet = parseStepPayload(
    "create_ad_set_enhanced",
    await createAdSetEnhancedAction(metaClient, {
      campaign_id: campaign.campaign_id,
      name: build.ad_set_name,
      optimization_goal: "OFFSITE_CONVERSIONS",
      billing_event: "IMPRESSIONS",
      promoted_object: {
        pixel_id: build.pixel_id,
        custom_event_type: "PURCHASE",
      },
      attribution_spec: [
        { event_type: "CLICK_THROUGH", window_days: 7 },
        { event_type: "VIEW_THROUGH", window_days: 1 },
      ],
      destination_type: "UNDEFINED",
      configured_status: status,
      start_time: startTime,
      is_dynamic_creative: true,
      targeting: {
        geo_locations: {
          countries: build.countries,
        },
        publisher_platforms: build.publisher_platforms,
        brand_safety_content_filter_levels: ["FACEBOOK_RELAXED"],
        targeting_automation: {
          advantage_audience: 1,
          individual_setting: {
            age: 1,
            gender: 1,
          },
        },
      },
    })
  );

  const creative = parseStepPayload(
    "create_ad_creative",
    await createAdCreativeAction(metaClient, {
      account_id: build.account_id,
      name: build.creative_name,
      page_id: build.page_id,
      instagram_user_id: build.instagram_user_id,
      messages: [
        copyVariants.parents.primary_text,
        copyVariants.teachers.primary_text,
        copyVariants.general.primary_text,
      ],
      headlines: [
        copyVariants.parents.headline,
        copyVariants.teachers.headline,
        copyVariants.general.headline,
      ],
      descriptions: [descriptionText],
      image_hash: imageHash,
      call_to_action_type: build.call_to_action_type,
      link_url: build.destination_url,
      enable_standard_enhancements: false,
    })
  );

  const ad = parseStepPayload(
    "create_ad",
    await createAdAction(metaClient, {
      ad_set_id: adSet.ad_set_id,
      name: build.ad_name,
      creative_id: creative.creative_id,
      status,
    })
  );

  return {
    key: build.key || build.campaign_name,
    success: true,
    upload: upload
      ? {
          file_path: build.image_path,
          image_hash: imageHash,
        }
      : {
          image_hash: imageHash,
        },
    defaults_applied: {
      objective: "OUTCOME_SALES",
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      budget_optimization: true,
      optimization_goal: "OFFSITE_CONVERSIONS",
      billing_event: "IMPRESSIONS",
      destination_type: "UNDEFINED",
      is_dynamic_creative: true,
      description: descriptionText,
      start_time: startTime,
    },
    copy_context: build.copy_context,
    copy_variants: {
      parents: copyVariants.parents,
      teachers: copyVariants.teachers,
      general: copyVariants.general,
      description: descriptionText,
    },
    created: {
      campaign_id: campaign.campaign_id,
      campaign_url: campaign.ads_manager_url,
      ad_set_id: adSet.ad_set_id,
      ad_set_url: adSet.ads_manager_url,
      creative_id: creative.creative_id,
      ad_id: ad.ad_id,
      ad_url: ad.ads_manager_url,
    },
  };
}

export async function runStructuredAdBuildAction(
  metaClient: MetaApiClient,
  params: RunStructuredAdBuildParams
): Promise<MetaToolResult> {
  const builds = [];
  let hasErrors = false;

  for (const build of params.builds) {
    try {
      builds.push(await runSingleBuild(metaClient, build));
    } catch (error) {
      hasErrors = true;
      builds.push({
        key: build.key || build.campaign_name,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  }

  return jsonToolResult(
    {
      success: !hasErrors,
      mode: "deterministic_dynamic_creative",
      builds,
    },
    hasErrors
  );
}
