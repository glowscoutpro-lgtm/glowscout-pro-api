import { searchGooglePlaces, haversineMiles } from "./googlePlaces.js";
import type { SurveyPayload } from "./types.js";
import { _resetZipCacheForTests } from "./zipResolver.js";

let failed = 0;

function assert(condition: unknown, message: string): void {
  const status = condition ? "PASS" : "FAIL";
  console.log(`${status}  ${message}`);
  if (!condition) failed++;
}

type StubResponse = { ok: boolean; status?: number; json: () => Promise<unknown>; text: () => Promise<string> };

function stub(body: unknown, ok = true, status = 200): StubResponse {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body)
  };
}

// Long Grove, IL is in ZIP 60047 (Lake Zurich centroid in our embedded data:
// 42.196, -88.0934). La Grange, IL is a Chicago suburb roughly 27 miles south
// of Long Grove. With a 5-mile radius, La Grange must be excluded.
const longGroveCenter = { lat: 42.196, lng: -88.0934 };
const laGrangeCoords = { lat: 41.8050, lng: -87.8700 };
const longGroveToLaGrangeMiles = haversineMiles(
  longGroveCenter.lat,
  longGroveCenter.lng,
  laGrangeCoords.lat,
  laGrangeCoords.lng
);

console.log(
  `[fixture] haversine Long Grove → La Grange = ${longGroveToLaGrangeMiles.toFixed(1)} miles`
);

const longGrovePayload = {
  places: [
    {
      id: "in-radius",
      displayName: { text: "Lake Zurich Nail Studio" },
      formattedAddress: "100 Main St, Lake Zurich, IL 60047, USA",
      rating: 4.9,
      userRatingCount: 120,
      // Right at the centroid — clearly inside 5 miles.
      location: { latitude: 42.196, longitude: -88.0934 },
      addressComponents: [
        { longText: "Lake Zurich", shortText: "Lake Zurich", types: ["locality"] },
        { longText: "Illinois", shortText: "IL", types: ["administrative_area_level_1"] },
        { longText: "60047", shortText: "60047", types: ["postal_code"] }
      ]
    },
    {
      id: "la-grange-far",
      displayName: { text: "La Grange Nail Tech" },
      formattedAddress: "10 Calendar Ave, La Grange, IL 60525, USA",
      rating: 4.8,
      userRatingCount: 90,
      location: { latitude: laGrangeCoords.lat, longitude: laGrangeCoords.lng },
      addressComponents: [
        { longText: "La Grange", shortText: "La Grange", types: ["locality"] },
        { longText: "Illinois", shortText: "IL", types: ["administrative_area_level_1"] },
        { longText: "60525", shortText: "60525", types: ["postal_code"] }
      ]
    }
  ]
};

function installFetchStub(geocodeMode: "ok-long-grove" | "denied"): void {
  globalThis.fetch = (async (input: RequestInfo | URL): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes("maps.googleapis.com/maps/api/geocode")) {
      if (geocodeMode === "denied") {
        return stub({ status: "REQUEST_DENIED" }) as unknown as Response;
      }
      return stub({
        status: "OK",
        results: [
          {
            formatted_address: "Long Grove, IL 60047, USA",
            geometry: { location: { lat: longGroveCenter.lat, lng: longGroveCenter.lng } },
            address_components: [
              { long_name: "Long Grove", short_name: "Long Grove", types: ["locality"] },
              { long_name: "Illinois", short_name: "IL", types: ["administrative_area_level_1"] },
              { long_name: "60047", short_name: "60047", types: ["postal_code"] },
              { long_name: "United States", short_name: "US", types: ["country"] }
            ]
          }
        ]
      }) as unknown as Response;
    }
    if (url.includes("places.googleapis.com")) {
      return stub(longGrovePayload) as unknown as Response;
    }
    if (url.includes("api.zippopotam.us")) {
      return stub({}, false, 404) as unknown as Response;
    }
    throw new Error("unexpected fetch in test: " + url);
  }) as typeof globalThis.fetch;
}

async function longGroveFiveMileExcludesLaGrange(): Promise<void> {
  installFetchStub("ok-long-grove");
  _resetZipCacheForTests();
  const survey: SurveyPayload = {
    location: "Long Grove, IL 60047",
    category: "nails",
    services: [],
    preferences: [],
    maxDistanceMiles: 5
  };
  const result = await searchGooglePlaces(survey, "fake-key");
  assert(
    longGroveToLaGrangeMiles > 5,
    `fixture sanity: Long Grove → La Grange is > 5 miles (${longGroveToLaGrangeMiles.toFixed(1)})`
  );
  assert(
    result.debug.searchCenter?.radiusMiles === 5,
    "5-mile radius is preserved in searchCenter"
  );
  assert(
    !result.pros.some((p) => /la grange/i.test(p.name) || /la grange/i.test(p.address)),
    "La Grange is excluded from Long Grove 5-mile search"
  );
  assert(
    result.pros.some((p) => /lake zurich/i.test(p.address) || /lake zurich/i.test(p.name)),
    "Lake Zurich provider (inside radius) is kept"
  );
  assert(
    result.pros.every((p) => typeof p.distanceMiles === "number" && p.distanceMiles <= 5),
    "All returned pros are within 5 miles of the resolved center"
  );
}

async function longGroveFiveMileWhenGeocoderFailsFallsBackToZip(): Promise<void> {
  // Simulate the production hazard: Geocoding API disabled / restricted so it
  // returns REQUEST_DENIED. Previously this silently entered an unrestricted
  // "near X" Places call with NO haversine filter and surfaced La Grange. Now
  // the freeform "Long Grove, IL 60047" must fall back to the embedded ZIP
  // centroid (60047 → Lake Zurich) and still enforce the 5-mile radius.
  installFetchStub("denied");
  _resetZipCacheForTests();
  const survey: SurveyPayload = {
    location: "Long Grove, IL 60047",
    category: "nails",
    services: [],
    preferences: [],
    maxDistanceMiles: 5
  };
  const result = await searchGooglePlaces(survey, "fake-key");
  assert(
    result.debug.resolvedLocation?.source === "zip-centroid",
    "Freeform 'Long Grove, IL 60047' falls back to ZIP centroid when geocoding fails"
  );
  assert(
    result.debug.resolvedLocation?.administrativeArea === "IL",
    "Fallback resolves to IL"
  );
  assert(
    result.debug.searchCenter != null && result.debug.searchCenter.radiusMiles === 5,
    "5-mile radius is preserved in the ZIP-fallback path"
  );
  assert(
    !result.pros.some((p) => /la grange/i.test(p.address) || /la grange/i.test(p.name)),
    "La Grange remains excluded when we fall back to ZIP centroid"
  );
  assert(
    result.pros.every((p) => typeof p.distanceMiles === "number" && p.distanceMiles <= 5),
    "All ZIP-fallback pros are within 5 miles of the resolved center"
  );
}

async function pureZipFiveMileExcludesLaGrange(): Promise<void> {
  // Same expectation when the user typed only the ZIP 60047.
  installFetchStub("denied");
  _resetZipCacheForTests();
  const survey: SurveyPayload = {
    location: "60047",
    category: "nails",
    services: [],
    preferences: [],
    maxDistanceMiles: 5
  };
  const result = await searchGooglePlaces(survey, "fake-key");
  assert(
    result.debug.searchCenter?.radiusMiles === 5,
    "5-mile radius preserved for pure ZIP 60047"
  );
  assert(
    !result.pros.some((p) => /la grange/i.test(p.address)),
    "Pure ZIP 60047 5-mile search excludes La Grange"
  );
}

async function unresolvedNonPostalReturnsEmpty(): Promise<void> {
  // No center resolvable (geocoding fails, no ZIP in the query) → must
  // return zero pros rather than fall back to an unrestricted text search.
  globalThis.fetch = (async (input: RequestInfo | URL): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes("maps.googleapis.com/maps/api/geocode")) {
      return stub({ status: "REQUEST_DENIED" }) as unknown as Response;
    }
    if (url.includes("places.googleapis.com")) {
      throw new Error("Places must not be called when we have no resolved center");
    }
    if (url.includes("api.zippopotam.us")) {
      return stub({}, false, 404) as unknown as Response;
    }
    throw new Error("unexpected fetch in test: " + url);
  }) as typeof globalThis.fetch;
  _resetZipCacheForTests();
  const survey: SurveyPayload = {
    location: "Some Made Up Town",
    category: "nails",
    services: [],
    preferences: [],
    maxDistanceMiles: 5
  };
  const result = await searchGooglePlaces(survey, "fake-key");
  assert(
    result.pros.length === 0,
    "Unresolved non-postal query returns 0 pros (no unrestricted text search)"
  );
  assert(
    result.debug.searchCenter == null,
    "Unresolved non-postal query has null searchCenter"
  );
  assert(
    result.debug.resolvedLocation?.source === "unresolved",
    "Unresolved non-postal query reports source=unresolved"
  );
}

async function run(): Promise<void> {
  const originalFetch = globalThis.fetch;
  try {
    await longGroveFiveMileExcludesLaGrange();
    await longGroveFiveMileWhenGeocoderFailsFallsBackToZip();
    await pureZipFiveMileExcludesLaGrange();
    await unresolvedNonPostalReturnsEmpty();
  } finally {
    globalThis.fetch = originalFetch;
  }
  if (failed > 0) {
    console.error(`\n${failed} long-grove radius case(s) failed`);
    process.exit(1);
  }
  console.log("\nAll long-grove radius cases passed");
}

run().catch((err) => {
  console.error("long-grove radius test threw:", err);
  process.exit(1);
});
