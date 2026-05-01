import type { ServiceCategory, ServiceSlug } from "./types";

export type ProfessionOption = {
  category: ServiceCategory;
  label: string;
  shortLabel: string;
  searchHint: string;
  defaultServices: ServiceSlug[];
};

export type ServiceOption = {
  slug: ServiceSlug;
  label: string;
  description: string;
};

export const PROFESSION_OPTIONS: ProfessionOption[] = [
  {
    category: "nails",
    label: "Nail technicians",
    shortLabel: "Nails",
    searchHint: "Manicures, pedicures, nail art",
    defaultServices: ["gel-manicure", "spa-pedicure"]
  },
  {
    category: "hair",
    label: "Hair stylists",
    shortLabel: "Hair",
    searchHint: "Cuts, color, blowouts, extensions",
    defaultServices: ["haircut", "hair-color"]
  },
  {
    category: "barber",
    label: "Barbers",
    shortLabel: "Barber",
    searchHint: "Men's cuts, fades, beard trims",
    defaultServices: ["mens-haircut", "barber-fade"]
  },
  {
    category: "lashes",
    label: "Lash artists",
    shortLabel: "Lashes",
    searchHint: "Extensions, lifts, fills",
    defaultServices: ["lash-extensions"]
  },
  {
    category: "brows",
    label: "Brow specialists",
    shortLabel: "Brows",
    searchHint: "Shaping, lamination, tint",
    defaultServices: ["brow-shaping"]
  },
  {
    category: "skin",
    label: "Estheticians",
    shortLabel: "Skin",
    searchHint: "Facials, peels, dermaplaning",
    defaultServices: ["custom-facial"]
  },
  {
    category: "waxing",
    label: "Waxing specialists",
    shortLabel: "Waxing",
    searchHint: "Brazilian, brow, body waxing",
    defaultServices: ["brazilian-wax"]
  },
  {
    category: "massage",
    label: "Massage therapists",
    shortLabel: "Massage",
    searchHint: "Swedish, deep tissue, sports",
    defaultServices: ["swedish-massage"]
  },
  {
    category: "makeup",
    label: "Makeup artists",
    shortLabel: "Makeup",
    searchHint: "Event, bridal, lessons",
    defaultServices: ["event-makeup"]
  },
  {
    category: "wellness",
    label: "Wellness pros",
    shortLabel: "Wellness",
    searchHint: "Body sculpting, sauna, Reiki",
    defaultServices: ["body-sculpting"]
  }
];

export const SERVICE_OPTIONS_BY_CATEGORY: Record<ServiceCategory, ServiceOption[]> = {
  nails: [
    {
      slug: "russian-manicure",
      label: "Russian manicure",
      description: "Detailed e-file cuticle work and polished finish."
    },
    {
      slug: "gel-manicure",
      label: "Gel manicure",
      description: "Long-lasting gel polish manicure."
    },
    {
      slug: "structured-gel",
      label: "Structured gel",
      description: "Added strength and shape with builder structure."
    },
    {
      slug: "builder-gel",
      label: "Builder gel / BIAB",
      description: "Overlay for stronger natural nails."
    },
    {
      slug: "dip-powder",
      label: "Dip powder",
      description: "Powder manicure with durable color."
    },
    {
      slug: "acrylic-full-set",
      label: "Acrylic full set",
      description: "Extensions or overlays with acrylic."
    },
    {
      slug: "dry-pedicure",
      label: "Dry pedicure",
      description: "Waterless pedicure focused on detail and hygiene."
    },
    {
      slug: "spa-pedicure",
      label: "Spa pedicure",
      description: "Soak, exfoliation, massage, and polish."
    },
    {
      slug: "nail-art",
      label: "Nail art",
      description: "Designs, chrome, gems, French, or custom art."
    },
    {
      slug: "classic-manicure",
      label: "Classic manicure",
      description: "Traditional nail grooming and polish."
    }
  ],
  hair: [
    { slug: "haircut", label: "Haircut", description: "Cut, shape, and finish." },
    { slug: "blowout", label: "Blowout", description: "Wash, blow dry, and style." },
    { slug: "hair-color", label: "Hair color", description: "Single-process color or gloss." },
    { slug: "balayage", label: "Balayage", description: "Hand-painted highlights and tone." },
    { slug: "hair-extensions", label: "Hair extensions", description: "Extension consultation or install." },
    { slug: "braids", label: "Braids", description: "Protective, event, or custom braiding." }
  ],
  barber: [
    { slug: "mens-haircut", label: "Men's haircut", description: "Classic cut, cleanup, and style." },
    { slug: "barber-fade", label: "Fade", description: "Skin, taper, low, mid, or high fade." },
    { slug: "beard-trim", label: "Beard trim", description: "Shape, line-up, and grooming." },
    { slug: "hot-towel-shave", label: "Hot towel shave", description: "Traditional straight-razor style service." }
  ],
  lashes: [
    { slug: "lash-extensions", label: "Lash extensions", description: "Classic, hybrid, or volume sets." },
    { slug: "lash-lift", label: "Lash lift", description: "Lift and curl for natural lashes." },
    { slug: "lash-fill", label: "Lash fill", description: "Maintenance fill for existing extensions." }
  ],
  brows: [
    { slug: "brow-shaping", label: "Brow shaping", description: "Wax, tweeze, or custom mapping." },
    { slug: "brow-lamination", label: "Brow lamination", description: "Fuller brushed-up brow finish." },
    { slug: "brow-tint", label: "Brow tint", description: "Semi-permanent brow color." }
  ],
  skin: [
    { slug: "custom-facial", label: "Custom facial", description: "Personalized skin treatment." },
    { slug: "chemical-peel", label: "Chemical peel", description: "Exfoliating peel treatment." },
    { slug: "dermaplaning", label: "Dermaplaning", description: "Surface exfoliation and peach fuzz removal." },
    { slug: "microneedling", label: "Microneedling", description: "Texture-focused treatment with consultation." }
  ],
  waxing: [
    { slug: "brazilian-wax", label: "Brazilian wax", description: "Specialty intimate waxing service." },
    { slug: "brow-wax", label: "Brow wax", description: "Brow cleanup and shaping." },
    { slug: "full-leg-wax", label: "Full leg wax", description: "Full-leg hair removal service." }
  ],
  massage: [
    { slug: "swedish-massage", label: "Swedish massage", description: "Relaxation-focused massage." },
    { slug: "deep-tissue-massage", label: "Deep tissue massage", description: "Focused pressure for tight muscles." },
    { slug: "sports-massage", label: "Sports massage", description: "Mobility and recovery-focused bodywork." },
    { slug: "prenatal-massage", label: "Prenatal massage", description: "Pregnancy-safe massage with trained pro." }
  ],
  makeup: [
    { slug: "event-makeup", label: "Event makeup", description: "Makeup for photos, parties, or events." },
    { slug: "bridal-makeup", label: "Bridal makeup", description: "Wedding-day or bridal trial makeup." },
    { slug: "makeup-lesson", label: "Makeup lesson", description: "One-on-one application coaching." }
  ],
  wellness: [
    { slug: "body-sculpting", label: "Body sculpting", description: "Non-invasive contouring-style wellness service." },
    { slug: "sauna-session", label: "Sauna session", description: "Infrared or traditional sauna appointment." },
    { slug: "reiki", label: "Reiki", description: "Energy-focused relaxation session." },
    { slug: "holistic-facial", label: "Holistic facial", description: "Facial service with wellness-focused approach." }
  ]
};

export const SERVICE_OPTIONS = Object.values(SERVICE_OPTIONS_BY_CATEGORY).flat();

export function getProfessionOption(category: ServiceCategory): ProfessionOption {
  return PROFESSION_OPTIONS.find((option) => option.category === category) ?? PROFESSION_OPTIONS[0];
}

export function getServiceOptionsForCategory(category: ServiceCategory): ServiceOption[] {
  return SERVICE_OPTIONS_BY_CATEGORY[category] ?? SERVICE_OPTIONS_BY_CATEGORY.nails;
}

export const PREFERENCE_OPTIONS = [
  "Cleanliness is most important",
  "Independent pro preferred",
  "Salon setting preferred",
  "Can book online",
  "Open evenings",
  "Open weekends",
  "Private studio setting",
  "Natural results preferred",
  "Specialist preferred"
];
