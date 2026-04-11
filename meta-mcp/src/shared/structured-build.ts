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

type CampaignPayload = {
  campaign_id: string;
  ads_manager_url?: string;
};

type AdSetPayload = {
  ad_set_id: string;
  ads_manager_url?: string;
};

type CampaignCacheEntry = {
  payload: CampaignPayload;
  settings: {
    status: string;
    daily_budget: number;
    special_ad_categories: string;
  };
};

type AdSetCacheEntry = {
  payload: AdSetPayload;
  settings: {
    status: string;
    start_time: string;
    name: string;
    countries: string;
    publisher_platforms: string;
    pixel_id: string;
  };
};

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
  const languageCode = build.language.trim().toLowerCase();
  const countryCode = build.country.trim().toUpperCase();
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

function buildCampaignCacheKey(build: StructuredAdBuildItemParams) {
  return `${build.account_id}::${build.campaign_name}`;
}

function normalizeCountries(build: StructuredAdBuildItemParams) {
  return [...build.countries].sort().join(",");
}

function normalizePublisherPlatforms(build: StructuredAdBuildItemParams) {
  const platforms = build.publisher_platforms || ["facebook", "instagram"];
  return [...platforms].sort().join(",");
}

function normalizeSpecialAdCategories(build: StructuredAdBuildItemParams) {
  const categories = build.special_ad_categories || ["NONE"];
  return [...categories].sort().join(",");
}

function buildAdSetCacheKey(build: StructuredAdBuildItemParams) {
  const adSetIdentity =
    build.ad_set_key || build.key || build.ad_name || build.creative_name;

  return `${buildCampaignCacheKey(build)}::${adSetIdentity}`;
}

function validateSingleCampaign(builds: StructuredAdBuildItemParams[]) {
  const campaignKeys = new Set(builds.map(buildCampaignCacheKey));

  if (campaignKeys.size !== 1) {
    throw new Error(
      "run_structured_ad_build supports exactly one campaign per call. Use the same account_id and campaign_name for every build item."
    );
  }
}

function validateCampaignSettings(
  build: StructuredAdBuildItemParams,
  existing: CampaignCacheEntry
) {
  const status = build.status || "PAUSED";
  const dailyBudget = Math.round(build.daily_budget_major * 100);
  const specialAdCategories = normalizeSpecialAdCategories(build);

  if (
    existing.settings.status !== status ||
    existing.settings.daily_budget !== dailyBudget ||
    existing.settings.special_ad_categories !== specialAdCategories
  ) {
    throw new Error(
      `Build "${build.key || build.campaign_name}" reuses campaign "${build.campaign_name}" with conflicting campaign-level settings. ` +
        "Use matching status, daily_budget_major, and special_ad_categories for all builds that share a campaign."
    );
  }
}

function validateAdSetSettings(
  build: StructuredAdBuildItemParams,
  startTime: string,
  existing: AdSetCacheEntry
) {
  const status = build.status || "PAUSED";
  const countries = normalizeCountries(build);
  const publisherPlatforms = normalizePublisherPlatforms(build);

  if (
    existing.settings.status !== status ||
    existing.settings.start_time !== startTime ||
    existing.settings.name !== build.ad_set_name ||
    existing.settings.countries !== countries ||
    existing.settings.publisher_platforms !== publisherPlatforms ||
    existing.settings.pixel_id !== build.pixel_id
  ) {
    throw new Error(
      `Build "${build.key || build.ad_name}" reuses ad_set_key "${build.ad_set_key}" with conflicting ad-set settings. ` +
        "Use matching ad_set_name, status, start_time, countries, publisher_platforms, and pixel_id for all builds that share an ad_set_key."
    );
  }
}

async function getOrCreateCampaign(
  metaClient: MetaApiClient,
  build: StructuredAdBuildItemParams,
  campaignCache: Map<string, CampaignCacheEntry>
) {
  const cacheKey = buildCampaignCacheKey(build);
  const cached = campaignCache.get(cacheKey);

  if (cached) {
    validateCampaignSettings(build, cached);
    return {
      campaign: cached.payload,
      reused: true,
    };
  }

  const status = build.status || "PAUSED";
  const dailyBudget = Math.round(build.daily_budget_major * 100);
  const specialAdCategories = normalizeSpecialAdCategories(build);
  const campaign = parseStepPayload(
    "create_campaign",
    await createCampaignAction(metaClient, {
      account_id: build.account_id,
      name: build.campaign_name,
      objective: "OUTCOME_SALES",
      status,
      daily_budget: dailyBudget,
      special_ad_categories: build.special_ad_categories,
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      budget_optimization: true,
    })
  ) as CampaignPayload;

  campaignCache.set(cacheKey, {
    payload: campaign,
    settings: {
      status,
      daily_budget: dailyBudget,
      special_ad_categories: specialAdCategories,
    },
  });

  return {
    campaign,
    reused: false,
  };
}

async function getOrCreateAdSet(
  metaClient: MetaApiClient,
  build: StructuredAdBuildItemParams,
  startTime: string,
  campaignId: string,
  adSetCache: Map<string, AdSetCacheEntry>
) {
  const cacheKey = buildAdSetCacheKey(build);
  const cached = adSetCache.get(cacheKey);

  if (cached) {
    validateAdSetSettings(build, startTime, cached);
    return {
      adSet: cached.payload,
      reused: true,
    };
  }

  const status = build.status || "PAUSED";
  const adSet = parseStepPayload(
    "create_ad_set_enhanced",
    await createAdSetEnhancedAction(metaClient, {
      campaign_id: campaignId,
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
      is_dynamic_creative: false,
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
  ) as AdSetPayload;

  adSetCache.set(cacheKey, {
    payload: adSet,
    settings: {
      status,
      start_time: startTime,
      name: build.ad_set_name,
      countries: normalizeCountries(build),
      publisher_platforms: normalizePublisherPlatforms(build),
      pixel_id: build.pixel_id,
    },
  });

  return {
    adSet,
    reused: false,
  };
}

async function runSingleBuild(
  metaClient: MetaApiClient,
  build: StructuredAdBuildItemParams,
  campaignCache: Map<string, CampaignCacheEntry>,
  adSetCache: Map<string, AdSetCacheEntry>
) {
  validateBuild(build);

  const status = build.status || "PAUSED";
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

  const { campaign, reused } = await getOrCreateCampaign(
    metaClient,
    build,
    campaignCache
  );

  const { adSet, reused: adSetReused } = await getOrCreateAdSet(
    metaClient,
    build,
    startTime,
    campaign.campaign_id,
    adSetCache
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
      is_dynamic_creative: false,
      description: descriptionText,
      start_time: startTime,
      status,
    },
    copy_variants: {
      parents: copyVariants.parents,
      teachers: copyVariants.teachers,
      general: copyVariants.general,
      description: descriptionText,
    },
    created: {
      campaign_id: campaign.campaign_id,
      campaign_url: campaign.ads_manager_url,
      campaign_reused: reused,
      ad_set_id: adSet.ad_set_id,
      ad_set_url: adSet.ads_manager_url,
      ad_set_reused: adSetReused,
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
  try {
    validateSingleCampaign(params.builds);
  } catch (error) {
    return jsonToolResult(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      true
    );
  }

  const builds = [];
  const campaignCache = new Map<string, CampaignCacheEntry>();
  const adSetCache = new Map<string, AdSetCacheEntry>();
  let hasErrors = false;

  for (const build of params.builds) {
    try {
      builds.push(
        await runSingleBuild(metaClient, build, campaignCache, adSetCache)
      );
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
      mode: "deterministic_asset_feed_campaign",
      campaign_count: campaignCache.size,
      ad_set_count: adSetCache.size,
      ad_count: builds.filter((build) => build.success).length,
      builds,
    },
    hasErrors
  );
}
