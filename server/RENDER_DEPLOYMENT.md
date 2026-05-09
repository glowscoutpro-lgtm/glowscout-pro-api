# Render deployment for GlowScout Pro API

Use this backend as the live API for the iPhone app. The Google Places API key must stay on Render as an environment variable and should never be placed in the mobile app.

## Render service settings

- Service type: Web Service
- Name: `glowscout-pro-api`
- Root directory: `server`
- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Health check path: `/health`

## Environment variables

Add these in Render under Environment:

```text
NODE_ENV=production
GOOGLE_MAPS_API_KEY=<paste directly into Render, not into chat>
ALLOWED_ORIGIN=*
```

### Required for the private feedback admin viewer

To unlock `GET /admin/feedback` (HTML), `GET /api/feedback` (JSON), and
`GET /api/feedback.csv` (CSV), set a long random secret in Render →
Environment:

```text
FEEDBACK_ADMIN_TOKEN=<long random string, e.g. `openssl rand -hex 32`>
```

Without this var the admin endpoints return `503 Admin endpoint not configured`
and never expose feedback data. (`ADMIN_TOKEN` is still accepted as a fallback
for older deploys.)

After deploy, open in a browser:

```text
https://<your-render-host>/admin/feedback?token=<FEEDBACK_ADMIN_TOKEN>
https://<your-render-host>/api/feedback?token=<FEEDBACK_ADMIN_TOKEN>
https://<your-render-host>/api/feedback.csv?token=<FEEDBACK_ADMIN_TOKEN>
```

### Optional: feedback email notifications

To get an email every time a beta tester submits feedback, add:

```text
RESEND_API_KEY=<paste from resend.com, not into chat>
FEEDBACK_NOTIFY_EMAIL=glowscoutpro@gmail.com
```

If `RESEND_API_KEY` is unset the API silently skips email notifications and
still stores feedback as usual. See `docs/BETA_FEEDBACK.md` for details.

## Verify after deploy

Open the Render service URL and add `/health`. A healthy response should look like:

```json
{"ok":true,"app":"GlowScout API"}
```

Then test a search by sending a POST request to `/api/pros/search` with a location, category, and services.
