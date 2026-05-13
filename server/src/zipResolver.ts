import type { ResolvedLocation } from "./types.js";

export type ZipCentroid = {
  lat: number;
  lng: number;
  city: string;
  state: string;
  postalCode: string;
};

const POSTAL_CODE_REGEX = /^\s*(\d{5})(?:-\d{4})?\s*$/;

// Embedded centroids for required ZIPs and a few common ones. Coordinates are
// approximate USPS/Census centroids. Source: public USPS/Census ZIP data.
export const EMBEDDED_ZIP_CENTROIDS: Record<string, Omit<ZipCentroid, "postalCode">> = {
  "60047": { lat: 42.196, lng: -88.0934, city: "Lake Zurich", state: "IL" },
  "90210": { lat: 34.0901, lng: -118.4065, city: "Beverly Hills", state: "CA" },
  "10001": { lat: 40.7506, lng: -73.9971, city: "New York", state: "NY" },
  "10002": { lat: 40.7166, lng: -73.987, city: "New York", state: "NY" },
  "10003": { lat: 40.7322, lng: -73.989, city: "New York", state: "NY" },
  "94102": { lat: 37.7795, lng: -122.4188, city: "San Francisco", state: "CA" },
  "94103": { lat: 37.7726, lng: -122.4108, city: "San Francisco", state: "CA" },
  "94110": { lat: 37.7491, lng: -122.4153, city: "San Francisco", state: "CA" },
  "60601": { lat: 41.8855, lng: -87.6217, city: "Chicago", state: "IL" },
  "60602": { lat: 41.8832, lng: -87.6286, city: "Chicago", state: "IL" },
  "60603": { lat: 41.8801, lng: -87.6275, city: "Chicago", state: "IL" },
  "60604": { lat: 41.8783, lng: -87.6294, city: "Chicago", state: "IL" },
  "60605": { lat: 41.8606, lng: -87.6243, city: "Chicago", state: "IL" },
  "60606": { lat: 41.8828, lng: -87.6383, city: "Chicago", state: "IL" },
  "60607": { lat: 41.8742, lng: -87.6516, city: "Chicago", state: "IL" },
  "60608": { lat: 41.8514, lng: -87.6705, city: "Chicago", state: "IL" },
  "60611": { lat: 41.8959, lng: -87.6201, city: "Chicago", state: "IL" },
  "60614": { lat: 41.9215, lng: -87.65, city: "Chicago", state: "IL" },
  "60622": { lat: 41.9024, lng: -87.6789, city: "Chicago", state: "IL" },
  "10010": { lat: 40.7388, lng: -73.9819, city: "New York", state: "NY" },
  "10011": { lat: 40.7415, lng: -74.0006, city: "New York", state: "NY" },
  "10012": { lat: 40.7256, lng: -73.9981, city: "New York", state: "NY" },
  "10013": { lat: 40.7196, lng: -74.0026, city: "New York", state: "NY" },
  "10014": { lat: 40.7339, lng: -74.0066, city: "New York", state: "NY" },
  "10016": { lat: 40.7449, lng: -73.9785, city: "New York", state: "NY" },
  "10017": { lat: 40.7522, lng: -73.9722, city: "New York", state: "NY" },
  "10018": { lat: 40.7549, lng: -73.9929, city: "New York", state: "NY" },
  "10019": { lat: 40.7651, lng: -73.9858, city: "New York", state: "NY" },
  "10021": { lat: 40.7691, lng: -73.9598, city: "New York", state: "NY" },
  "10022": { lat: 40.7587, lng: -73.9682, city: "New York", state: "NY" },
  "10023": { lat: 40.7755, lng: -73.9826, city: "New York", state: "NY" },
  "10024": { lat: 40.7857, lng: -73.9764, city: "New York", state: "NY" },
  "10025": { lat: 40.7984, lng: -73.9682, city: "New York", state: "NY" },
  "10028": { lat: 40.7765, lng: -73.9531, city: "New York", state: "NY" },
  "11201": { lat: 40.6936, lng: -73.9907, city: "Brooklyn", state: "NY" },
  "11211": { lat: 40.7106, lng: -73.9531, city: "Brooklyn", state: "NY" },
  "11215": { lat: 40.6671, lng: -73.9854, city: "Brooklyn", state: "NY" },
  "11217": { lat: 40.6817, lng: -73.9774, city: "Brooklyn", state: "NY" },
  "11222": { lat: 40.7281, lng: -73.949, city: "Brooklyn", state: "NY" },
  "90211": { lat: 34.0651, lng: -118.3838, city: "Beverly Hills", state: "CA" },
  "90212": { lat: 34.0626, lng: -118.4014, city: "Beverly Hills", state: "CA" },
  "90024": { lat: 34.0669, lng: -118.4357, city: "Los Angeles", state: "CA" },
  "90025": { lat: 34.0457, lng: -118.4459, city: "Los Angeles", state: "CA" },
  "90028": { lat: 34.1019, lng: -118.3268, city: "Los Angeles", state: "CA" },
  "90029": { lat: 34.0905, lng: -118.2945, city: "Los Angeles", state: "CA" },
  "90036": { lat: 34.0689, lng: -118.3494, city: "Los Angeles", state: "CA" },
  "90046": { lat: 34.1, lng: -118.3672, city: "Los Angeles", state: "CA" },
  "90069": { lat: 34.0903, lng: -118.3839, city: "West Hollywood", state: "CA" },
  "90048": { lat: 34.0732, lng: -118.3754, city: "Los Angeles", state: "CA" },
  "90049": { lat: 34.0709, lng: -118.4789, city: "Los Angeles", state: "CA" },
  "90404": { lat: 34.0285, lng: -118.4787, city: "Santa Monica", state: "CA" },
  "90405": { lat: 34.0085, lng: -118.4623, city: "Santa Monica", state: "CA" },
  "94105": { lat: 37.7898, lng: -122.394, city: "San Francisco", state: "CA" },
  "94107": { lat: 37.7703, lng: -122.3947, city: "San Francisco", state: "CA" },
  "94108": { lat: 37.7929, lng: -122.4081, city: "San Francisco", state: "CA" },
  "94109": { lat: 37.7929, lng: -122.4194, city: "San Francisco", state: "CA" },
  "94114": { lat: 37.7587, lng: -122.4346, city: "San Francisco", state: "CA" },
  "94117": { lat: 37.7706, lng: -122.4438, city: "San Francisco", state: "CA" },
  "98101": { lat: 47.6105, lng: -122.3358, city: "Seattle", state: "WA" },
  "98102": { lat: 47.6336, lng: -122.32, city: "Seattle", state: "WA" },
  "98103": { lat: 47.6727, lng: -122.3429, city: "Seattle", state: "WA" },
  "02108": { lat: 42.358, lng: -71.0644, city: "Boston", state: "MA" },
  "02109": { lat: 42.3617, lng: -71.0533, city: "Boston", state: "MA" },
  "02116": { lat: 42.3492, lng: -71.0729, city: "Boston", state: "MA" },
  "02118": { lat: 42.3389, lng: -71.0723, city: "Boston", state: "MA" },
  "02139": { lat: 42.3645, lng: -71.1041, city: "Cambridge", state: "MA" },
  "20001": { lat: 38.9128, lng: -77.0181, city: "Washington", state: "DC" },
  "20002": { lat: 38.9024, lng: -76.9874, city: "Washington", state: "DC" },
  "20009": { lat: 38.9175, lng: -77.0386, city: "Washington", state: "DC" },
  "30303": { lat: 33.7553, lng: -84.3895, city: "Atlanta", state: "GA" },
  "30305": { lat: 33.832, lng: -84.3837, city: "Atlanta", state: "GA" },
  "30309": { lat: 33.795, lng: -84.388, city: "Atlanta", state: "GA" },
  "33139": { lat: 25.7858, lng: -80.1339, city: "Miami Beach", state: "FL" },
  "33140": { lat: 25.815, lng: -80.13, city: "Miami Beach", state: "FL" },
  "78701": { lat: 30.2697, lng: -97.7404, city: "Austin", state: "TX" },
  "78702": { lat: 30.2616, lng: -97.7174, city: "Austin", state: "TX" },
  "78704": { lat: 30.2433, lng: -97.7706, city: "Austin", state: "TX" },
  "75201": { lat: 32.7864, lng: -96.7976, city: "Dallas", state: "TX" },
  "75204": { lat: 32.8068, lng: -96.7888, city: "Dallas", state: "TX" },
  "77002": { lat: 29.7551, lng: -95.366, city: "Houston", state: "TX" },
  "77006": { lat: 29.7402, lng: -95.3919, city: "Houston", state: "TX" },
  "85003": { lat: 33.4515, lng: -112.0805, city: "Phoenix", state: "AZ" },
  "85004": { lat: 33.4552, lng: -112.0686, city: "Phoenix", state: "AZ" },
  "80202": { lat: 39.7505, lng: -104.9963, city: "Denver", state: "CO" },
  "80203": { lat: 39.7327, lng: -104.9819, city: "Denver", state: "CO" },
  "97201": { lat: 45.4969, lng: -122.6962, city: "Portland", state: "OR" },
  "97209": { lat: 45.5295, lng: -122.6843, city: "Portland", state: "OR" },
  "63101": { lat: 38.6291, lng: -90.1899, city: "St. Louis", state: "MO" },
  "55401": { lat: 44.9846, lng: -93.2702, city: "Minneapolis", state: "MN" },
  "55402": { lat: 44.9762, lng: -93.2733, city: "Minneapolis", state: "MN" },
  "27601": { lat: 35.7782, lng: -78.6388, city: "Raleigh", state: "NC" },
  "28202": { lat: 35.2275, lng: -80.8388, city: "Charlotte", state: "NC" },
  "37203": { lat: 36.1518, lng: -86.7942, city: "Nashville", state: "TN" },
  "37206": { lat: 36.1839, lng: -86.7423, city: "Nashville", state: "TN" },
  // Chicago northwest suburbs — Schaumburg + neighboring towns. One ZIP per
  // town keeps the city-index centroid pinned to a single, verified location
  // and avoids skewing city-level coords when multiple ZIPs share a town.
  // 60173 reuses the live-verified centroid the production geocoder returns,
  // so the offline city/state path produces the same searchCenter as the ZIP
  // 60173 path.
  "60173": { lat: 42.0581, lng: -88.0482, city: "Schaumburg", state: "IL" },
  "60169": { lat: 42.0451, lng: -88.1078, city: "Hoffman Estates", state: "IL" },
  "60067": { lat: 42.1136, lng: -88.0707, city: "Palatine", state: "IL" },
  "60005": { lat: 42.0625, lng: -87.9941, city: "Arlington Heights", state: "IL" },
  "60007": { lat: 42.0084, lng: -88.014, city: "Elk Grove Village", state: "IL" },
  "60008": { lat: 42.0667, lng: -88.0394, city: "Rolling Meadows", state: "IL" },
  "60010": { lat: 42.1611, lng: -88.1486, city: "Barrington", state: "IL" },
  "60061": { lat: 42.2484, lng: -87.9622, city: "Vernon Hills", state: "IL" },
  "60048": { lat: 42.2864, lng: -87.9509, city: "Libertyville", state: "IL" },
  "60089": { lat: 42.1681, lng: -87.9594, city: "Buffalo Grove", state: "IL" },
  "60090": { lat: 42.1473, lng: -87.9881, city: "Wheeling", state: "IL" },
  "60201": { lat: 42.0501, lng: -87.6877, city: "Evanston", state: "IL" },
  "60302": { lat: 41.8932, lng: -87.7894, city: "Oak Park", state: "IL" },
  "60515": { lat: 41.7969, lng: -88.0117, city: "Downers Grove", state: "IL" },
  "60540": { lat: 41.7717, lng: -88.1471, city: "Naperville", state: "IL" },
  "60525": { lat: 41.8025, lng: -87.8662, city: "La Grange", state: "IL" }
};

const RESOLUTION_CACHE = new Map<string, ZipCentroid | null>();

const ZIPPOPOTAM_BASE = "https://api.zippopotam.us/us";
const ZIPPOPOTAM_TIMEOUT_MS = 2500;

export function extractUsZip(input: string): string | null {
  if (!input) return null;
  const match = POSTAL_CODE_REGEX.exec(input);
  return match ? match[1] : null;
}

export function isUsZipQuery(input: string): boolean {
  return extractUsZip(input) !== null;
}

function fromEmbedded(zip: string): ZipCentroid | null {
  const hit = EMBEDDED_ZIP_CENTROIDS[zip];
  if (!hit) return null;
  return { ...hit, postalCode: zip };
}

type ZippopotamResponse = {
  "post code"?: string;
  country?: string;
  "country abbreviation"?: string;
  places?: Array<{
    "place name"?: string;
    longitude?: string;
    latitude?: string;
    state?: string;
    "state abbreviation"?: string;
  }>;
};

async function fromZippopotam(zip: string): Promise<ZipCentroid | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ZIPPOPOTAM_TIMEOUT_MS);
  try {
    const response = await fetch(`${ZIPPOPOTAM_BASE}/${zip}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });
    if (!response.ok) return null;
    const data = (await response.json()) as ZippopotamResponse;
    const place = data.places?.[0];
    if (!place) return null;
    const lat = Number(place.latitude);
    const lng = Number(place.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return {
      lat,
      lng,
      city: place["place name"] ?? "",
      state: place["state abbreviation"] ?? place.state ?? "",
      postalCode: data["post code"] ?? zip
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveUsZip(input: string): Promise<ZipCentroid | null> {
  const zip = extractUsZip(input);
  if (!zip) return null;

  if (RESOLUTION_CACHE.has(zip)) {
    return RESOLUTION_CACHE.get(zip) ?? null;
  }

  const embedded = fromEmbedded(zip);
  if (embedded) {
    RESOLUTION_CACHE.set(zip, embedded);
    return embedded;
  }

  const remote = await fromZippopotam(zip);
  RESOLUTION_CACHE.set(zip, remote);
  return remote;
}

export function zipCentroidToResolvedLocation(
  query: string,
  centroid: ZipCentroid
): ResolvedLocation {
  return {
    query,
    formattedAddress: `${centroid.city}, ${centroid.state} ${centroid.postalCode}, USA`,
    locality: centroid.city,
    administrativeArea: centroid.state,
    postalCode: centroid.postalCode,
    country: "US",
    isPostalQuery: true,
    source: "zip-centroid"
  };
}

export function _resetZipCacheForTests(): void {
  RESOLUTION_CACHE.clear();
}
