import { describe, it, expect } from "vitest";
import { computeRoutes, recommend } from "./routing";

const base = { origin: "Shanghai", destination: "Istanbul", weightT: 20, urgency: "low", disruption: false } as const;

describe("routing", () => {
  it("disruption raises ocean leg time by 40% and cost by 20%", () => {
    const a = computeRoutes(base)[0]!.legs[0]!;
    const b = computeRoutes({ ...base, disruption: true })[0]!.legs[0]!;
    expect(b.days / a.days).toBeCloseTo(1.4);
    expect(b.cost / a.cost).toBeCloseTo(1.2);
  });
  it("Suez blockage penalizes only ocean legs", () => {
    const rail = computeRoutes({ ...base, disruption: true }).find((r) => r.id === "rail-ocean")!;
    expect(rail.legs.find((l) => l.mode === "rail")!.disrupted).toBe(false);
    expect(rail.legs.find((l) => l.mode === "ocean")!.disrupted).toBe(true);
    expect(rail.legs.find((l) => l.mode === "truck")!.disrupted).toBe(false);
  });
  it("border customs delays are added to lead time", () => {
    const routes = computeRoutes(base);
    expect(routes.find((r) => r.id === "rail-ocean")!.customsDays).toBe(3);
    expect(routes.find((r) => r.id === "ocean-truck")!.customsDays).toBe(5);
    expect(routes.find((r) => r.id === "air")!.customsDays).toBe(1);
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
});
