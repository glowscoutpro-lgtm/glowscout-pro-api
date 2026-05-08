export type ServiceCategory =
  | "nails"
  | "hair"
  | "barber"
  | "lashes"
  | "brows"
  | "skin"
  | "waxing"
  | "massage"
  | "makeup"
  | "wellness";

export type ServiceSlug =
  | "russian-manicure"
  | "gel-manicure"
  | "structured-gel"
  | "dip-powder"
  | "acrylic-full-set"
  | "nail-art"
  | "dry-pedicure"
  | "spa-pedicure"
  | "builder-gel"
  | "classic-manicure"
  | "haircut"
  | "blowout"
  | "hair-color"
  | "balayage"
  | "hair-extensions"
  | "braids"
  | "mens-haircut"
  | "barber-fade"
  | "beard-trim"
  | "hot-towel-shave"
  | "lash-extensions"
  | "lash-lift"
  | "lash-fill"
  | "brow-shaping"
  | "brow-lamination"
  | "brow-tint"
  | "custom-facial"
  | "chemical-peel"
  | "dermaplaning"
  | "microneedling"
  | "brazilian-wax"
  | "brow-wax"
  | "full-leg-wax"
  | "swedish-massage"
  | "deep-tissue-massage"
  | "sports-massage"
  | "prenatal-massage"
  | "event-makeup"
  | "bridal-makeup"
  | "makeup-lesson"
  | "body-sculpting"
  | "sauna-session"
  | "reiki"
  | "holistic-facial";

export type SurveyPayload = {
  location: string;
  category: ServiceCategory;
  services: ServiceSlug[];
  budget?: "under-50" | "50-85" | "85-125" | "125-plus";
  maxDistanceMiles?: number;
  availability?: "today" | "this-week" | "weekend" | "flexible";
  preferences?: string[];
};

export type ServiceEstimate = {
  service: ServiceSlug;
  label: string;
  low: number;
  high: number;
  confidence: "estimate" | "website" | "verified";
};

export type ReviewExcerpt = {
  authorName: string;
  authorUri?: string;
  rating?: number;
  text: string;
  relativePublishTime?: string;
  source: "google" | "demo";
};

export type LicenseVerificationStatus = "not_verified" | "pending_review" | "license_found" | "state_verified";

export type LicenseVerification = {
  status: LicenseVerificationStatus;
  label: string;
  state?: string;
  licenseType?: string;
  licenseNumberLast4?: string;
  lastChecked?: string;
  detail: string;
};

export type ProResult = {
  id: string;
  name: string;
  address: string;
  rating: number;
  reviewCount: number;
  phone?: string;
  website?: string;
  googleMapsUri?: string;
  priceLevel?: string;
  businessStatus?: string;
  lat?: number;
  lng?: number;
  distanceMiles?: number;
  matchedServices: ServiceSlug[];
  estimatedCosts: ServiceEstimate[];
  reviewHighlights: string[];
  reviews: ReviewExcerpt[];
  licenseVerification: LicenseVerification;
  score: number;
};

export type ResolvedLocation = {
  query: string;
  formattedAddress?: string;
  locality?: string;
  administrativeArea?: string;
  postalCode?: string;
  country?: string;
  isPostalQuery: boolean;
  source: "geocode" | "zip-centroid" | "demo" | "unresolved";
};

export type SearchCenter = {
  lat: number;
  lng: number;
  radiusMiles: number;
};

export type SearchDebug = {
  resolvedLocation: ResolvedLocation | null;
  searchCenter: SearchCenter | null;
  rawResultCount?: number;
  filteredOutCount?: number;
};
