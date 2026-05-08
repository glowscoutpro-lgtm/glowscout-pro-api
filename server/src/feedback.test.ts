import { feedbackSchema, normalizeFeedbackPayload } from "./feedback.js";

type Case = {
  name: string;
  input: unknown;
  expectValid: boolean;
  expectFields?: Record<string, unknown>;
};

const cases: Case[] = [
  {
    name: "canonical fields validate",
    input: {
      surveyType: "consumer_beta",
      searchQuality: "yes",
      trustResults: "somewhat",
      confusingPart: "the map controls",
      missingFeature: "filter by price",
      likedMost: "easy to find pros",
      fixFirst: "add login"
    },
    expectValid: true,
    expectFields: {
      surveyType: "consumer_beta",
      searchQuality: "yes",
      trustResults: "somewhat",
      confusingPart: "the map controls",
      missingFeature: "filter by price"
    }
  },
  {
    name: "build 9 aliases normalize and validate",
    input: {
      type: "consumer_beta",
      searchResultsUseful: "yes",
      resultsTrustworthy: "somewhat",
      confusing: "the map controls",
      missing: "filter by price",
      likedMost: "easy to find pros",
      fixFirst: "add login"
    },
    expectValid: true,
    expectFields: {
      surveyType: "consumer_beta",
      searchQuality: "yes",
      trustResults: "somewhat",
      confusingPart: "the map controls",
      missingFeature: "filter by price"
    }
  },
  {
    name: "build 9 aliases with professional_beta",
    input: {
      type: "professional_beta",
      searchResultsUseful: 4,
      resultsTrustworthy: 5
    },
    expectValid: true,
    expectFields: {
      surveyType: "professional_beta",
      searchQuality: 4,
      trustResults: 5
    }
  },
  {
    name: "mixed canonical + alias prefers canonical",
    input: {
      surveyType: "consumer_beta",
      type: "professional_beta",
      searchQuality: "yes",
      searchResultsUseful: "no"
    },
    expectValid: true,
    expectFields: {
      surveyType: "consumer_beta",
      searchQuality: "yes"
    }
  },
  {
    name: "missing surveyType still fails validation",
    input: {
      searchResultsUseful: "yes"
    },
    expectValid: false
  },
  {
    name: "unknown extra field still rejected after normalization",
    input: {
      type: "consumer_beta",
      bogusField: "x"
    },
    expectValid: false
  },
  {
    name: "numeric rating preserved",
    input: {
      type: "consumer_beta",
      overallRating: 4,
      easeOfUse: 3
    },
    expectValid: true,
    expectFields: {
      surveyType: "consumer_beta",
      overallRating: 4,
      easeOfUse: 3
    }
  },
  {
    name: "surveyType 'beta' normalizes to consumer_beta",
    input: {
      surveyType: "beta",
      searchQuality: "yes"
    },
    expectValid: true,
    expectFields: {
      surveyType: "consumer_beta",
      searchQuality: "yes"
    }
  },
  {
    name: "type 'beta' alias normalizes to consumer_beta",
    input: {
      type: "beta",
      likedMost: "fast"
    },
    expectValid: true,
    expectFields: {
      surveyType: "consumer_beta",
      likedMost: "fast"
    }
  },
  {
    name: "surveyType 'pro' normalizes to professional_beta",
    input: {
      surveyType: "pro",
      profession: "esthetician"
    },
    expectValid: true,
    expectFields: {
      surveyType: "professional_beta",
      profession: "esthetician"
    }
  },
  {
    name: "type 'pro' alias normalizes to professional_beta",
    input: {
      type: "pro"
    },
    expectValid: true,
    expectFields: {
      surveyType: "professional_beta"
    }
  },
  {
    name: "surveyType 'BETA' (uppercase) normalizes",
    input: {
      surveyType: "BETA"
    },
    expectValid: true,
    expectFields: {
      surveyType: "consumer_beta"
    }
  },
  {
    name: "unknown surveyType value still rejected",
    input: {
      surveyType: "garbage"
    },
    expectValid: false
  },
  {
    name: "currentSearchMethods + trustSignals arrays validate",
    input: {
      surveyType: "consumer_beta",
      currentSearchMethods: ["instagram", "google", "yelp"],
      currentSearchMethodOther: "ask my hairdresser",
      trustSignals: ["reviews", "before-after-photos", "verified-license"],
      trustSignalOther: "personal referral",
      bookingConfidenceFactor: "clear pricing and recent reviews"
    },
    expectValid: true,
    expectFields: {
      surveyType: "consumer_beta",
      currentSearchMethodOther: "ask my hairdresser",
      trustSignalOther: "personal referral",
      bookingConfidenceFactor: "clear pricing and recent reviews"
    }
  },
  {
    name: "empty arrays for new fields validate",
    input: {
      surveyType: "consumer_beta",
      currentSearchMethods: [],
      trustSignals: []
    },
    expectValid: true
  },
  {
    name: "currentSearchMethods over max length rejected",
    input: {
      surveyType: "consumer_beta",
      currentSearchMethods: Array.from({ length: 21 }, (_, i) => `method-${i}`)
    },
    expectValid: false
  },
  {
    name: "non-array currentSearchMethods rejected",
    input: {
      surveyType: "consumer_beta",
      currentSearchMethods: "instagram"
    },
    expectValid: false
  }
];

let failed = 0;
for (const { name, input, expectValid, expectFields } of cases) {
  const normalized = normalizeFeedbackPayload(input);
  const parsed = feedbackSchema.safeParse(normalized);
  const okValid = parsed.success === expectValid;
  let okFields = true;
  if (expectValid && parsed.success && expectFields) {
    for (const [k, v] of Object.entries(expectFields)) {
      if ((parsed.data as Record<string, unknown>)[k] !== v) {
        okFields = false;
        console.log(`  field mismatch ${k}: got=${(parsed.data as Record<string, unknown>)[k]} expected=${v}`);
      }
    }
  }
  const ok = okValid && okFields;
  const status = ok ? "PASS" : "FAIL";
  console.log(`${status}  ${name}`);
  if (!parsed.success && expectValid) {
    console.log("  errors:", JSON.stringify(parsed.error.flatten()));
  }
  if (!ok) failed++;
}

if (failed > 0) {
  console.log(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${cases.length} tests passed`);
