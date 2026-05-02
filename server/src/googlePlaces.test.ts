import { calculateScore } from "./googlePlaces.js";

type Case = { rating: number; reviewCount: number; expected: number; tolerance: number };

const cases: Case[] = [
  { rating: 5.0, reviewCount: 10, expected: 96, tolerance: 2 },
  { rating: 5.0, reviewCount: 20, expected: 98, tolerance: 2 },
  { rating: 5.0, reviewCount: 50, expected: 99, tolerance: 1 },
  { rating: 4.9, reviewCount: 200, expected: 96, tolerance: 2 },
  { rating: 4.6, reviewCount: 200, expected: 76, tolerance: 3 },
  { rating: 4.5, reviewCount: 1000, expected: 70, tolerance: 5 },
  { rating: 5.0, reviewCount: 500, expected: 99, tolerance: 1 }
];

let failed = 0;
for (const { rating, reviewCount, expected, tolerance } of cases) {
  const actual = calculateScore({ rating, userRatingCount: reviewCount });
  const ok = Math.abs(actual - expected) <= tolerance;
  const status = ok ? "PASS" : "FAIL";
  console.log(
    `${status}  rating=${rating}  reviews=${reviewCount}  score=${actual}  expected≈${expected}±${tolerance}`
  );
  if (!ok) failed++;
}

if (calculateScore({ rating: 5.0, userRatingCount: 50 }) <= calculateScore({ rating: 4.6, userRatingCount: 200 })) {
  console.log("FAIL  newer high-quality pro should outrank lower-rated high-volume pro");
  failed++;
}

if (failed > 0) {
  console.error(`\n${failed} scoring case(s) failed`);
  process.exit(1);
}
console.log("\nAll scoring cases passed");
