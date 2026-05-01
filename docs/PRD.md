# GlowScout PRD

## Problem statement

People looking for nail services often search across Maps, social media, booking sites, and salon websites before they can decide who to trust. The highest-risk moments are choosing a pro for detailed services such as Russian manicures, structured gel, acrylic sets, dry pedicures, and nail art, where quality, hygiene, technique, and reviews matter. GlowScout reduces that search time by surfacing only nail pros who meet a minimum trust threshold: at least 10 Google reviews and a 4.5-star average or higher.

## Goals

- Help users find qualified nail pros in their zip code, town, or city in under 2 minutes.
- Enforce a clear quality threshold of 4.5+ stars and 10+ Google reviews.
- Capture service intent through a short customer survey before showing matches.
- Show estimated service cost ranges so customers can compare likely pricing before contacting a pro.
- Build the category model so GlowScout can expand to health and beauty pros beyond nails.

## Non-goals

- GlowScout will not process bookings or payments in the MVP.
- GlowScout will not claim exact prices unless a pro provides verified service menus.
- GlowScout will not scrape private or gated booking platforms.
- GlowScout will not rank pros who fail the minimum rating or review-count criteria.
- GlowScout will not create provider accounts in the MVP.

## User stories

- As a customer, I want to enter a zip code, town, or city so that I can find nail pros near me.
- As a customer, I want to select specific services so that my results match what I need.
- As a customer, I want to see only pros with strong Google ratings and enough reviews so that I can feel confident contacting them.
- As a customer, I want to see estimated costs by service so that I can compare options before calling or booking.
- As a future beauty customer, I want the same trusted discovery experience for other categories such as brows, lashes, hair, skincare, massage, and wellness.

## Requirements

### P0

- Search by zip code, town, or city.
- Service survey for nail services.
- Backend proxy for Google Places API so the API key is not exposed in the mobile app.
- Filter results to rating >= 4.5 and review count >= 10.
- Display pro name, address, rating, review count, contact actions, review highlights, and estimated service costs.
- Demo mode so the app can be tested without a Google API key.

### P1

- Distance-based filtering from a geocoded center point.
- Real menu extraction from provider websites where allowed.
- Favorites and saved searches.
- Provider profile pages with service specialties.

### P2

- Booking integrations.
- User accounts.
- Provider onboarding.
- Verified price menus.
- Expansion categories beyond nails.

## Acceptance criteria

### Search

- Given a user enters a location and chooses at least one service, when they tap Find verified pros, then the app sends the survey to the backend and displays matching pros.
- Given a Google Places result has fewer than 10 reviews, when results are returned, then that result is excluded.
- Given a Google Places result has a rating below 4.5, when results are returned, then that result is excluded.
- Given no Google API key is configured, when the user searches, then demo results are returned with a demo-mode label.

### Survey

- Given a user selects multiple nail services, when the survey summary updates, then all selected services are shown.
- Given no service is selected, when the user searches, then the app prompts them to choose a service.

### Cost estimator

- Given selected services, when pros are returned, then each pro includes estimated low and high prices for those services.
- Given Google price level is available, when estimates are generated, then the estimate is adjusted by the price-level multiplier.

## Success metrics

- Search completion rate: 70% of users who start the survey reach results.
- Contact action rate: 25% of result viewers tap call, website, or map.
- Result quality: 95% of displayed pros maintain 4.5+ rating and 10+ reviews at query time.
- Time to first useful result: under 2 minutes for first-time users.
- Expansion readiness: new health and beauty categories can be added without changing the core result model.

## Open questions

- Should the business model be customer subscription, provider lead generation, featured placement, or affiliate booking?
- Should GlowScout include individual independent technicians separately from salon businesses?
- What legal disclaimers are needed around estimated pricing and third-party review data?
- Which launch geography should be prioritized first?
