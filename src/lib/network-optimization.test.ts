import { describe, expect, it } from "vitest";
import { evaluateNetworkEdges, optimizeNetwork, type NetworkEdge, type NetworkInputs, type NetworkPath, type TransportationNetwork } from "./network-optimization";
import { TRANSPORT_NETWORK } from "./transport-network";
import { computeRoutes, recommend } from "./routing";
import { URGENCY, type Mode, type Urgency } from "./model-assumptions";

const base: NetworkInputs = { origin: "A", destination: "D", weightT: 1, urgency: "medium", carbonPricePerTonne: 100, disruption: false, objective: "cost" };
const edge = (id: string, from: string, to: string, distanceKm: number, mode: Mode = "ocean", overrides: Partial<NetworkEdge> = {}): NetworkEdge =>
  ({ id, from, to, distanceKm, mode, handlingDays: 0, customsDays: 0, fixedCost: 0, usesSuezCanal: false, ...overrides });
const graph = (edges: NetworkEdge[], ids = ["A", "B", "C", "D"]): TransportationNetwork => ({ nodes: ids.map((id) => ({ id, coordinates: [0, 0] })), edges });
function path(network: TransportationNetwork, input: NetworkInputs = base): NetworkPath {
  const result = optimizeNetwork(network, input);
  if (result.status !== "ok") throw new Error(`Expected a connected path, got ${result.status}`);
  return result.path;
}

describe("educational Dijkstra optimizer", () => {
  it("finds a cheaper multi-edge path rather than taking a direct edge", () => {
    const network = graph([edge("ad", "A", "D", 1000), edge("ab", "A", "B", 400), edge("bd", "B", "D", 400)]);
    const result = path(network);
    expect(result.nodes.map((node) => node.id)).toEqual(["A", "B", "D"]);
    expect(result.cost).toBe(16);
    expect(result.distanceKm).toBe(800);
    expect(result.co2).toBe(8);
    expect(result.objectiveValue).toBe(result.cost);
  });

  const alternatives = graph([
    edge("ab", "A", "B", 500, "ocean", { handlingDays: 10 }), edge("bd", "B", "D", 500),
    edge("ac", "A", "C", 500, "rail"), edge("cd", "C", "D", 500, "rail"),
    edge("ad", "A", "D", 1000, "air"),
  ]);
  it.each([
    ["cost", ["A", "B", "D"]], ["time", ["A", "D"]], ["tradeoff", ["A", "C", "D"]],
  ] as const)("%s can choose a different path", (objective, expected) => {
    expect(path(alternatives, { ...base, objective }).nodes.map((node) => node.id)).toEqual(expected);
  });

  it("returns no route for disconnected or reverse-only directed connections", () => {
    expect(optimizeNetwork(graph([edge("ba", "B", "A", 100), edge("bd", "B", "D", 100)]), base).status).toBe("unreachable");
  });
  it("reports missing cities without substitution", () => {
    expect(optimizeNetwork(TRANSPORT_NETWORK, { ...base, origin: "Ningbo", destination: "Mersin" })).toEqual({ status: "unsupported", missingNodes: ["Ningbo", "Mersin"] });
  });
  it("removes only explicitly Suez-dependent edges and leaves Caspian ocean values unchanged", () => {
    const network = graph([edge("ad", "A", "D", 100, "ocean", { usesSuezCanal: true }), edge("ab", "A", "B", 100), edge("bd", "B", "D", 100)]);
    expect(path(network).edges.map((item) => item.id)).toEqual(["ad"]);
    const disrupted = path(network, { ...base, disruption: true });
    expect(disrupted.edges.map((item) => item.id)).toEqual(["ab", "bd"]);
    expect(disrupted.cost).toBe(4);
    expect(evaluateNetworkEdges(network, { ...base, disruption: true })).toEqual(evaluateNetworkEdges(network, base));
    const result = optimizeNetwork(graph([edge("ad", "A", "D", 100, "ocean", { usesSuezCanal: true })]), { ...base, disruption: true });
    expect(result).toEqual({ status: "unreachable", excludedEdges: 1 });
  });
  it("adds customs, handling and fixed costs once per edge with correct weight and carbon units", () => {
    const network = graph([edge("ad", "A", "D", 650, "ocean", { handlingDays: 2, customsDays: 3, fixedCost: 50 })]);
    const result = path(network, { ...base, weightT: 20, urgency: "high", carbonPricePerTonne: 300, objective: "tradeoff" });
    expect(result.cost).toBe(310);
    expect(result.co2).toBe(130);
    expect(result.days).toBe(6);
    expect(result.carbonCost).toBe(39);
    expect(result.timePenalty).toBe(30000);
    expect(result.generalizedCost).toBe(30349);
    expect(result.objectiveValue).toBe(30349);
    const light = path(network, { ...base, weightT: 10 });
    expect(light.cost).toBe(180);
    expect(light.co2).toBe(65);
    expect(light.days).toBe(result.days);
  });
  it("carbon price and urgency change valuation but not physical edge calculations", () => {
    const a = evaluateNetworkEdges(alternatives, { ...base, objective: "tradeoff", carbonPricePerTonne: 0 });
    const b = evaluateNetworkEdges(alternatives, { ...base, objective: "tradeoff", carbonPricePerTonne: 300, urgency: "critical" });
    for (let i = 0; i < a.length; i++) {
      const low = a[i]; const high = b[i];
      if (!low || !high) throw new Error("Missing edge");
      expect([high.cost, high.co2, high.days]).toEqual([low.cost, low.co2, low.days]);
      expect(high.carbonCost).toBeCloseTo(high.co2 * 0.3, 10);
      expect(high.timePenalty).toBe(high.days * 1000);
    }
  });
  it("exact ties use node order and retain the first parallel edge in edge order", () => {
    const network = graph([edge("ac", "A", "C", 100), edge("ab-first", "A", "B", 100), edge("ab-second", "A", "B", 100), edge("cd", "C", "D", 100), edge("bd", "B", "D", 100)]);
    for (let i = 0; i < 5; i++) expect(path(network).edges.map((item) => item.id)).toEqual(["ab-first", "bd"]);
  });
  it("handles zero-weight cycles and identical origin/destination without a repeated path", () => {
    const network = graph([edge("ab", "A", "B", 0), edge("ba", "B", "A", 0), edge("bd", "B", "D", 1)]);
    expect(path(network).nodes.map((node) => node.id)).toEqual(["A", "B", "D"]);
    const trivial = path(network, { ...base, destination: "A" });
    expect(trivial.nodes.map((node) => node.id)).toEqual(["A"]);
    expect(trivial.edges).toEqual([]);
    expect(trivial.generalizedCost).toBe(0);
  });
  it.each([-1, Infinity, NaN])("rejects invalid edge distance %s", (distanceKm) => {
    expect(() => optimizeNetwork(graph([edge("ad", "A", "D", distanceKm)]), base)).toThrow();
  });
  it("rejects invalid inputs, endpoints and overflow", () => {
    expect(() => optimizeNetwork(alternatives, { ...base, weightT: 0 })).toThrow();
    expect(() => optimizeNetwork(alternatives, { ...base, carbonPricePerTonne: -100 })).toThrow();
    expect(() => optimizeNetwork(graph([edge("ax", "A", "X", 100)]), base)).toThrow();
    expect(() => optimizeNetwork(alternatives, { ...base, weightT: Number.MAX_VALUE })).toThrow();
  });
  it("all supported inputs produce finite nonnegative weights and valid additive paths", () => {
    for (const origin of ["Shanghai", "Shenzhen"]) for (const destination of ["Istanbul", "Izmir"])
      for (const urgency of Object.keys(URGENCY) as Urgency[]) for (const weightT of [1, 20, 100])
        for (const carbonPricePerTonne of [0, 100, 300]) for (const disruption of [false, true])
          for (const objective of ["cost", "time", "tradeoff"] as const) {
            const input = { origin, destination, urgency, weightT, carbonPricePerTonne, disruption, objective };
            for (const item of evaluateNetworkEdges(TRANSPORT_NETWORK, input)) {
              expect(Number.isFinite(item.weight)).toBe(true);
              expect(item.weight).toBeGreaterThanOrEqual(0);
            }
            const result = path(TRANSPORT_NETWORK, input);
            expect(result.nodes[0]?.id).toBe(origin);
            expect(result.nodes.at(-1)?.id).toBe(destination);
            expect(result.objectiveValue).toBeCloseTo(result.edges.reduce((sum, item) => sum + item.weight, 0), 8);
            expect(result.generalizedCost).toBeCloseTo(result.cost + result.carbonCost + result.timePenalty, 7);
            result.edges.forEach((item, index) => {
              expect(item.from).toBe(result.nodes[index]?.id);
              expect(item.to).toBe(result.nodes[index + 1]?.id);
              expect(TRANSPORT_NETWORK.edges.some((original) => original.id === item.id)).toBe(true);
              if (disruption) expect(item.usesSuezCanal).toBe(false);
            });
          }
  });
  it("keeps Phase 1/2 reference results unchanged after network optimization", () => {
    const input = { origin: "Shanghai", destination: "Istanbul", weightT: 20, urgency: "low", disruption: false } as const;
    const before = computeRoutes(input);
    optimizeNetwork(TRANSPORT_NETWORK, { ...input, objective: "tradeoff" });
    expect(computeRoutes({ ...input, carbonPricePerTonne: 100 })).toEqual(before);
    expect(before.map((item) => item.cost)).toEqual([8620, 177020, 14944]);
    expect(before.map((item) => item.co2)).toEqual([3740, 96090, 4928]);
    expect(recommend(before).id).toBe("ocean-truck");
  });
});