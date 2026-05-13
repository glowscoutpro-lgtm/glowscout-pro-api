import { searchGooglePlaces } from "./googlePlaces.js";
import {
  resolveOfflineCityState,
  _resetCityIndexForTests
} from "./locationSuggest.js";
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

// Mixed live-Places payload: in-radius Lake Zurich provider, far-out La Grange
// provider, and an out-of-state WI provider. All have rating >= 4.5 and >= 10
// reviews so they pass the quality filter — the fix has to keep them out via
// the radius + state filter, exactly as ZIP 60047 already does.
const lakeZurichPayload = {
  places: [
    {
      id: "lz-in-radius",
      displayName: { text: "Elina's Nail Studio" },
      formattedAddress: "100 Main St, Lake Zurich, IL 60047, USA",
      rating: 4.9,
      userRatingCount: 120,
      location: { latitude: 42.196, longitude: -88.0934 },
      addressComponents: [
        { longText: "Lake Zurich", shortText: "Lake Zurich", types: ["locality"] },
        { longText: "Illinois", shortText: "IL", types: ["administrative_area_level_1"] },
        { longText: "60047", shortText: "60047", types: ["postal_code"] }
      ]
    },
    {
      id: "long-grove-in-radius",
      displayName: { text: "Long Grove Nail Bar" },
      formattedAddress: "200 Old McHenry Rd, Long Grove, IL 60047, USA",
      rating: 4.8,
      userRatingCount: 80,
      location: { latitude: 42.182, longitude: -87.998 },
      addressComponents: [
        { longText: "Long Grove", shortText: "Long Grove", types: ["locality"] },
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
      // ~27 miles south of Lake Zurich — must be excluded by radius filter.
      location: { latitude: 41.805, longitude: -87.87 },
      addressComponents: [
        { longText: "La Grange", shortText: "La Grange", types: ["locality"] },
        { longText: "Illinois", shortText: "IL", types: ["administrative_area_level_1"] },
        { longText: "60525", shortText: "60525", types: ["postal_code"] }
      ]
    },
    {
      id: "wi-out-of-state",
      displayName: { text: "Kenosha Beauty Bar" },
      formattedAddress: "1 State Line Rd, Kenosha, WI 53140, USA",
      rating: 4.9,
      userRatingCount: 200,
      // ~22 miles north of Lake Zurich; even within range, must drop by state.
      location: { latitude: 42.585, longitude: -87.821 },
      addressComponents: [
        { longText: "Kenosha", shortText: "Kenosha", types: ["locality"] },
        { longText: "Wisconsin", shortText: "WI", types: ["administrative_area_level_1"] },
        { longText: "53140", shortText: "53140", types: ["postal_code"] }
      ]
    }
  ]
};

let capturedPlacesBody: Record<string, unknown> | null = null;

function installGeocoderDeniedStub(): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes("maps.googleapis.com/maps/api/geocode")) {
      // Simulate the production hazard: Google Geocoding API is restricted /
      // disabled / rate limited. Live mode previously gave up and returned a
      // null searchCenter for "Lake Zurich, IL" — the bug this fallback fixes.
      return stub({ status: "REQUEST_DENIED" }) as unknown as Response;
    }
    if (url.includes("places.googleapis.com")) {
      const raw = init?.body;
      if (typeof raw === "string") capturedPlacesBody = JSON.parse(raw);
      return stub(lakeZurichPayload) as unknown as Response;
    }
    if (url.includes("api.zippopotam.us")) {
      return stub({}, false, 404) as unknown as Response;
    }
    throw new Error("unexpected fetch in test: " + url);
  }) as typeof globalThis.fetch;
}

function resetState(): void {
  capturedPlacesBody = null;
  _resetZipCacheForTests();
  _resetCityIndexForTests();
}

function resolverLakeZurich(): void {
  const offline = resolveOfflineCityState("Lake Zurich, IL");
  assert(offline != null, "resolveOfflineCityState matches 'Lake Zurich, IL'");
  assert(
    offline?.city.toLowerCase() === "lake zurich",
    `Lake Zurich, IL city is 'Lake Zurich' (got ${offline?.city})`
  );
  assert(offline?.state === "IL", `Lake Zurich, IL state is IL (got ${offline?.state})`);
  assert(
    offline != null && Math.abs(offline.lat - 42.196) < 0.05,
    `Lake Zurich, IL lat ~42.196 (got ${offline?.lat})`
  );
  assert(
    offline != null && Math.abs(offline.lng + 88.0934) < 0.05,
    `Lake Zurich, IL lng ~-88.0934 (got ${offline?.lng})`
  );
  assert(offline?.source === "embedded", "Lake Zurich resolves from embedded ZIP catalog");
}

function resolverLongGrove(): void {
  const offline = resolveOfflineCityState("Long Grove, IL");
  assert(offline != null, "resolveOfflineCityState matches 'Long Grove, IL'");
  assert(offline?.city === "Long Grove", `Long Grove, IL city is 'Long Grove' (got ${offline?.city})`);
  assert(offline?.state === "IL", `Long Grove, IL state is IL (got ${offline?.state})`);
  assert(
    offline != null && Math.abs(offline.lat - 42.182) < 0.05,
    `Long Grove, IL lat ~42.182 (got ${offline?.lat})`
  );
  assert(offline?.source === "curated", "Long Grove resolves from curated NEARBY_BY_ZIP table");
}

function resolverCaseAndSpacingTolerant(): void {
  const a = resolveOfflineCityState("lake zurich, il");
  const b = resolveOfflineCityState("Lake Zurich IL");
  const c = resolveOfflineCityState("  Lake   Zurich,   IL  ");
  assert(a != null, "lower-case 'lake zurich, il' resolves");
  assert(b != null, "comma-less 'Lake Zurich IL' resolves");
  assert(c != null, "extra-whitespace 'Lake Zurich, IL' resolves");
}

function resolverUnknownCityReturnsNull(): void {
  const offline = resolveOfflineCityState("Some Made Up Town, IL");
  assert(offline === null, "Unknown city returns null (no false positive)");
}

function resolverStateMismatchReturnsNull(): void {
  // Lake Zurich is in IL, not WI. The resolver must not silently match the
  // city when the user named the wrong state.
  const offline = resolveOfflineCityState("Lake Zurich, WI");
  assert(offline === null, "Lake Zurich, WI returns null (state mismatch)");
}

async function liveSearchLakeZurichWhenGeocoderFails(): Promise<void> {
  installGeocoderDeniedStub();
  resetState();
  const survey: SurveyPayload = {
    location: "Lake Zurich, IL",
    category: "nails",
    services: ["russian-manicure", "gel-manicure"],
    preferences: [],
    maxDistanceMiles: 10
  };
  const result = await searchGooglePlaces(survey, "fake-key");

  assert(
    result.debug.searchCenter != null,
    "Lake Zurich, IL produces a non-null searchCenter when geocoding fails"
  );
  assert(
    result.debug.searchCenter != null && Math.abs(result.debug.searchCenter.lat - 42.196) < 0.05,
    `searchCenter.lat ~ 42.196 (got ${result.debug.searchCenter?.lat})`
  );
  assert(
    result.debug.searchCenter?.radiusMiles === 10,
    `Requested 10-mile radius is reflected in searchCenter`
  );
  assert(
    result.debug.resolvedLocation?.administrativeArea === "IL",
    "Resolved state is IL"
  );
  assert(
    result.debug.resolvedLocation?.locality === "Lake Zurich",
    "Resolved locality is Lake Zurich"
  );
  assert(
    result.debug.resolvedLocation?.source === "zip-centroid",
    "City/state fallback reports source=zip-centroid"
  );
  assert(
    result.pros.some((p) => /Elina/.test(p.name)),
    "Live pros include the in-radius IL provider (Elina's Nail Studio)"
  );
  assert(
    !result.pros.some((p) => /la grange/i.test(p.address)),
    "Live pros exclude La Grange (out of radius)"
  );
  assert(
    !result.pros.some((p) => / WI /.test(p.address)),
    "Live pros exclude WI provider (state filter)"
  );
  assert(
    result.pros.every((p) => typeof p.distanceMiles === "number" && p.distanceMiles <= 10),
    "All returned pros are within 10 miles of the resolved center"
  );
  assert(
    capturedPlacesBody != null &&
      typeof capturedPlacesBody.locationBias === "object" &&
      capturedPlacesBody.locationBias != null,
    "Places call carries a locationBias circle (no unrestricted no-center search)"
  );
}

async function liveSearchLongGroveWhenGeocoderFails(): Promise<void> {
  installGeocoderDeniedStub();
  resetState();
  const survey: SurveyPayload = {
    location: "Long Grove, IL",
    category: "nails",
    services: [],
    preferences: [],
    maxDistanceMiles: 8
  };
  const result = await searchGooglePlaces(survey, "fake-key");

  assert(
    result.debug.searchCenter != null,
    "Long Grove, IL produces a non-null searchCenter when geocoding fails"
  );
  assert(
    result.debug.searchCenter != null && Math.abs(result.debug.searchCenter.lat - 42.182) < 0.05,
    `Long Grove searchCenter.lat ~ 42.182 (got ${result.debug.searchCenter?.lat})`
  );
  assert(
    result.debug.searchCenter?.radiusMiles === 8,
    "Requested 8-mile radius is reflected in searchCenter"
  );
  assert(
    result.debug.resolvedLocation?.administrativeArea === "IL",
    "Long Grove resolves to IL"
  );
  assert(
    result.pros.some((p) => /Long Grove/i.test(p.address) || /Lake Zurich/i.test(p.address)),
    "Long Grove search returns Long Grove or Lake Zurich providers"
  );
  assert(
    !result.pros.some((p) => /la grange/i.test(p.address)),
    "Long Grove 8-mile search excludes La Grange (out of radius)"
  );
  assert(
    !result.pros.some((p) => / WI /.test(p.address)),
    "Long Grove search excludes WI provider"
  );
}

async function liveSearchLakeZurichGeocoderAndPlacesParity(): Promise<void> {
  // Verifies the fallback path matches the ZIP 60047 path: same center, same
  // pro set after filtering. The bug report noted that ZIP 60047 worked but
  // "Lake Zurich, IL" returned 0 — this asserts the parity is restored.
  installGeocoderDeniedStub();
  resetState();
  const cityResult = await searchGooglePlaces(
    {
      location: "Lake Zurich, IL",
      category: "nails",
      services: [],
      preferences: [],
      maxDistanceMiles: 10
    },
    "fake-key"
  );
  resetState();
  installGeocoderDeniedStub();
  const zipResult = await searchGooglePlaces(
    {
      location: "60047",
      category: "nails",
      services: [],
      preferences: [],
      maxDistanceMiles: 10
    },
    "fake-key"
  );

  assert(
    cityResult.pros.length > 0,
    "Lake Zurich, IL returns >0 pros (the regression the user reported)"
  );
  assert(
    zipResult.pros.length > 0,
    "ZIP 60047 still returns >0 pros (baseline parity check)"
  );
  assert(
    cityResult.pros.length === zipResult.pros.length,
    `Lake Zurich, IL and ZIP 60047 return the same provider count ` +
      `(city=${cityResult.pros.length}, zip=${zipResult.pros.length})`
  );

  const cityIds = new Set(cityResult.pros.map((p) => p.id));
  const zipIds = new Set(zipResult.pros.map((p) => p.id));
  const matches = [...cityIds].every((id) => zipIds.has(id));
  assert(matches, "Lake Zurich, IL surfaces the same providers as ZIP 60047");
}

async function run(): Promise<void> {
  const originalFetch = globalThis.fetch;
  try {
    resetState();
    resolverLakeZurich();
    resolverLongGrove();
    resolverCaseAndSpacingTolerant();
    resolverUnknownCityReturnsNull();
    resolverStateMismatchReturnsNull();
    await liveSearchLakeZurichWhenGeocoderFails();
    await liveSearchLongGroveWhenGeocoderFails();
    await liveSearchLakeZurichGeocoderAndPlacesParity();
  } finally {
    globalThis.fetch = originalFetch;
  }
  if (failed > 0) {
    console.error(`\n${failed} city/state fallback case(s) failed`);
    process.exit(1);
  }
  console.log("\nAll city/state fallback cases passed");
}

run().catch((err) => {
  console.error("city/state fallback test threw:", err);
  process.exit(1);
});
