import { lineCostKopiyky, lineRevenueKopiyky, parseQuantity, roundHalfUp } from './money';

describe('money', () => {
  it('rounds half up', () => {
    expect(roundHalfUp(0.5)).toBe(1);
    expect(roundHalfUp(1.4)).toBe(1);
    expect(roundHalfUp(2.5)).toBe(3);
  });

  it('computes whole-quantity line cost/revenue exactly', () => {
    expect(lineCostKopiyky(3000, 4)).toBe(12000);
    expect(lineRevenueKopiyky(6000, 4)).toBe(24000);
  });

  it('rounds a fractional quantity once per line', () => {
    // 4500 * 0.333 = 1498.5 → 1499
    expect(lineRevenueKopiyky(4500, 0.333)).toBe(1499);
  });

  it('parses a numeric-string quantity from the DB', () => {
    expect(parseQuantity('4.000')).toBe(4);
    expect(parseQuantity('0.5')).toBe(0.5);
  });

  it('reproduces the worked example (575 / 300 / 225 UAH)', () => {
    const cost =
      lineCostKopiyky(3000, 4) + lineCostKopiyky(12000, 1) + lineCostKopiyky(2000, 3);
    const revenue =
      lineRevenueKopiyky(6000, 4) + lineRevenueKopiyky(20000, 1) + lineRevenueKopiyky(4500, 3);
    const otherExpenses = 5000;
    expect(revenue).toBe(57500); // брудний дохід
    expect(cost).toBe(30000);
    expect(revenue - cost - otherExpenses).toBe(22500); // чистий дохід
  });
});
