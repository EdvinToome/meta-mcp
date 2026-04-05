# Meta Ads Build Brief Schema

Persist state in the working folder so a later run can resume without asking everything again.

## Files

- `meta-ads-brief.json`: resolved inputs and assumptions before writes
- `meta-ads-result.json`: returned IDs, preview links, and skipped-step reasons after writes

## Suggested `meta-ads-brief.json`

```json
{
  "working_folder": "/absolute/path/to/assets",
  "server_mode": "full-flow",
  "account": {
    "id": "act_123",
    "name": "Primary account"
  },
  "assets": [
    {
      "path": "/absolute/path/to/assets/hero-1.jpg",
      "upload_tool": "upload_creative_asset",
      "hosted_url": "https://cdn.example.com/hero-1.jpg",
      "uploaded_asset_id": "2384",
      "uploaded_hash": "7f3f9a9d2f5f3a0d",
      "selected_for_creative": true
    }
  ],
  "campaign": {
    "name": "Spring Launch",
    "objective": "OUTCOME_TRAFFIC",
    "status": "PAUSED",
    "daily_budget_cents": 2500,
    "budget_scope": "campaign",
    "bid_strategy": "LOWEST_COST_WITHOUT_CAP",
    "special_ad_categories": []
  },
  "ad_set": {
    "name": "EE - Broad 25-54",
    "status": "PAUSED",
    "billing_event": "IMPRESSIONS",
    "optimization_goal": "LINK_CLICKS",
    "budget_inherited_from_campaign": true,
    "targeting": {
      "geo_locations": {
        "countries": ["EE"]
      },
      "age_min": 25,
      "age_max": 54
    }
  },
  "creatives": [
    {
      "key": "teachers",
      "name": "Hero Image V1",
      "asset_source": {
        "path": "/absolute/path/to/assets/hero-1.jpg",
        "uploaded_hash": "7f3f9a9d2f5f3a0d"
      },
      "message": "Short primary text",
      "headline": "Short headline",
      "description": "Optional description",
      "link_url": "https://example.com",
      "call_to_action_type": "LEARN_MORE"
    }
  ],
  "ads": [
    {
      "key": "teachers",
      "name": "Hero Image V1 Ad",
      "status": "PAUSED"
    }
  ],
  "assumptions": [
    "No special ad categories apply",
    "Use paused status for all new objects"
  ]
}
```

## Suggested `meta-ads-result.json`

```json
{
  "working_folder": "/absolute/path/to/assets",
  "server_mode": "full-flow",
  "created": {
    "campaign_id": "123",
    "ad_set_id": "456",
    "creative_ids": [
      {
        "key": "teachers",
        "creative_id": "789"
      }
    ],
    "ad_ids": [
      {
        "key": "teachers",
        "ad_id": "101112"
      }
    ]
  },
  "selected_assets": [
    {
      "path": "/absolute/path/to/assets/hero-1.jpg",
      "upload_tool": "upload_creative_asset",
      "uploaded_asset_id": "2384",
      "uploaded_hash": "7f3f9a9d2f5f3a0d"
    }
  ],
  "preview": {
    "available": true,
    "details": "Preview response or link"
  },
  "skipped_steps": [],
  "errors": []
}
```

## Usage rules

- Update the brief before each confirmation checkpoint.
- Update the result file immediately after each successful write.
- Keep IDs and URLs exact as returned by the MCP.
- Persist upload hashes and asset IDs as soon as an upload tool returns them, even if later steps fail.
- If the run stops mid-flight, write partial success state and include blocked downstream steps in `skipped_steps` or `errors` rather than dropping the upload or campaign IDs that were already created.
