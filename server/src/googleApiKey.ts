// Resolve a Google Maps/Places API key from any of the env var names that have
// historically been used to configure the production service. The first
// non-empty value wins. Keeping this in one place ensures the provider search
// (`/api/pros/search`) and the city/state suggestion fallback
// (`/api/locations/suggest`) always agree on which key to use.
const GOOGLE_API_KEY_ENV_VARS = [
  "GOOGLE_MAPS_API_KEY",
  "GOOGLE_PLACES_API_KEY",
  "GOOGLE_MAPS_PLATFORM_API_KEY",
  "GOOGLE_API_KEY",
  "MAPS_API_KEY",
  "PLACES_API_KEY"
] as const;

export type GoogleApiKeyResolution = {
  apiKey: string | undefined;
  source: string | undefined;
  checked: readonly string[];
};

export function resolveGoogleApiKey(env: NodeJS.ProcessEnv = process.env): GoogleApiKeyResolution {
  for (const name of GOOGLE_API_KEY_ENV_VARS) {
    const value = env[name];
    if (typeof value === "string" && value.trim().length > 0) {
      return { apiKey: value.trim(), source: name, checked: GOOGLE_API_KEY_ENV_VARS };
    }
  }
  return { apiKey: undefined, source: undefined, checked: GOOGLE_API_KEY_ENV_VARS };
}

export const GOOGLE_API_KEY_ENV_NAMES: readonly string[] = GOOGLE_API_KEY_ENV_VARS;
