import { estimateCosts } from "./pricing.js";
import type {
  LicenseVerification,
  LicenseVerificationStatus,
  ProResult,
  ResolvedLocation,
  SearchCenter,
  SearchDebug,
  ServiceCategory,
  ServiceSlug,
  SurveyPayload
} from "./types.js";

export type DemoSearchResult = {
  pros: ProResult[];
  debug: SearchDebug;
};

const DEFAULT_DEMO_RADIUS_MILES = 10;

const DEMO_LOCATION_CENTERS: Array<{
  matches: (loc: string) => boolean;
  center: { lat: number; lng: number };
  resolved: Omit<ResolvedLocation, "query" | "source">;
}> = [
  {
    matches: (loc) =>
      loc.includes("60047") ||
      loc.includes("lake zurich") ||
      loc.includes("long grove") ||
      loc.includes("hawthorn woods"),
    center: { lat: 42.196, lng: -88.0934 },
    resolved: {
      formattedAddress: "Lake Zurich, IL 60047, USA",
      locality: "Lake Zurich",
      administrativeArea: "IL",
      postalCode: "60047",
      country: "US",
      isPostalQuery: true
    }
  },
  {
    matches: (loc) => loc.includes("90210") || loc.includes("beverly hills"),
    center: { lat: 34.0901, lng: -118.4065 },
    resolved: {
      formattedAddress: "Beverly Hills, CA 90210, USA",
      locality: "Beverly Hills",
      administrativeArea: "CA",
      postalCode: "90210",
      country: "US",
      isPostalQuery: true
    }
  },
  {
    matches: (loc) => loc.includes("10001"),
    center: { lat: 40.7506, lng: -73.9971 },
    resolved: {
      formattedAddress: "New York, NY 10001, USA",
      locality: "New York",
      administrativeArea: "NY",
      postalCode: "10001",
      country: "US",
      isPostalQuery: true
    }
  }
];

type DemoTemplate = {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  score: number;
  priceLevel: string;
  quote: string;
  licenseStatus?: LicenseVerificationStatus;
};

const DEFAULT_SERVICES_BY_CATEGORY: Record<ServiceCategory, ServiceSlug[]> = {
  nails: ["gel-manicure", "spa-pedicure"],
  hair: ["haircut", "hair-color"],
  barber: ["mens-haircut", "barber-fade"],
  lashes: ["lash-extensions"],
  brows: ["brow-shaping"],
  skin: ["custom-facial"],
  waxing: ["brazilian-wax"],
  massage: ["swedish-massage"],
  makeup: ["event-makeup"],
  wellness: ["body-sculpting"]
};

const DEMO_PROS_BY_CATEGORY: Record<ServiceCategory, DemoTemplate[]> = {
  nails: [
    {
      id: "demo-nails-1",
      name: "Luxe Nail Atelier",
      rating: 4.9,
      reviewCount: 186,
      score: 98,
      priceLevel: "PRICE_LEVEL_EXPENSIVE",
      quote: "Clients mention detailed cuticle work and polished gel finishes.",
      licenseStatus: "state_verified"
    },
    {
      id: "demo-nails-2",
      name: "Polish & Co Studio",
      rating: 4.8,
      reviewCount: 94,
      score: 94,
      priceLevel: "PRICE_LEVEL_MODERATE",
      quote: "Reviewers praise cleanliness, appointment timing, and spa pedicures.",
      licenseStatus: "license_found"
    },
    {
      id: "demo-nails-3",
      name: "Bare Beauty Nail Bar",
      rating: 4.7,
      reviewCount: 51,
      score: 89,
      priceLevel: "PRICE_LEVEL_MODERATE",
      quote: "Guests highlight friendly service and strong classic manicure work.",
      licenseStatus: "not_verified"
    }
  ],
  hair: [
    {
      id: "demo-hair-1",
      name: "Crown & Color Studio",
      rating: 4.9,
      reviewCount: 211,
      score: 99,
      priceLevel: "PRICE_LEVEL_EXPENSIVE",
      quote: "Guests praise color consultations, shine, and a calm one-on-one styling experience.",
      licenseStatus: "state_verified"
    },
    {
      id: "demo-hair-2",
      name: "The Chair Hair Lounge",
      rating: 4.8,
      reviewCount: 132,
      score: 95,
      priceLevel: "PRICE_LEVEL_MODERATE",
      quote: "Strong fit for haircuts, blowouts, and natural-looking color refreshes."
    },
    {
      id: "demo-hair-3",
      name: "Gloss House Salon",
      rating: 4.7,
      reviewCount: 76,
      score: 90,
      priceLevel: "PRICE_LEVEL_MODERATE",
      quote: "Reviewers mention friendly stylists, clean stations, and reliable scheduling."
    }
  ],
  barber: [
    {
      id: "demo-barber-1",
      name: "Crisp & Co Barber Studio",
      rating: 4.9,
      reviewCount: 188,
      score: 98,
      priceLevel: "PRICE_LEVEL_MODERATE",
      quote: "Clients praise clean fades, sharp lineups, and appointment timing.",
      licenseStatus: "state_verified"
    },
    {
      id: "demo-barber-2",
      name: "The Modern Barber Chair",
      rating: 4.8,
      reviewCount: 121,
      score: 94,
      priceLevel: "PRICE_LEVEL_MODERATE",
      quote: "Strong fit for men's haircuts, beard trims, and hot towel shaves.",
      licenseStatus: "license_found"
    },
    {
      id: "demo-barber-3",
      name: "Oak Street Barbers",
      rating: 4.7,
      reviewCount: 68,
      score: 89,
      priceLevel: "PRICE_LEVEL_INEXPENSIVE",
      quote: "Reviewers mention friendly barbers, quick cleanups, and consistent fades."
    }
  ],
  lashes: [
    {
      id: "demo-lashes-1",
      name: "Lash Theory Studio",
      rating: 4.9,
      reviewCount: 144,
      score: 97,
      priceLevel: "PRICE_LEVEL_EXPENSIVE",
      quote: "Clients highlight retention, comfort, and soft natural-looking lash sets.",
      licenseStatus: "state_verified"
    },
    {
      id: "demo-lashes-2",
      name: "Blink Bar",
      rating: 4.8,
      reviewCount: 88,
      score: 93,
      priceLevel: "PRICE_LEVEL_MODERATE",
      quote: "Popular for lash fills, lifts, and online booking."
    },
    {
      id: "demo-lashes-3",
      name: "Soft Set Lash Studio",
      rating: 4.7,
      reviewCount: 47,
      score: 88,
      priceLevel: "PRICE_LEVEL_MODERATE",
      quote: "Reviewers mention careful application and a quiet private studio setting."
    }
  ],
  brows: [
    {
      id: "demo-brows-1",
      name: "Arch & Feather Brow Studio",
      rating: 4.9,
      reviewCount: 123,
      score: 96,
      priceLevel: "PRICE_LEVEL_MODERATE",
      quote: "Known for brow mapping, balanced shaping, and natural results.",
      licenseStatus: "license_found"
    },
    {
      id: "demo-brows-2",
      name: "Brow Room Collective",
      rating: 4.8,
      reviewCount: 67,
      score: 91,
      priceLevel: "PRICE_LEVEL_MODERATE",
      quote: "Strong option for lamination, tinting, and quick cleanups."
    }
  ],
  skin: [
    {
      id: "demo-skin-1",
      name: "Aura Skin Studio",
      rating: 4.9,
      reviewCount: 172,
      score: 98,
      priceLevel: "PRICE_LEVEL_EXPENSIVE",
      quote: "Guests praise thoughtful consultations, clean rooms, and customized facial plans.",
      licenseStatus: "state_verified"
    },
    {
      id: "demo-skin-2",
      name: "Fresh Face Esthetics",
      rating: 4.8,
      reviewCount: 109,
      score: 94,
      priceLevel: "PRICE_LEVEL_MODERATE",
      quote: "Popular for facials, dermaplaning, and gentle education."
    }
  ],
  waxing: [
    {
      id: "demo-waxing-1",
      name: "Smooth Studio",
      rating: 4.9,
      reviewCount: 155,
      score: 97,
      priceLevel: "PRICE_LEVEL_MODERATE",
      quote: "Reviewers mention fast appointments, cleanliness, and respectful service.",
      licenseStatus: "license_found"
    },
    {
      id: "demo-waxing-2",
      name: "Bare Method Wax Bar",
      rating: 4.8,
      reviewCount: 84,
      score: 92,
      priceLevel: "PRICE_LEVEL_MODERATE",
      quote: "Strong fit for Brazilian, brow, and body waxing."
    }
  ],
  massage: [
    {
      id: "demo-massage-1",
      name: "Restore Massage Therapy",
      rating: 4.9,
      reviewCount: 203,
      score: 99,
      priceLevel: "PRICE_LEVEL_EXPENSIVE",
      quote: "Clients praise deep tissue work, quiet rooms, and professional intake questions.",
      licenseStatus: "state_verified"
    },
    {
      id: "demo-massage-2",
      name: "Still Point Bodywork",
      rating: 4.8,
      reviewCount: 117,
      score: 95,
      priceLevel: "PRICE_LEVEL_MODERATE",
      quote: "Popular for Swedish massage, recovery work, and flexible scheduling."
    }
  ],
  makeup: [
    {
      id: "demo-makeup-1",
      name: "Canvas Makeup Artistry",
      rating: 4.9,
      reviewCount: 91,
      score: 94,
      priceLevel: "PRICE_LEVEL_EXPENSIVE",
      quote: "Clients praise camera-ready makeup, calm communication, and event-day timing.",
      licenseStatus: "pending_review"
    },
    {
      id: "demo-makeup-2",
      name: "Soft Glam Collective",
      rating: 4.8,
      reviewCount: 64,
      score: 90,
      priceLevel: "PRICE_LEVEL_MODERATE",
      quote: "Strong fit for event makeup, lessons, and natural soft glam."
    }
  ],
  wellness: [
    {
      id: "demo-wellness-1",
      name: "GlowWell Studio",
      rating: 4.9,
      reviewCount: 118,
      score: 96,
      priceLevel: "PRICE_LEVEL_EXPENSIVE",
      quote: "Guests mention calm spaces, transparent pricing, and wellness-focused care.",
      licenseStatus: "pending_review"
    },
    {
      id: "demo-wellness-2",
      name: "Balance Beauty & Wellness",
      rating: 4.8,
      reviewCount: 73,
      score: 91,
      priceLevel: "PRICE_LEVEL_MODERATE",
      quote: "Popular for sauna sessions, holistic facials, and relaxing treatments."
    }
  ]
};

function demoReviews(name: string) {
  return [
    {
      authorName: "Demo reviewer",
      rating: 5,
      text: `Demo review placeholder for ${name}. Live mode displays real Google reviewer names and review excerpts returned by Google Places.`,
      relativePublishTime: "Demo mode",
      source: "demo" as const
    },
    {
      authorName: "Demo reviewer",
      rating: 5,
      text: "Demo review placeholder for previewing how customers compare written feedback before calling or booking.",
      relativePublishTime: "Demo mode",
      source: "demo" as const
    }
  ];
}

function licenseTypeForCategory(category: ServiceCategory): string {
  const licenseTypes: Record<ServiceCategory, string> = {
    nails: "Nail Technician",
    hair: "Cosmetologist",
    barber: "Barber",
    lashes: "Cosmetologist / Esthetician",
    brows: "Esthetician / Cosmetologist",
    skin: "Esthetician",
    waxing: "Esthetician / Cosmetologist",
    massage: "Massage Therapist",
    makeup: "Makeup Artist",
    wellness: "Wellness Professional"
  };

  return licenseTypes[category];
}

function stateFromLocation(location: string): string | undefined {
  const normalized = location.toUpperCase();
  const match = normalized.match(/\b([A-Z]{2})\b/);

  if (match) {
    return match[1];
  }

  if (normalized.includes("60047") || normalized.includes("LAKE ZURICH") || normalized.includes("CHICAGO")) {
    return "IL";
  }

  return undefined;
}

function buildLicenseVerification(
  status: LicenseVerificationStatus | undefined,
  category: ServiceCategory,
  location: string
): LicenseVerification {
  const state = stateFromLocation(location);
  const licenseType = licenseTypeForCategory(category);
  const safeStatus = status ?? "not_verified";
  const lastChecked = new Date().toISOString();

  if (safeStatus === "state_verified") {
    return {
      status: "state_verified",
      label: state ? `Verified ${state} ${licenseType}` : `State license verified`,
      state,
      licenseType,
      licenseNumberLast4: "4821",
      lastChecked,
      detail: "Demo badge: pro-submitted license details matched the official state licensing record."
    };
  }

  if (safeStatus === "license_found") {
    return {
      status: "license_found",
      label: state ? `License found in ${state}` : "License found",
      state,
      licenseType,
      lastChecked,
      detail:
        "Demo badge: GlowScout found a likely public license match, but the pro has not completed self-verification."
    };
  }

  if (safeStatus === "pending_review") {
    return {
      status: "pending_review",
      label: "License pending review",
      state,
      licenseType,
      lastChecked,
      detail: "Demo badge: license details were submitted and are waiting for admin or state-board review."
    };
  }

  return {
    status: "not_verified",
    label: "License not verified",
    state,
    licenseType,
    lastChecked,
    detail: "Demo badge: this pro may be top-rated on Google, but GlowScout has not verified a state license."
  };
}

function toPro(template: DemoTemplate, survey: SurveyPayload, services: ServiceSlug[], index: number): ProResult {
  return {
    id: template.id,
    name: template.name,
    address: `${survey.location || "Your city"} · ${1.8 + index * 1.3} mi · Demo listing`,
    rating: template.rating,
    reviewCount: template.reviewCount,
    phone: "(555) 012-0186",
    website: "https://example.com",
    googleMapsUri: "https://maps.google.com",
    priceLevel: template.priceLevel,
    businessStatus: "OPERATIONAL",
    matchedServices: services,
    estimatedCosts: estimateCosts(services, template.priceLevel),
    reviewHighlights: [
      template.quote,
      survey.preferences?.includes("Mobile service")
        ? "Mobile service preference is on. Demo listing includes pros that travel to you."
        : survey.preferences?.includes("Licensed pro")
          ? "Licensed pro preference is turned on. Verified badge status is shown separately."
          : "Meets the 4.5-star and 10-review GlowScout trust filter."
    ],
    reviews: demoReviews(template.name),
    licenseVerification: buildLicenseVerification(template.licenseStatus, survey.category, survey.location),
    score: template.score
  };
}

function resolveDemoLocation(rawLocation: string): {
  center: SearchCenter | null;
  resolved: ResolvedLocation;
} {
  const normalized = rawLocation.toLowerCase();
  const match = DEMO_LOCATION_CENTERS.find((entry) => entry.matches(normalized));
  if (!match) {
    return {
      center: null,
      resolved: {
        query: rawLocation,
        isPostalQuery: /^\s*\d{5}(?:-\d{4})?\s*$/.test(rawLocation),
        source: "demo"
      }
    };
  }
  return {
    center: { ...match.center, radiusMiles: DEFAULT_DEMO_RADIUS_MILES },
    resolved: { query: rawLocation, source: "demo", ...match.resolved }
  };
}

export function getDemoPros(survey: SurveyPayload): DemoSearchResult {
  const category = survey.category ?? "nails";
  const services: ServiceSlug[] =
    survey.services.length > 0 ? survey.services : DEFAULT_SERVICES_BY_CATEGORY[category];
  const normalizedLocation = survey.location.toLowerCase();
  const shouldFeatureElina =
    category === "nails" &&
    (normalizedLocation.includes("60047") ||
      normalizedLocation.includes("lake zurich") ||
      normalizedLocation.includes("long grove") ||
      normalizedLocation.includes("hawthorn woods"));

  const { center, resolved } = resolveDemoLocation(survey.location);
  const debug: SearchDebug = {
    resolvedLocation: resolved,
    searchCenter: center
  };

  const defaultPros = DEMO_PROS_BY_CATEGORY[category].map((template, index) =>
    toPro(template, survey, services, index)
  );

  if (!shouldFeatureElina) {
    return { pros: defaultPros, debug };
  }

  const elina: ProResult = {
    id: "demo-elina-60047",
    name: "Elina Nail Studio",
    address: "291 S Rand Road, Lake Zurich, IL 60047 · Demo listing",
    rating: 4.9,
    reviewCount: 28,
    phone: "(847) 970-0072",
    website: "https://nailstudiobyelina.com",
    googleMapsUri:
      "https://maps.google.com/?q=Elina%20Nail%20Studio%20291%20S%20Rand%20Road%20Lake%20Zurich%20IL%2060047",
    priceLevel: "PRICE_LEVEL_MODERATE",
    businessStatus: "OPERATIONAL",
    lat: 42.1969,
    lng: -88.0925,
    distanceMiles: 0.1,
    matchedServices: services,
    estimatedCosts: estimateCosts(services, "PRICE_LEVEL_MODERATE"),
    reviewHighlights: [
      "Demo mode: pro-submitted license details matched the state lookup record.",
      "Strong fit for Russian manicure, structured gel, dry pedicure, and private studio preferences."
    ],
    reviews: demoReviews("Elina Nail Studio"),
    licenseVerification: buildLicenseVerification("state_verified", "nails", "Lake Zurich, IL 60047"),
    score: 99
  };

  return {
    pros: [
      elina,
      ...defaultPros.map((pro) => ({
        ...pro,
        address: pro.address.replace(survey.location || "Your city", "Lake Zurich, IL")
      }))
    ],
    debug
  };
}
