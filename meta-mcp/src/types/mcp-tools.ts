import { z } from "zod";

// Campaign Management Schemas
export const ListCampaignsSchema = z.object({
  account_id: z.string().describe("Meta Ad Account ID"),
  status: z
    .enum(["ACTIVE", "PAUSED", "DELETED", "ARCHIVED"])
    .optional()
    .describe("Filter by campaign status"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(10)
    .describe("Number of campaigns to return"),
  after: z.string().optional().describe("Pagination cursor for next page"),
  verbose: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include full campaign fields in response"),
});

export const CreateCampaignSchema = z.object({
  account_id: z.string().describe("Meta Ad Account ID"),
  name: z.string().min(1).describe("Campaign name"),
  objective: z
    .enum([
      "OUTCOME_APP_PROMOTION",
      "OUTCOME_AWARENESS",
      "OUTCOME_ENGAGEMENT",
      "OUTCOME_LEADS",
      "OUTCOME_SALES",
      "OUTCOME_TRAFFIC",
    ])
    .describe(
      "Campaign objective using Outcome-Driven Ad Experience (ODAE) format"
    ),
  status: z
    .enum(["ACTIVE", "PAUSED"])
    .default("PAUSED")
    .describe("Initial campaign status"),
  daily_budget: z
    .number()
    .positive()
    .optional()
    .describe("Daily budget in account currency cents"),
  lifetime_budget: z
    .number()
    .positive()
    .optional()
    .describe("Lifetime budget in account currency cents"),
  start_time: z
    .string()
    .optional()
    .describe("Campaign start time (ISO 8601 format)"),
  stop_time: z
    .string()
    .optional()
    .describe("Campaign stop time (ISO 8601 format)"),
  special_ad_categories: z
    .array(
      z.enum([
        "NONE",
        "EMPLOYMENT",
        "HOUSING",
        "CREDIT",
        "SOCIAL_ISSUES_ELECTIONS_POLITICS",
      ])
    )
    .optional()
    .describe(
      "Special ad categories for regulated industries (required for legal, financial services, etc.)"
    ),
  bid_strategy: z
    .enum(["LOWEST_COST_WITHOUT_CAP", "LOWEST_COST_WITH_BID_CAP", "COST_CAP"])
    .optional()
    .describe("Bid strategy for the campaign"),
  bid_cap: z
    .number()
    .positive()
    .optional()
    .describe(
      "Bid cap amount in account currency cents (required for LOWEST_COST_WITH_BID_CAP)"
    ),
  budget_optimization: z
    .boolean()
    .optional()
    .describe("Enable campaign budget optimization across ad sets"),
});

export const UpdateCampaignSchema = z.object({
  campaign_id: z.string().describe("Campaign ID to update"),
  name: z.string().optional().describe("New campaign name"),
  status: z
    .enum(["ACTIVE", "PAUSED", "ARCHIVED"])
    .optional()
    .describe("New campaign status"),
  daily_budget: z
    .number()
    .positive()
    .optional()
    .describe("New daily budget in account currency cents"),
  lifetime_budget: z
    .number()
    .positive()
    .optional()
    .describe("New lifetime budget in account currency cents"),
  start_time: z
    .string()
    .optional()
    .describe("New campaign start time (ISO 8601 format)"),
  stop_time: z
    .string()
    .optional()
    .describe("New campaign stop time (ISO 8601 format)"),
});

export const DeleteCampaignSchema = z.object({
  campaign_id: z.string().describe("Campaign ID to delete"),
});

// Ad Set Management Schemas
export const ListAdSetsSchema = z.object({
  campaign_id: z.string().optional().describe("Filter by campaign ID"),
  account_id: z.string().optional().describe("Filter by account ID"),
  status: z
    .enum(["ACTIVE", "PAUSED", "DELETED", "ARCHIVED"])
    .optional()
    .describe("Filter by ad set status"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(10)
    .describe("Number of ad sets to return"),
  after: z.string().optional().describe("Pagination cursor for next page"),
  verbose: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include full ad set fields in response"),
});

export const CreateAdSetSchema = z.object({
  campaign_id: z.string().describe("Campaign ID for the ad set"),
  name: z.string().min(1).describe("Ad set name"),
  daily_budget: z
    .number()
    .positive()
    .optional()
    .describe("Daily budget in account currency cents"),
  lifetime_budget: z
    .number()
    .positive()
    .optional()
    .describe("Lifetime budget in account currency cents"),
  optimization_goal: z
    .string()
    .describe("Optimization goal (e.g., LINK_CLICKS, CONVERSIONS)"),
  billing_event: z
    .string()
    .describe("Billing event (e.g., LINK_CLICKS, IMPRESSIONS)"),
  bid_amount: z
    .number()
    .positive()
    .optional()
    .describe("Bid amount in account currency cents"),
  start_time: z
    .string()
    .optional()
    .describe("Ad set start time (ISO 8601 format)"),
  end_time: z.string().optional().describe("Ad set end time (ISO 8601 format)"),
  promoted_object: z
    .object({
      page_id: z.string().optional().describe("Facebook Page ID to promote"),
      pixel_id: z
        .string()
        .optional()
        .describe("Facebook Pixel ID for tracking"),
      smart_pse_enabled: z
        .boolean()
        .optional()
        .describe("Smart PSE toggle for purchase optimization"),
      application_id: z
        .string()
        .optional()
        .describe("Application ID for app promotion"),
      object_store_url: z
        .string()
        .optional()
        .describe("App store URL for app promotion"),
      custom_event_type: z
        .string()
        .optional()
        .describe("Custom event type for conversion tracking"),
    })
    .optional()
    .describe(
      "Object being promoted - required for certain campaign objectives like OUTCOME_TRAFFIC"
    ),
  attribution_spec: z
    .array(
      z.object({
        event_type: z
          .enum(["CLICK_THROUGH", "VIEW_THROUGH"])
          .default("CLICK_THROUGH"),
        window_days: z.number().min(1).max(90).default(1),
      })
    )
    .default([{ event_type: "CLICK_THROUGH", window_days: 1 }])
    .describe(
      "Attribution specification for tracking conversions - REQUIRED by Meta API"
    ),
  destination_type: z
    .enum([
      "WEBSITE",
      "ON_AD",
      "FACEBOOK",
      "INSTAGRAM",
      "MESSENGER",
      "WHATSAPP",
      "UNDEFINED",
    ])
    .optional()
    .describe("Destination type when the specific ad set flow requires it"),
  is_dynamic_creative: z
    .boolean()
    .optional()
    .describe("Whether to use dynamic creative optimization"),
  use_new_app_click: z
    .boolean()
    .optional()
    .describe("Whether to use new app click attribution"),
  configured_status: z
    .enum(["ACTIVE", "PAUSED"])
    .optional()
    .describe("Configured status field when the specific ad set flow requires it"),
  optimization_sub_event: z
    .enum([
      "NONE",
      "VIDEO_PLAY",
      "APP_INSTALL",
      "LINK_CLICK",
      "LEAD_GROUPED",
      "PURCHASE",
    ])
    .optional()
    .describe("Optimization sub-event when the specific optimization flow requires it"),
  recurring_budget_semantics: z
    .boolean()
    .optional()
    .describe("Recurring budget semantics when required"),
  targeting: z
    .object({
      age_min: z
        .number()
        .min(13)
        .max(65)
        .optional()
        .describe("Minimum age for targeting"),
      age_max: z
        .number()
        .min(13)
        .max(65)
        .optional()
        .describe("Maximum age for targeting"),
      genders: z
        .array(z.number().min(1).max(2))
        .optional()
        .describe("Gender targeting (1=male, 2=female)"),
      geo_locations: z
        .object({
          countries: z
            .array(z.string())
            .optional()
            .describe("Country codes for targeting"),
          location_types: z
            .array(z.enum(["home", "recent"]))
            .optional()
            .describe("Location types for targeting when needed"),
          regions: z
            .array(z.object({ key: z.string() }))
            .optional()
            .describe("Region targeting"),
          cities: z
            .array(
              z.object({
                key: z.string(),
                radius: z.number().optional(),
                distance_unit: z.enum(["mile", "kilometer"]).optional(),
              })
            )
            .optional()
            .describe("City targeting with optional radius"),
        })
        .optional()
        .describe("Geographic targeting"),
      interests: z
        .array(
          z.object({
            id: z.string(),
            name: z.string().optional(),
          })
        )
        .optional()
        .describe("Interest targeting"),
      behaviors: z
        .array(
          z.object({
            id: z.string(),
            name: z.string().optional(),
          })
        )
        .optional()
        .describe("Behavior targeting"),
      custom_audiences: z
        .array(z.string())
        .optional()
        .describe("Custom audience IDs"),
      lookalike_audiences: z
        .array(z.string())
        .optional()
        .describe("Lookalike audience IDs"),
      device_platforms: z
        .array(z.enum(["mobile", "desktop"]))
        .optional()
        .describe("Device platform targeting"),
      publisher_platforms: z
        .array(z.enum(["facebook", "instagram", "messenger", "whatsapp"]))
        .optional()
        .describe("Publisher platform targeting"),
      targeting_optimization: z
        .enum(["none", "expansion_all"])
        .optional()
        .describe("Targeting optimization setting"),
      brand_safety_content_filter_levels: z
        .array(
          z.enum([
            "FACEBOOK_STANDARD",
            "FACEBOOK_RELAXED",
            "AN_STANDARD",
            "AN_RELAXED",
            "RESTRICTIVE",
          ])
        )
        .optional()
        .describe("Brand safety content filter levels"),
      targeting_automation: z
        .object({
          advantage_audience: z.number().optional(),
          individual_setting: z
            .object({
              age: z.number().optional(),
              gender: z.number().optional(),
            })
            .optional(),
        })
        .optional()
        .describe("Advantage Audience automation settings"),
    })
    .optional()
    .describe("Targeting parameters"),
  status: z
    .enum(["ACTIVE", "PAUSED"])
    .default("PAUSED")
    .describe("Initial ad set status"),
});

// Analytics Schemas
export const GetInsightsSchema = z.object({
  object_id: z
    .string()
    .describe("ID of campaign, ad set, or ad to get insights for"),
  level: z
    .enum(["account", "campaign", "adset", "ad"])
    .describe("Level of insights to retrieve"),
  date_preset: z
    .enum([
      "today",
      "yesterday",
      "this_week",
      "last_week",
      "this_month",
      "last_month",
      "this_quarter",
      "last_quarter",
      "this_year",
      "last_year",
      "lifetime",
    ])
    .optional()
    .describe("Date preset for insights"),
  time_range: z
    .object({
      since: z.string().describe("Start date (YYYY-MM-DD)"),
      until: z.string().describe("End date (YYYY-MM-DD)"),
    })
    .optional()
    .describe("Custom date range for insights"),
  fields: z
    .array(z.string())
    .optional()
    .describe("Specific fields to retrieve (e.g., impressions, clicks, spend)"),
  metric_preset: z
    .enum(["delivery", "traffic", "ecommerce", "creative_testing"])
    .optional()
    .describe("Vetted field preset for insights metrics"),
  breakdowns: z
    .array(z.string())
    .optional()
    .describe("Breakdown dimensions (e.g., age, gender, placement)"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(10)
    .describe("Number of insights to return"),
  verbose: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include all raw insight fields in response"),
});

export const GetRoasReportSchema = z.object({
  object_id: z
    .string()
    .describe("ID of campaign, ad set, or ad to get ROAS report for"),
  level: z
    .enum(["account", "campaign", "adset", "ad"])
    .describe("Level of insights to retrieve"),
  date_preset: z
    .enum([
      "today",
      "yesterday",
      "this_week",
      "last_week",
      "this_month",
      "last_month",
      "this_quarter",
      "last_quarter",
      "this_year",
      "last_year",
      "lifetime",
    ])
    .optional()
    .describe("Date preset for insights"),
  time_range: z
    .object({
      since: z.string().describe("Start date (YYYY-MM-DD)"),
      until: z.string().describe("End date (YYYY-MM-DD)"),
    })
    .optional()
    .describe("Custom date range for insights"),
  breakdowns: z
    .array(z.string())
    .optional()
    .describe("Breakdown dimensions (e.g., age, gender, placement)"),
  attribution_window: z
    .enum(["default", "1d_click", "7d_click", "28d_click", "1d_view", "1d_ev"])
    .optional()
    .default("default")
    .describe("Attribution window to use for conversion metrics"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(50)
    .describe("Number of insight rows to return"),
});

export const ComparePerformanceSchema = z.object({
  object_ids: z
    .array(z.string())
    .min(2)
    .max(10)
    .describe("IDs of campaigns/ad sets/ads to compare"),
  level: z
    .enum(["campaign", "adset", "ad"])
    .describe("Level of objects being compared"),
  date_preset: z
    .enum([
      "today",
      "yesterday",
      "this_week",
      "last_week",
      "this_month",
      "last_month",
      "this_quarter",
      "last_quarter",
      "this_year",
      "last_year",
      "lifetime",
    ])
    .optional()
    .describe("Date preset for comparison"),
  time_range: z
    .object({
      since: z.string().describe("Start date (YYYY-MM-DD)"),
      until: z.string().describe("End date (YYYY-MM-DD)"),
    })
    .optional()
    .describe("Custom date range for comparison"),
  metrics: z
    .array(z.string())
    .default(["impressions", "clicks", "spend", "ctr", "cpc"])
    .describe("Metrics to compare"),
});

export const ExportInsightsSchema = z.object({
  object_id: z
    .string()
    .describe("ID of campaign, ad set, or ad to export insights for"),
  level: z
    .enum(["account", "campaign", "adset", "ad"])
    .describe("Level of insights to export"),
  format: z.enum(["csv", "json"]).default("csv").describe("Export format"),
  date_preset: z
    .enum([
      "today",
      "yesterday",
      "this_week",
      "last_week",
      "this_month",
      "last_month",
      "this_quarter",
      "last_quarter",
      "this_year",
      "last_year",
      "lifetime",
    ])
    .optional()
    .describe("Date preset for export"),
  time_range: z
    .object({
      since: z.string().describe("Start date (YYYY-MM-DD)"),
      until: z.string().describe("End date (YYYY-MM-DD)"),
    })
    .optional()
    .describe("Custom date range for export"),
  fields: z.array(z.string()).optional().describe("Specific fields to export"),
  breakdowns: z
    .array(z.string())
    .optional()
    .describe("Breakdown dimensions to include"),
});

// Audience Management Schemas
export const ListAudiencesSchema = z.object({
  account_id: z.string().describe("Meta Ad Account ID"),
  type: z
    .enum(["custom", "lookalike", "saved"])
    .optional()
    .describe("Filter by audience type"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(10)
    .describe("Number of audiences to return"),
  after: z.string().optional().describe("Pagination cursor for next page"),
  verbose: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include full audience fields in response"),
});

export const CreateCustomAudienceSchema = z.object({
  account_id: z.string().describe("Meta Ad Account ID"),
  name: z.string().min(1).describe("Custom audience name"),
  description: z.string().optional().describe("Custom audience description"),
  subtype: z
    .enum([
      "CUSTOM",
      "WEBSITE",
      "APP",
      "OFFLINE_CONVERSION",
      "CLAIM",
      "PARTNER",
      "VIDEO",
      "BAG_OF_ACCOUNTS",
      "STUDY_RULE_AUDIENCE",
      "FOX",
    ])
    .describe("Custom audience subtype"),
  customer_file_source: z
    .enum([
      "USER_PROVIDED_ONLY",
      "PARTNER_PROVIDED_ONLY",
      "BOTH_USER_AND_PARTNER_PROVIDED",
    ])
    .optional()
    .describe("Customer file source"),
  retention_days: z
    .number()
    .min(1)
    .max(180)
    .optional()
    .describe("Retention days for the audience"),
  rule: z
    .any()
    .optional()
    .describe("Rule definition for the audience (depends on subtype)"),
});

export const CreateLookalikeAudienceSchema = z.object({
  account_id: z.string().describe("Meta Ad Account ID"),
  name: z.string().min(1).describe("Lookalike audience name"),
  origin_audience_id: z.string().describe("ID of the source custom audience"),
  country: z.string().describe("Country code for the lookalike audience"),
  ratio: z
    .number()
    .min(0.01)
    .max(0.2)
    .describe("Ratio of the population to target (0.01 = 1%, 0.2 = 20%)"),
  description: z.string().optional().describe("Lookalike audience description"),
});

export const EstimateAudienceSizeSchema = z.object({
  account_id: z.string().describe("Meta Ad Account ID"),
  targeting: z
    .object({
      age_min: z
        .number()
        .min(13)
        .max(65)
        .optional()
        .describe("Minimum age for targeting"),
      age_max: z
        .number()
        .min(13)
        .max(65)
        .optional()
        .describe("Maximum age for targeting"),
      genders: z
        .array(z.number().min(1).max(2))
        .optional()
        .describe("Gender targeting (1=male, 2=female)"),
      geo_locations: z
        .object({
          countries: z
            .array(z.string())
            .optional()
            .describe("Country codes for targeting"),
          regions: z
            .array(z.object({ key: z.string() }))
            .optional()
            .describe("Region targeting"),
          cities: z
            .array(
              z.object({
                key: z.string(),
                radius: z.number().optional(),
                distance_unit: z.enum(["mile", "kilometer"]).optional(),
              })
            )
            .optional()
            .describe("City targeting with optional radius"),
        })
        .optional()
        .describe("Geographic targeting"),
      interests: z
        .array(
          z.object({
            id: z.string(),
            name: z.string().optional(),
          })
        )
        .optional()
        .describe("Interest targeting"),
      behaviors: z
        .array(
          z.object({
            id: z.string(),
            name: z.string().optional(),
          })
        )
        .optional()
        .describe("Behavior targeting"),
      custom_audiences: z
        .array(z.string())
        .optional()
        .describe("Custom audience IDs"),
      lookalike_audiences: z
        .array(z.string())
        .optional()
        .describe("Lookalike audience IDs"),
    })
    .describe("Targeting parameters for size estimation"),
  optimization_goal: z.string().describe("Optimization goal for the estimate"),
});

// OAuth Tool Schemas
export const GenerateAuthUrlSchema = z.object({
  scopes: z
    .array(z.string())
    .optional()
    .default(["ads_management"])
    .describe("OAuth scopes to request"),
  state: z.string().optional().describe("State parameter for security"),
});

export const ExchangeCodeSchema = z.object({
  code: z.string().describe("Authorization code from OAuth redirect"),
});

export const RefreshTokenSchema = z.object({
  short_lived_token: z
    .string()
    .optional()
    .describe(
      "Short-lived token to exchange (optional, uses current if not provided)"
  ),
});

export const CreateAdSchema = z.object({
  ad_set_id: z.string().describe("Ad set ID where this ad will be created"),
  name: z.string().min(1).describe("Ad name"),
  creative_id: z.string().describe("Existing creative ID to attach to the ad"),
  status: z
    .enum(["ACTIVE", "PAUSED"])
    .optional()
    .default("PAUSED")
    .describe("Initial ad status"),
});

export const GenerateSystemTokenSchema = z.object({
  system_user_id: z.string().describe("System user ID"),
  scopes: z
    .array(z.string())
    .optional()
    .default(["ads_management"])
    .describe("Scopes for the system user token"),
  expiring_token: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      "Whether to generate an expiring token (60 days) or non-expiring"
    ),
});

// Creative Management Schemas
export const ListCreativesSchema = z.object({
  account_id: z.string().describe("Meta Ad Account ID"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(10)
    .describe("Number of creatives to return"),
  after: z.string().optional().describe("Pagination cursor for next page"),
  verbose: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include full creative fields in response"),
});

export const CreateAdCreativeSchema = z.object({
  account_id: z.string().describe("Meta Ad Account ID"),
  name: z.string().min(1).describe("Creative name"),
  page_id: z
    .string()
    .describe("Facebook Page ID (required for object_story_spec)"),
  message: z.string().optional().describe("Primary ad text/message"),
  messages: z
    .array(z.string().min(1))
    .min(1)
    .optional()
    .describe("Multiple primary text variants for asset_feed_spec creatives"),
  headline: z.string().optional().describe("Ad title/headline"),
  headlines: z
    .array(z.string().min(1))
    .min(1)
    .optional()
    .describe("Multiple headline variants for asset_feed_spec creatives"),
  picture: z
    .string()
    .url()
    .optional()
    .describe("External image URL - must be publicly accessible"),
  image_hash: z
    .string()
    .optional()
    .describe("Pre-uploaded image hash (alternative to picture URL)"),
  video_id: z.string().optional().describe("Video ID for video creatives"),
  call_to_action_type: z
    .enum([
      "LEARN_MORE",
      "SHOP_NOW",
      "SIGN_UP",
      "DOWNLOAD",
      "BOOK_TRAVEL",
      "LISTEN_MUSIC",
      "WATCH_VIDEO",
      "GET_QUOTE",
      "CONTACT_US",
      "APPLY_NOW",
      "GET_DIRECTIONS",
      "CALL_NOW",
      "MESSAGE_PAGE",
      "SUBSCRIBE",
      "BOOK_NOW",
      "ORDER_NOW",
      "DONATE_NOW",
      "SAY_THANKS",
      "SELL_NOW",
      "SHARE",
      "OPEN_LINK",
      "LIKE_PAGE",
      "FOLLOW_PAGE",
      "FOLLOW_USER",
      "REQUEST_TIME",
      "VISIT_PAGES_FEED",
      "USE_APP",
      "PLAY_GAME",
      "INSTALL_APP",
      "USE_MOBILE_APP",
      "INSTALL_MOBILE_APP",
      "OPEN_MOVIES",
      "AUDIO_CALL",
      "VIDEO_CALL",
      "GET_OFFER",
      "GET_OFFER_VIEW",
      "BUY_NOW",
      "ADD_TO_CART",
      "SELL",
      "GIFT_WRAP",
      "MAKE_AN_OFFER",
    ])
    .optional()
    .describe("Call to action button type (40+ supported types)"),
  link_url: z
    .string()
    .url()
    .describe(
      "Destination URL where users will be directed when clicking the ad"
    ),
  description: z.string().optional().describe("Additional description text"),
  descriptions: z
    .array(z.string().min(1))
    .min(1)
    .optional()
    .describe("Multiple description variants for asset_feed_spec creatives"),
  instagram_user_id: z
    .string()
    .optional()
    .describe("Instagram user ID for the creative identity"),
  adlabels: z
    .array(z.string())
    .optional()
    .describe("Ad labels for organization and tracking"),
  // v23.0 Standard Enhancements (new structure)
  enable_standard_enhancements: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Enable v23.0 Standard Enhancements with individual feature control"
    ),
  enhancement_features: z
    .object({
      enhance_cta: z
        .boolean()
        .optional()
        .default(true)
        .describe("Enhance call-to-action buttons"),
      image_brightness_and_contrast: z
        .boolean()
        .optional()
        .default(true)
        .describe("Auto-adjust image brightness and contrast"),
      text_improvements: z
        .boolean()
        .optional()
        .default(true)
        .describe("Improve ad text readability"),
      image_templates: z
        .boolean()
        .optional()
        .default(false)
        .describe("Apply image templates and frames"),
    })
    .optional()
    .describe("Individual enhancement features for v23.0 compliance"),
  attachment_style: z
    .enum(["link", "album"])
    .optional()
    .default("link")
    .describe("Attachment style for link ads"),
  caption: z
    .string()
    .optional()
    .describe("Caption text (typically domain name)"),
});

export const StructuredAdBuildItemSchema = z.object({
  key: z.string().optional().describe("Stable key for this build item in the result payload"),
  account_id: z.string().describe("Meta Ad Account ID"),
  page_id: z.string().describe("Facebook Page ID for the creative"),
  instagram_user_id: z
    .string()
    .optional()
    .describe("Instagram user ID for the creative identity"),
  pixel_id: z.string().describe("Pixel ID for the promoted object"),
  countries: z
    .array(z.string().min(2))
    .min(1)
    .describe("Country codes to target in the ad set"),
  campaign_name: z.string().min(1).describe("Campaign name"),
  ad_set_name: z.string().min(1).describe("Ad set name"),
  creative_name: z.string().min(1).describe("Creative name"),
  ad_name: z.string().min(1).describe("Ad name"),
  destination_url: z
    .string()
    .url()
    .describe("Destination URL for the ad click"),
  daily_budget_major: z
    .number()
    .positive()
    .describe("Daily budget in major currency units, for example 18 for EUR 18/day"),
  start_time: z
    .string()
    .optional()
    .describe("Ad set start time in ISO 8601 format"),
  image_path: z
    .string()
    .optional()
    .describe("Absolute local file path for the image to upload"),
  image_hash: z
    .string()
    .optional()
    .describe("Existing Meta image hash to reuse instead of uploading"),
  image_name: z.string().optional().describe("Optional image library name"),
  language: z
    .string()
    .min(1)
    .describe("Language code for localization, for example et, lt, lv, pt, en"),
  country: z
    .string()
    .min(2)
    .describe("Country code for localization, for example EE, LT, LV, PT"),
  copy_variants: z
    .object({
      description: z
        .string()
        .min(1)
        .optional()
        .describe("Ad description in '<brand_or_domain> | <text>' format"),
      parents: z.object({
        headline: z.string().min(1).describe("Audience-specific headline for the parents angle"),
        primary_text: z
          .string()
          .min(1)
          .describe("Audience-specific primary text for the parents angle"),
      }),
      teachers: z.object({
        headline: z.string().min(1).describe("Audience-specific headline for the teachers angle"),
        primary_text: z
          .string()
          .min(1)
          .describe("Audience-specific primary text for the teachers angle"),
      }),
      general: z.object({
        headline: z.string().min(1).describe("Audience-specific headline for the general angle"),
        primary_text: z
          .string()
          .min(1)
          .describe("Audience-specific primary text for the general angle"),
      }),
    })
    .describe("Explicit copy variants prepared by the agent before the structured build runs"),
  call_to_action_type: z
    .enum([
      "LEARN_MORE",
      "SHOP_NOW",
      "SIGN_UP",
      "DOWNLOAD",
      "BOOK_TRAVEL",
      "LISTEN_MUSIC",
      "WATCH_VIDEO",
      "GET_QUOTE",
      "CONTACT_US",
      "APPLY_NOW",
      "GET_DIRECTIONS",
      "CALL_NOW",
      "MESSAGE_PAGE",
      "SUBSCRIBE",
      "BOOK_NOW",
      "ORDER_NOW",
      "DONATE_NOW",
      "SAY_THANKS",
      "SELL_NOW",
      "SHARE",
      "OPEN_LINK",
      "LIKE_PAGE",
      "FOLLOW_PAGE",
      "FOLLOW_USER",
      "REQUEST_TIME",
      "VISIT_PAGES_FEED",
      "USE_APP",
      "PLAY_GAME",
      "INSTALL_APP",
      "USE_MOBILE_APP",
      "INSTALL_MOBILE_APP",
      "OPEN_MOVIES",
      "AUDIO_CALL",
      "VIDEO_CALL",
      "GET_OFFER",
      "GET_OFFER_VIEW",
      "BUY_NOW",
      "ADD_TO_CART",
      "SELL",
      "GIFT_WRAP",
      "MAKE_AN_OFFER",
    ])
    .optional()
    .default("SHOP_NOW")
    .describe("Call to action button type"),
  status: z
    .enum(["ACTIVE", "PAUSED"])
    .optional()
    .default("PAUSED")
    .describe("Initial status for campaign, ad set, and ad"),
  special_ad_categories: z
    .array(z.string())
    .optional()
    .default(["NONE"])
    .describe("Special ad categories for campaign creation"),
  publisher_platforms: z
    .array(z.string())
    .optional()
    .default(["facebook", "instagram"])
    .describe("Publisher platforms to target"),
});

export const RunStructuredAdBuildSchema = z.object({
  builds: z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return value;
      }

      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    },
    z
      .array(StructuredAdBuildItemSchema)
      .min(1)
      .describe("One or more deterministic Meta ad builds to run")
  ),
});

const CreativeBriefSchema = z.object({
  objective: z.string().min(1).describe("Campaign objective for this creative"),
  audience: z.string().min(1).describe("Who this creative is for"),
  awareness_stage: z
    .string()
    .min(1)
    .describe("Audience awareness stage (cold, warm, hot, etc.)"),
  angle: z.string().min(1).describe("Primary messaging angle"),
  offer: z.string().min(1).describe("Offer being promoted"),
  proof_type: z
    .string()
    .min(1)
    .describe("Proof mechanism (review, stats, authority, etc.)"),
  cta: z.string().min(1).describe("Exact call to action"),
  landing_page: z.string().url().describe("Destination URL for this creative"),
});

export const CreateCreativeGenerationBatchSchema = z.object({
  concept: z.string().optional().describe("Optional audit label for the batch"),
  template_id: z
    .string()
    .min(1)
    .optional()
    .describe("Optional template id used by the prompt builder"),
  creative_brief: CreativeBriefSchema.optional().describe(
    "Optional structured brief for audit metadata"
  ),
  creative_description: z
    .string()
    .optional()
    .describe("Optional audit description of what the visual should communicate"),
  aspect_ratio: z
    .enum(["1:1", "4:5", "9:16", "16:9"])
    .optional()
    .default("1:1")
    .describe("Target aspect ratio for generated candidates"),
  full_count: z
    .number()
    .int()
    .min(0)
    .optional()
    .default(1)
    .describe("How many full (with text) candidates to generate"),
  visual_only_count: z
    .number()
    .int()
    .min(0)
    .optional()
    .default(0)
    .describe("How many visual-only (no text) candidates to generate"),
  generation_mode: z
    .enum(["interactive", "deferred_batch"])
    .optional()
    .default("interactive")
    .describe("Generation execution mode"),
  language: z
    .string()
    .optional()
    .default("en")
    .describe("Language code used for prompt localization"),
  country: z
    .string()
    .optional()
    .default("US")
    .describe("Country code used for localization context"),
  overlay_text: z
    .array(z.string().min(1))
    .optional()
    .describe("Optional audit list of text overlays already included in the prompt"),
  reference_images: z
    .array(z.string().min(1))
    .min(1)
    .describe("Local paths or URLs for worksheet/product reference images"),
  full_prompt: z
    .string()
    .min(1)
    .optional()
    .describe("Complete full-mode prompt sent directly to Gemini"),
  visual_only_prompt: z
    .string()
    .min(1)
    .optional()
    .describe("Complete visual-only prompt sent directly to Gemini"),
  plan_notes: z
    .string()
    .optional()
    .describe("Optional planner notes for auditability"),
});

export const GenerationBatchIdSchema = z.object({
  batch_id: z.string().min(1).describe("Generation batch ID"),
});

export const ApproveCreativeCandidateSchema = z.object({
  batch_id: z.string().min(1).describe("Generation batch ID"),
  candidate_id: z.string().min(1).describe("Candidate ID to approve"),
});

export const ProvideFinalOverlayAssetSchema = z.object({
  batch_id: z.string().min(1).describe("Generation batch ID"),
  candidate_id: z.string().min(1).describe("Approved visual-only candidate ID"),
  final_image_path: z
    .string()
    .min(1)
    .describe("Absolute local path to final manually overlaid image"),
});

export const EditCandidatePromptSchema = z.object({
  batch_id: z.string().min(1).describe("Generation batch ID"),
  candidate_id: z.string().min(1).describe("Candidate ID to branch from"),
  prompt_delta: z
    .string()
    .min(1)
    .describe("Prompt adjustment instructions to apply"),
});

export const RestartGenerationBatchSchema = z.object({
  batch_id: z.string().min(1).describe("Generation batch ID"),
  concept: z
    .string()
    .optional()
    .describe("Optional replacement concept for restart"),
  template_id: z
    .string()
    .optional()
    .describe("Optional replacement template id"),
  full_count: z.number().int().min(0).optional().describe("Replacement full count"),
  visual_only_count: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Replacement visual-only count"),
  generation_mode: z
    .enum(["interactive", "deferred_batch"])
    .optional()
    .describe("Replacement generation mode"),
});
export const PreviewAdSchema = z.object({
  creative_id: z.string().describe("Creative ID to preview"),
  ad_format: z
    .enum([
      "DESKTOP_FEED_STANDARD",
      "MOBILE_FEED_STANDARD",
      "MOBILE_FEED_BASIC",
      "MOBILE_BANNER",
      "MOBILE_MEDIUM_RECTANGLE",
      "MOBILE_FULLWIDTH",
      "MOBILE_INTERSTITIAL",
      "INSTAGRAM_STANDARD",
      "INSTAGRAM_STORY",
    ])
    .describe("Ad format for preview"),
  product_item_ids: z
    .array(z.string())
    .optional()
    .describe("Product item IDs for dynamic ads"),
});

// Enhanced Creative Tool Schemas
export const TroubleshootCreativeSchema = z.object({
  issue_description: z
    .string()
    .min(5)
    .describe(
      "Describe the creative issue you're experiencing or paste the error message"
    ),
  creative_type: z
    .enum(["image", "video", "carousel", "collection"])
    .optional()
    .describe("Type of creative experiencing issues"),
});

export const AnalyzeCreativesSchema = z.object({
  account_id: z.string().describe("Meta Ad Account ID to analyze"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(50)
    .describe("Maximum number of creatives to analyze"),
});

export const CreativeValidationEnhancedSchema = z.object({
  account_id: z.string().describe("Meta Ad Account ID"),
  name: z.string().min(1).describe("Creative name"),
  page_id: z
    .string()
    .describe("Facebook Page ID (required for object_story_spec)"),
  message: z.string().describe("Primary ad text/message"),
  headline: z.string().optional().describe("Ad title/headline"),
  picture: z
    .string()
    .url()
    .optional()
    .describe("External image URL - must be publicly accessible"),
  image_hash: z
    .string()
    .optional()
    .describe("Pre-uploaded image hash (alternative to picture URL)"),
  video_id: z.string().optional().describe("Video ID for video creatives"),
  call_to_action_type: z
    .enum([
      "LEARN_MORE",
      "SHOP_NOW",
      "SIGN_UP",
      "DOWNLOAD",
      "BOOK_TRAVEL",
      "LISTEN_MUSIC",
      "WATCH_VIDEO",
      "GET_QUOTE",
      "CONTACT_US",
      "APPLY_NOW",
      "GET_DIRECTIONS",
      "CALL_NOW",
      "MESSAGE_PAGE",
      "SUBSCRIBE",
      "BOOK_NOW",
      "ORDER_NOW",
      "DONATE_NOW",
      "SAY_THANKS",
      "SELL_NOW",
      "SHARE",
      "OPEN_LINK",
      "LIKE_PAGE",
      "FOLLOW_PAGE",
      "FOLLOW_USER",
      "REQUEST_TIME",
      "VISIT_PAGES_FEED",
      "USE_APP",
      "PLAY_GAME",
      "INSTALL_APP",
      "USE_MOBILE_APP",
      "INSTALL_MOBILE_APP",
      "OPEN_MOVIES",
      "AUDIO_CALL",
      "VIDEO_CALL",
      "GET_OFFER",
      "GET_OFFER_VIEW",
      "BUY_NOW",
      "ADD_TO_CART",
      "SELL",
      "GIFT_WRAP",
      "MAKE_AN_OFFER",
    ])
    .optional()
    .describe("Call to action button type (40+ supported types)"),
  link_url: z
    .string()
    .url()
    .optional()
    .describe(
      "Destination URL where users will be directed when clicking the ad"
    ),
  description: z.string().optional().describe("Additional description text"),
  instagram_user_id: z
    .string()
    .optional()
    .describe("Instagram user ID for the creative identity"),
  adlabels: z
    .array(z.string())
    .optional()
    .describe("Ad labels for organization and tracking"),
  enable_standard_enhancements: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Enable v23.0 Standard Enhancements with individual feature control"
    ),
  enhancement_features: z
    .object({
      enhance_cta: z
        .boolean()
        .optional()
        .default(true)
        .describe("Enhance call-to-action buttons"),
      image_brightness_and_contrast: z
        .boolean()
        .optional()
        .default(true)
        .describe("Auto-adjust image brightness and contrast"),
      text_improvements: z
        .boolean()
        .optional()
        .default(true)
        .describe("Improve ad text readability"),
      image_templates: z
        .boolean()
        .optional()
        .default(false)
        .describe("Apply image templates and frames"),
    })
    .optional()
    .describe("Individual enhancement features for v23.0 compliance"),
  attachment_style: z
    .enum(["link", "album"])
    .optional()
    .default("link")
    .describe("Attachment style for link ads"),
  caption: z
    .string()
    .optional()
    .describe("Caption text (typically domain name)"),
});

// Upload Image from URL Schema
export const UploadImageFromUrlSchema = z.object({
  account_id: z.string().describe("Meta Ad Account ID (with act_ prefix)"),
  image_url: z
    .string()
    .url()
    .describe("URL of the image to download and upload to Meta"),
  image_name: z
    .string()
    .optional()
    .describe("Optional custom name for the uploaded image"),
});

export const UploadCreativeAssetSchema = z.object({
  account_id: z.string().describe("Meta Ad Account ID (with act_ prefix)"),
  file_path: z.string().describe("Absolute local file path to the image asset"),
  image_name: z
    .string()
    .optional()
    .describe("Optional custom name for the uploaded image"),
});

export const ExtractTargetPageFactsSchema = z.object({
  target_url: z.string().url().describe("Target URL to extract lightweight facts from"),
  max_items: z
    .number()
    .min(1)
    .max(50)
    .optional()
    .default(20)
    .describe("Maximum number of extracted keyword lines to return"),
});

// Type exports for runtime use
export type ListCampaignsParams = z.infer<typeof ListCampaignsSchema>;
export type CreateCampaignParams = z.infer<typeof CreateCampaignSchema>;
export type UpdateCampaignParams = z.infer<typeof UpdateCampaignSchema>;
export type DeleteCampaignParams = z.infer<typeof DeleteCampaignSchema>;
export type ListAdSetsParams = z.infer<typeof ListAdSetsSchema>;
export type CreateAdSetParams = z.infer<typeof CreateAdSetSchema>;
export type CreateAdParams = z.infer<typeof CreateAdSchema>;
export type GetInsightsParams = z.infer<typeof GetInsightsSchema>;
export type GetRoasReportParams = z.infer<typeof GetRoasReportSchema>;
export type ComparePerformanceParams = z.infer<typeof ComparePerformanceSchema>;
export type ExportInsightsParams = z.infer<typeof ExportInsightsSchema>;
export type ListAudiencesParams = z.infer<typeof ListAudiencesSchema>;
export type CreateCustomAudienceParams = z.infer<
  typeof CreateCustomAudienceSchema
>;
export type CreateLookalikeAudienceParams = z.infer<
  typeof CreateLookalikeAudienceSchema
>;
export type EstimateAudienceSizeParams = z.infer<
  typeof EstimateAudienceSizeSchema
>;
export type ListCreativesParams = z.infer<typeof ListCreativesSchema>;
export type CreateAdCreativeParams = z.infer<typeof CreateAdCreativeSchema>;
export type StructuredAdBuildItemParams = z.infer<typeof StructuredAdBuildItemSchema>;
export type RunStructuredAdBuildParams = z.infer<typeof RunStructuredAdBuildSchema>;
export type CreateCreativeGenerationBatchParams = z.infer<
  typeof CreateCreativeGenerationBatchSchema
>;
export type GenerationBatchIdParams = z.infer<typeof GenerationBatchIdSchema>;
export type ApproveCreativeCandidateParams = z.infer<
  typeof ApproveCreativeCandidateSchema
>;
export type ProvideFinalOverlayAssetParams = z.infer<
  typeof ProvideFinalOverlayAssetSchema
>;
export type EditCandidatePromptParams = z.infer<typeof EditCandidatePromptSchema>;
export type RestartGenerationBatchParams = z.infer<
  typeof RestartGenerationBatchSchema
>;
export type PreviewAdParams = z.infer<typeof PreviewAdSchema>;
export type GenerateAuthUrlParams = z.infer<typeof GenerateAuthUrlSchema>;
export type ExchangeCodeParams = z.infer<typeof ExchangeCodeSchema>;
export type RefreshTokenParams = z.infer<typeof RefreshTokenSchema>;
export type GenerateSystemTokenParams = z.infer<
  typeof GenerateSystemTokenSchema
>;
export type TroubleshootCreativeParams = z.infer<
  typeof TroubleshootCreativeSchema
>;
export type AnalyzeCreativesParams = z.infer<typeof AnalyzeCreativesSchema>;
export type CreativeValidationEnhancedParams = z.infer<
  typeof CreativeValidationEnhancedSchema
>;
export type UploadImageFromUrlParams = z.infer<typeof UploadImageFromUrlSchema>;
export type UploadCreativeAssetParams = z.infer<
  typeof UploadCreativeAssetSchema
>;
export type ExtractTargetPageFactsParams = z.infer<
  typeof ExtractTargetPageFactsSchema
>;
