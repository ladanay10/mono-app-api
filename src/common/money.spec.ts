import {
  lineCostKopiyky,
  lineRevenueKopiyky,
  parseQuantity,
  roundHalfUp,
} from './money';

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

  it('reproduces the worked example — packaging is 100% profit (625 / 325 UAH)', () => {
    const cost =
      lineCostKopiyky(3000, 4) +
      lineCostKopiyky(12000, 1) +
      lineCostKopiyky(2000, 3);
    const linesSale =
      lineRevenueKopiyky(6000, 4) +
      lineRevenueKopiyky(20000, 1) +
      lineRevenueKopiyky(4500, 3);
    const packagingAddOn = 5000; // packaging — a 100%-margin markup the client pays
    expect(linesSale).toBe(57500);
    expect(cost).toBe(30000);
    // Client pays for packaging → it is added into revenue (БРУДНИЙ ДОХІД).
    const revenue = linesSale + packagingAddOn;
    expect(revenue).toBe(62500); // брудний дохід = уся сума за букет
    // net = revenue − flowers cost (packaging stays in profit; its supply cost is
    // tracked separately as a GENERAL expense).
    expect(revenue - cost).toBe(32500); // чистий дохід
  });
});
