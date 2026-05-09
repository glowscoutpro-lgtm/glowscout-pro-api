import { searchGooglePlaces } from "./googlePlaces.js";
import type { SurveyPayload } from "./types.js";
import { _resetZipCacheForTests } from "./zipResolver.js";

let failed = 0;

function assert(condition: unknown, message: string): void {
  const status = condition ? "PASS" : "FAIL";
  console.log(`${status}  ${message}`);
  if (!condition) failed++;
}

const baseSurvey = (overrides: Partial<SurveyPayload>): SurveyPayload => ({
  location: "Jackson, MS",
  category: "nails",
  services: [],
  preferences: [],
  maxDistanceMiles: 10,
  ...overrides
});

type StubResponse = { ok: boolean; status?: number; json: () => Promise<unknown>; text: () => Promise<string> };

function stub(body: unknown, ok = true, status = 200): StubResponse {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body)
  };
}

// Mixed payload: an in-state Jackson, MS provider, an out-of-state TN result
// (Jackson, TN also exists), and an out-of-state LA result whose admin area
// is missing from addressComponents but still parseable from formattedAddress.
const jacksonPayload = {
  places: [
    {
      id: "ms-good",
      displayName: { text: "Magnolia Nails Jackson" },
      formattedAddress: "100 N State St, Jackson, MS 39201, USA",
      rating: 4.9,
      userRatingCount: 150,
      location: { latitude: 32.2988, longitude: -90.1848 },
      addressComponents: [
        { longText: "Jackson", shortText: "Jackson", types: ["locality"] },
        { longText: "Mississippi", shortText: "MS", types: ["administrative_area_level_1"] },
        { longText: "39201", shortText: "39201", types: ["postal_code"] }
      ]
    },
    {
      id: "tn-jackson",
      displayName: { text: "Jackson Nails & Spa" },
      formattedAddress: "200 W Baltimore St, Jackson, TN 38301, USA",
      rating: 4.8,
      userRatingCount: 88,
      // Coordinates of Jackson, TN — ~210 miles from Jackson, MS, but the
      // distance filter alone is the wrong gate: even if a place was 9 miles
      // away across a state line we want strict in-state filtering when the
      // user named MS explicitly.
      location: { latitude: 35.6145, longitude: -88.8139 },
      addressComponents: [
        { longText: "Jackson", shortText: "Jackson", types: ["locality"] },
        { longText: "Tennessee", shortText: "TN", types: ["administrative_area_level_1"] },
        { longText: "38301", shortText: "38301", types: ["postal_code"] }
      ]
    },
    {
      id: "la-no-admin",
      displayName: { text: "Bayou Beauty Studio" },
      formattedAddress: "1 Main St, Tallulah, LA 71282, USA",
      rating: 4.7,
      userRatingCount: 60,
      // 2-mile bogus location to *prove* the state filter is what saves us —
      // even if the haversine distance is tiny, we drop because the address
      // is in LA, not MS.
      location: { latitude: 32.31, longitude: -90.18 },
      addressComponents: [
        // No administrative_area_level_1 — must fall back to formattedAddress.
        { longText: "Tallulah", shortText: "Tallulah", types: ["locality"] }
      ]
    },
    {
      id: "ms-second",
      displayName: { text: "River Bend Nail Lounge" },
      formattedAddress: "555 Lakeland Dr, Jackson, MS 39216, USA",
      rating: 4.7,
      userRatingCount: 40,
      location: { latitude: 32.32, longitude: -90.15 },
      addressComponents: [
        { longText: "Jackson", shortText: "Jackson", types: ["locality"] },
        { longText: "Mississippi", shortText: "MS", types: ["administrative_area_level_1"] },
        { longText: "39216", shortText: "39216", types: ["postal_code"] }
      ]
    }
  ]
};

let capturedPlacesBody: Record<string, unknown> | null = null;

function installFetchStub(geocodeOk: boolean): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes("maps.googleapis.com/maps/api/geocode")) {
      if (!geocodeOk) {
        return stub({ status: "REQUEST_DENIED" }) as unknown as Response;
      }
      return stub({
        status: "OK",
        results: [
          {
            formatted_address: "Jackson, MS, USA",
            geometry: { location: { lat: 32.2988, lng: -90.1848 } },
            address_components: [
              { long_name: "Jackson", short_name: "Jackson", types: ["locality"] },
              { long_name: "Mississippi", short_name: "MS", types: ["administrative_area_level_1"] },
              { long_name: "United States", short_name: "US", types: ["country"] }
            ]
          }
        ]
      }) as unknown as Response;
    }
    if (url.includes("places.googleapis.com")) {
      const raw = init?.body;
      if (typeof raw === "string") capturedPlacesBody = JSON.parse(raw);
      return stub(jacksonPayload) as unknown as Response;
    }
    if (url.includes("api.zippopotam.us")) {
      return stub({}, false, 404) as unknown as Response;
    }
    throw new Error("unexpected fetch in test: " + url);
  }) as typeof globalThis.fetch;
}

async function jacksonFreeformLocation(): Promise<void> {
  installFetchStub(true);
  capturedPlacesBody = null;
  _resetZipCacheForTests();
  const survey = baseSurvey({ location: "Jackson, MS", maxDistanceMiles: 25 });
  const result = await searchGooglePlaces(survey, "fake-key");
  assert(
    result.debug.resolvedLocation?.administrativeArea === "MS",
    "Jackson, MS resolves to MS"
  );
  assert(
    result.debug.searchCenter != null && Math.abs(result.debug.searchCenter.lat - 32.3) < 0.5,
    "Jackson, MS searchCenter is near Jackson lat (~32.3)"
  );
  const states = result.pros.map((p) => p.address);
  assert(
    !result.pros.some((p) => / TN /.test(p.address)),
    "Jackson, MS results exclude Tennessee providers"
  );
  assert(
    !result.pros.some((p) => / LA /.test(p.address)),
    "Jackson, MS results exclude Louisiana provider with no admin component"
  );
  assert(
    result.pros.length === 2 && result.pros.every((p) => / MS /.test(p.address)),
    `Jackson, MS keeps only the MS providers (got ${states.join(" | ")})`
  );
  assert(
    result.pros.every((p) => typeof p.distanceMiles === "number"),
    "Jackson, MS results carry distanceMiles"
  );
}

async function jacksonSuggestionFields(): Promise<void> {
  installFetchStub(false); // geocoding intentionally fails — params should win
  capturedPlacesBody = null;
  _resetZipCacheForTests();
  const survey: SurveyPayload = {
    location: "Jackson, MS",
    category: "nails",
    services: [],
    preferences: [],
    maxDistanceMiles: 10,
    locationCity: "Jackson",
    locationState: "MS",
    locationLat: 32.2981392,
    locationLng: -90.18065,
    locationRadiusMiles: 8
  };
  const result = await searchGooglePlaces(survey, "fake-key");
  assert(
    result.debug.searchCenter?.radiusMiles === 8,
    "locationRadiusMiles=8 is honored over default maxDistanceMiles"
  );
  assert(
    result.debug.resolvedLocation?.administrativeArea === "MS",
    "Override center surfaces MS as administrativeArea"
  );
  assert(
    result.pros.every((p) => / MS /.test(p.address)),
    "Suggestion-driven search keeps only MS providers"
  );
  assert(
    !result.pros.some((p) => / TN /.test(p.address) || / LA /.test(p.address)),
    "Suggestion-driven search drops TN and LA providers"
  );
}

async function freeformOnlyStateInferred(): Promise<void> {
  // Geocoder returns a wrong-state center (e.g. Jackson, TN) but the user
  // typed "Jackson, MS" — the state token in the freeform query must still
  // pin filtering to MS.
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes("maps.googleapis.com/maps/api/geocode")) {
      return stub({
        status: "OK",
        results: [
          {
            formatted_address: "Jackson, TN, USA",
            geometry: { location: { lat: 35.6145, lng: -88.8139 } },
            address_components: [
              { long_name: "Jackson", short_name: "Jackson", types: ["locality"] },
              { long_name: "Tennessee", short_name: "TN", types: ["administrative_area_level_1"] },
              { long_name: "United States", short_name: "US", types: ["country"] }
            ]
          }
        ]
      }) as unknown as Response;
    }
    if (url.includes("places.googleapis.com")) {
      const raw = init?.body;
      if (typeof raw === "string") capturedPlacesBody = JSON.parse(raw);
      return stub(jacksonPayload) as unknown as Response;
    }
    if (url.includes("api.zippopotam.us")) {
      return stub({}, false, 404) as unknown as Response;
    }
    throw new Error("unexpected fetch in test: " + url);
  }) as typeof globalThis.fetch;
  _resetZipCacheForTests();
  const survey = baseSurvey({ location: "Jackson, MS", maxDistanceMiles: 50 });
  const result = await searchGooglePlaces(survey, "fake-key");
  assert(
    result.pros.every((p) => / MS /.test(p.address)),
    "Even when geocoder picks Jackson TN, parsed 'MS' state pins results to MS"
  );
}

async function emptyResultIfNoStateMatch(): Promise<void> {
  // All places returned are TN — must produce 0 pros, not silently fall back.
  const tnOnly = {
    places: [
      {
        id: "tn-only",
        displayName: { text: "Jackson Nails & Spa" },
        formattedAddress: "200 W Baltimore St, Jackson, TN 38301, USA",
        rating: 4.8,
        userRatingCount: 88,
        location: { latitude: 32.299, longitude: -90.184 },
        addressComponents: [
          { longText: "Jackson", shortText: "Jackson", types: ["locality"] },
          { longText: "Tennessee", shortText: "TN", types: ["administrative_area_level_1"] }
        ]
      }
    ]
  };
  globalThis.fetch = (async (input: RequestInfo | URL): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes("maps.googleapis.com/maps/api/geocode")) {
      return stub({
        status: "OK",
        results: [
          {
            formatted_address: "Jackson, MS, USA",
            geometry: { location: { lat: 32.2988, lng: -90.1848 } },
            address_components: [
              { long_name: "Jackson", short_name: "Jackson", types: ["locality"] },
              { long_name: "Mississippi", short_name: "MS", types: ["administrative_area_level_1"] },
              { long_name: "United States", short_name: "US", types: ["country"] }
            ]
          }
        ]
      }) as unknown as Response;
    }
    if (url.includes("places.googleapis.com")) {
      return stub(tnOnly) as unknown as Response;
    }
    if (url.includes("api.zippopotam.us")) {
      return stub({}, false, 404) as unknown as Response;
    }
    throw new Error("unexpected fetch in test: " + url);
  }) as typeof globalThis.fetch;
  _resetZipCacheForTests();
  const result = await searchGooglePlaces(baseSurvey({ location: "Jackson, MS" }), "fake-key");
  assert(
    result.pros.length === 0,
    "Strict state filter returns 0 pros when only out-of-state matches exist"
  );
  assert(
    result.debug.searchCenter != null,
    "searchCenter is still populated even when zero pros pass filter"
  );
}

async function run(): Promise<void> {
  const originalFetch = globalThis.fetch;
  try {
    await jacksonFreeformLocation();
    await jacksonSuggestionFields();
    await freeformOnlyStateInferred();
    await emptyResultIfNoStateMatch();
  } finally {
    globalThis.fetch = originalFetch;
  }
  if (failed > 0) {
    console.error(`\n${failed} city/state filter case(s) failed`);
    process.exit(1);
  }
  console.log("\nAll city/state filter cases passed");
}

run().catch((err) => {
  console.error("city/state filter test threw:", err);
  process.exit(1);
});
