# Cult Equipment CRM Deployment

## 1. Supabase Auth Setup

1. Create a Supabase project.
2. Go to **Authentication > Users** and create the CRM users.
3. Copy the project **URL** and **anon public key** from **Project Settings > API**.
4. Update `supabase-config.js`:

```js
window.CRM_SUPABASE_CONFIG = {
  url: "https://YOUR_PROJECT_ID.supabase.co",
  anonKey: "YOUR_SUPABASE_ANON_KEY",
};
```

5. In **Authentication > URL Configuration**, add the Cloudflare Pages URL after the first deployment.

When `supabase-config.js` is blank, the app uses local test login. When it has URL/key values, the app uses Supabase Auth.

## 2. GitHub Setup

If the GitHub repository root is `crm-dashboard`, push this folder directly.

If the GitHub repository root is `New project`, set the Cloudflare Pages root directory to:

```text
crm-dashboard
```

## 3. Cloudflare Pages Setup

Use Cloudflare Pages with GitHub integration.

Recommended settings:

```text
Framework preset: None
Build command: leave blank
Build output directory: /
Root directory: crm-dashboard
```

If the repository itself contains only the CRM files, leave root directory blank and use:

```text
Build output directory: /
```

## 4. Current Storage Note

Supabase Auth is wired now. Lead data still uses browser storage in this version. The database schema is in `supabase-schema.sql` and can be used for the next step: moving leads, calls, follow-ups, deleted leads, and templates into Supabase tables.
