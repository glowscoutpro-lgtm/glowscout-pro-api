import { createHash } from "crypto";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { z } from "zod";
import { getDemoPros } from "./demoData.js";
import { resolveGoogleApiKey } from "./googleApiKey.js";
import { searchGooglePlaces } from "./googlePlaces.js";
import {
  appendFeedback,
  buildStoredFeedback,
  feedbackSchema,
  listFeedback,
  normalizeFeedbackPayload,
  type StoredFeedback
} from "./feedback.js";
import { suggestLocations } from "./locationSuggest.js";
import { notifyFeedbackEmail } from "./notifyEmail.js";
import { normalizeCategoryValue, normalizeServicesInput } from "./serviceLabels.js";
import type { SurveyPayload } from "./types.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 4000);
const allowedOrigin = process.env.ALLOWED_ORIGIN ?? "*";

app.use(cors({ origin: allowedOrigin === "*" ? true : allowedOrigin }));
app.use(express.json({ limit: "1mb" }));

const surveySchema = z.object({
  location: z.string().min(2),
  category: z.preprocess(
    normalizeCategoryValue,
    z
      .enum(["nails", "hair", "barber", "lashes", "brows", "skin", "waxing", "massage", "makeup", "wellness"])
      .default("nails")
  ),
  services: z.preprocess(
    normalizeServicesInput,
    z
      .array(
        z.enum([
          "russian-manicure",
          "gel-manicure",
          "structured-gel",
          "dip-powder",
          "acrylic-full-set",
          "nail-art",
          "dry-pedicure",
          "spa-pedicure",
          "builder-gel",
          "classic-manicure",
          "haircut",
          "blowout",
          "hair-color",
          "balayage",
          "hair-extensions",
          "braids",
          "mens-haircut",
          "barber-fade",
          "beard-trim",
          "hot-towel-shave",
          "lash-extensions",
          "lash-lift",
          "lash-fill",
          "brow-shaping",
          "brow-lamination",
          "brow-tint",
          "custom-facial",
          "chemical-peel",
          "dermaplaning",
          "microneedling",
          "brazilian-wax",
          "brow-wax",
          "full-leg-wax",
          "swedish-massage",
          "deep-tissue-massage",
          "sports-massage",
          "prenatal-massage",
          "event-makeup",
          "bridal-makeup",
          "makeup-lesson",
          "body-sculpting",
          "sauna-session",
          "reiki",
          "holistic-facial"
        ])
      )
      .default([])
  ),
  budget: z.enum(["under-50", "50-85", "85-125", "125-plus"]).optional(),
  maxDistanceMiles: z.coerce.number().min(1).max(50).default(10),
  availability: z.enum(["today", "this-week", "weekend", "flexible"]).optional(),
  preferences: z.array(z.string()).default([]),
  // Optional fields populated by the suggestion picker. When present we treat
  // them as the authoritative search anchor and skip geocoding the freeform
  // location string.
  locationCity: z.string().min(1).optional(),
  locationState: z
    .string()
    .min(2)
    .max(2)
    .transform((value) => value.toUpperCase())
    .optional(),
  locationPostalCode: z.string().min(3).max(10).optional(),
  locationLat: z.coerce.number().min(-90).max(90).optional(),
  locationLng: z.coerce.number().min(-180).max(180).optional(),
  locationRadiusMiles: z.coerce.number().min(1).max(50).optional()
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, app: "GlowScout API" });
});

app.post("/api/pros/search", async (req, res) => {
  const parsed = surveySchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid survey", details: parsed.error.flatten() });
    return;
  }

  const survey = parsed.data as SurveyPayload;
  const { apiKey } = resolveGoogleApiKey();

  try {
    const result = apiKey ? await searchGooglePlaces(survey, apiKey) : getDemoPros(survey);
    res.json({
      mode: apiKey ? "live" : "demo",
      criteria: {
        minimumRating: 4.5,
        minimumReviewCount: 10,
        category: survey.category,
        maxDistanceMiles: survey.locationRadiusMiles ?? survey.maxDistanceMiles
      },
      resolvedLocation: result.debug.resolvedLocation,
      searchCenter: result.debug.searchCenter,
      pros: result.pros
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected search error";
    res.status(502).json({ error: message });
  }
});

app.get("/api/locations/suggest", async (req, res) => {
  const raw = req.query.q;
  const query = typeof raw === "string" ? raw : Array.isArray(raw) ? String(raw[0] ?? "") : "";
  if (!query.trim()) {
    res.status(400).json({ error: "Missing query parameter `q`" });
    return;
  }
  try {
    const suggestions = await suggestLocations(query);
    const { source: keySource } = resolveGoogleApiKey();
    res.json({
      query,
      count: suggestions.length,
      suggestions,
      googleKeySource: keySource ?? null
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Suggestion lookup failed";
    res.status(502).json({ error: message });
  }
});

function hashIp(ip: string | undefined): string | undefined {
  if (!ip) return undefined;
  const salt = process.env.FEEDBACK_IP_SALT ?? "glowscout-feedback";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 16);
}

app.post("/api/feedback", async (req, res) => {
  const normalized = normalizeFeedbackPayload(req.body);
  const parsed = feedbackSchema.safeParse(normalized);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid feedback", details: parsed.error.flatten() });
    return;
  }

  try {
    const ipHash = hashIp(req.ip);
    const record = buildStoredFeedback(parsed.data, ipHash);
    await appendFeedback(record);
    console.log(
      `[feedback] ${record.surveyType} id=${record.id} overallRating=${record.overallRating ?? "n/a"}`
    );
    notifyFeedbackEmail(record)
      .then((result) => {
        if (result.status === "sent") {
          console.log(`[feedback] email notification sent id=${record.id}`);
        } else if (result.status === "skipped") {
          console.log(`[feedback] email notification skipped: ${result.reason}`);
        } else {
          console.warn(`[feedback] email notification failed id=${record.id}: ${result.error}`);
        }
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[feedback] email notification threw id=${record.id}: ${message}`);
      });
    res.status(201).json({ ok: true, id: record.id, receivedAt: record.receivedAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to store feedback";
    console.error("[feedback] failed to store:", message);
    res.status(500).json({ error: "Unable to store feedback" });
  }
});

function resolveAdminToken(): string | undefined {
  const token = process.env.FEEDBACK_ADMIN_TOKEN ?? process.env.ADMIN_TOKEN;
  return token && token.length > 0 ? token : undefined;
}

function extractProvidedToken(req: express.Request): string | undefined {
  const headerToken = req.header("x-admin-token");
  if (headerToken) return headerToken;
  const auth = req.header("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  const queryToken = req.query.token;
  if (typeof queryToken === "string") return queryToken;
  if (Array.isArray(queryToken) && typeof queryToken[0] === "string") return queryToken[0];
  return undefined;
}

type AdminAuthResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

function checkAdminAuth(req: express.Request): AdminAuthResult {
  const token = resolveAdminToken();
  if (!token) {
    return {
      ok: false,
      status: 503,
      error:
        "Admin endpoint not configured. Set FEEDBACK_ADMIN_TOKEN in the server environment."
    };
  }
  const provided = extractProvidedToken(req);
  if (!provided || provided !== token) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  return { ok: true };
}

function clampLimit(value: unknown): number {
  const n = Number(value ?? 500);
  if (!Number.isFinite(n)) return 500;
  return Math.min(Math.max(Math.floor(n), 1), 5000);
}

app.get("/api/feedback", async (req, res) => {
  const auth = checkAdminAuth(req);
  if (!auth.ok) {
    res.status(auth.status).json({ error: auth.error });
    return;
  }

  const limit = clampLimit(req.query.limit);
  try {
    const items = await listFeedback(limit);
    res.json({ count: items.length, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to read feedback";
    res.status(500).json({ error: message });
  }
});

const CSV_COLUMNS: Array<keyof StoredFeedback | "_answers"> = [
  "id",
  "receivedAt",
  "surveyType",
  "appVersion",
  "appBuild",
  "platform",
  "deviceModel",
  "osVersion",
  "name",
  "email",
  "canContact",
  "testerRole",
  "overallRating",
  "easeOfUse",
  "searchQuality",
  "trustResults",
  "wouldUseAgain",
  "likedMost",
  "confusingPart",
  "missingFeature",
  "fixFirst",
  "currentSearchMethods",
  "currentSearchMethodOther",
  "trustSignals",
  "trustSignalOther",
  "bookingConfidenceFactor",
  "profession",
  "offersMobileService",
  "privateStudio",
  "wouldClaimProfile",
  "licenseVerificationHelpful",
  "wouldAddPricing",
  "wouldPayForEnhancedProfile",
  "businessValue",
  "concerns",
  "searchLocation",
  "searchCategory",
  "searchContext",
  "ipHash"
];

function csvEscape(value: unknown): string {
  if (value === undefined || value === null) return "";
  const stringified = Array.isArray(value)
    ? value.join("; ")
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
  if (/[",\n\r]/.test(stringified)) {
    return `"${stringified.replace(/"/g, '""')}"`;
  }
  return stringified;
}

function feedbackToCsv(items: StoredFeedback[]): string {
  const header = CSV_COLUMNS.join(",");
  const rows = items.map((item) =>
    CSV_COLUMNS.map((col) => csvEscape((item as Record<string, unknown>)[col])).join(",")
  );
  return [header, ...rows].join("\n") + "\n";
}

app.get("/api/feedback.csv", async (req, res) => {
  const auth = checkAdminAuth(req);
  if (!auth.ok) {
    res.status(auth.status).type("text/plain").send(auth.error);
    return;
  }

  const limit = clampLimit(req.query.limit);
  try {
    const items = await listFeedback(limit);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="glowscout-feedback-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send(feedbackToCsv(items));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to read feedback";
    res.status(500).type("text/plain").send(message);
  }
});

function escapeHtml(value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  const stringified = Array.isArray(value)
    ? value.join(", ")
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
  return stringified
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderFeedbackHtml(items: StoredFeedback[], token: string): string {
  const tokenParam = encodeURIComponent(token);
  const sorted = [...items].sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));
  const cards = sorted.length
    ? sorted
        .map((item) => {
          const longText = (label: string, value: unknown) => {
            const escaped = escapeHtml(value);
            return escaped ? `<div class="row"><div class="k">${label}</div><div class="v">${escaped}</div></div>` : "";
          };
          const fact = (label: string, value: unknown) => {
            const escaped = escapeHtml(value);
            return escaped ? `<span class="chip"><b>${label}:</b> ${escaped}</span>` : "";
          };
          return `<article class="card">
  <header>
    <span class="badge ${item.surveyType}">${escapeHtml(item.surveyType)}</span>
    <time>${escapeHtml(item.receivedAt)}</time>
    <span class="id">${escapeHtml(item.id)}</span>
  </header>
  <div class="chips">
    ${fact("App", [item.appVersion, item.appBuild ? `(${item.appBuild})` : ""].filter(Boolean).join(" "))}
    ${fact("Platform", item.platform)}
    ${fact("Device", item.deviceModel)}
    ${fact("OS", item.osVersion)}
    ${fact("Tester", item.testerRole)}
    ${fact("Name", item.name)}
    ${fact("Email", item.email)}
    ${fact("Contact OK", item.canContact)}
    ${fact("Overall", item.overallRating)}
    ${fact("Ease", item.easeOfUse)}
    ${fact("Search quality", item.searchQuality)}
    ${fact("Trust", item.trustResults)}
    ${fact("Use again", item.wouldUseAgain)}
    ${fact("Profession", item.profession)}
    ${fact("Mobile svc", item.offersMobileService)}
    ${fact("Private studio", item.privateStudio)}
    ${fact("Claim profile", item.wouldClaimProfile)}
    ${fact("License helpful", item.licenseVerificationHelpful)}
    ${fact("Add pricing", item.wouldAddPricing)}
    ${fact("Pay enhanced", item.wouldPayForEnhancedProfile)}
    ${fact("Search location", item.searchLocation)}
    ${fact("Search category", item.searchCategory)}
  </div>
  ${longText("Liked most", item.likedMost)}
  ${longText("Confusing", item.confusingPart)}
  ${longText("Missing feature", item.missingFeature)}
  ${longText("Fix first", item.fixFirst)}
  ${longText("Current search methods", item.currentSearchMethods)}
  ${longText("Current search method (other)", item.currentSearchMethodOther)}
  ${longText("Trust signals", item.trustSignals)}
  ${longText("Trust signal (other)", item.trustSignalOther)}
  ${longText("Booking confidence", item.bookingConfidenceFactor)}
  ${longText("Business value", item.businessValue)}
  ${longText("Concerns", item.concerns)}
  ${longText("Search context", item.searchContext)}
</article>`;
        })
        .join("\n")
    : `<p class="empty">No feedback submissions yet.</p>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<title>GlowScout Feedback Admin</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 14px/1.45 -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; margin: 0; padding: 24px; background: #fafafa; color: #1a1a1a; }
  h1 { margin: 0 0 4px; font-size: 20px; }
  .summary { color: #666; margin-bottom: 16px; }
  .toolbar { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
  .toolbar a { padding: 6px 12px; border-radius: 6px; background: #1a1a1a; color: #fff; text-decoration: none; font-size: 13px; }
  .toolbar a.secondary { background: #e5e5e5; color: #1a1a1a; }
  .card { background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px; }
  .card header { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; margin-bottom: 8px; }
  .card header time { color: #666; font-size: 12px; }
  .card header .id { color: #999; font-size: 11px; font-family: ui-monospace, monospace; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
  .badge.consumer_beta { background: #e6f4ea; color: #0f5132; }
  .badge.professional_beta { background: #e7f1ff; color: #0a3d91; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
  .chip { display: inline-block; padding: 2px 8px; border-radius: 4px; background: #f1f1f1; font-size: 12px; color: #333; }
  .row { display: grid; grid-template-columns: 180px 1fr; gap: 8px; padding: 4px 0; border-top: 1px dashed #eee; }
  .row .k { color: #666; font-size: 12px; }
  .row .v { white-space: pre-wrap; word-break: break-word; }
  .empty { color: #666; font-style: italic; }
  @media (prefers-color-scheme: dark) {
    body { background: #111; color: #eee; }
    .card { background: #1c1c1c; border-color: #2a2a2a; }
    .toolbar a.secondary { background: #2a2a2a; color: #eee; }
    .chip { background: #2a2a2a; color: #ddd; }
    .card header time { color: #aaa; }
    .row { border-top-color: #2a2a2a; }
    .row .k { color: #aaa; }
  }
</style>
</head>
<body>
<h1>GlowScout beta feedback</h1>
<p class="summary">${sorted.length} submission${sorted.length === 1 ? "" : "s"} (newest first).</p>
<div class="toolbar">
  <a href="/admin/feedback?token=${tokenParam}">Refresh</a>
  <a class="secondary" href="/api/feedback?token=${tokenParam}">JSON</a>
  <a class="secondary" href="/api/feedback.csv?token=${tokenParam}">CSV</a>
</div>
${cards}
</body>
</html>`;
}

app.get("/admin/feedback", async (req, res) => {
  const auth = checkAdminAuth(req);
  if (!auth.ok) {
    res
      .status(auth.status)
      .type("text/html")
      .send(
        `<!doctype html><meta charset="utf-8"><title>GlowScout Feedback Admin</title>` +
          `<body style="font:14px -apple-system,sans-serif;padding:24px;color:#900">` +
          `<h1>${auth.status === 503 ? "Setup needed" : "Unauthorized"}</h1>` +
          `<p>${escapeHtml(auth.error)}</p></body>`
      );
    return;
  }

  const limit = clampLimit(req.query.limit);
  try {
    const items = await listFeedback(limit);
    const token = resolveAdminToken() ?? "";
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.send(renderFeedbackHtml(items, token));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to read feedback";
    res.status(500).type("text/plain").send(message);
  }
});

app.listen(port, () => {
  console.log(`GlowScout API listening on http://localhost:${port}`);
});
