import { API_URL } from "./config";
import type { ProResult, SurveyPayload } from "./types";

export type SearchResponse = {
  mode: "live" | "demo";
  criteria: {
    minimumRating: number;
    minimumReviewCount: number;
    category: string;
  };
  pros: ProResult[];
};

export async function searchPros(payload: SurveyPayload): Promise<SearchResponse> {
  const response = await fetch(`${API_URL}/api/pros/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Search failed");
  }

  return (await response.json()) as SearchResponse;
}
