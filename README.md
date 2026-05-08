# GlowScout

GlowScout is an App Store-ready MVP concept for discovering top-rated beauty and wellness professionals by zip code, town, or city. It filters pros to businesses with at least 10 Google reviews and an average rating of 4.5 stars or higher, then matches them to a customer service survey.

The app now includes profession selection for nails, hair, barbers, lashes, brows, skin, waxing, massage, makeup, and wellness. Each profession has its own service list, estimated cost ranges, and the same rating and review-count rules.

## What is included

- Expo React Native mobile app for iOS development.
- Express backend proxy for Google Places API calls.
- Service survey that captures profession, preferred services, budget, travel radius, availability, and preferences.
- Google Places filtering for rating >= 4.5 and review count >= 10.
- Cost estimator for selected beauty and wellness services based on service type and Google price-level signals when available.
- Licensed pro preference button plus neutral trust badges: Top-rated, License not verified, License pending review, License found, and State license verified.
- Demo mode when no Google API key is configured.
- App Store readiness checklist and PRD docs.

## Name and positioning

The app is named GlowScout. It is short, memorable, beauty-oriented, and broad enough to grow from nails into beauty and wellness professionals.

Suggested tagline: Find trusted beauty pros near you.

## Quick start

### Backend

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

Set `GOOGLE_MAPS_API_KEY` in `server/.env` to use live Google Places data. Without it, the server returns demo data.

### Mobile app

```bash
cd app
npm install
npm start
```

For iOS testing, open the project with Expo Go during development or create a development build. For App Store submission, build the native iOS app with Xcode 26 or later and the iOS 26 SDK or later.

## Production notes

- Do not put the Google Maps API key in the mobile app. Keep it on the backend.
- Configure API key restrictions in Google Cloud.
- Add a live production backend URL in `app/src/config.ts`.
- Add a privacy policy before App Store submission because the app collects location/search and survey preference data.
- If user accounts are added later, add in-app account deletion.
- Do not label a professional as fraudulent in the app. Use neutral trust labels until a state-board lookup or pro-submitted license number confirms license status.
- For the strongest badge, collect the pro's legal name, state, profession, license type, and license number, then verify it against the relevant state licensing board before showing "State license verified."

## Default API URL

The app uses `http://localhost:4000` by default for local development. When testing on a physical iPhone, replace this with your machine LAN IP or a deployed HTTPS backend.

## Location suggestions

`GET /api/locations/suggest?q=<query>` powers the mobile dropdown shown while a user is typing a ZIP code or city. It is fully offline for the embedded ZIPs (no paid Google Geocoding dependency) and falls back to the free Zippopotam.us API for unfamiliar ZIPs.

For ZIP queries (e.g. `60047`, `90210`, `10001`) the response includes:

- a `zip` entry that searches the entire ZIP polygon,
- a primary `city` entry resolved from the ZIP centroid (Lake Zurich, Beverly Hills, New York, …), and
- curated `nearby` entries for towns and neighborhoods that overlap the ZIP (e.g. Long Grove, Hawthorn Woods, Kildeer, Indian Creek for 60047).

For city text queries (e.g. `Lake Zurich`, `New York, NY`, `Bev`) the response is a list of matching `city` suggestions sourced from the embedded ZIP catalog. Each suggestion carries `lat`, `lng`, `label`, `city`, `state`, optional `postalCode`, `type`, and a `radiusMiles` hint that the client can pass through to `/api/pros/search`.

`St`/`Saint` (also `Mt`/`Mount`, `Ft`/`Fort`) are treated as the same word, and trailing state names work as 2-letter codes or full names with or without a comma — `St Augustine FL`, `Saint Augustine, Florida`, `Charlotte North Carolina` all parse correctly.

When a city query has no embedded match and `GOOGLE_MAPS_API_KEY` is configured, the suggester falls back to Google's Geocoding API (restricted to US results) so towns like `St Augustine, FL` return a single high-confidence `city` suggestion with `source: "google"`. Without an API key, unknown cities return an empty list.

Example:

```bash
curl "http://localhost:4000/api/locations/suggest?q=60047"
```

```json
{
  "query": "60047",
  "count": 6,
  "suggestions": [
    { "type": "zip",    "label": "Search entire ZIP 60047 (Lake Zurich, IL)", "city": "Lake Zurich",    "state": "IL", "postalCode": "60047", "lat": 42.196, "lng": -88.0934, "radiusMiles": 6, "source": "embedded" },
    { "type": "city",   "label": "Lake Zurich, IL",     "city": "Lake Zurich",    "state": "IL", "postalCode": "60047", "lat": 42.196, "lng": -88.0934, "radiusMiles": 8, "source": "embedded" },
    { "type": "nearby", "label": "Long Grove, IL",      "city": "Long Grove",     "state": "IL", "postalCode": "60047", "lat": 42.182, "lng": -87.998,  "radiusMiles": 4, "source": "curated" },
    { "type": "nearby", "label": "Hawthorn Woods, IL",  "city": "Hawthorn Woods", "state": "IL", "postalCode": "60047", "lat": 42.225, "lng": -88.044,  "radiusMiles": 4, "source": "curated" },
    { "type": "nearby", "label": "Kildeer, IL",         "city": "Kildeer",        "state": "IL", "postalCode": "60047", "lat": 42.176, "lng": -88.046,  "radiusMiles": 4, "source": "curated" },
    { "type": "nearby", "label": "Indian Creek, IL",    "city": "Indian Creek",   "state": "IL", "postalCode": "60047", "lat": 42.205, "lng": -87.971,  "radiusMiles": 4, "source": "curated" }
  ]
}
```

The existing `POST /api/pros/search` endpoint is unchanged.
