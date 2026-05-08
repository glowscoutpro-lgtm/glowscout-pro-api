import {
  _resetCityIndexForTests,
  _resetGeocodeCacheForTests,
  normalizeCityName,
  suggestLocations,
  type LocationSuggestion
} from "./locationSuggest.js";
import { _resetZipCacheForTests } from "./zipResolver.js";

let failed = 0;

function assert(condition: unknown, message: string): void {
  const status = condition ? "PASS" : "FAIL";
  console.log(`${status}  ${message}`);
  if (!condition) failed++;
}

function findByLabel(items: LocationSuggestion[], needle: string): LocationSuggestion | undefined {
  return items.find((s) => s.label.toLowerCase().includes(needle.toLowerCase()));
}

async function run(): Promise<void> {
  _resetCityIndexForTests();
  _resetZipCacheForTests();

  // 60047 → entire ZIP + Lake Zurich primary + nearby Long Grove etc.
  {
    const items = await suggestLocations("60047");
    assert(items.length >= 3, `60047 returns at least 3 suggestions (got ${items.length})`);
    const zipEntry = items.find((s) => s.type === "zip");
    assert(zipEntry?.postalCode === "60047", "60047 has zip-type suggestion with postalCode 60047");
    assert(zipEntry?.label.includes("60047"), "60047 zip-type label mentions ZIP");
    assert(zipEntry != null && Math.abs(zipEntry.lat - 42.196) < 0.5, "60047 zip lat ~42.196");
    const primary = items.find((s) => s.type === "city");
    assert(
      primary?.city === "Lake Zurich" && primary.state === "IL",
      "60047 primary city is Lake Zurich, IL"
    );
    const longGrove = findByLabel(items, "long grove");
    assert(longGrove?.type === "nearby", "60047 includes Long Grove as nearby");
    assert(longGrove?.state === "IL", "60047 nearby Long Grove is in IL");
    assert(items.every((s) => typeof s.radiusMiles === "number" && s.radiusMiles > 0), "all 60047 suggestions carry positive radiusMiles");
  }

  // 90210 → Beverly Hills primary + West Hollywood nearby
  {
    const items = await suggestLocations("90210");
    const primary = items.find((s) => s.type === "city");
    assert(primary?.city === "Beverly Hills" && primary.state === "CA", "90210 primary is Beverly Hills, CA");
    assert(findByLabel(items, "west hollywood") != null, "90210 includes West Hollywood as nearby");
    const zipEntry = items.find((s) => s.type === "zip");
    assert(zipEntry != null && zipEntry.postalCode === "90210", "90210 includes entire ZIP option");
  }

  // 10001 → New York primary
  {
    const items = await suggestLocations("10001");
    const primary = items.find((s) => s.type === "city");
    assert(primary?.city === "New York" && primary.state === "NY", "10001 primary is New York, NY");
    const zipEntry = items.find((s) => s.type === "zip");
    assert(zipEntry?.postalCode === "10001", "10001 includes entire ZIP option");
  }

  // ZIP+4 should normalize to base ZIP
  {
    const items = await suggestLocations("60047-1234");
    const zipEntry = items.find((s) => s.type === "zip");
    assert(zipEntry?.postalCode === "60047", "ZIP+4 normalizes to 5-digit ZIP");
  }

  // City text query
  {
    const items = await suggestLocations("Lake Zurich");
    assert(items.length >= 1, "Lake Zurich returns at least one suggestion");
    assert(
      items.some((s) => s.city === "Lake Zurich" && s.state === "IL" && s.type === "city"),
      "Lake Zurich text query includes Lake Zurich, IL"
    );
  }

  // City + state filter
  {
    const items = await suggestLocations("New York, NY");
    assert(
      items.some((s) => s.city === "New York" && s.state === "NY"),
      "New York, NY parses and returns NY entry"
    );
    assert(items.every((s) => s.state === "NY"), "City+state filter restricts to NY");
  }

  // Prefix substring search (Bev → Beverly Hills)
  {
    const items = await suggestLocations("Bev");
    assert(
      items.some((s) => s.city === "Beverly Hills" && s.state === "CA"),
      "Bev prefix returns Beverly Hills, CA"
    );
  }

  // Empty / very short queries
  {
    const empty = await suggestLocations("");
    assert(empty.length === 0, "empty query returns no suggestions");
    const single = await suggestLocations("a");
    assert(single.length === 0, "single-character text query returns no suggestions");
  }

  // St/Saint normalization
  {
    assert(normalizeCityName("St Augustine") === "saint augustine", "normalizeCityName: St → Saint");
    assert(normalizeCityName("Saint Augustine") === "saint augustine", "normalizeCityName: Saint stays Saint");
    assert(normalizeCityName("St. Louis") === "saint louis", "normalizeCityName: St. → Saint");
    assert(normalizeCityName("Mt Vernon") === "mount vernon", "normalizeCityName: Mt → Mount");
    assert(normalizeCityName("Ft Lauderdale") === "fort lauderdale", "normalizeCityName: Ft → Fort");
  }

  // Embedded "St. Louis" matches both "St Louis" and "Saint Louis"
  {
    const stLouis = await suggestLocations("St Louis");
    assert(
      stLouis.some((s) => s.city === "St. Louis" && s.state === "MO"),
      "St Louis matches embedded St. Louis, MO"
    );
    const saintLouis = await suggestLocations("Saint Louis");
    assert(
      saintLouis.some((s) => s.city === "St. Louis" && s.state === "MO"),
      "Saint Louis matches embedded St. Louis, MO"
    );
  }

  // City + spelled-out state: "Lake Zurich Illinois"
  {
    const items = await suggestLocations("Lake Zurich Illinois");
    assert(
      items.some((s) => s.city === "Lake Zurich" && s.state === "IL"),
      "Lake Zurich Illinois (no comma) parses state name"
    );
  }

  // Two-word state name: "Charlotte North Carolina"
  {
    const items = await suggestLocations("Charlotte North Carolina");
    assert(
      items.some((s) => s.city === "Charlotte" && s.state === "NC"),
      "Charlotte North Carolina parses two-word state"
    );
  }

  // Google Geocoding fallback for city not in embedded catalog
  // Test all four variants: St Augustine FL, St Augustine Florida,
  // Saint Augustine FL, Saint Augustine Florida.
  {
    const variants = [
      "St Augustine FL",
      "St Augustine Florida",
      "Saint Augustine FL",
      "Saint Augustine Florida",
      "St Augustine, FL"
    ];
    for (const variant of variants) {
      const originalFetch = globalThis.fetch;
      let fetchedUrl = "";
      globalThis.fetch = (async (input: RequestInfo | URL): Promise<Response> => {
        fetchedUrl = typeof input === "string" ? input : input.toString();
        const body = JSON.stringify({
          status: "OK",
          results: [
            {
              formatted_address: "St. Augustine, FL, USA",
              geometry: { location: { lat: 29.9012, lng: -81.3124 } },
              types: ["locality", "political"],
              address_components: [
                { long_name: "St. Augustine", short_name: "St. Augustine", types: ["locality", "political"] },
                { long_name: "Florida", short_name: "FL", types: ["administrative_area_level_1", "political"] },
                { long_name: "United States", short_name: "US", types: ["country", "political"] }
              ]
            }
          ]
        });
        return new Response(body, { status: 200 });
      }) as typeof globalThis.fetch;
      const originalKey = process.env.GOOGLE_MAPS_API_KEY;
      process.env.GOOGLE_MAPS_API_KEY = "test-key";
      try {
        _resetGeocodeCacheForTests();
        const items = await suggestLocations(variant);
        assert(items.length >= 1, `${variant}: returns at least one suggestion via Google fallback`);
        const sa = items.find((s) => s.city === "St. Augustine");
        assert(sa != null, `${variant}: includes St. Augustine`);
        assert(sa?.state === "FL", `${variant}: state resolved as FL`);
        assert(sa?.source === "google", `${variant}: source is google`);
        assert(typeof sa?.lat === "number" && typeof sa?.lng === "number", `${variant}: has lat/lng`);
        assert(fetchedUrl.includes("components=country%3AUS"), `${variant}: geocode call restricts to US`);
      } finally {
        globalThis.fetch = originalFetch;
        if (originalKey == null) {
          delete process.env.GOOGLE_MAPS_API_KEY;
        } else {
          process.env.GOOGLE_MAPS_API_KEY = originalKey;
        }
      }
    }
  }

  // No Google fallback when API key is unset → falls back to empty
  {
    const candidateNames = [
      "GOOGLE_MAPS_API_KEY",
      "GOOGLE_PLACES_API_KEY",
      "GOOGLE_MAPS_PLATFORM_API_KEY",
      "GOOGLE_API_KEY",
      "MAPS_API_KEY",
      "PLACES_API_KEY"
    ];
    const originalValues: Record<string, string | undefined> = {};
    for (const name of candidateNames) {
      originalValues[name] = process.env[name];
      delete process.env[name];
    }
    try {
      _resetGeocodeCacheForTests();
      const items = await suggestLocations("Truth or Consequences NM");
      assert(
        items.length === 0,
        "no Google API key env var set → unknown city returns empty list"
      );
    } finally {
      for (const name of candidateNames) {
        if (originalValues[name] != null) process.env[name] = originalValues[name];
      }
    }
  }

  // Geocoding fallback also fires when only an alternate env var is set
  // (e.g. GOOGLE_PLACES_API_KEY) and GOOGLE_MAPS_API_KEY is absent.
  {
    const candidateNames = [
      "GOOGLE_MAPS_API_KEY",
      "GOOGLE_PLACES_API_KEY",
      "GOOGLE_MAPS_PLATFORM_API_KEY",
      "GOOGLE_API_KEY",
      "MAPS_API_KEY",
      "PLACES_API_KEY"
    ];
    const originalValues: Record<string, string | undefined> = {};
    for (const name of candidateNames) {
      originalValues[name] = process.env[name];
      delete process.env[name];
    }
    const originalFetch = globalThis.fetch;
    let fetchCalled = false;
    let fetchedUrl = "";
    globalThis.fetch = (async (input: RequestInfo | URL): Promise<Response> => {
      fetchCalled = true;
      fetchedUrl = typeof input === "string" ? input : input.toString();
      const body = JSON.stringify({
        status: "OK",
        results: [
          {
            formatted_address: "St. Augustine, FL, USA",
            geometry: { location: { lat: 29.9012, lng: -81.3124 } },
            types: ["locality", "political"],
            address_components: [
              { long_name: "St. Augustine", short_name: "St. Augustine", types: ["locality", "political"] },
              { long_name: "Florida", short_name: "FL", types: ["administrative_area_level_1", "political"] },
              { long_name: "United States", short_name: "US", types: ["country", "political"] }
            ]
          }
        ]
      });
      return new Response(body, { status: 200 });
    }) as typeof globalThis.fetch;
    process.env.GOOGLE_PLACES_API_KEY = "places-only-key";
    try {
      _resetGeocodeCacheForTests();
      const items = await suggestLocations("St Augustine FL");
      assert(fetchCalled, "GOOGLE_PLACES_API_KEY-only env triggers Google geocoding fallback");
      assert(
        fetchedUrl.includes("key=places-only-key"),
        "geocode call uses the alternate-env-var key value"
      );
      const sa = items.find((s) => s.city === "St. Augustine");
      assert(sa != null, "GOOGLE_PLACES_API_KEY-only env still returns a St. Augustine suggestion");
      assert(sa?.source === "google", "alternate-env suggestion source is google");
    } finally {
      globalThis.fetch = originalFetch;
      for (const name of candidateNames) {
        if (originalValues[name] != null) {
          process.env[name] = originalValues[name];
        } else {
          delete process.env[name];
        }
      }
    }
  }

  // Embedded match still wins over Google fallback (no API call needed)
  {
    const originalFetch = globalThis.fetch;
    let fetchCalled = false;
    globalThis.fetch = (async (): Promise<Response> => {
      fetchCalled = true;
      return new Response("{}", { status: 200 });
    }) as typeof globalThis.fetch;
    const originalKey = process.env.GOOGLE_MAPS_API_KEY;
    process.env.GOOGLE_MAPS_API_KEY = "test-key";
    try {
      _resetGeocodeCacheForTests();
      const items = await suggestLocations("Lake Zurich");
      assert(items.length >= 1, "Lake Zurich still resolves from embedded index when API key is set");
      assert(!fetchCalled, "Embedded match short-circuits Google geocoding fallback");
    } finally {
      globalThis.fetch = originalFetch;
      if (originalKey == null) {
        delete process.env.GOOGLE_MAPS_API_KEY;
      } else {
        process.env.GOOGLE_MAPS_API_KEY = originalKey;
      }
    }
  }

  // Unknown ZIP with offline-only resolver returns empty list (no global guesses)
  {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (): Promise<Response> => {
      const body = JSON.stringify({});
      return new Response(body, { status: 404 });
    }) as typeof globalThis.fetch;
    try {
      _resetZipCacheForTests();
      const items = await suggestLocations("99999");
      assert(items.length === 0, "unresolvable ZIP returns zero suggestions");
    } finally {
      globalThis.fetch = originalFetch;
    }
  }

  if (failed > 0) {
    console.error(`\n${failed} location-suggest case(s) failed`);
    process.exit(1);
  }
  console.log("\nAll location-suggest cases passed");
}

run().catch((err) => {
  console.error("location-suggest test threw:", err);
  process.exit(1);
});
