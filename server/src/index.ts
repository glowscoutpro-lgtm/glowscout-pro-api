import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { z } from "zod";
import { getDemoPros } from "./demoData.js";
import { searchGooglePlaces } from "./googlePlaces.js";
import type { SurveyPayload } from "./types.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 4000);
const allowedOrigin = process.env.ALLOWED_ORIGIN ?? "*";

app.use(cors({ origin: allowedOrigin === "*" ? true : allowedOrigin }));
app.use(express.json({ limit: "1mb" }));

const surveySchema = z.object({
  location: z.string().min(2),
  category: z
    .enum(["nails", "hair", "barber", "lashes", "brows", "skin", "waxing", "massage", "makeup", "wellness"])
    .default("nails"),
  services: z
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
    .default([]),
  budget: z.enum(["under-50", "50-85", "85-125", "125-plus"]).optional(),
  maxDistanceMiles: z.coerce.number().min(1).max(50).default(10),
  availability: z.enum(["today", "this-week", "weekend", "flexible"]).optional(),
  preferences: z.array(z.string()).default([])
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
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  try {
    const pros = apiKey ? await searchGooglePlaces(survey, apiKey) : getDemoPros(survey);
    res.json({
      mode: apiKey ? "live" : "demo",
      criteria: {
        minimumRating: 4.5,
        minimumReviewCount: 10,
        category: survey.category
      },
      pros
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected search error";
    res.status(502).json({ error: message });
  }
});

app.listen(port, () => {
  console.log(`GlowScout API listening on http://localhost:${port}`);
});
