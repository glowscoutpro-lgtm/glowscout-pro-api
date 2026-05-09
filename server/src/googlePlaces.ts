import { estimateCosts } from "./pricing.js";
import type {
  LicenseVerification,
  ProResult,
  ResolvedLocation,
  ReviewExcerpt,
  SearchCenter,
  SearchDebug,
  ServiceCategory,
  ServiceSlug,
  SurveyPayload
} from "./types.js";
import {
  isUsZipQuery,
  resolveUsZip,
  zipCentroidToResolvedLocation
} from "./zipResolver.js";

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
  formattedAddress?: string;
  locality?: string;
  administrativeArea?: string;
  postalCode?: string;
  country?: string;
  isPostalQuery: boolean;
};

const MIN_RATING = 4.5;
const MIN_REVIEW_COUNT = 10;
const SCORE_PRIOR_WEIGHT = 3;
const SCORE_PRIOR_RATING = 4.5;
const SCORE_RATING_PIVOT = 4.6;
const SCORE_RATING_SLOPE = 200 / 3;
const SCORE_RATING_OFFSET = 76;
const SCORE_VOLUME_CAP = 50;
const SCORE_MAX = 99;
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

export type SearchResult = {
  pros: ProResult[];
  debug: SearchDebug;
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

export function calculateScore(place: Pick<GooglePlace, "rating" | "userRatingCount">): number {
  const rating = place.rating ?? 0;
  const reviewCount = place.userRatingCount ?? 0;
  if (reviewCount <= 0) {
    return 0;
  }
  const shrunkRating =
    (SCORE_PRIOR_WEIGHT * SCORE_PRIOR_RATING + reviewCount * rating) /
    (SCORE_PRIOR_WEIGHT + reviewCount);
  const ratingComponent =
    (shrunkRating - SCORE_RATING_PIVOT) * SCORE_RATING_SLOPE + SCORE_RATING_OFFSET;
  const volumeConfidence = Math.log10(1 + Math.min(reviewCount, SCORE_VOLUME_CAP));
  const raw = ratingComponent + volumeConfidence;
  return Math.max(0, Math.min(SCORE_MAX, Math.round(raw)));
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

function normalize(value?: string): string | undefined {
  if (!value) return undefined;
  return value.trim().toLowerCase();
}

export function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
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
      formatted_address?: string;
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
  const adminComponent = components.find((c) => c.types?.includes("administrative_area_level_1"));
  const countryComponent = components.find((c) => c.types?.includes("country"));

  return {
    lat,
    lng,
    formattedAddress: top.formatted_address,
    locality: localityComponent?.long_name ?? localityComponent?.short_name,
    administrativeArea: adminComponent?.short_name ?? adminComponent?.long_name,
    postalCode: postalComponent?.long_name ?? postalComponent?.short_name,
    country: countryComponent?.short_name ?? countryComponent?.long_name,
    isPostalQuery: isPostalQuery(location)
  };
}

function placeMatchesLocality(place: GooglePlace, locality: string): boolean {
  const target = normalize(locality);
  if (!target) return true;
  const components = place.addressComponents ?? [];
  return components.some((component) => {
    if (!component.types?.some((t) => t === "locality" || t === "postal_town" || t === "sublocality")) {
      return false;
    }
    const long = normalize(component.longText);
    const short = normalize(component.shortText);
    return long === target || short === target;
  });
}

function placeAdminArea(place: GooglePlace): string | undefined {
  const components = place.addressComponents ?? [];
  const admin = components.find((c) => c.types?.includes("administrative_area_level_1"));
  return admin?.shortText ?? admin?.longText;
}

const US_STATE_ABBRS = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC"
]);

// Pull a US state abbreviation out of a Google `formattedAddress` string when
// the structured `addressComponents` did not include one. Google formats US
// addresses as "<street>, <city>, <STATE> <zip>, USA" so the state token
// appears immediately before the ZIP near the end.
function adminFromFormattedAddress(formattedAddress?: string): string | undefined {
  if (!formattedAddress) return undefined;
  // Try "<STATE> <5-digit ZIP>" first (most reliable for US addresses).
  const stateZip = formattedAddress.match(/\b([A-Z]{2})\s+\d{5}(?:-\d{4})?\b/);
  if (stateZip && US_STATE_ABBRS.has(stateZip[1])) return stateZip[1];
  // Fall back to a comma-separated state token before "USA"/"United States".
  const tail = formattedAddress.match(/,\s*([A-Z]{2})\s*(?:,\s*(?:USA|United States))?$/);
  if (tail && US_STATE_ABBRS.has(tail[1])) return tail[1];
  return undefined;
}

function effectivePlaceAdmin(place: GooglePlace): string | undefined {
  return placeAdminArea(place) ?? adminFromFormattedAddress(place.formattedAddress);
}

function placePostalCode(place: GooglePlace): string | undefined {
  const components = place.addressComponents ?? [];
  const postal = components.find((c) => c.types?.includes("postal_code"));
  return postal?.longText ?? postal?.shortText;
}

function clampDistanceMiles(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_MAX_DISTANCE_MILES;
  }
  return Math.min(value, ABSOLUTE_MAX_DISTANCE_MILES);
}

export type PlacesCircle = { latitude: number; longitude: number; radiusMeters: number };

export function buildPlacesTextSearchBody(
  textQuery: string,
  locationBias?: PlacesCircle
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    textQuery,
    minRating: MIN_RATING,
    maxResultCount: 20,
    includePureServiceAreaBusinesses: true
  };

  // Places Text Search v1 supports `locationBias.circle` but does NOT support
  // `locationRestriction.circle` — locationRestriction only accepts `rectangle`.
  // Sending circle on locationRestriction returns
  //   400 Unknown name 'circle' at 'location_restriction'
  // We rely on locationBias for the API hint and apply a strict haversine +
  // admin/postal post-filter in the caller to enforce the radius.
  if (locationBias) {
    body.locationBias = {
      circle: {
        center: { latitude: locationBias.latitude, longitude: locationBias.longitude },
        radius: locationBias.radiusMeters
      }
    };
  }

  return body;
}

async function callPlacesTextSearch(
  apiKey: string,
  textQuery: string,
  locationBias?: PlacesCircle
): Promise<GooglePlace[]> {
  const body = buildPlacesTextSearchBody(textQuery, locationBias);

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

function mapPlaceToProResult(place: GooglePlace, survey: SurveyPayload, distanceMiles?: number): ProResult {
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
    distanceMiles:
      typeof distanceMiles === "number" && Number.isFinite(distanceMiles)
        ? Math.round(distanceMiles * 100) / 100
        : undefined,
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

type ResolvedCenter = {
  lat: number;
  lng: number;
  formattedAddress?: string;
  locality?: string;
  administrativeArea?: string;
  postalCode?: string;
  country?: string;
  isPostalQuery: boolean;
  source: "geocode" | "zip-centroid";
};

function geocodeToResolvedCenter(geocode: GeocodeResult): ResolvedCenter {
  return {
    lat: geocode.lat,
    lng: geocode.lng,
    formattedAddress: geocode.formattedAddress,
    locality: geocode.locality,
    administrativeArea: geocode.administrativeArea,
    postalCode: geocode.postalCode,
    country: geocode.country,
    isPostalQuery: geocode.isPostalQuery,
    source: "geocode"
  };
}

function resolvedCenterToLocation(query: string, center: ResolvedCenter): ResolvedLocation {
  return {
    query,
    formattedAddress: center.formattedAddress,
    locality: center.locality,
    administrativeArea: center.administrativeArea,
    postalCode: center.postalCode,
    country: center.country,
    isPostalQuery: center.isPostalQuery,
    source: center.source
  };
}

async function resolveLocation(
  rawLocation: string,
  apiKey: string
): Promise<ResolvedCenter | null> {
  const geocode = await geocodeLocation(rawLocation, apiKey);
  if (geocode) {
    return geocodeToResolvedCenter(geocode);
  }

  if (isUsZipQuery(rawLocation)) {
    const centroid = await resolveUsZip(rawLocation);
    if (centroid) {
      const resolved = zipCentroidToResolvedLocation(rawLocation, centroid);
      return {
        lat: centroid.lat,
        lng: centroid.lng,
        formattedAddress: resolved.formattedAddress,
        locality: resolved.locality,
        administrativeArea: resolved.administrativeArea,
        postalCode: resolved.postalCode,
        country: resolved.country,
        isPostalQuery: true,
        source: "zip-centroid"
      };
    }
  }

  return null;
}

// When the client has already picked a suggestion from /api/locations/suggest
// it sends the resolved coords/state directly. Trust those over re-geocoding
// the freeform `location` string — re-geocoding can flip "Jackson, MS" to
// "Jackson, TN" if Places ranks the latter higher for the city alone.
function centerFromSurveyOverrides(survey: SurveyPayload): ResolvedCenter | null {
  const lat = survey.locationLat;
  const lng = survey.locationLng;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const state = survey.locationState?.toUpperCase();
  const city = survey.locationCity?.trim() || undefined;
  const postal = survey.locationPostalCode?.trim() || undefined;
  const isPostal = Boolean(postal && POSTAL_CODE_REGEX.test(postal));
  const formattedParts = [city, state, postal].filter((p): p is string => Boolean(p));
  return {
    lat,
    lng,
    formattedAddress: formattedParts.length > 0 ? formattedParts.join(", ") : undefined,
    locality: city,
    administrativeArea: state,
    postalCode: postal,
    country: "US",
    isPostalQuery: isPostal,
    source: isPostal ? "zip-centroid" : "geocode"
  };
}

// Parse a "City, ST" / "City, State" / "City ST" string in the freeform
// location field. We use this to detect when the user explicitly named a
// state — that's our cue to apply a strict state filter even if the geocode
// returned a different `administrativeArea`.
function parseStateFromLocationText(location: string): string | undefined {
  const trimmed = location.trim();
  if (!trimmed) return undefined;
  const commaTail = trimmed.match(/,\s*([A-Za-z]{2})\b\s*(?:USA|United States)?\s*$/);
  if (commaTail) {
    const abbr = commaTail[1].toUpperCase();
    if (US_STATE_ABBRS.has(abbr)) return abbr;
  }
  const spaceTail = trimmed.match(/\b([A-Za-z]{2})\s*(?:USA|United States)?\s*$/);
  if (spaceTail) {
    const abbr = spaceTail[1].toUpperCase();
    if (US_STATE_ABBRS.has(abbr)) return abbr;
  }
  return undefined;
}

export async function searchGooglePlaces(survey: SurveyPayload, apiKey: string): Promise<SearchResult> {
  const baseQuery = buildServiceQuery(survey);
  const requestedRadius =
    typeof survey.locationRadiusMiles === "number"
      ? survey.locationRadiusMiles
      : survey.maxDistanceMiles;
  const maxDistanceMiles = clampDistanceMiles(requestedRadius);
  const radiusMeters = Math.min(
    maxDistanceMiles * METERS_PER_MILE,
    ABSOLUTE_MAX_DISTANCE_MILES * METERS_PER_MILE
  );

  // The state the user explicitly named in the search box / suggestion. When
  // present we treat this as the ground truth for filtering, regardless of
  // what Google's geocoder returns for the freeform string.
  const requestedState =
    survey.locationState?.toUpperCase() ?? parseStateFromLocationText(survey.location);

  const overrideCenter = centerFromSurveyOverrides(survey);
  const center = overrideCenter ?? (await resolveLocation(survey.location, apiKey));

  if (!center) {
    const looksPostal = isPostalQuery(survey.location);
    const resolvedLocation: ResolvedLocation = {
      query: survey.location,
      isPostalQuery: looksPostal,
      source: "unresolved"
    };

    if (looksPostal) {
      // Refuse to do an unrestricted global text search for postal-shaped
      // queries — that path produces out-of-state false positives like
      // "Beverly Hills Premier Nail Salon Pittsburgh" for ZIP 90210.
      return {
        pros: [],
        debug: {
          resolvedLocation,
          searchCenter: null,
          rawResultCount: 0,
          filteredOutCount: 0
        }
      };
    }

    const textQueryWithLocation = `${baseQuery} near ${survey.location}`;
    const places = await callPlacesTextSearch(apiKey, textQueryWithLocation);
    let qualified = places.filter(passesQualityFilters);
    if (requestedState) {
      const adminTarget = normalize(requestedState);
      qualified = qualified.filter((place) => {
        const placeAdmin = normalize(effectivePlaceAdmin(place));
        return placeAdmin === adminTarget;
      });
    }
    const pros = qualified
      .map((place) => mapPlaceToProResult(place, survey))
      .sort((a, b) => b.score - a.score);
    return {
      pros,
      debug: {
        resolvedLocation,
        searchCenter: null,
        rawResultCount: places.length,
        filteredOutCount: places.length - pros.length
      }
    };
  }

  const resolvedLocation = resolvedCenterToLocation(survey.location, center);
  const searchCenter: SearchCenter = {
    lat: center.lat,
    lng: center.lng,
    radiusMiles: maxDistanceMiles
  };

  const textQueryWithLocation = formatQueryWithCenter(baseQuery, center, survey.location);

  const places = await callPlacesTextSearch(
    apiKey,
    textQueryWithLocation,
    { latitude: center.lat, longitude: center.lng, radiusMeters }
  );

  const treatAsPostal = center.isPostalQuery || isPostalQuery(survey.location);

  type Annotated = { place: GooglePlace; distance: number };
  const annotated: Annotated[] = [];
  for (const place of places) {
    if (!passesQualityFilters(place)) continue;
    const lat = place.location?.latitude;
    const lng = place.location?.longitude;
    if (typeof lat !== "number" || typeof lng !== "number") continue;
    const distance = haversineMiles(center.lat, center.lng, lat, lng);
    if (distance > maxDistanceMiles) continue;
    annotated.push({ place, distance });
  }

  let filtered: Annotated[] = annotated;

  // The state we'll enforce: prefer the one the user explicitly named (in the
  // suggestion or the freeform "Jackson, MS" text), then fall back to whatever
  // the geocoder returned. When we have *any* known state we apply a strict
  // filter — out-of-state results are dropped, not preserved as fallbacks.
  const targetState = requestedState ?? center.administrativeArea;
  if (targetState) {
    const adminTarget = normalize(targetState);
    const adminMatches = annotated.filter((entry) => {
      const placeAdmin = normalize(effectivePlaceAdmin(entry.place));
      // Drop entries whose admin area we cannot determine — when the user
      // asked for "Jackson, MS" we'd rather show fewer results than risk
      // surfacing an out-of-state provider whose state we just couldn't read.
      return placeAdmin === adminTarget;
    });
    if (treatAsPostal || requestedState) {
      // For postal queries OR when the user named a state explicitly, never
      // fall back to out-of-state results. Apply strictly even if 0 match.
      filtered = adminMatches;
    } else if (adminMatches.length > 0 && adminMatches.length < annotated.length) {
      filtered = adminMatches;
    }
  }

  if (treatAsPostal && center.postalCode) {
    const postalTarget = normalize(center.postalCode);
    const postalMatches = filtered.filter((entry) => {
      const placePostal = normalize(placePostalCode(entry.place));
      return placePostal && placePostal === postalTarget;
    });
    if (postalMatches.length >= MIN_RESULTS_BEFORE_FALLBACK) {
      filtered = postalMatches;
    }
  } else if (center.locality) {
    const localityMatches = filtered.filter((entry) =>
      placeMatchesLocality(entry.place, center.locality!)
    );
    if (localityMatches.length >= MIN_RESULTS_BEFORE_FALLBACK) {
      filtered = localityMatches;
    }
  }

  const pros = filtered
    .map(({ place, distance }) => mapPlaceToProResult(place, survey, distance))
    .sort((a, b) => b.score - a.score);

  return {
    pros,
    debug: {
      resolvedLocation,
      searchCenter,
      rawResultCount: places.length,
      filteredOutCount: places.length - pros.length
    }
  };
}

function formatQueryWithCenter(baseQuery: string, center: ResolvedCenter, originalLocation: string): string {
  const locationParts = [center.locality, center.administrativeArea, center.postalCode]
    .filter((part): part is string => Boolean(part && part.trim().length > 0));
  const locationLabel = locationParts.length > 0 ? locationParts.join(", ") : originalLocation;
  return `${baseQuery} near ${locationLabel}`;
}
