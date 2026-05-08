import { resolveGoogleApiKey } from "./googleApiKey.js";
import { EMBEDDED_ZIP_CENTROIDS, extractUsZip, resolveUsZip } from "./zipResolver.js";

export type LocationSuggestionType = "zip" | "city" | "nearby";

export type LocationSuggestion = {
  type: LocationSuggestionType;
  label: string;
  city: string;
  state: string;
  postalCode?: string;
  lat: number;
  lng: number;
  radiusMiles: number;
  source: "embedded" | "zippopotam" | "curated" | "google";
};

type NearbyEntry = {
  city: string;
  state: string;
  lat: number;
  lng: number;
  radiusMiles?: number;
};

// Known overlapping/nearby cities for selected ZIPs. Sourced from public USPS
// notes and OpenStreetMap centroids; kept small so we never have to call paid
// geocoding APIs. ZIPs that aren't listed here just return the primary city.
const NEARBY_BY_ZIP: Record<string, NearbyEntry[]> = {
  // 60047 — Lake County, IL: ZIP boundary covers Lake Zurich plus parts of
  // Hawthorn Woods, Kildeer, Long Grove, and Indian Creek.
  "60047": [
    { city: "Long Grove", state: "IL", lat: 42.182, lng: -87.998, radiusMiles: 4 },
    { city: "Hawthorn Woods", state: "IL", lat: 42.225, lng: -88.044, radiusMiles: 4 },
    { city: "Kildeer", state: "IL", lat: 42.176, lng: -88.046, radiusMiles: 4 },
    { city: "Indian Creek", state: "IL", lat: 42.205, lng: -87.971, radiusMiles: 4 }
  ],
  // 90210 — Beverly Hills, CA borders Los Angeles, West Hollywood, Bel Air.
  "90210": [
    { city: "West Hollywood", state: "CA", lat: 34.09, lng: -118.3617, radiusMiles: 3 },
    { city: "Los Angeles", state: "CA", lat: 34.0522, lng: -118.2437, radiusMiles: 5 },
    { city: "Bel Air", state: "CA", lat: 34.0901, lng: -118.459, radiusMiles: 3 }
  ],
  // 10001 — Chelsea / Midtown West, NYC.
  "10001": [
    { city: "Hoboken", state: "NJ", lat: 40.7439, lng: -74.0324, radiusMiles: 3 },
    { city: "Hell's Kitchen", state: "NY", lat: 40.7638, lng: -73.9918, radiusMiles: 2 },
    { city: "Chelsea", state: "NY", lat: 40.7465, lng: -74.0014, radiusMiles: 2 }
  ],
  "10002": [
    { city: "Lower East Side", state: "NY", lat: 40.715, lng: -73.984, radiusMiles: 2 },
    { city: "Chinatown", state: "NY", lat: 40.7158, lng: -73.997, radiusMiles: 2 }
  ],
  "94102": [
    { city: "Tenderloin", state: "CA", lat: 37.7838, lng: -122.4148, radiusMiles: 1 },
    { city: "Hayes Valley", state: "CA", lat: 37.7766, lng: -122.4244, radiusMiles: 1 }
  ],
  "60601": [
    { city: "The Loop", state: "IL", lat: 41.8835, lng: -87.6293, radiusMiles: 1 },
    { city: "Streeterville", state: "IL", lat: 41.8941, lng: -87.6181, radiusMiles: 1 }
  ],
  "60614": [
    { city: "Lincoln Park", state: "IL", lat: 41.9214, lng: -87.6534, radiusMiles: 1 },
    { city: "Old Town", state: "IL", lat: 41.9099, lng: -87.6375, radiusMiles: 1 }
  ]
};

type CityEntry = {
  city: string;
  state: string;
  lat: number;
  lng: number;
  // Representative ZIP we can attach when we want to surface one.
  postalCode?: string;
};

let cityIndex: CityEntry[] | null = null;

function buildCityIndex(): CityEntry[] {
  const grouped = new Map<string, { lats: number[]; lngs: number[]; zips: string[] }>();
  for (const [zip, entry] of Object.entries(EMBEDDED_ZIP_CENTROIDS)) {
    const key = `${entry.city}|${entry.state}`;
    let bucket = grouped.get(key);
    if (!bucket) {
      bucket = { lats: [], lngs: [], zips: [] };
      grouped.set(key, bucket);
    }
    bucket.lats.push(entry.lat);
    bucket.lngs.push(entry.lng);
    bucket.zips.push(zip);
  }

  const cities: CityEntry[] = [];
  for (const [key, bucket] of grouped.entries()) {
    const [city, state] = key.split("|");
    const lat = bucket.lats.reduce((a, b) => a + b, 0) / bucket.lats.length;
    const lng = bucket.lngs.reduce((a, b) => a + b, 0) / bucket.lngs.length;
    const postalCode = bucket.zips.sort()[0];
    cities.push({ city, state, lat, lng, postalCode });
  }
  // Stable order: alphabetical by city, then state.
  cities.sort((a, b) => a.city.localeCompare(b.city) || a.state.localeCompare(b.state));
  return cities;
}

function getCityIndex(): CityEntry[] {
  if (!cityIndex) cityIndex = buildCityIndex();
  return cityIndex;
}

export function _resetCityIndexForTests(): void {
  cityIndex = null;
}

function cityRadiusMiles(state: string): number {
  // Dense urban cores get a smaller default radius; suburban towns get more.
  const URBAN = new Set(["NY", "DC"]);
  return URBAN.has(state) ? 5 : 8;
}

const ZIP_AREA_RADIUS_MILES = 6;

function makeZipSuggestion(
  zip: string,
  centroid: { lat: number; lng: number; city: string; state: string },
  source: LocationSuggestion["source"]
): LocationSuggestion {
  return {
    type: "zip",
    label: `Search entire ZIP ${zip} (${centroid.city}, ${centroid.state})`,
    city: centroid.city,
    state: centroid.state,
    postalCode: zip,
    lat: centroid.lat,
    lng: centroid.lng,
    radiusMiles: ZIP_AREA_RADIUS_MILES,
    source
  };
}

function makePrimaryCitySuggestion(
  centroid: { lat: number; lng: number; city: string; state: string },
  zip: string,
  source: LocationSuggestion["source"]
): LocationSuggestion {
  return {
    type: "city",
    label: `${centroid.city}, ${centroid.state}`,
    city: centroid.city,
    state: centroid.state,
    postalCode: zip,
    lat: centroid.lat,
    lng: centroid.lng,
    radiusMiles: cityRadiusMiles(centroid.state),
    source
  };
}

function makeNearbySuggestion(entry: NearbyEntry, zip: string): LocationSuggestion {
  return {
    type: "nearby",
    label: `${entry.city}, ${entry.state}`,
    city: entry.city,
    state: entry.state,
    postalCode: zip,
    lat: entry.lat,
    lng: entry.lng,
    radiusMiles: entry.radiusMiles ?? cityRadiusMiles(entry.state),
    source: "curated"
  };
}

function makeCitySuggestion(entry: CityEntry): LocationSuggestion {
  return {
    type: "city",
    label: `${entry.city}, ${entry.state}`,
    city: entry.city,
    state: entry.state,
    postalCode: entry.postalCode,
    lat: entry.lat,
    lng: entry.lng,
    radiusMiles: cityRadiusMiles(entry.state),
    source: "embedded"
  };
}

const STATE_ABBR_BY_NAME: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO",
  montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND",
  ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI",
  "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT",
  vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI",
  wyoming: "WY", "district of columbia": "DC"
};

function parseCityState(query: string): { city: string; state?: string } {
  const trimmed = query.trim().replace(/\s+/g, " ");
  // Match "City, ST" or "City, State"
  const commaIdx = trimmed.lastIndexOf(",");
  if (commaIdx > 0) {
    const cityPart = trimmed.slice(0, commaIdx).trim();
    const tail = trimmed.slice(commaIdx + 1).trim();
    if (tail.length === 2 && /^[A-Za-z]{2}$/.test(tail)) {
      return { city: cityPart, state: tail.toUpperCase() };
    }
    const fromName = STATE_ABBR_BY_NAME[tail.toLowerCase()];
    if (fromName) {
      return { city: cityPart, state: fromName };
    }
    // Multi-word state names ("New York") were already handled by the lowercase
    // map above. Anything else is treated as part of the city.
    return { city: trimmed };
  }

  // No comma. Try to peel off a trailing state. The trailing state can be:
  //   - a 2-letter abbreviation: "St Augustine FL"
  //   - a single-word state name: "St Augustine Florida"
  //   - a two-word state name:   "Charlotte North Carolina"
  const tokens = trimmed.split(/\s+/);
  if (tokens.length >= 2) {
    const last1 = tokens[tokens.length - 1];
    if (last1.length === 2 && /^[A-Za-z]{2}$/.test(last1)) {
      return { city: tokens.slice(0, -1).join(" "), state: last1.toUpperCase() };
    }
    const last1Name = STATE_ABBR_BY_NAME[last1.toLowerCase()];
    if (last1Name) {
      return { city: tokens.slice(0, -1).join(" "), state: last1Name };
    }
    if (tokens.length >= 3) {
      const last2 = `${tokens[tokens.length - 2]} ${tokens[tokens.length - 1]}`;
      const last2Name = STATE_ABBR_BY_NAME[last2.toLowerCase()];
      if (last2Name) {
        return { city: tokens.slice(0, -2).join(" "), state: last2Name };
      }
    }
  }
  return { city: trimmed };
}

// Normalize common abbreviations so "St Augustine" and "Saint Augustine" match
// the same target. Used both when comparing against the embedded city index and
// when forming a query for the Google Geocoding fallback.
export function normalizeCityName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\./g, " ")
    .replace(/\s+/g, " ")
    .trim()
    // st → saint (treat them as the same word at any token position).
    .replace(/(^|\s)st(\s|$)/g, "$1saint$2")
    .replace(/(^|\s)ste(\s|$)/g, "$1sainte$2")
    .replace(/(^|\s)mt(\s|$)/g, "$1mount$2")
    .replace(/(^|\s)ft(\s|$)/g, "$1fort$2");
}

const MAX_CITY_SUGGESTIONS = 8;

let loggedMissingKeyOnce = false;

export function _resetMissingKeyLogForTests(): void {
  loggedMissingKeyOnce = false;
}

export async function suggestLocations(query: string): Promise<LocationSuggestion[]> {
  const trimmed = query?.trim() ?? "";
  if (trimmed.length === 0) return [];

  const zip = extractUsZip(trimmed);
  if (zip) {
    const centroid = await resolveUsZip(zip);
    if (!centroid) return [];

    const source: LocationSuggestion["source"] =
      EMBEDDED_ZIP_CENTROIDS[zip] != null ? "embedded" : "zippopotam";

    const suggestions: LocationSuggestion[] = [
      makeZipSuggestion(zip, centroid, source),
      makePrimaryCitySuggestion(centroid, zip, source)
    ];

    for (const nearby of NEARBY_BY_ZIP[zip] ?? []) {
      // Skip duplicates of the primary city (e.g. if a curated nearby happens
      // to share the primary city's name).
      if (
        nearby.city.toLowerCase() === centroid.city.toLowerCase() &&
        nearby.state.toUpperCase() === centroid.state.toUpperCase()
      ) {
        continue;
      }
      suggestions.push(makeNearbySuggestion(nearby, zip));
    }

    return suggestions;
  }

  const { city: cityQuery, state } = parseCityState(trimmed);
  const needle = cityQuery.toLowerCase();
  if (needle.length < 2) return [];

  const normalizedNeedle = normalizeCityName(cityQuery);

  const index = getCityIndex();
  const startsWith: CityEntry[] = [];
  const contains: CityEntry[] = [];
  for (const entry of index) {
    if (state && entry.state !== state) continue;
    const cityLower = entry.city.toLowerCase();
    const cityNormalized = normalizeCityName(entry.city);
    if (cityLower === needle || cityNormalized === normalizedNeedle) {
      startsWith.unshift(entry);
    } else if (cityLower.startsWith(needle) || cityNormalized.startsWith(normalizedNeedle)) {
      startsWith.push(entry);
    } else if (cityLower.includes(needle) || cityNormalized.includes(normalizedNeedle)) {
      contains.push(entry);
    }
  }

  const embeddedHits = [...startsWith, ...contains]
    .slice(0, MAX_CITY_SUGGESTIONS)
    .map(makeCitySuggestion);

  if (embeddedHits.length > 0) {
    return embeddedHits;
  }

  // Fallback: ask Google Geocoding for a US city match. This handles cities
  // that aren't represented in the embedded ZIP catalog (e.g. St Augustine,
  // FL). We only call out when we have nothing locally and a query looks
  // city-like (>= 3 chars).
  if (needle.length < 3) return [];
  const { apiKey, checked } = resolveGoogleApiKey();
  if (!apiKey) {
    if (!loggedMissingKeyOnce) {
      loggedMissingKeyOnce = true;
      console.warn(
        `[locationSuggest] Google Geocoding fallback skipped: no API key set. Checked env vars: ${checked.join(", ")}.`
      );
    }
    return [];
  }

  const geocoded = await geocodeCityFallback(cityQuery, state, apiKey);
  return geocoded ? [geocoded] : [];
}

type GeocodeAddressComponent = {
  long_name?: string;
  short_name?: string;
  types?: string[];
};

type GeocodeApiResult = {
  formatted_address?: string;
  geometry?: { location?: { lat?: number; lng?: number } };
  address_components?: GeocodeAddressComponent[];
  types?: string[];
};

const GEOCODE_CACHE = new Map<string, LocationSuggestion | null>();
const GEOCODE_TIMEOUT_MS = 3000;

export function _resetGeocodeCacheForTests(): void {
  GEOCODE_CACHE.clear();
}

async function geocodeCityFallback(
  cityQuery: string,
  state: string | undefined,
  apiKey: string
): Promise<LocationSuggestion | null> {
  const address = state ? `${cityQuery}, ${state}, USA` : `${cityQuery}, USA`;
  const cacheKey = address.toLowerCase();
  if (GEOCODE_CACHE.has(cacheKey)) {
    return GEOCODE_CACHE.get(cacheKey) ?? null;
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("components", "country:US");
  url.searchParams.set("key", apiKey);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);
  let data: { status?: string; results?: GeocodeApiResult[] };
  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    if (!response.ok) {
      GEOCODE_CACHE.set(cacheKey, null);
      return null;
    }
    data = (await response.json()) as { status?: string; results?: GeocodeApiResult[] };
  } catch {
    GEOCODE_CACHE.set(cacheKey, null);
    return null;
  } finally {
    clearTimeout(timer);
  }

  if (data.status !== "OK" || !data.results?.length) {
    GEOCODE_CACHE.set(cacheKey, null);
    return null;
  }

  // Prefer a result that geocoded as a locality (true town/city), then fall
  // back to the top result. We require US country and a usable lat/lng.
  const localityResult =
    data.results.find((r) => r.types?.includes("locality")) ??
    data.results.find((r) => r.types?.includes("administrative_area_level_3")) ??
    data.results.find((r) => r.types?.includes("postal_town")) ??
    data.results[0];

  const components = localityResult.address_components ?? [];
  const country = components.find((c) => c.types?.includes("country"));
  if (country && (country.short_name ?? country.long_name) !== "US") {
    GEOCODE_CACHE.set(cacheKey, null);
    return null;
  }

  const localityComp =
    components.find((c) => c.types?.includes("locality")) ??
    components.find((c) => c.types?.includes("postal_town")) ??
    components.find((c) => c.types?.includes("administrative_area_level_3")) ??
    components.find((c) => c.types?.includes("administrative_area_level_2"));
  const adminComp = components.find((c) => c.types?.includes("administrative_area_level_1"));
  const postalComp = components.find((c) => c.types?.includes("postal_code"));

  const cityName = localityComp?.long_name ?? localityComp?.short_name ?? cityQuery;
  const stateAbbr = adminComp?.short_name ?? adminComp?.long_name ?? state ?? "";
  const lat = localityResult.geometry?.location?.lat;
  const lng = localityResult.geometry?.location?.lng;
  if (typeof lat !== "number" || typeof lng !== "number" || !stateAbbr) {
    GEOCODE_CACHE.set(cacheKey, null);
    return null;
  }

  const suggestion: LocationSuggestion = {
    type: "city",
    label: `${cityName}, ${stateAbbr}`,
    city: cityName,
    state: stateAbbr,
    postalCode: postalComp?.long_name ?? postalComp?.short_name,
    lat,
    lng,
    radiusMiles: cityRadiusMiles(stateAbbr),
    source: "google"
  };
  GEOCODE_CACHE.set(cacheKey, suggestion);
  return suggestion;
}
