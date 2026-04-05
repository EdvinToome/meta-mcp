# Site Profiles

Define one profile per website or brand in `site-profiles.local.json`.

Use `site-profiles.example.json` as the starter template.

You can create the local file with:

```bash
npm run init:workspace
```

Use this shape:

```json
{
  "profiles": [
    {
      "slug": "brand-country",
      "label": "Brand Country",
      "brand_name": "Brand",
      "language": "Estonian",
      "country": "Estonia",
      "status": "draft",
      "account_id": "act_1234567890",
      "page_id": "1234567890",
      "instagram_user_id": "17841400000000000",
      "pixel_id": "1234567890",
      "domain": "example.com",
      "default_url": "https://example.com",
      "countries": ["EE"]
    }
  ]
}
```

Rules:
- `slug` should be short and stable.
- `label` is the human-facing profile name.
- `brand_name` is the public-facing brand/store label to use in copy and naming.
- `language` is the copy language for that site.
- `country` is the localization country name for that site.
- `status` should be `active` or `draft`.
- `account_id`, `page_id`, `instagram_user_id`, and `pixel_id` should be the live Meta IDs for that site.
- `domain` should match the website this profile is for.
- `default_url` is the landing page to use when the user says "use the default site URL".
- `countries` is the default geo target for that site. Use ISO country codes.

Behavior:
- The Meta Ads agent should match a profile by slug, label, or domain.
- If more than one profile could match, it should ask which one to use.
- If no profile matches, it should ask before creating anything.
- Nothing in this file is a global default unless there is exactly one matching profile for the request.

Add-profile workflow:
- If the user asks to add a new profile, collect `slug`, `label`, `brand_name`, `language`, `country`, `account_id`, `page_id`, `instagram_user_id`, `pixel_id`, `domain`, `default_url`, and `countries`.
- Write the new entry into `site-profiles.local.json`.
- If required fields are missing, ask only for the missing fields.
- After writing the profile, validate the `account_id` with `get_ad_accounts`, then run `verify_account_setup` when available.
- If account validation fails, change `status` to `draft` and explain what failed.
- If account validation succeeds, set `status` to `active`.
