import { estimateCosts } from "./pricing.js";
import type {
  LicenseVerification,
  ProResult,
  ReviewExcerpt,
  ServiceCategory,
  ServiceSlug,
  SurveyPayload
} from "./types.js";

type GoogleAddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

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
  addressComponents?: GoogleAddressComponent[];
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

type GeocodeResult = {
  lat: number;
  lng: number;
  locality?: string;
  postalCode?: string;
  isPostalQuery: boolean;
};

const MIN_RATING = 4.5;
const MIN_REVIEW_COUNT = 10;
const DEFAULT_MAX_DISTANCE_MILES = 10;
const ABSOLUTE_MAX_DISTANCE_MILES = 50;
const MIN_RESULTS_BEFORE_FALLBACK = 3;
const METERS_PER_MILE = 1609.344;
const EARTH_RADIUS_MILES = 3958.7613;

const POSTAL_CODE_REGEX = /^\s*\d{5}(?:-\d{4})?\s*$/;

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

function isPostalQuery(input: string): boolean {
  return POSTAL_CODE_REGEX.test(input);
}

function normalizeLocality(value?: string): string | undefined {
  if (!value) return undefined;
  return value.trim().toLowerCase();
}

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MILES * c;
}

async function geocodeLocation(location: string, apiKey: string): Promise<GeocodeResult | null> {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", location);
  url.searchParams.set("key", apiKey);

  let response: Response;
  try {
    response = await fetch(url.toString());
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    status?: string;
    results?: Array<{
      geometry?: { location?: { lat?: number; lng?: number } };
      address_components?: Array<{ long_name?: string; short_name?: string; types?: string[] }>;
    }>;
  };

  if (data.status !== "OK" || !data.results?.length) {
    return null;
  }

  const top = data.results[0];
  const lat = top.geometry?.location?.lat;
  const lng = top.geometry?.location?.lng;
  if (typeof lat !== "number" || typeof lng !== "number") {
    return null;
  }

  const components = top.address_components ?? [];
  const localityComponent = components.find((c) => c.types?.includes("locality"))
    ?? components.find((c) => c.types?.includes("postal_town"))
    ?? components.find((c) => c.types?.includes("sublocality"))
    ?? components.find((c) => c.types?.includes("administrative_area_level_3"));
  const postalComponent = components.find((c) => c.types?.includes("postal_code"));

  return {
    lat,
    lng,
    locality: localityComponent?.long_name ?? localityComponent?.short_name,
    postalCode: postalComponent?.long_name ?? postalComponent?.short_name,
    isPostalQuery: isPostalQuery(location)
  };
}

function placeMatchesLocality(place: GooglePlace, locality: string): boolean {
  const target = normalizeLocality(locality);
  if (!target) return true;
  const components = place.addressComponents ?? [];
  return components.some((component) => {
    if (!component.types?.some((t) => t === "locality" || t === "postal_town" || t === "sublocality")) {
      return false;
    }
    const long = normalizeLocality(component.longText);
    const short = normalizeLocality(component.shortText);
    return long === target || short === target;
  });
}

function clampDistanceMiles(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_MAX_DISTANCE_MILES;
  }
  return Math.min(value, ABSOLUTE_MAX_DISTANCE_MILES);
}

async function callPlacesTextSearch(
  apiKey: string,
  textQuery: string,
  locationBias?: { latitude: number; longitude: number; radiusMeters: number }
): Promise<GooglePlace[]> {
  const body: Record<string, unknown> = {
    textQuery,
    minRating: MIN_RATING,
    maxResultCount: 20,
    includePureServiceAreaBusinesses: true
  };

  if (locationBias) {
    body.locationBias = {
      circle: {
        center: { latitude: locationBias.latitude, longitude: locationBias.longitude },
        radius: locationBias.radiusMeters
      }
    };
  }

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
        "places.reviews",
        "places.addressComponents"
      ].join(",")
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google Places request failed with ${response.status}: ${errorBody}`);
  }

  const data = (await response.json()) as GoogleTextSearchResponse;
  return data.places ?? [];
}

function mapPlaceToProResult(place: GooglePlace, survey: SurveyPayload): ProResult {
  return {
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
  };
}

function passesQualityFilters(place: GooglePlace): boolean {
  return (place.rating ?? 0) >= MIN_RATING && (place.userRatingCount ?? 0) >= MIN_REVIEW_COUNT;
}

export async function searchGooglePlaces(survey: SurveyPayload, apiKey: string): Promise<ProResult[]> {
  const baseQuery = buildServiceQuery(survey);
  const textQueryWithLocation = `${baseQuery} near ${survey.location}`;
  const maxDistanceMiles = clampDistanceMiles(survey.maxDistanceMiles);

  const geocode = await geocodeLocation(survey.location, apiKey);

  if (!geocode) {
    const places = await callPlacesTextSearch(apiKey, textQueryWithLocation);
    return places
      .filter(passesQualityFilters)
      .map((place) => mapPlaceToProResult(place, survey))
      .sort((a, b) => b.score - a.score);
  }

  const radiusMeters = Math.min(maxDistanceMiles * METERS_PER_MILE, ABSOLUTE_MAX_DISTANCE_MILES * METERS_PER_MILE);
  const places = await callPlacesTextSearch(apiKey, textQueryWithLocation, {
    latitude: geocode.lat,
    longitude: geocode.lng,
    radiusMeters
  });

  const withinRadius = places.filter((place) => {
    if (!passesQualityFilters(place)) return false;
    const lat = place.location?.latitude;
    const lng = place.location?.longitude;
    if (typeof lat !== "number" || typeof lng !== "number") return false;
    const distance = haversineMiles(geocode.lat, geocode.lng, lat, lng);
    return distance <= maxDistanceMiles;
  });

  const treatAsPostal = geocode.isPostalQuery || isPostalQuery(survey.location);

  let filtered: GooglePlace[];
  if (treatAsPostal || !geocode.locality) {
    filtered = withinRadius;
  } else {
    const localityMatches = withinRadius.filter((place) => placeMatchesLocality(place, geocode.locality!));
    filtered = localityMatches.length >= MIN_RESULTS_BEFORE_FALLBACK ? localityMatches : withinRadius;
  }

  return filtered
    .map((place) => mapPlaceToProResult(place, survey))
    .sort((a, b) => b.score - a.score);
}
