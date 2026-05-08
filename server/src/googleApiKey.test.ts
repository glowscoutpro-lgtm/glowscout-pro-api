import { GOOGLE_API_KEY_ENV_NAMES, resolveGoogleApiKey } from "./googleApiKey.js";

let failed = 0;
function assert(condition: unknown, message: string): void {
  const status = condition ? "PASS" : "FAIL";
  console.log(`${status}  ${message}`);
  if (!condition) failed++;
}

function emptyEnv(): NodeJS.ProcessEnv {
  return {} as NodeJS.ProcessEnv;
}

function run(): void {
  // No env vars → no key resolved.
  {
    const result = resolveGoogleApiKey(emptyEnv());
    assert(result.apiKey === undefined, "no env vars set → apiKey is undefined");
    assert(result.source === undefined, "no env vars set → source is undefined");
    assert(result.checked.length >= 4, "checked list contains the candidate env var names");
  }

  // GOOGLE_MAPS_API_KEY wins as primary.
  {
    const env = { GOOGLE_MAPS_API_KEY: "primary" } as NodeJS.ProcessEnv;
    const result = resolveGoogleApiKey(env);
    assert(result.apiKey === "primary", "GOOGLE_MAPS_API_KEY resolves apiKey");
    assert(result.source === "GOOGLE_MAPS_API_KEY", "GOOGLE_MAPS_API_KEY reported as source");
  }

  // Falls back to GOOGLE_PLACES_API_KEY when MAPS is unset.
  {
    const env = { GOOGLE_PLACES_API_KEY: "places" } as NodeJS.ProcessEnv;
    const result = resolveGoogleApiKey(env);
    assert(result.apiKey === "places", "GOOGLE_PLACES_API_KEY used when GOOGLE_MAPS_API_KEY missing");
    assert(result.source === "GOOGLE_PLACES_API_KEY", "GOOGLE_PLACES_API_KEY reported as source");
  }

  // Falls back to GOOGLE_API_KEY.
  {
    const env = { GOOGLE_API_KEY: "generic" } as NodeJS.ProcessEnv;
    const result = resolveGoogleApiKey(env);
    assert(result.apiKey === "generic", "GOOGLE_API_KEY used as further fallback");
    assert(result.source === "GOOGLE_API_KEY", "GOOGLE_API_KEY reported as source");
  }

  // Priority: when both are set, GOOGLE_MAPS_API_KEY wins (primary).
  {
    const env = {
      GOOGLE_MAPS_API_KEY: "primary",
      GOOGLE_PLACES_API_KEY: "places",
      GOOGLE_API_KEY: "generic"
    } as NodeJS.ProcessEnv;
    const result = resolveGoogleApiKey(env);
    assert(result.apiKey === "primary", "GOOGLE_MAPS_API_KEY beats other names when all are set");
    assert(result.source === "GOOGLE_MAPS_API_KEY", "Source reflects the winning env var");
  }

  // Empty/whitespace strings are not treated as set.
  {
    const env = { GOOGLE_MAPS_API_KEY: "   ", GOOGLE_PLACES_API_KEY: "real" } as NodeJS.ProcessEnv;
    const result = resolveGoogleApiKey(env);
    assert(result.apiKey === "real", "blank GOOGLE_MAPS_API_KEY is skipped in favor of next");
    assert(result.source === "GOOGLE_PLACES_API_KEY", "Source reports the env var that actually held a value");
  }

  // Trims whitespace from the resolved value.
  {
    const env = { GOOGLE_MAPS_API_KEY: "  trimmed  " } as NodeJS.ProcessEnv;
    const result = resolveGoogleApiKey(env);
    assert(result.apiKey === "trimmed", "resolved key is trimmed of surrounding whitespace");
  }

  // The known env var list contains the most common alternate names.
  {
    const expected = ["GOOGLE_MAPS_API_KEY", "GOOGLE_PLACES_API_KEY", "GOOGLE_API_KEY"];
    for (const name of expected) {
      assert(GOOGLE_API_KEY_ENV_NAMES.includes(name), `${name} is in the candidate env var list`);
    }
  }

  if (failed > 0) {
    console.error(`\n${failed} googleApiKey case(s) failed`);
    process.exit(1);
  }
  console.log("\nAll googleApiKey cases passed");
}

run();
