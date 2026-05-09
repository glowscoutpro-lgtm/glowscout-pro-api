# Beta feedback collection

The API exposes `POST /api/feedback` so the GlowScout mobile app can submit
TestFlight beta survey responses for both the family/friends consumer beta and
the upcoming professional beta.

## Submitting feedback

```http
POST /api/feedback
Content-Type: application/json
```

Body fields (all optional except `surveyType`):

| Field | Type | Notes |
|---|---|---|
| `surveyType` | `"consumer_beta"` \| `"professional_beta"` | Required |
| `name` | string | |
| `email` | string (email) | |
| `canContact` | boolean | |
| `testerRole` | string | e.g. "friend", "family", "stylist" |
| `overallRating` | number 0-5 | |
| `easeOfUse` | number 0-5 | |
| `searchQuality` | number 0-5 | |
| `trustResults` | number 0-5 | |
| `wouldUseAgain` | number 0-5 | |
| `likedMost` | string | |
| `confusingPart` | string | |
| `missingFeature` | string | |
| `fixFirst` | string | |
| `currentSearchMethods` | string[] (max 20) | Family/friends beta: how testers currently search for beauty/wellness pros (e.g. `instagram`, `google`, `yelp`) |
| `currentSearchMethodOther` | string | Free-text "other" entry for `currentSearchMethods` |
| `trustSignals` | string[] (max 20) | Family/friends beta: signals that make a professional trustworthy (e.g. `reviews`, `before-after-photos`, `verified-license`) |
| `trustSignalOther` | string | Free-text "other" entry for `trustSignals` |
| `bookingConfidenceFactor` | string | Family/friends beta: what would make the tester confident enough to book |
| `profession` | string | Professional survey |
| `offersMobileService` | boolean | Professional survey |
| `privateStudio` | boolean | Professional survey |
| `wouldClaimProfile` | boolean | Professional survey |
| `licenseVerificationHelpful` | number 0-5 | Professional survey |
| `wouldAddPricing` | boolean | Professional survey |
| `wouldPayForEnhancedProfile` | boolean | Professional survey |
| `businessValue` | string | Professional survey |
| `concerns` | string | Professional survey |
| `appVersion` | string | |
| `appBuild` | string | Optional build number, e.g. "9" |
| `platform` | string | e.g. "ios" |
| `deviceModel` | string | Optional, e.g. "iPhone 15 Pro" |
| `osVersion` | string | Optional, e.g. "iOS 18.2" |
| `searchLocation` | string | Optional last-search location label |
| `searchCategory` | string | Optional last-search category |
| `searchContext` | string | Optional free-form context (e.g. recent query) |

Responses:

- `201 Created` → `{ "ok": true, "id": "...", "receivedAt": "..." }`
- `400 Bad Request` → validation errors
- `500 Internal Server Error` → storage failure

## Storage

Each submission is appended as one JSON line to
`${FEEDBACK_DIR}/feedback.jsonl`. On Render the deploy mounts a 1 GB
persistent disk at `/var/data/glowscout-feedback` (set via `FEEDBACK_DIR`),
so feedback survives restarts and re-deploys.

The submitter's IP is not stored in plaintext: a 16-char SHA-256 prefix using
`FEEDBACK_IP_SALT` is recorded as `ipHash` for rate-limit forensics.

## Retrieving feedback (admin)

Set `FEEDBACK_ADMIN_TOKEN` to a long random string in Render → Environment.
(`ADMIN_TOKEN` is still accepted as a fallback for backwards compatibility.)

Three private admin entry points are available — all reject requests when the
token env var is unset (`503 Admin endpoint not configured`) and when the
provided token does not match (`401 Unauthorized`):

| Path | Use | Format |
|---|---|---|
| `GET /admin/feedback?token=<TOKEN>` | Browser viewer for quick review | HTML |
| `GET /api/feedback?token=<TOKEN>` | Programmatic access / scripts | JSON |
| `GET /api/feedback.csv?token=<TOKEN>` | One-click spreadsheet export | CSV |

All three accept the token in any of three ways:

- `?token=<TOKEN>` query string (handy for the browser viewer)
- `x-admin-token: <TOKEN>` header
- `Authorization: Bearer <TOKEN>` header

Optional `?limit=<n>` controls how many of the most recent submissions to
return (default 500, max 5000).

Example URLs (replace `glowscout-pro-api.onrender.com` with your Render URL):

```text
https://glowscout-pro-api.onrender.com/admin/feedback?token=YOUR_TOKEN
https://glowscout-pro-api.onrender.com/api/feedback?token=YOUR_TOKEN
https://glowscout-pro-api.onrender.com/api/feedback.csv?token=YOUR_TOKEN
```

For ad-hoc retrieval, you can also `cat` the JSONL file directly on the
server:

```bash
cat /var/data/glowscout-feedback/feedback.jsonl | jq .
```

## Email notifications (optional)

If configured, the API sends a concise plaintext email to the founder inbox
every time a feedback submission succeeds. Email delivery is best-effort and
non-blocking — if it fails or is unconfigured, the API still returns `201`.

Provider: [Resend](https://resend.com) (free tier covers low-volume beta
traffic).

Setup:

1. Sign up at resend.com and create an API key.
2. In Render → Environment, add:

   ```text
   RESEND_API_KEY=<paste from Resend>
   FEEDBACK_NOTIFY_EMAIL=glowscoutpro@gmail.com
   ```

3. (Optional) Override the sender address with
   `FEEDBACK_NOTIFY_FROM="GlowScout Feedback <feedback@yourdomain.com>"`. Until
   you verify your own domain in Resend, leave this unset — the default
   `onboarding@resend.dev` works out of the box for testing.
4. Redeploy. New feedback will trigger an email; if `RESEND_API_KEY` is unset
   the server logs `email notification skipped` and the request still
   succeeds.

| Env var | Required | Default | Notes |
|---|---|---|---|
| `RESEND_API_KEY` | for email | _unset_ | If unset, notifications are skipped silently. |
| `FEEDBACK_NOTIFY_EMAIL` | no | `glowscoutpro@gmail.com` | Recipient. |
| `FEEDBACK_NOTIFY_FROM` | no | `GlowScout Feedback <onboarding@resend.dev>` | Use a verified domain once available. |
