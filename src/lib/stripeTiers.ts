// src/lib/stripeTiers.ts
// Mapping of Stripe Product IDs to tier details for Dojo U Corps

export interface StripeTier {
  name: string;
  priceId: string;
  yearlyPrice: number;
  memberLimit: number;
}

export const STRIPE_PRODUCT_TIERS: Record<string, StripeTier> = {
  'prod_SbQUcKNsgCqD0B': {
    name: 'Dojo U Corps (0-10 Members)',
    priceId: 'price_1RgDdBGaCjXRja84vAkRZMMY',
    yearlyPrice: 1000,
    memberLimit: 10,
  },
  'prod_SbcF6ACgEplojA': {
    name: 'Dojo U Corps (11-20 Members)',
    priceId: 'price_1RgP1HGaCjXRja84CxepCyx6',
    yearlyPrice: 1700,
    memberLimit: 20,
  },
  'prod_Sbh8ZRerL3eQ8V': {
    name: 'Dojo U Corps (21-30 Members)',
    priceId: 'price_1RgTjpGaCjXRja8480DtvH38',
    yearlyPrice: 2400,
    memberLimit: 30,
  },
  'prod_SbhBZlI18E50u3': {
    name: 'Dojo U Corps (31-40 Members)',
    priceId: 'price_1RgTmrGaCjXRja84kW7rEmvA',
    yearlyPrice: 3000,
    memberLimit: 40,
  },
};
