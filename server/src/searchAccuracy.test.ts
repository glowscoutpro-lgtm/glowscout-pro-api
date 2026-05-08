import { getDemoPros } from "./demoData.js";
import { buildPlacesTextSearchBody, haversineMiles } from "./googlePlaces.js";
import type { SurveyPayload } from "./types.js";
import {
  _resetZipCacheForTests,
  extractUsZip,
  isUsZipQuery,
  resolveUsZip,
  zipCentroidToResolvedLocation
} from "./zipResolver.js";

let failed = 0;

function assert(condition: unknown, message: string): void {
  const status = condition ? "PASS" : "FAIL";
  console.log(`${status}  ${message}`);
  if (!condition) failed++;
}

const baseSurvey = (location: string, overrides: Partial<SurveyPayload> = {}): SurveyPayload => ({
  location,
  category: "nails",
  services: [],
  preferences: [],
  maxDistanceMiles: 10,
  ...overrides
});

// Places Text Search v1 request body schema: must use locationBias.circle and
// must NOT use locationRestriction (Google rejects locationRestriction.circle
// with "Unknown name 'circle' at 'location_restriction'"). locationRestriction
// in v1 only supports `rectangle`, so we use locationBias.circle and rely on
// the in-process haversine + admin/postal post-filter to enforce the radius.
{
  const body = buildPlacesTextSearchBody("nail salon near 90210", {
    latitude: 34.0901,
    longitude: -118.4065,
    radiusMeters: 16093
  });
  assert(body.textQuery === "nail salon near 90210", "request body has textQuery");
  assert(typeof body.minRating === "number", "request body has minRating");
  assert(body.maxResultCount === 20, "request body has maxResultCount=20");
  assert(body.includePureServiceAreaBusinesses === true, "request body opts in to pure service-area businesses");
  assert(!("locationRestriction" in body), "request body must NOT include locationRestriction (v1 rejects circle there)");
  const bias = body.locationBias as { circle?: { center?: { latitude?: number; longitude?: number }; radius?: number } } | undefined;
  assert(bias != null && bias.circle != null, "request body uses locationBias.circle");
  assert(
    bias?.circle?.center?.latitude === 34.0901 && bias?.circle?.center?.longitude === -118.4065,
    "locationBias.circle.center matches resolved coordinates"
  );
  assert(bias?.circle?.radius === 16093, "locationBias.circle.radius is in meters");

  const noBias = buildPlacesTextSearchBody("nail salon");
  assert(!("locationBias" in noBias), "no locationBias when no center provided");
  assert(!("locationRestriction" in noBias), "no locationRestriction when no center provided");
}

// 60047: Elina inclusion + correct resolved location
{
  const result = getDemoPros(baseSurvey("60047"));
  const elina = result.pros.find((pro) => pro.name === "Elina Nail Studio");
  assert(elina != null, "60047 demo includes Elina Nail Studio");
  assert(
    result.debug.resolvedLocation?.postalCode === "60047",
    "60047 demo resolves to postal code 60047"
  );
  assert(
    result.debug.resolvedLocation?.administrativeArea === "IL",
    "60047 demo resolves to IL"
  );
  assert(result.debug.searchCenter != null, "60047 demo provides searchCenter");
}

// 90210: ensure no false-positive Pittsburgh result by name + state filtering
// (demo data doesn't include Pittsburgh, so this is a structural guard)
{
  const result = getDemoPros(baseSurvey("90210"));
  const hasPittsburgh = result.pros.some((pro) =>
    /pittsburgh/i.test(pro.name) || /pittsburgh/i.test(pro.address)
  );
  assert(!hasPittsburgh, "90210 demo excludes any Pittsburgh-named result");
  assert(
    result.debug.resolvedLocation?.administrativeArea === "CA",
    "90210 demo resolves to CA"
  );
  assert(
    result.debug.searchCenter?.lat != null && Math.abs(result.debug.searchCenter!.lat - 34.09) < 0.5,
    "90210 demo searchCenter is near Beverly Hills latitude"
  );
}

// 10001: NY resolution
{
  const result = getDemoPros(baseSurvey("10001"));
  assert(
    result.debug.resolvedLocation?.administrativeArea === "NY",
    "10001 demo resolves to NY"
  );
  assert(
    result.debug.resolvedLocation?.locality === "New York",
    "10001 demo resolves to New York locality"
  );
  assert(result.pros.length > 0, "10001 demo returns pros");
}

// Distance math sanity: Beverly Hills -> Pittsburgh is well above any reasonable radius
{
  const beverlyHills = { lat: 34.0901, lng: -118.4065 };
  const pittsburgh = { lat: 40.4406, lng: -79.9959 };
  const distance = haversineMiles(beverlyHills.lat, beverlyHills.lng, pittsburgh.lat, pittsburgh.lng);
  assert(distance > 1000, `Beverly Hills to Pittsburgh distance > 1000 miles (got ${distance.toFixed(0)})`);
  assert(distance > 50, "Beverly Hills to Pittsburgh exceeds ABSOLUTE_MAX_DISTANCE_MILES (50)");
}

// Distance filter math: a place 15 miles away should be rejected by 10mi radius
{
  const center = { lat: 42.196, lng: -88.0934 };
  // ~25 miles east-ish
  const far = { lat: 42.196, lng: -87.6 };
  const distance = haversineMiles(center.lat, center.lng, far.lat, far.lng);
  assert(distance > 10, `25-mile-away point exceeds 10mi radius (got ${distance.toFixed(1)})`);
}

// ZIP resolver: extract + match
{
  assert(isUsZipQuery("60047"), "isUsZipQuery accepts 60047");
  assert(isUsZipQuery("60047-1234"), "isUsZipQuery accepts ZIP+4");
  assert(isUsZipQuery(" 90210 "), "isUsZipQuery accepts whitespace-padded ZIP");
  assert(!isUsZipQuery("Lake Zurich, IL"), "isUsZipQuery rejects city,state strings");
  assert(!isUsZipQuery("1234"), "isUsZipQuery rejects 4-digit values");
  assert(extractUsZip("60047-1234") === "60047", "extractUsZip strips +4 suffix");
}

// Embedded centroids for the three required ZIPs resolve without network
{
  _resetZipCacheForTests();
  const promises = [resolveUsZip("60047"), resolveUsZip("90210"), resolveUsZip("10001")];
  Promise.all(promises).then(([il, ca, ny]) => {
    assert(
      il != null && il.state === "IL" && il.city === "Lake Zurich" && il.postalCode === "60047",
      "60047 resolves to Lake Zurich, IL via embedded centroid"
    );
    assert(
      ca != null && ca.state === "CA" && ca.city === "Beverly Hills" && ca.postalCode === "90210",
      "90210 resolves to Beverly Hills, CA via embedded centroid"
    );
    assert(
      ny != null && ny.state === "NY" && ny.city === "New York" && ny.postalCode === "10001",
      "10001 resolves to New York, NY via embedded centroid"
    );
    if (il) {
      assert(Math.abs(il.lat - 42.196) < 0.5, "60047 lat ~42.196");
      assert(Math.abs(il.lng + 88.0934) < 0.5, "60047 lng ~-88.093");
    }
    if (ca) {
      assert(Math.abs(ca.lat - 34.09) < 0.5, "90210 lat ~34.09");
    }

    // resolvedLocation builder
    if (il) {
      const resolved = zipCentroidToResolvedLocation("60047", il);
      assert(resolved.source === "zip-centroid", "zip-centroid source on ResolvedLocation");
      assert(resolved.administrativeArea === "IL", "ResolvedLocation has IL admin area");
      assert(resolved.postalCode === "60047", "ResolvedLocation preserves postal code");
      assert(resolved.isPostalQuery === true, "ResolvedLocation marks postal");
    }
    afterAsync();
  });
}

let asyncDone = false;
function afterAsync(): void {
  asyncDone = true;
  finalize();
}

// Stub fetch to simulate Geocoding API failure → searchGooglePlaces must
// fall back to ZIP centroid for ZIP queries, set searchCenter, and apply
// distance + admin-area filtering so out-of-state results are dropped.
async function searchFallbackTest(): Promise<void> {
  const { searchGooglePlaces } = await import("./googlePlaces.js");
  const originalFetch = globalThis.fetch;

  type StubResponse = { ok: boolean; status?: number; json: () => Promise<unknown>; text: () => Promise<string> };

  function stub(body: unknown, ok = true, status = 200): StubResponse {
    return {
      ok,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body)
    };
  }

  // Three Places "near 90210": one in Beverly Hills (close), two elsewhere
  // including a Pittsburgh false positive that should be filtered.
  const placesPayload = {
    places: [
      {
        id: "good-1",
        displayName: { text: "Beverly Hills Glow Nail Bar" },
        formattedAddress: "200 N Bedford Dr, Beverly Hills, CA 90210",
        rating: 4.9,
        userRatingCount: 120,
        location: { latitude: 34.0731, longitude: -118.4001 },
        addressComponents: [
          { longText: "Beverly Hills", shortText: "Beverly Hills", types: ["locality"] },
          { longText: "California", shortText: "CA", types: ["administrative_area_level_1"] },
          { longText: "90210", shortText: "90210", types: ["postal_code"] }
        ]
      },
      {
        id: "bad-pittsburgh",
        displayName: { text: "Beverly Hills Premier Nail Salon Pittsburgh" },
        formattedAddress: "100 5th Ave, Pittsburgh, PA 15222",
        rating: 4.8,
        userRatingCount: 88,
        location: { latitude: 40.4406, longitude: -79.9959 },
        addressComponents: [
          { longText: "Pittsburgh", shortText: "Pittsburgh", types: ["locality"] },
          { longText: "Pennsylvania", shortText: "PA", types: ["administrative_area_level_1"] },
          { longText: "15222", shortText: "15222", types: ["postal_code"] }
        ]
      },
      {
        id: "low-rating",
        displayName: { text: "Below Quality Threshold" },
        formattedAddress: "1 Some St, Beverly Hills, CA 90210",
        rating: 4.0,
        userRatingCount: 50,
        location: { latitude: 34.07, longitude: -118.4 },
        addressComponents: [
          { longText: "Beverly Hills", shortText: "Beverly Hills", types: ["locality"] },
          { longText: "California", shortText: "CA", types: ["administrative_area_level_1"] }
        ]
      }
    ]
  };

  let capturedPlacesBody: Record<string, unknown> | null = null;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes("maps.googleapis.com/maps/api/geocode")) {
      // Simulate REQUEST_DENIED → handled as null geocode by current code
      return stub({ status: "REQUEST_DENIED", error_message: "Geocoding API not enabled" }) as unknown as Response;
    }
    if (url.includes("places.googleapis.com")) {
      const raw = init?.body;
      if (typeof raw === "string") {
        capturedPlacesBody = JSON.parse(raw);
      }
      return stub(placesPayload) as unknown as Response;
    }
    if (url.includes("api.zippopotam.us")) {
      // Should not be hit for embedded ZIPs, but return safe payload anyway.
      return stub({ places: [{ "place name": "Beverly Hills", "state abbreviation": "CA", latitude: "34.09", longitude: "-118.4" }], "post code": "90210" }) as unknown as Response;
    }
    throw new Error("unexpected fetch in test: " + url);
  }) as typeof globalThis.fetch;

  try {
    _resetZipCacheForTests();
    const survey: SurveyPayload = baseSurvey("90210");
    const result = await searchGooglePlaces(survey, "fake-key");

    assert(
      result.debug.resolvedLocation?.source === "zip-centroid",
      "90210 falls back to zip-centroid resolution when Geocoding API fails"
    );
    assert(
      result.debug.resolvedLocation?.administrativeArea === "CA",
      "90210 resolved admin area is CA after fallback"
    );
    assert(
      result.debug.searchCenter != null && Math.abs(result.debug.searchCenter.lat - 34.09) < 0.5,
      "90210 searchCenter populated from zip centroid (~34.09)"
    );
    const hasPittsburgh = result.pros.some((p) =>
      /pittsburgh/i.test(p.name) || /pittsburgh/i.test(p.address)
    );
    assert(!hasPittsburgh, "90210 fallback excludes Pittsburgh false positive");
    assert(
      result.pros.every((p) => p.address.includes("CA") || p.address.includes("California")),
      "All 90210 results are in CA"
    );
    assert(
      result.pros.every((p) => typeof p.distanceMiles === "number"),
      "All 90210 results have distanceMiles"
    );
    assert(
      result.pros.every((p) => p.rating >= 4.5 && p.reviewCount >= 10),
      "Quality filters still applied (rating >=4.5 reviewCount >=10)"
    );

    // Outgoing Places v1 request schema sanity — this is what triggered the
    // 400 in production: locationRestriction.circle is not supported.
    assert(capturedPlacesBody != null, "Places searchText was called and body captured");
    if (capturedPlacesBody) {
      assert(
        !("locationRestriction" in capturedPlacesBody),
        "Outgoing request must NOT include locationRestriction (v1 rejects circle)"
      );
      const bias = (capturedPlacesBody as { locationBias?: { circle?: { center?: { latitude?: number; longitude?: number }; radius?: number } } }).locationBias;
      assert(
        bias?.circle?.center?.latitude != null && bias?.circle?.center?.longitude != null,
        "Outgoing request uses locationBias.circle with center"
      );
      assert(
        typeof bias?.circle?.radius === "number" && (bias!.circle!.radius as number) > 0,
        "Outgoing request locationBias.circle has positive radius"
      );
      assert(
        typeof (capturedPlacesBody as { textQuery?: string }).textQuery === "string",
        "Outgoing request has textQuery"
      );
    }

    // 60047 must include Elina via the live search path
    capturedPlacesBody = null;
    const elinaPayload = {
      places: [
        {
          id: "elina",
          displayName: { text: "Elina Nail Studio" },
          formattedAddress: "100 Main St, Lake Zurich, IL 60047",
          rating: 4.9,
          userRatingCount: 220,
          location: { latitude: 42.196, longitude: -88.0934 },
          addressComponents: [
            { longText: "Lake Zurich", shortText: "Lake Zurich", types: ["locality"] },
            { longText: "Illinois", shortText: "IL", types: ["administrative_area_level_1"] },
            { longText: "60047", shortText: "60047", types: ["postal_code"] }
          ]
        },
        {
          id: "out-of-state",
          displayName: { text: "Pittsburgh Nails" },
          formattedAddress: "1 5th Ave, Pittsburgh, PA 15222",
          rating: 4.8,
          userRatingCount: 50,
          location: { latitude: 40.4406, longitude: -79.9959 },
          addressComponents: [
            { longText: "Pittsburgh", shortText: "Pittsburgh", types: ["locality"] },
            { longText: "Pennsylvania", shortText: "PA", types: ["administrative_area_level_1"] },
            { longText: "15222", shortText: "15222", types: ["postal_code"] }
          ]
        }
      ]
    };
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes("maps.googleapis.com/maps/api/geocode")) {
        return stub({ status: "REQUEST_DENIED" }) as unknown as Response;
      }
      if (url.includes("places.googleapis.com")) {
        const raw = init?.body;
        if (typeof raw === "string") {
          capturedPlacesBody = JSON.parse(raw);
        }
        return stub(elinaPayload) as unknown as Response;
      }
      if (url.includes("api.zippopotam.us")) {
        return stub({}, false, 404) as unknown as Response;
      }
      throw new Error("unexpected fetch in test: " + url);
    }) as typeof globalThis.fetch;
    _resetZipCacheForTests();
    const elinaResult = await searchGooglePlaces(baseSurvey("60047"), "fake-key");
    assert(
      elinaResult.pros.some((p) => p.name === "Elina Nail Studio"),
      "60047 live search includes Elina Nail Studio"
    );
    assert(
      !elinaResult.pros.some((p) => /pittsburgh/i.test(p.name) || /pittsburgh/i.test(p.address)),
      "60047 live search excludes Pittsburgh false positive"
    );
    assert(
      elinaResult.pros.every((p) => typeof p.distanceMiles === "number"),
      "60047 results carry distanceMiles"
    );
    if (capturedPlacesBody) {
      const b = capturedPlacesBody as { locationBias?: { circle?: { center?: { latitude?: number } } } };
      assert(
        !("locationRestriction" in (capturedPlacesBody as object)),
        "60047 outgoing request must NOT include locationRestriction"
      );
      assert(
        typeof b.locationBias?.circle?.center?.latitude === "number",
        "60047 outgoing request uses locationBias.circle"
      );
    }

    // Unresolved postal: an unknown ZIP that the embedded set doesn't have
    // and (in this test) zippopotam returns 404 → must NOT do an
    // unrestricted text search; should return empty pros + null searchCenter.
    globalThis.fetch = (async (input: RequestInfo | URL): Promise<Response> => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes("maps.googleapis.com/maps/api/geocode")) {
        return stub({ status: "REQUEST_DENIED" }) as unknown as Response;
      }
      if (url.includes("api.zippopotam.us")) {
        return stub({}, false, 404) as unknown as Response;
      }
      if (url.includes("places.googleapis.com")) {
        // If we hit this for an unresolved postal, the test fails the
        // contract: we must not call Places without restriction.
        throw new Error("Places API must not be called for unresolved postal");
      }
      throw new Error("unexpected fetch in test: " + url);
    }) as typeof globalThis.fetch;
    _resetZipCacheForTests();
    const unresolved = await searchGooglePlaces(baseSurvey("99999"), "fake-key");
    assert(
      unresolved.debug.resolvedLocation?.source === "unresolved",
      "Unknown ZIP (99999) is reported as unresolved"
    );
    assert(unresolved.debug.searchCenter == null, "Unknown ZIP has null searchCenter");
    assert(unresolved.pros.length === 0, "Unknown ZIP returns zero pros (no global text search)");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

let searchTestDone = false;
searchFallbackTest()
  .catch((err) => {
    console.log(`FAIL  searchGooglePlaces fallback test threw: ${err}`);
    failed++;
  })
  .finally(() => {
    searchTestDone = true;
    finalize();
  });

let finalized = false;
function finalize(): void {
  if (finalized) return;
  if (!asyncDone) return;
  if (!searchTestDone) return;
  finalized = true;
  if (failed > 0) {
    console.error(`\n${failed} search-accuracy case(s) failed`);
    process.exit(1);
  }
  console.log("\nAll search-accuracy cases passed");
}
