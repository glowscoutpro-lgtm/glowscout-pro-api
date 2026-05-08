import {
  _resetCityIndexForTests,
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
