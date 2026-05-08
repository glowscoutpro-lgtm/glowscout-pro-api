import { getDemoPros } from "./demoData.js";
import { haversineMiles } from "./googlePlaces.js";
import type { SurveyPayload } from "./types.js";

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

if (failed > 0) {
  console.error(`\n${failed} search-accuracy case(s) failed`);
  process.exit(1);
}
console.log("\nAll search-accuracy cases passed");
