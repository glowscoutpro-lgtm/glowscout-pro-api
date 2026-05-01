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
