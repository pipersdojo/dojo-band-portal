import { STRIPE_PRODUCT_TIERS } from '@/lib/stripeTiers';
import { useState } from 'react';

export function TierPricingTable({ onSelect, selectedPriceId, disabled }: { onSelect: (priceId: string) => void, selectedPriceId?: string, disabled?: boolean }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      {Object.entries(STRIPE_PRODUCT_TIERS).map(([productId, tier]) => (
        <div
          key={productId}
          className={`border rounded p-4 bg-white shadow transition-all ${selectedPriceId === tier.priceId ? 'ring-2 ring-blue-500' : ''}`}
        >
          <div className="font-bold text-lg mb-2">{tier.name}</div>
          <div className="mb-1">Up to <b>{tier.memberLimit}</b> members</div>
          <div className="mb-1 font-semibold text-xl">${tier.yearlyPrice} <span className="text-base font-normal">/ year</span></div>
          <button
            className={`mt-2 px-4 py-2 rounded ${selectedPriceId === tier.priceId ? 'bg-blue-700' : 'bg-blue-600'} text-white disabled:opacity-50`}
            onClick={() => onSelect(tier.priceId)}
            disabled={disabled}
          >
            {selectedPriceId === tier.priceId ? 'Selected' : 'Select'}
          </button>
        </div>
      ))}
    </div>
  );
}
