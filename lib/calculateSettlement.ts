// lib/calculateSettlement.ts

export type Settlement = {
  commissionRate: number;      // %
  commissionAmount: number;    // integer fee you keep
  sellerPayout: number;        // integer seller gets
  dvlaFee: number;             // integer DVLA fee (e.g. 80 for £80)
};

export function calculateSettlement(salePrice: number): Settlement {
  if (!Number.isFinite(salePrice) || salePrice <= 0) {
    throw new Error("Invalid sale price for settlement.");
  }

  let commissionRate: number;

  if (salePrice <= 4999) {
    commissionRate = 10;
  } else if (salePrice <= 9999) {
    commissionRate = 8;
  } else if (salePrice <= 24999) {
    commissionRate = 7;
  } else if (salePrice <= 49999) {
    commissionRate = 6;
  } else {
    commissionRate = 5;
  }

  const commissionAmount = Math.round(salePrice * (commissionRate / 100));
  const sellerPayout = salePrice - commissionAmount;

  // treat as whole pounds for now
  const dvlaFee = 80;

  return {
    commissionRate,
    commissionAmount,
    sellerPayout,
    dvlaFee,
  };
}
