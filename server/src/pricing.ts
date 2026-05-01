import type { ServiceEstimate, ServiceSlug } from "./types.js";

const BASE_PRICE_RANGES: Record<ServiceSlug, { label: string; low: number; high: number }> = {
  "russian-manicure": { label: "Russian manicure", low: 75, high: 130 },
  "gel-manicure": { label: "Gel manicure", low: 35, high: 70 },
  "structured-gel": { label: "Structured gel manicure", low: 65, high: 110 },
  "dip-powder": { label: "Dip powder manicure", low: 45, high: 85 },
  "acrylic-full-set": { label: "Acrylic full set", low: 55, high: 120 },
  "nail-art": { label: "Nail art add-on", low: 10, high: 55 },
  "dry-pedicure": { label: "Dry pedicure", low: 45, high: 85 },
  "spa-pedicure": { label: "Spa pedicure", low: 50, high: 95 },
  "builder-gel": { label: "Builder gel / BIAB", low: 60, high: 115 },
  "classic-manicure": { label: "Classic manicure", low: 22, high: 45 },
  haircut: { label: "Haircut", low: 45, high: 120 },
  blowout: { label: "Blowout", low: 40, high: 90 },
  "hair-color": { label: "Hair color", low: 85, high: 180 },
  balayage: { label: "Balayage", low: 160, high: 350 },
  "hair-extensions": { label: "Hair extensions", low: 250, high: 900 },
  braids: { label: "Braids", low: 80, high: 280 },
  "mens-haircut": { label: "Men's haircut", low: 30, high: 75 },
  "barber-fade": { label: "Fade", low: 35, high: 85 },
  "beard-trim": { label: "Beard trim", low: 18, high: 45 },
  "hot-towel-shave": { label: "Hot towel shave", low: 30, high: 70 },
  "lash-extensions": { label: "Lash extensions", low: 120, high: 260 },
  "lash-lift": { label: "Lash lift", low: 70, high: 130 },
  "lash-fill": { label: "Lash fill", low: 55, high: 120 },
  "brow-shaping": { label: "Brow shaping", low: 20, high: 55 },
  "brow-lamination": { label: "Brow lamination", low: 70, high: 140 },
  "brow-tint": { label: "Brow tint", low: 20, high: 50 },
  "custom-facial": { label: "Custom facial", low: 85, high: 180 },
  "chemical-peel": { label: "Chemical peel", low: 110, high: 250 },
  dermaplaning: { label: "Dermaplaning", low: 75, high: 160 },
  microneedling: { label: "Microneedling", low: 180, high: 450 },
  "brazilian-wax": { label: "Brazilian wax", low: 55, high: 95 },
  "brow-wax": { label: "Brow wax", low: 18, high: 40 },
  "full-leg-wax": { label: "Full leg wax", low: 70, high: 140 },
  "swedish-massage": { label: "Swedish massage", low: 80, high: 150 },
  "deep-tissue-massage": { label: "Deep tissue massage", low: 95, high: 180 },
  "sports-massage": { label: "Sports massage", low: 100, high: 190 },
  "prenatal-massage": { label: "Prenatal massage", low: 90, high: 170 },
  "event-makeup": { label: "Event makeup", low: 90, high: 200 },
  "bridal-makeup": { label: "Bridal makeup", low: 150, high: 400 },
  "makeup-lesson": { label: "Makeup lesson", low: 80, high: 180 },
  "body-sculpting": { label: "Body sculpting", low: 120, high: 350 },
  "sauna-session": { label: "Sauna session", low: 25, high: 65 },
  reiki: { label: "Reiki session", low: 70, high: 150 },
  "holistic-facial": { label: "Holistic facial", low: 95, high: 210 }
};

const PRICE_LEVEL_MULTIPLIER: Record<string, number> = {
  PRICE_LEVEL_FREE: 1,
  PRICE_LEVEL_INEXPENSIVE: 0.9,
  PRICE_LEVEL_MODERATE: 1,
  PRICE_LEVEL_EXPENSIVE: 1.25,
  PRICE_LEVEL_VERY_EXPENSIVE: 1.45
};

export function estimateCosts(services: ServiceSlug[], priceLevel?: string): ServiceEstimate[] {
  const multiplier = priceLevel ? PRICE_LEVEL_MULTIPLIER[priceLevel] ?? 1 : 1;

  return services.map((service) => {
    const base = BASE_PRICE_RANGES[service];
    return {
      service,
      label: base.label,
      low: Math.round(base.low * multiplier),
      high: Math.round(base.high * multiplier),
      confidence: "estimate"
    };
  });
}

export function serviceLabel(service: ServiceSlug): string {
  return BASE_PRICE_RANGES[service]?.label ?? service;
}
