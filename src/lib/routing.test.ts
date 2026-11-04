import { describe, it, expect } from "vitest";
import { computeRoutes, recommend, explainRecommendation, ORIGINS, DESTINATIONS, URGENCY, type Urgency } from "./routing";
import { ASSUMPTION_GROUPS, MODES, SHADOW_CARBON_PRICE, CARBON_PRICE_SENSITIVITY } from "./model-assumptions";

const base = { origin: "Shanghai", destination: "Istanbul", weightT: 20, urgency: "low", disruption: false } as const;

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Expected route or leg was missing");
  return value;
}

describe("routing", () => {
  it("carbon sensitivity control uses 0–300 dollars per tonne, default 100, step 25", () => {
    expect(CARBON_PRICE_SENSITIVITY).toEqual({ min: 0, max: 300, default: 100, step: 25 });
  });

  it("explicit $100/tonne reproduces Phase 1 exactly across the input domain", () => {
    for (const inputs of scenarios) {
      expect(computeRoutes({ ...inputs, carbonPricePerTonne: 100 })).toEqual(computeRoutes(inputs));
    }
  });

  it("increasing carbon price leaves every physical transport calculation unchanged", () => {
    for (const inputs of scenarios) {
      const zero = computeRoutes({ ...inputs, carbonPricePerTonne: 0 });
      computeRoutes({ ...inputs, carbonPricePerTonne: 300 }).forEach((r, i) => {
        const a = required(zero[i]);
        expect({ cost: r.cost, co2: r.co2, days: r.days, legs: r.legs, customs: r.customsDays, handling: r.handlingDays, fixed: r.fixedCost, variable: r.variableCost, time: r.timePenalty, scores: r.scores })
          .toEqual({ cost: a.cost, co2: a.co2, days: a.days, legs: a.legs, customs: a.customsDays, handling: a.handlingDays, fixed: a.fixedCost, variable: a.variableCost, time: a.timePenalty, scores: a.scores });
        expect(r.generalizedCost - a.generalizedCost).toBeCloseTo(a.co2 * 0.3, 7);
      });
    }
  });

  it.each([0, 100, 300])("correctly converts $%s/tonne CO₂ at slider minimum, default and maximum", (price) => {
    for (const r of computeRoutes({ ...base, carbonPricePerTonne: price })) {
      expect(r.carbonCost).toBe(r.co2 * (price / 1000));
      expect(r.generalizedCost).toBe(r.cost + r.timePenalty + r.carbonCost);
    }
  });

  it("recommendation and explanation minimize actual costs at every slider step", () => {
    for (let price = 0; price <= 300; price += 25) {
      for (const inputs of scenarios) {
        const routes = computeRoutes({ ...inputs, carbonPricePerTonne: price });
        const explanation = explainRecommendation(routes);
        expect(recommend(routes).generalizedCost).toBe(Math.min(...routes.map((r) => r.generalizedCost)));
        expect(explanation.winner).toBe(recommend(routes));
        expect(explanation.gap).toBeCloseTo(explanation.contributions.freight + explanation.contributions.carbon + explanation.contributions.time, 7);
      }
    }
  });

  it("does not force a different recommendation when the carbon price changes", () => {
    expect(recommend(computeRoutes({ ...base, carbonPricePerTonne: 0 })).id).toBe("ocean-truck");
    expect(recommend(computeRoutes({ ...base, carbonPricePerTonne: 300 })).id).toBe("ocean-truck");
  });

  it("disruption raises ocean leg time by 40% and cost by 20%", () => {
    const a = required(required(computeRoutes(base)[0]).legs[0]);
    const b = required(required(computeRoutes({ ...base, disruption: true })[0]).legs[0]);
    expect(b.days / a.days).toBeCloseTo(1.4);
    expect(b.cost / a.cost).toBeCloseTo(1.2);
  });
  it("Suez blockage penalizes only ocean legs", () => {
    const rail = required(computeRoutes({ ...base, disruption: true }).find((r) => r.id === "rail-ocean"));
    expect(required(rail.legs.find((l) => l.mode === "rail")).disrupted).toBe(false);
    expect(required(rail.legs.find((l) => l.mode === "ocean")).disrupted).toBe(true);
    expect(required(rail.legs.find((l) => l.mode === "truck")).disrupted).toBe(false);
  });
  it("border customs delays are added to lead time", () => {
    const routes = computeRoutes(base);
    expect(required(routes.find((r) => r.id === "rail-ocean")).customsDays).toBe(3);
    expect(required(routes.find((r) => r.id === "ocean-truck")).customsDays).toBe(5);
    expect(required(routes.find((r) => r.id === "air")).customsDays).toBe(1);
    for (const r of routes) {
      expect(r.days).toBeCloseTo(r.customsDays + r.legs.reduce((s, l) => s + l.days, 0) + (r.id === "air" ? 2 : r.id === "rail-ocean" ? 5 : 4));
    }
  });
  it("disruption flips the low-urgency recommendation away from ocean+truck", () => {
    expect(recommend(computeRoutes(base)).id).toBe("ocean-truck");
    expect(recommend(computeRoutes({ ...base, disruption: true })).id).not.toBe("ocean-truck");
  });
  it("critical urgency recommends air", () => {
    expect(recommend(computeRoutes({ ...base, urgency: "critical" })).id).toBe("air");
  });

  it("preserves the original default numerical baseline", () => {
    const expected = [
      { cost: 8620, co2: 3740, days: 9 + 16000 / 650 + 300 / 700 },
      { cost: 177020, co2: 96090, days: 3 + 8000 / 9000 + 50 / 700 },
      { cost: 14944, co2: 4928, days: 8 + 10500 / 900 + 1000 / 650 + 60 / 700 },
    ];
    computeRoutes(base).forEach((r, i) => {
      const e = required(expected[i]);
      expect(r.cost).toBe(e.cost);
      expect(r.co2).toBe(e.co2);
      expect(r.days).toBeCloseTo(e.days, 10);
      expect(r.generalizedCost).toBeCloseTo(e.cost + e.days * 15 * 20 + e.co2 * 0.1, 10);
    });
  });

  it("preserves all documented coefficients and marks them illustrative", () => {
    expect(MODES).toEqual({
      ocean: { cost: 0.02, co2g: 10, kmPerDay: 650, label: "Ocean" },
      rail: { cost: 0.06, co2g: 22, kmPerDay: 900, label: "Rail" },
      truck: { cost: 0.12, co2g: 90, kmPerDay: 700, label: "Truck" },
      air: { cost: 1.1, co2g: 600, kmPerDay: 9000, label: "Air" },
    });
    expect(SHADOW_CARBON_PRICE).toBe(0.1);
    expect(Object.values(URGENCY).map((u) => u.delayPerTonDay)).toEqual([15, 60, 250, 1000]);
    for (const row of ASSUMPTION_GROUPS.flatMap((g) => g.rows)) {
      expect(row.sourceStatus).toBe("Illustrative assumption");
      expect(Number.isFinite(row.value)).toBe(true);
    }
  });

  const scenarios = ORIGINS.flatMap((origin) => DESTINATIONS.flatMap((destination) =>
    (Object.keys(URGENCY) as Urgency[]).flatMap((urgency) => [false, true].flatMap((disruption) =>
      [1, 20, 100].map((weightT) => ({ origin, destination, urgency, disruption, weightT }))))));

  it.each(scenarios)("valid results across the input domain: $origin → $destination / $urgency / $disruption / $weightT t", (inputs) => {
    const routes = computeRoutes(inputs);
    expect(routes.map((r) => r.id)).toEqual(["ocean-truck", "air", "rail-ocean"]);
    for (const r of routes) {
      expect(Number.isFinite(r.cost)).toBe(true);
      expect(r.cost).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(r.co2)).toBe(true);
      expect(r.co2).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(r.days)).toBe(true);
      expect(r.days).toBeGreaterThan(0);
      expect(r.generalizedCost).toBeCloseTo(r.cost + r.co2 * 0.1 + r.days * URGENCY[inputs.urgency].delayPerTonDay * inputs.weightT, 8);
      expect(r.carbonCost).toBeCloseTo(r.co2 * 0.1, 10);
      expect(r.timePenalty).toBeCloseTo(r.days * URGENCY[inputs.urgency].delayPerTonDay * inputs.weightT, 10);
      expect(r.days).toBeCloseTo(r.handlingDays + r.customsDays + r.legs.reduce((sum, l) => sum + l.days, 0), 10);
      for (const score of Object.values(r.scores)) {
        expect(Number.isFinite(score)).toBe(true);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
      for (const l of r.legs) {
        expect(l.cost).toBeGreaterThanOrEqual(0);
        expect(l.co2).toBeGreaterThanOrEqual(0);
        expect(l.days).toBeGreaterThan(0);
        expect(l.disrupted).toBe(inputs.disruption && l.mode === "ocean");
        expect(l.suezDependency).toBe("unspecified");
      }
    }
    expect(recommend(routes).generalizedCost).toBe(Math.min(...routes.map((r) => r.generalizedCost)));
  });

  it("increasing weight scales variable cost and emissions, but not fixed cost or transit time", () => {
    const light = computeRoutes({ ...base, weightT: 10 });
    computeRoutes({ ...base, weightT: 20 }).forEach((heavy, i) => {
      const a = required(light[i]);
      expect(heavy.variableCost).toBeGreaterThan(a.variableCost);
      expect(heavy.variableCost).toBeCloseTo(a.variableCost * 2, 10);
      expect(heavy.co2).toBeGreaterThan(a.co2);
      expect(heavy.co2).toBeCloseTo(a.co2 * 2, 10);
      expect(heavy.fixedCost).toBe(a.fixedCost);
      expect(heavy.days).toBe(a.days);
    });
  });

  it("urgency changes preference, not physical freight or emissions", () => {
    const low = computeRoutes(base);
    const expected = { low: "ocean-truck", medium: "rail-ocean", high: "rail-ocean", critical: "air" };
    for (const urgency of Object.keys(URGENCY) as Urgency[]) {
      const routes = computeRoutes({ ...base, urgency });
      expect(recommend(routes).id).toBe(expected[urgency]);
      routes.forEach((r, i) => {
        expect(r.cost).toBe(required(low[i]).cost);
        expect(r.co2).toBe(required(low[i]).co2);
        expect(r.days).toBe(required(low[i]).days);
      });
    }
  });

  it("disruption affects every ocean leg consistently while leaving emissions and other additions unchanged", () => {
    const nominal = computeRoutes(base);
    computeRoutes({ ...base, disruption: true }).forEach((r, i) => {
      const a = required(nominal[i]);
      expect(r.co2).toBe(a.co2);
      expect(r.fixedCost).toBe(a.fixedCost);
      expect(r.customsDays).toBe(a.customsDays);
      expect(r.handlingDays).toBe(a.handlingDays);
      r.legs.forEach((l, j) => {
        const old = required(a.legs[j]);
        expect(l.cost).toBeCloseTo(old.cost * (l.mode === "ocean" ? 1.2 : 1), 10);
        expect(l.days).toBeCloseTo(old.days * (l.mode === "ocean" ? 1.4 : 1), 10);
        expect(l.co2).toBe(old.co2);
      });
    });
  });

  it("explanation ranks actual results and decomposes the winning gap", () => {
    const routes = computeRoutes({ ...base, urgency: "critical" });
    const e = explainRecommendation(routes);
    expect(e.winner).toBe(recommend(routes));
    expect(e.runnerUp.id).toBe("rail-ocean");
    expect(e.gap).toBeCloseTo(e.runnerUp.generalizedCost - e.winner.generalizedCost, 10);
    expect(e.gap).toBeCloseTo(e.contributions.freight + e.contributions.carbon + e.contributions.time, 8);
    expect(e.fasterDespiteHigherFreight).toBe(true);
  });

  it("exact ties keep template order in both recommendation and explanation", () => {
    const routes = computeRoutes(base).map((r) => ({ ...r, generalizedCost: 100 }));
    expect(recommend(routes).id).toBe("ocean-truck");
    expect(explainRecommendation(routes).winner.id).toBe("ocean-truck");
    expect(explainRecommendation(routes).gap).toBe(0);
  });
});
