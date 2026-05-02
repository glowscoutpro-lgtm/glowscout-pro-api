import { estimateCosts } from "./pricing.js";
import type {
  LicenseVerification,
  ProResult,
  ReviewExcerpt,
  ServiceCategory,
  ServiceSlug,
  SurveyPayload
} from "./types.js";

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  priceLevel?: string;
  businessStatus?: string;
  location?: { latitude?: number; longitude?: number };
  reviews?: Array<{
    rating?: number;
    text?: { text?: string };
    relativePublishTimeDescription?: string;
    authorAttribution?: { displayName?: string; uri?: string };
  }>;
};

type GoogleTextSearchResponse = {
  places?: GooglePlace[];
};

const MIN_RATING = 4.5;
const MIN_REVIEW_COUNT = 10;

const CATEGORY_TERMS: Record<ServiceCategory, string> = {
  nails: "nail salon",
  hair: "hair salon stylist",
  barber: "barber shop men's haircut",
  lashes: "lash studio lash artist",
  brows: "brow studio eyebrow specialist",
  skin: "esthetician facial spa",
  waxing: "waxing salon",
  massage: "massage therapist",
  makeup: "makeup artist",
  wellness: "wellness spa"
};

const SERVICE_TERMS: Record<ServiceSlug, string> = {
  "russian-manicure": "Russian manicure",
  "gel-manicure": "gel manicure",
  "structured-gel": "structured gel manicure",
  "dip-powder": "dip powder nails",
  "acrylic-full-set": "acrylic nails",
  "nail-art": "nail art",
  "dry-pedicure": "dry pedicure",
  "spa-pedicure": "spa pedicure",
  "builder-gel": "builder gel nails",
  "classic-manicure": "manicure",
  haircut: "haircut",
  blowout: "blowout",
  "hair-color": "hair color",
  balayage: "balayage",
  "hair-extensions": "hair extensions",
  braids: "braids",
  "mens-haircut": "men's haircut",
  "barber-fade": "barber fade haircut",
  "beard-trim": "beard trim barber",
  "hot-towel-shave": "hot towel shave barber",
  "lash-extensions": "lash extensions",
  "lash-lift": "lash lift",
  "lash-fill": "lash fill",
  "brow-shaping": "brow shaping",
  "brow-lamination": "brow lamination",
  "brow-tint": "brow tint",
  "custom-facial": "custom facial",
  "chemical-peel": "chemical peel",
  dermaplaning: "dermaplaning",
  microneedling: "microneedling",
  "brazilian-wax": "Brazilian wax",
  "brow-wax": "brow wax",
  "full-leg-wax": "full leg wax",
  "swedish-massage": "Swedish massage",
  "deep-tissue-massage": "deep tissue massage",
  "sports-massage": "sports massage",
  "prenatal-massage": "prenatal massage",
  "event-makeup": "event makeup",
  "bridal-makeup": "bridal makeup",
  "makeup-lesson": "makeup lesson",
  "body-sculpting": "body sculpting",
  "sauna-session": "sauna",
  reiki: "Reiki",
  "holistic-facial": "holistic facial"
};

function buildServiceQuery(survey: SurveyPayload): string {
  const categoryTerm = CATEGORY_TERMS[survey.category] ?? CATEGORY_TERMS.nails;
  const selectedTerms = survey.services.map((service) => SERVICE_TERMS[service]).filter(Boolean);
  const licensedTerm = survey.preferences?.includes("Licensed pro") ? "licensed" : "";
  const mobileTerm = survey.preferences?.includes("Mobile service")
    ? "mobile at-home on-site house call comes to you travel"
    : "";

  if (selectedTerms.length === 0) {
    return [licensedTerm, mobileTerm, categoryTerm].filter(Boolean).join(" ");
  }

  return [licensedTerm, mobileTerm, selectedTerms.join(" or "), categoryTerm].filter(Boolean).join(" ");
}

function calculateScore(place: GooglePlace): number {
  const ratingScore = ((place.rating ?? 0) / 5) * 70;
  const reviewScore = Math.min((place.userRatingCount ?? 0) / 100, 1) * 30;
  return Math.round(ratingScore + reviewScore);
}

function reviewHighlights(place: GooglePlace): string[] {
  return (place.reviews ?? [])
    .map((review) => review.text?.text)
    .filter((text): text is string => Boolean(text))
    .slice(0, 2);
}

function reviewExcerpts(place: GooglePlace): ReviewExcerpt[] {
  return (place.reviews ?? [])
    .map((review) => ({
      authorName: review.authorAttribution?.displayName ?? "Google reviewer",
      authorUri: review.authorAttribution?.uri,
      rating: review.rating,
      text: review.text?.text ?? "",
      relativePublishTime: review.relativePublishTimeDescription,
      source: "google" as const
    }))
    .filter((review) => review.text.trim().length > 0)
    .slice(0, 5);
}

function defaultLicenseVerification(survey: SurveyPayload): LicenseVerification {
  return {
    status: survey.preferences?.includes("Licensed pro") ? "pending_review" : "not_verified",
    label: survey.preferences?.includes("Licensed pro") ? "License pending review" : "License not verified",
    detail:
      "Google reviews and ads do not verify a state professional license. A verified badge requires state-board matching or pro-submitted license details.",
    lastChecked: new Date().toISOString()
  };
}

export async function searchGooglePlaces(survey: SurveyPayload, apiKey: string): Promise<ProResult[]> {
  const textQuery = `${buildServiceQuery(survey)} near ${survey.location}`;

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "places.rating",
        "places.userRatingCount",
        "places.nationalPhoneNumber",
        "places.websiteUri",
        "places.googleMapsUri",
        "places.priceLevel",
        "places.businessStatus",
        "places.reviews"
      ].join(",")
    },
    body: JSON.stringify({
      textQuery,
      minRating: MIN_RATING,
      maxResultCount: 20,
      includePureServiceAreaBusinesses: true
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Places request failed with ${response.status}: ${body}`);
  }

  const data = (await response.json()) as GoogleTextSearchResponse;

  return (data.places ?? [])
    .filter((place) => (place.rating ?? 0) >= MIN_RATING)
    .filter((place) => (place.userRatingCount ?? 0) >= MIN_REVIEW_COUNT)
    .map((place) => ({
      id: place.id ?? crypto.randomUUID(),
      name: place.displayName?.text ?? "Unnamed beauty pro",
      address: place.formattedAddress ?? "Address unavailable",
      rating: place.rating ?? 0,
      reviewCount: place.userRatingCount ?? 0,
      phone: place.nationalPhoneNumber,
      website: place.websiteUri,
      googleMapsUri: place.googleMapsUri,
      priceLevel: place.priceLevel,
      businessStatus: place.businessStatus,
      lat: place.location?.latitude,
      lng: place.location?.longitude,
      matchedServices: survey.services,
      estimatedCosts: estimateCosts(survey.services, place.priceLevel),
      reviewHighlights: reviewHighlights(place),
      reviews: reviewExcerpts(place),
      licenseVerification: defaultLicenseVerification(survey),
      score: calculateScore(place)
    }))
    .sort((a, b) => b.score - a.score);
}
