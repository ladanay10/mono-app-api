// All money is integer kopiyky (1 UAH = 100). Quantities may be fractional.
// Round half-up ONCE per line so downstream SUMs never drift.
export function roundHalfUp(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

// quantity arrives from the DB as a numeric string (e.g. "4.000").
export function parseQuantity(quantity: string | number): number {
  const n = typeof quantity === 'number' ? quantity : Number(quantity);
  if (!Number.isFinite(n))
    throw new Error(`Invalid quantity: ${String(quantity)}`);
  return n;
}

export function lineCostKopiyky(
  unitPurchaseKopiyky: number,
  quantity: number,
): number {
  return roundHalfUp(unitPurchaseKopiyky * quantity);
}

export function lineRevenueKopiyky(
  unitSaleKopiyky: number,
  quantity: number,
): number {
  return roundHalfUp(unitSaleKopiyky * quantity);
}
