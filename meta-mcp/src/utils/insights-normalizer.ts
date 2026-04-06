import type {
  AdInsights,
  AdsActionStat,
  NormalizedInsightsRow,
} from "../types/meta-api.js";

export const ECOMMERCE_INSIGHTS_FIELDS = [
  "impressions",
  "clicks",
  "spend",
  "reach",
  "frequency",
  "ctr",
  "cpc",
  "cpm",
  "actions",
  "action_values",
  "cost_per_action_type",
  "purchase_roas",
  "website_purchase_roas",
  "mobile_app_purchase_roas",
] as const;

export const INSIGHTS_FIELD_PRESETS = {
  delivery: ["impressions", "reach", "frequency", "spend", "cpm"],
  traffic: [
    "impressions",
    "clicks",
    "spend",
    "ctr",
    "cpc",
    "cpm",
    "actions",
    "cost_per_action_type",
  ],
  ecommerce: [...ECOMMERCE_INSIGHTS_FIELDS],
  creative_testing: [
    "impressions",
    "clicks",
    "spend",
    "reach",
    "ctr",
    "cpc",
    "cpm",
    "actions",
    "cost_per_action_type",
  ],
} as const;

export type InsightsMetricPreset = keyof typeof INSIGHTS_FIELD_PRESETS;

export const SUPPORTED_ATTRIBUTION_WINDOWS = [
  "default",
  "1d_click",
  "7d_click",
  "28d_click",
  "1d_view",
  "1d_ev",
] as const;

const PURCHASE_ACTION_PRIORITY = [
  "offsite_conversion.fb_pixel_purchase",
  "omni_purchase",
  "purchase",
];

const PURCHASE_VALUE_PRIORITY = [
  "offsite_conversion.fb_pixel_purchase",
  "omni_purchase",
  "purchase",
];

const ADD_TO_CART_PRIORITY = [
  "offsite_conversion.fb_pixel_add_to_cart",
  "omni_add_to_cart",
  "add_to_cart",
];

const INITIATE_CHECKOUT_PRIORITY = [
  "offsite_conversion.fb_pixel_initiate_checkout",
  "omni_initiated_checkout",
  "initiate_checkout",
];

const LANDING_PAGE_VIEW_PRIORITY = [
  "landing_page_view",
  "omni_landing_page_view",
  "offsite_conversion.fb_pixel_landing_page_view",
];

const LEAD_PRIORITY = [
  "offsite_conversion.fb_pixel_lead",
  "omni_lead",
  "lead",
  "onsite_conversion.lead_grouped",
];

function parseNumericValue(value?: string | number | null): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (!value) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sumActionType(
  rows: AdsActionStat[] | undefined,
  actionType: string,
): number {
  if (!rows) {
    return 0;
  }

  return rows.reduce((total, row) => {
    if (row.action_type !== actionType) {
      return total;
    }
    return total + parseNumericValue(row.value);
  }, 0);
}

function getPriorityActionValue(
  rows: AdsActionStat[] | undefined,
  actionTypes: readonly string[],
): number {
  for (const actionType of actionTypes) {
    const value = sumActionType(rows, actionType);
    if (value > 0) {
      return value;
    }
  }

  return 0;
}

function getRoasValue(rows: AdsActionStat[] | undefined): number {
  if (!rows || rows.length === 0) {
    return 0;
  }

  return getPriorityActionValue(rows, PURCHASE_ACTION_PRIORITY);
}

export function normalizeInsightsRow(insight: AdInsights): NormalizedInsightsRow {
  const spend = parseNumericValue(insight.spend);
  const impressions = parseNumericValue(insight.impressions);
  const clicks = parseNumericValue(insight.clicks);
  const purchases = getPriorityActionValue(insight.actions, PURCHASE_ACTION_PRIORITY);
  const purchaseValue = getPriorityActionValue(
    insight.action_values,
    PURCHASE_VALUE_PRIORITY,
  );

  return {
    date_start: insight.date_start,
    date_stop: insight.date_stop,
    account_id: insight.account_id,
    campaign_id: insight.campaign_id,
    adset_id: insight.adset_id,
    ad_id: insight.ad_id,
    spend,
    impressions,
    clicks,
    reach: parseNumericValue(insight.reach),
    ctr: parseNumericValue(insight.ctr),
    cpc: parseNumericValue(insight.cpc),
    cpm: parseNumericValue(insight.cpm),
    purchases,
    purchase_value: purchaseValue,
    add_to_cart: getPriorityActionValue(insight.actions, ADD_TO_CART_PRIORITY),
    initiate_checkout: getPriorityActionValue(
      insight.actions,
      INITIATE_CHECKOUT_PRIORITY,
    ),
    landing_page_views: getPriorityActionValue(
      insight.actions,
      LANDING_PAGE_VIEW_PRIORITY,
    ),
    leads: getPriorityActionValue(insight.actions, LEAD_PRIORITY),
    purchase_roas: getRoasValue(insight.purchase_roas),
    website_purchase_roas: getRoasValue(insight.website_purchase_roas),
    mobile_app_purchase_roas: getRoasValue(insight.mobile_app_purchase_roas),
    cost_per_purchase: purchases > 0 ? spend / purchases : 0,
    raw_actions: insight.actions,
    raw_action_values: insight.action_values,
    raw_purchase_roas: insight.purchase_roas,
    raw_website_purchase_roas: insight.website_purchase_roas,
    raw_mobile_app_purchase_roas: insight.mobile_app_purchase_roas,
  };
}

export function normalizeInsightsRows(
  insights: AdInsights[],
): NormalizedInsightsRow[] {
  return insights.map(normalizeInsightsRow);
}
