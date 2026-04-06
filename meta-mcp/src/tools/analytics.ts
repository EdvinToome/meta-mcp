import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MetaApiClient } from "../meta-client.js";
import {
  GetInsightsSchema,
  GetRoasReportSchema,
  ComparePerformanceSchema,
  ExportInsightsSchema,
} from "../types/mcp-tools";
import type { AdInsights, NormalizedInsightsRow } from "../types/meta-api";
import {
  ECOMMERCE_INSIGHTS_FIELDS,
  INSIGHTS_FIELD_PRESETS,
  type InsightsMetricPreset,
} from "../utils/insights-normalizer.js";

export function setupAnalyticsTools(
  server: McpServer,
  metaClient: MetaApiClient,
) {
  registerAnalyticsTools(server, metaClient);
}

export function registerAnalyticsTools(
  server: McpServer,
  metaClient: MetaApiClient,
) {
  server.tool(
    "get_insights",
    GetInsightsSchema.shape,
    async ({
      object_id,
      level,
      date_preset,
      time_range,
      fields,
      metric_preset,
      breakdowns,
      limit,
      verbose,
    }) => {
      try {
        const params: Record<string, any> = {
          level,
          limit: limit || 10,
          fields: resolveInsightFields(fields, metric_preset),
        };

        if (date_preset) {
          params.date_preset = date_preset;
        } else if (time_range) {
          params.time_range = time_range;
        } else {
          params.date_preset = "last_7d";
        }

        if (breakdowns && breakdowns.length > 0) {
          params.breakdowns = breakdowns;
        }

        const result = await metaClient.getInsights(object_id, params);
        const normalizedInsights = metaClient.normalizeInsightsRows(result.data);
        const summary = calculateSummaryMetrics(normalizedInsights);

        const response: Record<string, unknown> = {
          insights: normalizedInsights,
          summary,
          pagination: {
            has_next_page: result.hasNextPage,
            has_previous_page: result.hasPreviousPage,
            next_cursor: result.paging?.cursors?.after,
            previous_cursor: result.paging?.cursors?.before,
          },
          query_parameters: {
            object_id,
            level,
            date_preset,
            time_range,
            fields,
            metric_preset,
            fields_used: params.fields,
            breakdowns,
            verbose: Boolean(verbose),
          },
          total_count: normalizedInsights.length,
        };

        if (verbose) {
          response.raw_insights = result.data;
        }

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
              text: `Error getting insights: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "get_roas_report",
    GetRoasReportSchema.shape,
    async ({
      object_id,
      level,
      date_preset,
      time_range,
      breakdowns,
      attribution_window,
      limit,
    }) => {
      try {
        const params: Record<string, any> = {
          level,
          limit: limit || 50,
          fields: [...ECOMMERCE_INSIGHTS_FIELDS],
        };

        if (date_preset) {
          params.date_preset = date_preset;
        } else if (time_range) {
          params.time_range = time_range;
        } else {
          params.date_preset = "last_7d";
        }

        if (breakdowns && breakdowns.length > 0) {
          params.breakdowns = breakdowns;
        }

        if (attribution_window && attribution_window !== "default") {
          params.action_attribution_windows = [attribution_window];
        }

        const result = await metaClient.getInsights(object_id, params);
        const normalizedRows = metaClient.normalizeInsightsRows(result.data);
        const summary = calculateSummaryMetrics(normalizedRows);

        const response = {
          object_id,
          level,
          attribution_window_used: attribution_window || "default",
          summary: {
            spend: summary.total_spend,
            purchase_value: summary.total_purchase_value,
            purchases: summary.total_purchases,
            blended_roas: summary.blended_roas,
            website_purchase_roas: round2(
              calculateSpendWeightedAverage(
                normalizedRows,
                "website_purchase_roas",
              ),
            ),
            mobile_app_purchase_roas: round2(
              calculateSpendWeightedAverage(
                normalizedRows,
                "mobile_app_purchase_roas",
              ),
            ),
            cost_per_purchase: summary.cost_per_purchase,
            average_order_value: summary.average_order_value,
          },
          normalized_rows: normalizedRows,
          pagination: {
            has_next_page: result.hasNextPage,
            has_previous_page: result.hasPreviousPage,
            next_cursor: result.paging?.cursors?.after,
            previous_cursor: result.paging?.cursors?.before,
          },
          query_parameters: {
            object_id,
            level,
            date_preset,
            time_range,
            breakdowns,
            attribution_window: attribution_window || "default",
            fields_used: params.fields,
          },
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
              text: `Error getting ROAS report: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "compare_performance",
    ComparePerformanceSchema.shape,
    async ({ object_ids, level, date_preset, time_range, metrics }) => {
      try {
        const params: Record<string, any> = {
          level,
          fields: [...ECOMMERCE_INSIGHTS_FIELDS],
        };

        if (date_preset) {
          params.date_preset = date_preset;
        } else if (time_range) {
          params.time_range = time_range;
        } else {
          params.date_preset = "last_7d";
        }

        const comparisons: Array<Record<string, unknown>> = [];

        for (const objectId of object_ids) {
          try {
            const result = await metaClient.getInsights(objectId, params);
            const normalizedRows = metaClient.normalizeInsightsRows(result.data);
            const summary = calculateSummaryMetrics(normalizedRows);

            let objectName = objectId;
            try {
              if (level === "campaign") {
                const campaign = await metaClient.getCampaign(objectId);
                objectName = campaign.name;
              }
            } catch {
              objectName = objectId;
            }

            comparisons.push({
              object_id: objectId,
              object_name: objectName,
              object_type: level,
              metrics: summary,
            });
          } catch (error) {
            comparisons.push({
              object_id: objectId,
              object_name: objectId,
              object_type: level,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }

        const rankings = calculatePerformanceRankings(comparisons, metrics);

        const response = {
          comparison_results: comparisons,
          rankings,
          query_parameters: {
            object_ids,
            level,
            date_preset,
            time_range,
            metrics,
            fields_used: params.fields,
          },
          comparison_date: new Date().toISOString(),
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
              text: `Error comparing performance: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "export_insights",
    ExportInsightsSchema.shape,
    async ({
      object_id,
      level,
      format,
      date_preset,
      time_range,
      fields,
      breakdowns,
    }) => {
      try {
        const params: Record<string, any> = {
          level,
          limit: 1000,
        };

        if (date_preset) {
          params.date_preset = date_preset;
        } else if (time_range) {
          params.time_range = time_range;
        } else {
          params.date_preset = "last_30d";
        }

        if (fields && fields.length > 0) {
          params.fields = fields;
        }

        if (breakdowns && breakdowns.length > 0) {
          params.breakdowns = breakdowns;
        }

        const result = await metaClient.getInsights(object_id, params);

        let exportData: string;
        let mimeType: string;

        if (format === "csv") {
          exportData = convertToCSV(result.data);
          mimeType = "text/csv";
        } else {
          exportData = JSON.stringify(result.data, null, 2);
          mimeType = "application/json";
        }

        const response = {
          success: true,
          format,
          mime_type: mimeType,
          data_size: exportData.length,
          record_count: result.data.length,
          export_date: new Date().toISOString(),
          query_parameters: {
            object_id,
            level,
            date_preset,
            time_range,
            fields,
            breakdowns,
          },
          data: exportData,
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
              text: `Error exporting insights: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "get_campaign_performance",
    GetInsightsSchema.shape,
    async (params) => {
      try {
        const campaignParams = {
          ...params,
          level: "campaign" as const,
          fields: resolveInsightFields(params.fields, params.metric_preset),
        };

        const result = await metaClient.getInsights(
          params.object_id,
          campaignParams,
        );
        const normalizedRows = metaClient.normalizeInsightsRows(result.data);
        const summary = calculateSummaryMetrics(normalizedRows);

        let campaignDetails;
        try {
          campaignDetails = await metaClient.getCampaign(params.object_id);
        } catch {
          campaignDetails = { id: params.object_id, name: "Unknown Campaign" };
        }

        const response: Record<string, unknown> = {
          campaign: {
            id: campaignDetails.id,
            name: campaignDetails.name,
            objective: campaignDetails.objective,
            status: campaignDetails.status,
          },
          performance: summary,
          daily_breakdown: normalizedRows,
          query_parameters: campaignParams,
        };

        if (params.verbose) {
          response.raw_daily_breakdown = result.data;
        }

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
              text: `Error getting campaign performance: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "get_attribution_data",
    GetInsightsSchema.shape,
    async (params) => {
      try {
        const attributionParams = {
          ...params,
          fields:
            resolveInsightFields(params.fields, params.metric_preset) ||
            [...ECOMMERCE_INSIGHTS_FIELDS],
          breakdowns: params.breakdowns || ["action_attribution_windows"],
        };

        const result = await metaClient.getInsights(
          params.object_id,
          attributionParams,
        );
        const normalizedRows = metaClient.normalizeInsightsRows(result.data);

        const response = {
          attribution_data: normalizedRows,
          summary: calculateAttributionMetrics(normalizedRows),
          query_parameters: attributionParams,
          total_records: normalizedRows.length,
        };

        if (params.verbose) {
          (response as Record<string, unknown>).raw_attribution_data = result.data;
        }

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
              text: `Error getting attribution data: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}

function resolveInsightFields(
  fields?: string[],
  metricPreset?: InsightsMetricPreset,
): string[] | undefined {
  if (fields && fields.length > 0) {
    return fields;
  }

  if (metricPreset) {
    return [...INSIGHTS_FIELD_PRESETS[metricPreset]];
  }

  return undefined;
}

function calculateSummaryMetrics(insights: NormalizedInsightsRow[]) {
  if (insights.length === 0) {
    return {
      total_impressions: 0,
      total_clicks: 0,
      total_spend: 0,
      total_purchase_value: 0,
      total_purchases: 0,
      average_ctr: 0,
      average_cpc: 0,
      average_cpm: 0,
      blended_roas: 0,
      cost_per_purchase: 0,
      average_order_value: 0,
    };
  }

  const totals = insights.reduce(
    (acc, insight) => {
      acc.impressions += insight.impressions;
      acc.clicks += insight.clicks;
      acc.spend += insight.spend;
      acc.purchase_value += insight.purchase_value;
      acc.purchases += insight.purchases;
      return acc;
    },
    { impressions: 0, clicks: 0, spend: 0, purchase_value: 0, purchases: 0 },
  );

  const averageCtr =
    totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const averageCpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
  const averageCpm =
    totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;
  const blendedRoas = totals.spend > 0 ? totals.purchase_value / totals.spend : 0;
  const costPerPurchase =
    totals.purchases > 0 ? totals.spend / totals.purchases : 0;
  const averageOrderValue =
    totals.purchases > 0 ? totals.purchase_value / totals.purchases : 0;

  return {
    total_impressions: round2(totals.impressions),
    total_clicks: round2(totals.clicks),
    total_spend: round2(totals.spend),
    total_purchase_value: round2(totals.purchase_value),
    total_purchases: round2(totals.purchases),
    average_ctr: round2(averageCtr),
    average_cpc: round2(averageCpc),
    average_cpm: round2(averageCpm),
    blended_roas: round2(blendedRoas),
    cost_per_purchase: round2(costPerPurchase),
    average_order_value: round2(averageOrderValue),
    date_range: {
      start: insights[0]?.date_start,
      end: insights[insights.length - 1]?.date_stop,
    },
  };
}

function calculateSpendWeightedAverage(
  rows: NormalizedInsightsRow[],
  field: "website_purchase_roas" | "mobile_app_purchase_roas",
): number {
  const totals = rows.reduce(
    (acc, row) => {
      if (row.spend <= 0 || row[field] <= 0) {
        return acc;
      }
      acc.weighted += row[field] * row.spend;
      acc.spend += row.spend;
      return acc;
    },
    { weighted: 0, spend: 0 },
  );

  return totals.spend > 0 ? totals.weighted / totals.spend : 0;
}

function calculatePerformanceRankings(comparisons: any[], metrics: string[]) {
  const rankings: Record<string, unknown> = {};

  for (const metric of metrics) {
    const validComparisons = comparisons.filter((c) => c.metrics && !c.error);

    if (validComparisons.length === 0) {
      continue;
    }

    const sorted = validComparisons
      .map((c) => ({
        object_id: c.object_id,
        object_name: c.object_name,
        value: getMetricValue(c.metrics, metric),
      }))
      .filter((item) => item.value !== null)
      .sort((a, b) => {
        const isCostMetric =
          metric.includes("cpc") ||
          metric.includes("cpm") ||
          metric.includes("spend") ||
          metric.includes("cost");

        return isCostMetric
          ? (a.value || 0) - (b.value || 0)
          : (b.value || 0) - (a.value || 0);
      });

    rankings[metric] = sorted.map((item, index) => ({
      rank: index + 1,
      object_id: item.object_id,
      object_name: item.object_name,
      value: item.value,
    }));
  }

  return rankings;
}

function getMetricValue(
  metrics: Record<string, unknown>,
  metricName: string,
): number | null {
  if (metricName === "roas") {
    const roasValue = metrics.blended_roas;
    return typeof roasValue === "number" ? roasValue : null;
  }

  const value =
    metrics[`total_${metricName}`] ||
    metrics[`average_${metricName}`] ||
    metrics[metricName];

  if (typeof value === "number") {
    return value;
  }

  return null;
}

function calculateAttributionMetrics(insights: NormalizedInsightsRow[]) {
  const summary = calculateSummaryMetrics(insights);

  return {
    total_conversions: summary.total_purchases,
    total_purchases: summary.total_purchases,
    total_purchase_value: summary.total_purchase_value,
    blended_roas: summary.blended_roas,
    cost_per_purchase: summary.cost_per_purchase,
    average_order_value: summary.average_order_value,
  };
}

function convertToCSV(data: AdInsights[]): string {
  if (data.length === 0) {
    return "";
  }

  const headers = new Set<string>();
  data.forEach((row) => {
    Object.keys(row).forEach((key) => headers.add(key));
  });

  const headerArray = Array.from(headers);
  const csvRows = [headerArray.join(",")];

  data.forEach((row) => {
    const values = headerArray.map((header) => {
      const value = (row as Record<string, unknown>)[header];
      if (value === null || value === undefined) {
        return "";
      }
      if (typeof value === "object") {
        return JSON.stringify(value);
      }
      return String(value).replace(/"/g, '""');
    });

    csvRows.push(values.map((v) => `"${v}"`).join(","));
  });

  return csvRows.join("\n");
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
