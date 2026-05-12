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
    name: "missing surveyType defaults to consumer_beta",
    input: {
      searchResultsUseful: "yes"
    },
    expectValid: true,
    expectFields: {
      surveyType: "consumer_beta",
      searchQuality: "yes"
    }
  },
  {
    name: "unknown extra field is preserved (passthrough)",
    input: {
      type: "consumer_beta",
      bogusField: "x"
    },
    expectValid: true,
    expectFields: {
      surveyType: "consumer_beta",
      bogusField: "x"
    }
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
    name: "unknown surveyType value falls back to consumer_beta",
    input: {
      surveyType: "garbage"
    },
    expectValid: true,
    expectFields: {
      surveyType: "consumer_beta"
    }
  },
  {
    name: "surveyType 'friend_family' normalizes to consumer_beta",
    input: {
      surveyType: "friend_family",
      likedMost: "test from family"
    },
    expectValid: true,
    expectFields: {
      surveyType: "consumer_beta",
      likedMost: "test from family"
    }
  },
  {
    name: "type 'friend_family' alias normalizes to consumer_beta",
    input: {
      type: "friend_family"
    },
    expectValid: true,
    expectFields: {
      surveyType: "consumer_beta"
    }
  },
  {
    name: "surveyType 'Friends & Family' normalizes to consumer_beta",
    input: {
      surveyType: "Friends & Family"
    },
    expectValid: true,
    expectFields: {
      surveyType: "consumer_beta"
    }
  },
  {
    name: "build 12-style payload with extra app fields validates",
    input: {
      type: "beta",
      searchResultsUseful: "yes",
      resultsTrustworthy: "somewhat",
      confusing: "the map controls",
      missing: "filter by price",
      currentSearchMethods: ["instagram", "google"],
      trustSignals: ["reviews", "verified-license"],
      bookingConfidenceFactor: "clear pricing",
      appBuild: "12",
      platform: "ios",
      sessionId: "abc-123",
      submittedFromScreen: "FeedbackModal"
    },
    expectValid: true,
    expectFields: {
      surveyType: "consumer_beta",
      searchQuality: "yes",
      trustResults: "somewhat",
      confusingPart: "the map controls",
      missingFeature: "filter by price",
      bookingConfidenceFactor: "clear pricing",
      appBuild: "12",
      sessionId: "abc-123"
    }
  },
  {
    name: "build 15-style payload with friend_family and extras validates",
    input: {
      surveyType: "friend_family",
      name: "Frank Carabetta",
      email: "fcarabetta@italiafoods.com",
      canContact: true,
      searchResultsUseful: 4,
      resultsTrustworthy: 5,
      confusing: "nothing major",
      missing: "appointment booking",
      likedMost: "fast results",
      fixFirst: "make pricing clearer",
      appVersion: "1.0.0",
      appBuild: "15",
      platform: "ios",
      deviceModel: "iPhone 15 Pro",
      osVersion: "18.2",
      searchLocation: "Lake Zurich, IL",
      searchCategory: "nails"
    },
    expectValid: true,
    expectFields: {
      surveyType: "consumer_beta",
      email: "fcarabetta@italiafoods.com",
      searchQuality: 4,
      trustResults: 5,
      missingFeature: "appointment booking",
      appBuild: "15"
    }
  },
  {
    name: "completely empty body defaults to consumer_beta",
    input: {},
    expectValid: true,
    expectFields: {
      surveyType: "consumer_beta"
    }
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
  },
  {
    name: "pro reviewer string booleans (yes/no) and blank numeric rating validate",
    input: {
      surveyType: "professional_beta",
      profession: "nail tech",
      privateStudio: "yes",
      wouldClaimProfile: "no",
      offersMobileService: "yes",
      licenseVerificationHelpful: "",
      wouldAddPricing: "true",
      wouldPayForEnhancedProfile: "false"
    },
    expectValid: true,
    expectFields: {
      surveyType: "professional_beta",
      privateStudio: true,
      wouldClaimProfile: false,
      offersMobileService: true,
      wouldAddPricing: true,
      wouldPayForEnhancedProfile: false
    }
  },
  {
    name: "string boolean variants (on/off/1/0) normalize",
    input: {
      surveyType: "professional_beta",
      privateStudio: "on",
      wouldClaimProfile: "off",
      offersMobileService: "1",
      wouldAddPricing: "0"
    },
    expectValid: true,
    expectFields: {
      privateStudio: true,
      wouldClaimProfile: false,
      offersMobileService: true,
      wouldAddPricing: false
    }
  },
  {
    name: "NaN string and 'nan' literal for numeric rating treated as undefined",
    input: {
      surveyType: "professional_beta",
      licenseVerificationHelpful: "nan",
      overallRating: ""
    },
    expectValid: true,
    expectFields: {
      surveyType: "professional_beta"
    }
  },
  {
    name: "literal NaN number for licenseVerificationHelpful treated as undefined",
    input: {
      surveyType: "professional_beta",
      licenseVerificationHelpful: Number.NaN
    },
    expectValid: true,
    expectFields: {
      surveyType: "professional_beta"
    }
  },
  {
    name: "blank string optional booleans treated as undefined",
    input: {
      surveyType: "professional_beta",
      privateStudio: "",
      wouldClaimProfile: "",
      offersMobileService: "",
      canContact: ""
    },
    expectValid: true,
    expectFields: {
      surveyType: "professional_beta"
    }
  },
  {
    name: "numeric strings for licenseVerificationHelpful coerce to number",
    input: {
      surveyType: "professional_beta",
      licenseVerificationHelpful: "4"
    },
    expectValid: true,
    expectFields: {
      licenseVerificationHelpful: 4
    }
  },
  {
    name: "out-of-range numeric rating rejected",
    input: {
      surveyType: "professional_beta",
      licenseVerificationHelpful: 7
    },
    expectValid: false
  },
  {
    name: "blank string for sentimentOrRating treated as undefined",
    input: {
      surveyType: "consumer_beta",
      easeOfUse: "",
      searchQuality: "",
      trustResults: "yes"
    },
    expectValid: true,
    expectFields: {
      surveyType: "consumer_beta",
      trustResults: "yes"
    }
  },
  {
    name: "full pro reviewer payload from screenshot validates",
    input: {
      surveyType: "professional_beta",
      profession: "esthetician",
      offersMobileService: "no",
      privateStudio: "yes",
      wouldClaimProfile: "yes",
      licenseVerificationHelpful: "",
      wouldAddPricing: "yes",
      wouldPayForEnhancedProfile: "no",
      businessValue: "would bring more clients",
      concerns: "none right now",
      appVersion: "1.0.0",
      appBuild: "16",
      platform: "ios"
    },
    expectValid: true,
    expectFields: {
      surveyType: "professional_beta",
      offersMobileService: false,
      privateStudio: true,
      wouldClaimProfile: true,
      wouldAddPricing: true,
      wouldPayForEnhancedProfile: false
    }
  },
  {
    name: "device + search context fields validate",
    input: {
      surveyType: "consumer_beta",
      appVersion: "1.0.0",
      appBuild: "9",
      platform: "ios",
      deviceModel: "iPhone 15 Pro",
      osVersion: "18.2",
      searchLocation: "Lake Zurich, IL",
      searchCategory: "nails",
      searchContext: "looking for russian manicure under $85"
    },
    expectValid: true,
    expectFields: {
      appBuild: "9",
      deviceModel: "iPhone 15 Pro",
      searchLocation: "Lake Zurich, IL"
    }
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
