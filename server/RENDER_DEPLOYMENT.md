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

## Verify after deploy

Open the Render service URL and add `/health`. A healthy response should look like:

```json
{"ok":true,"app":"GlowScout API"}
```

Then test a search by sending a POST request to `/api/pros/search` with a location, category, and services.
