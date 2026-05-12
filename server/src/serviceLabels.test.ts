import { getDemoPros } from "./demoData.js";
import {
  normalizeCategoryValue,
  normalizeServiceValue,
  normalizeServicesInput
} from "./serviceLabels.js";
import type { SurveyPayload } from "./types.js";

let failed = 0;

function assert(condition: unknown, message: string): void {
  const status = condition ? "PASS" : "FAIL";
  console.log(`${status}  ${message}`);
  if (!condition) failed++;
}

// Unit-level: each readable label the app shows must normalize to a slug.
{
  const labelCases: Array<[string, string]> = [
    ["Russian manicure", "russian-manicure"],
    ["Gel manicure", "gel-manicure"],
    ["Classic manicure", "classic-manicure"],
    ["Structured gel", "structured-gel"],
    ["Builder gel / BIAB", "builder-gel"],
    ["Dip powder", "dip-powder"],
    ["Acrylic full set", "acrylic-full-set"],
    ["Dry pedicure", "dry-pedicure"],
    ["Spa pedicure", "spa-pedicure"],
    ["Nail art", "nail-art"],
    ["Men's haircut", "mens-haircut"],
    ["Mens haircut", "mens-haircut"],
    ["Hair color", "hair-color"],
    ["Brazilian wax", "brazilian-wax"],
    ["Swedish massage", "swedish-massage"],
    ["Event makeup", "event-makeup"],
    ["Body sculpting", "body-sculpting"],
    ["  gel  manicure  ", "gel-manicure"],
    ["GEL MANICURE", "gel-manicure"]
  ];
  for (const [label, slug] of labelCases) {
    assert(
      normalizeServiceValue(label) === slug,
      `"${label}" → "${slug}" (got "${String(normalizeServiceValue(label))}")`
    );
  }
}

// Slug values must pass through untouched so existing clients keep working.
{
  for (const slug of ["russian-manicure", "gel-manicure", "classic-manicure", "haircut", "barber-fade"]) {
    assert(
      normalizeServiceValue(slug) === slug,
      `slug "${slug}" passes through unchanged`
    );
  }
}

// Unknown values must be left alone so the Zod enum still produces an
// "Invalid survey" 400 for genuinely bad input (no silent dropping).
{
  assert(normalizeServiceValue("Made up service") === "Made up service", "unknown label passed through unchanged");
  assert(normalizeServiceValue("totally-fake-slug") === "totally-fake-slug", "unknown slug passed through unchanged");
}

// Array preprocess: arrays normalize element-wise; non-arrays pass through
// so Zod produces the usual "Expected array" error.
{
  const out = normalizeServicesInput([
    "Russian manicure",
    "gel-manicure",
    "Classic manicure"
  ]);
  assert(
    Array.isArray(out) &&
      out[0] === "russian-manicure" &&
      out[1] === "gel-manicure" &&
      out[2] === "classic-manicure",
    "array of labels+slugs normalizes element-wise"
  );
  assert(normalizeServicesInput("not an array") === "not an array", "non-array input passes through (Zod will reject)");
  assert(normalizeServicesInput(undefined) === undefined, "undefined input passes through to defaults");
}

// Unit-level: readable category labels the app sends must normalize to the
// existing enum slug. Unknowns pass through so the Zod enum still 400s.
{
  const categoryCases: Array<[string, string]> = [
    ["Nail Tech", "nails"],
    ["nail-tech", "nails"],
    ["Nail Technician", "nails"],
    ["Nails", "nails"],
    ["Manicure", "nails"],
    ["Manicurist", "nails"],
    ["Hair Stylist", "hair"],
    ["hairstylist", "hair"],
    ["Hair", "hair"],
    ["Barber", "barber"],
    ["Men's Haircut", "barber"],
    ["Mens Haircut", "barber"],
    ["Lash Artist", "lashes"],
    ["Lash Tech", "lashes"],
    ["Brows", "brows"],
    ["Eyebrows", "brows"],
    ["Microblading", "brows"],
    ["Esthetician", "skin"],
    ["Aesthetician", "skin"],
    ["Skin", "skin"],
    ["Skincare", "skin"],
    ["Waxing", "waxing"],
    ["Hair Removal", "waxing"],
    ["Massage", "massage"],
    ["Massage Therapist", "massage"],
    ["Makeup", "makeup"],
    ["Makeup Artist", "makeup"],
    ["MUA", "makeup"],
    ["Wellness", "wellness"],
    ["Spa", "wellness"],
    ["  NAIL   TECH  ", "nails"]
  ];
  for (const [label, slug] of categoryCases) {
    assert(
      normalizeCategoryValue(label) === slug,
      `category "${label}" → "${slug}" (got "${String(normalizeCategoryValue(label))}")`
    );
  }
  // Existing slug clients keep working.
  for (const slug of ["nails", "hair", "barber", "lashes", "brows", "skin", "waxing", "massage", "makeup", "wellness"]) {
    assert(
      normalizeCategoryValue(slug) === slug,
      `category slug "${slug}" passes through unchanged`
    );
  }
  // Genuinely unknown labels are not silently dropped.
  assert(
    normalizeCategoryValue("Astrology") === "Astrology",
    "unknown category label passed through unchanged"
  );
  assert(
    normalizeCategoryValue("totally-bogus") === "totally-bogus",
    "unknown category slug passed through unchanged"
  );
}

// Schema-level: build the survey schema the way index.ts does and verify
// the Lake Zurich payload with display labels parses to slugs and that
// the demo path then yields matches instead of a 400.
async function lakeZurichLabelPayloadParses(): Promise<void> {
  const { z } = await import("zod");
  const { normalizeCategoryValue: normCat } = await import("./serviceLabels.js");
  const surveySchema = z.object({
    location: z.string().min(2),
    category: z.preprocess(
      normCat,
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
    preferences: z.array(z.string()).default([]),
    maxDistanceMiles: z.coerce.number().min(1).max(50).default(10)
  });

  const lakeZurichPayload = {
    location: "Lake Zurich, IL",
    category: "nails",
    services: ["Russian manicure", "Gel manicure", "Classic manicure"],
    preferences: [],
    maxDistanceMiles: 10
  };
  const parsed = surveySchema.safeParse(lakeZurichPayload);
  assert(parsed.success, `Lake Zurich label payload parses (errors=${parsed.success ? "" : JSON.stringify(parsed.error.flatten())})`);
  if (parsed.success) {
    const services = parsed.data.services;
    assert(
      services.length === 3 &&
        services[0] === "russian-manicure" &&
        services[1] === "gel-manicure" &&
        services[2] === "classic-manicure",
      `services normalized to slugs (got ${JSON.stringify(services)})`
    );

    // The demo path keys off lowercase location matches, so labels must not
    // affect downstream behavior — Lake Zurich should still yield matches.
    const survey = parsed.data as SurveyPayload;
    const result = getDemoPros(survey);
    assert(
      result.pros.length > 0,
      `Lake Zurich label payload yields demo matches (got ${result.pros.length})`
    );
    assert(
      result.pros.some((p) => p.name === "Elina Nail Studio"),
      "Lake Zurich 60047 label payload still surfaces Elina Nail Studio"
    );
  }

  // Mixed slug + label input also parses cleanly (rollout safety for clients
  // that send a mix during the app update).
  const mixed = surveySchema.safeParse({
    location: "Lake Zurich, IL",
    services: ["russian-manicure", "Gel manicure", "classic-manicure"],
    maxDistanceMiles: 5
  });
  assert(
    mixed.success && mixed.data.services.join(",") === "russian-manicure,gel-manicure,classic-manicure",
    "mixed slug + label payload normalizes to all slugs"
  );

  // Unknown labels must still 400 — we don't want silent dropping.
  const bad = surveySchema.safeParse({
    location: "Lake Zurich, IL",
    services: ["Not a real service"],
    maxDistanceMiles: 5
  });
  assert(!bad.success, "genuinely unknown service value still fails validation");

  // Exact TestFlight 60047/Lake Zurich payload: app sends the readable
  // profession label ("Nail Tech") as `category` alongside service display
  // labels. Both must normalize so the schema accepts the payload and
  // Lake Zurich still yields demo matches (Elina Nail Studio).
  const appPayload = {
    location: "60047",
    category: "Nail Tech",
    services: ["Russian manicure", "Gel manicure", "Classic manicure"],
    preferences: ["Walk-in availability", "Speaks Russian"],
    maxDistanceMiles: 10
  };
  const appParsed = surveySchema.safeParse(appPayload);
  assert(
    appParsed.success,
    `60047 "Nail Tech" label payload parses (errors=${appParsed.success ? "" : JSON.stringify(appParsed.error.flatten())})`
  );
  if (appParsed.success) {
    assert(
      appParsed.data.category === "nails",
      `category "Nail Tech" normalized to "nails" (got "${appParsed.data.category}")`
    );
    assert(
      appParsed.data.services.join(",") === "russian-manicure,gel-manicure,classic-manicure",
      `services normalized to slugs (got ${JSON.stringify(appParsed.data.services)})`
    );
    const survey = appParsed.data as SurveyPayload;
    const result = getDemoPros(survey);
    assert(
      result.pros.length > 0,
      `60047 "Nail Tech" payload yields demo matches (got ${result.pros.length})`
    );
    assert(
      result.pros.some((p) => p.name === "Elina Nail Studio"),
      `60047 "Nail Tech" payload surfaces Elina Nail Studio`
    );
  }

  // Common alternate profession labels from the app's profession picker
  // must also normalize to existing slugs.
  const altCases: Array<[string, string]> = [
    ["nail-tech", "nails"],
    ["Nail Technician", "nails"],
    ["Hair Stylist", "hair"],
    ["Lash Artist", "lashes"],
    ["Esthetician", "skin"],
    ["Barber", "barber"]
  ];
  for (const [label, slug] of altCases) {
    const out = surveySchema.safeParse({
      location: "Lake Zurich, IL",
      category: label,
      services: [],
      maxDistanceMiles: 10
    });
    assert(
      out.success && out.data.category === slug,
      `category "${label}" payload normalizes to "${slug}" (parsed=${out.success ? out.data.category : "FAIL"})`
    );
  }

  // Genuinely unknown category values must still fail (no silent fallback).
  const badCategory = surveySchema.safeParse({
    location: "Lake Zurich, IL",
    category: "Astrologer",
    services: [],
    maxDistanceMiles: 10
  });
  assert(!badCategory.success, "genuinely unknown category value still fails validation");
}

async function run(): Promise<void> {
  await lakeZurichLabelPayloadParses();
  if (failed > 0) {
    console.error(`\n${failed} serviceLabels case(s) failed`);
    process.exit(1);
  }
  console.log("\nAll serviceLabels cases passed");
}

run().catch((err) => {
  console.error("serviceLabels test threw:", err);
  process.exit(1);
});
