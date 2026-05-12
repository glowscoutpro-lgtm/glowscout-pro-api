import type { ServiceSlug } from "./types.js";

// Display labels the app shows in the UI. The TestFlight build started
// sending these strings ("Russian manicure", "Gel manicure", ...) instead
// of the underlying slugs, which made the Zod enum reject the payload
// with a 400 Invalid survey. We accept either form server-side and
// normalize to slugs before validation.
const LABEL_TO_SLUG: Record<string, ServiceSlug> = {
  // Nails
  "russian manicure": "russian-manicure",
  "gel manicure": "gel-manicure",
  "structured gel": "structured-gel",
  "builder gel": "builder-gel",
  "builder gel / biab": "builder-gel",
  "biab": "builder-gel",
  "dip powder": "dip-powder",
  "acrylic full set": "acrylic-full-set",
  "acrylic": "acrylic-full-set",
  "dry pedicure": "dry-pedicure",
  "spa pedicure": "spa-pedicure",
  "nail art": "nail-art",
  "classic manicure": "classic-manicure",
  "manicure": "classic-manicure",
  // Hair
  "haircut": "haircut",
  "blowout": "blowout",
  "hair color": "hair-color",
  "balayage": "balayage",
  "hair extensions": "hair-extensions",
  "braids": "braids",
  // Barber
  "men's haircut": "mens-haircut",
  "mens haircut": "mens-haircut",
  "fade": "barber-fade",
  "barber fade": "barber-fade",
  "beard trim": "beard-trim",
  "hot towel shave": "hot-towel-shave",
  // Lashes
  "lash extensions": "lash-extensions",
  "lash lift": "lash-lift",
  "lash fill": "lash-fill",
  // Brows
  "brow shaping": "brow-shaping",
  "brow lamination": "brow-lamination",
  "brow tint": "brow-tint",
  // Skin
  "custom facial": "custom-facial",
  "facial": "custom-facial",
  "chemical peel": "chemical-peel",
  "dermaplaning": "dermaplaning",
  "microneedling": "microneedling",
  // Waxing
  "brazilian wax": "brazilian-wax",
  "brow wax": "brow-wax",
  "full leg wax": "full-leg-wax",
  // Massage
  "swedish massage": "swedish-massage",
  "deep tissue massage": "deep-tissue-massage",
  "sports massage": "sports-massage",
  "prenatal massage": "prenatal-massage",
  // Makeup
  "event makeup": "event-makeup",
  "bridal makeup": "bridal-makeup",
  "makeup lesson": "makeup-lesson",
  // Wellness
  "body sculpting": "body-sculpting",
  "sauna session": "sauna-session",
  "sauna": "sauna-session",
  "reiki": "reiki",
  "holistic facial": "holistic-facial"
};

function normalizeKey(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‘’‛′]/g, "'") // smart quotes → ascii apostrophe
    .replace(/[\s ]+/g, " ")
    .trim();
}

// Normalize a single service value: pass slugs through unchanged, map known
// display labels to their slug, and leave everything else alone so the Zod
// enum still surfaces a genuine "Invalid survey" for unknown values.
export function normalizeServiceValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed.length === 0) return value;
  // If it already looks like a slug (no spaces, lowercase, hyphenated), let
  // the enum decide.
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmed)) return trimmed;
  const key = normalizeKey(trimmed);
  // Also try a dehyphenated form so "Gel-Manicure" still maps.
  const dehyphenated = key.replace(/-/g, " ").replace(/\s+/g, " ").trim();
  return LABEL_TO_SLUG[key] ?? LABEL_TO_SLUG[dehyphenated] ?? value;
}

// Preprocess for `z.array(z.enum([...]))`: arrays go through element-wise
// normalization; non-arrays are passed through so Zod still emits the
// "Expected array" error message.
export function normalizeServicesInput(input: unknown): unknown {
  if (!Array.isArray(input)) return input;
  return input.map(normalizeServiceValue);
}
