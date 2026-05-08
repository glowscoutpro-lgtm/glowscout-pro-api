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
  source: "embedded" | "zippopotam" | "curated";
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
  const trimmed = query.trim();
  // Match "City, ST" or "City, State"
  const commaIdx = trimmed.lastIndexOf(",");
  if (commaIdx > 0) {
    const cityPart = trimmed.slice(0, commaIdx).trim();
    const tail = trimmed.slice(commaIdx + 1).trim();
    if (tail.length === 2) {
      return { city: cityPart, state: tail.toUpperCase() };
    }
    const fromName = STATE_ABBR_BY_NAME[tail.toLowerCase()];
    if (fromName) {
      return { city: cityPart, state: fromName };
    }
    // Treat the tail as part of the city if we can't recognize it as a state.
    return { city: trimmed };
  }
  // Trailing 2-letter state without a comma: "Lake Zurich IL"
  const tokens = trimmed.split(/\s+/);
  if (tokens.length >= 2) {
    const last = tokens[tokens.length - 1];
    if (last.length === 2 && /^[A-Za-z]{2}$/.test(last)) {
      return { city: tokens.slice(0, -1).join(" "), state: last.toUpperCase() };
    }
  }
  return { city: trimmed };
}

const MAX_CITY_SUGGESTIONS = 8;

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

  const index = getCityIndex();
  const startsWith: CityEntry[] = [];
  const contains: CityEntry[] = [];
  for (const entry of index) {
    if (state && entry.state !== state) continue;
    const cityLower = entry.city.toLowerCase();
    if (cityLower === needle) {
      startsWith.unshift(entry);
    } else if (cityLower.startsWith(needle)) {
      startsWith.push(entry);
    } else if (cityLower.includes(needle)) {
      contains.push(entry);
    }
  }

  return [...startsWith, ...contains]
    .slice(0, MAX_CITY_SUGGESTIONS)
    .map(makeCitySuggestion);
}
