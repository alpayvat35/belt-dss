import { describe, it, expect } from "vitest";
import { computeRoutes, recommend } from "./routing";

const base = { origin: "Shanghai", destination: "Istanbul", weightT: 20, urgency: "low", disruption: false } as const;

describe("routing", () => {
  it("disruption raises ocean leg time by 40% and cost by 20%", () => {
    const a = computeRoutes(base)[0].legs[0];
    const b = computeRoutes({ ...base, disruption: true })[0].legs[0];
    expect(b.days / a.days).toBeCloseTo(1.4);
    expect(b.cost / a.cost).toBeCloseTo(1.2);
  });
  it("disruption flips the low-urgency recommendation away from ocean+truck", () => {
    expect(recommend(computeRoutes(base)).id).toBe("ocean-truck");
    expect(recommend(computeRoutes({ ...base, disruption: true })).id).not.toBe("ocean-truck");
  });
  it("critical urgency recommends air", () => {
    expect(recommend(computeRoutes({ ...base, urgency: "critical" })).id).toBe("air");
  });
});
