# FollowUp CRM MVP

This is a lightweight web app focused only on the essential sales workflow:

- Login / logout
- Lead details capture and edit
- Follow-up reminders
- Call tracking
- Browser notifications while the app is open
- Google Calendar event link for each follow-up

## Files

- `index.html`: app shell and forms
- `styles.css`: UI styling
- `app.js`: local state, rendering, and interactions
- `supabase-schema.sql`: minimal shared database schema with RLS

## Current behavior

- Runs as a static app in the browser
- Uses `localStorage` for demo persistence
- Starts with no leads so your team can add only real records
- Lead fields are limited to ASM name, lead name, mobile number, status, and lost reason when status is Lost
- Lead remarks support long text
- Follow-up date/time is set from the Follow-ups or Call Log flows

## How to open

Open [index.html](C:\Users\syed.hussain\OneDrive\OneDrive - Curefit Healthcare Pvt Ltd\Documents\New project\crm-dashboard\index.html) in a browser.

For the Codex in-app browser, use the local website URL instead:

```powershell
node server.js
```

Then open:

```text
http://localhost:4173
```

To let someone else on the same network test, share your machine's LAN URL:

```text
http://YOUR-LAN-IP:4173
```

## Supabase hookup plan

Replace the demo local state with:

- `supabase.auth.signInWithPassword()` for login
- `leads` table for lead capture
- `followups` table for reminders
- `calls` table for call tracking
- `profiles` table to map authenticated users to an organization
- Google Calendar API OAuth if you want automatic calendar insertion without clicking the Calendar link

Suggested deployment:

- Frontend on Cloudflare Pages
- Supabase for auth and database
- Optional Cloudflare Worker or VPS job for reminder notifications
