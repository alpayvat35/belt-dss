import { MODES, URGENCY, CARBON_PRICE_SENSITIVITY, type Mode, type Urgency } from "./model-assumptions";

export type NetworkObjective = "cost" | "time" | "tradeoff";
export interface NetworkNode { id: string; coordinates: [number, number] }
/** All distances, fixed charges, and delays in the educational graph are illustrative. */
export interface NetworkEdge {
  id: string; from: string; to: string; mode: Mode; distanceKm: number;
  fixedCost: number; handlingDays: number; customsDays: number; usesSuezCanal: boolean;
  /** Schematic display only; never used to calculate distance or weights. */
  waypoints?: [number, number][];
}
export interface TransportationNetwork { nodes: NetworkNode[]; edges: NetworkEdge[] }
export interface NetworkInputs {
  origin: string; destination: string; weightT: number; urgency: Urgency;
  carbonPricePerTonne?: number; disruption: boolean; objective: NetworkObjective;
}
export interface EvaluatedNetworkEdge extends NetworkEdge {
  cost: number; co2: number; transitDays: number; days: number;
  carbonCost: number; timePenalty: number; generalizedCost: number; weight: number;
}
export interface NetworkPath {
  nodes: NetworkNode[]; edges: EvaluatedNetworkEdge[]; modes: Mode[];
  distanceKm: number; cost: number; co2: number; days: number;
  carbonCost: number; timePenalty: number; generalizedCost: number; objectiveValue: number;
}
export type NetworkResult =
  | { status: "ok"; path: NetworkPath; excludedEdges: number }
  | { status: "unsupported"; missingNodes: string[] }
  | { status: "unreachable"; excludedEdges: number };

function nonnegative(value: number, name: string) {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} must be finite and non-negative.`);
}

/** Freight USD; emissions kg CO₂; time days; objective USD (or days for time). */
export function evaluateNetworkEdges(network: TransportationNetwork, input: NetworkInputs): EvaluatedNetworkEdge[] {
  nonnegative(input.weightT, "Cargo weight");
  if (input.weightT === 0) throw new RangeError("Cargo weight must be positive.");
  const price = input.carbonPricePerTonne ?? CARBON_PRICE_SENSITIVITY.default;
  nonnegative(price, "Carbon price");
  if (!(input.urgency in URGENCY) || !["cost", "time", "tradeoff"].includes(input.objective)) throw new RangeError("Unsupported decision criterion.");
  const ids = new Set(network.nodes.map((node) => node.id));
  if (ids.size !== network.nodes.length) throw new Error("Network node IDs must be unique.");
  const edgeIds = new Set<string>();
  return network.edges.map((edge) => {
    if (!ids.has(edge.from) || !ids.has(edge.to)) throw new Error("Edge endpoint is missing from the graph.");
    if (edgeIds.has(edge.id)) throw new Error("Network edge IDs must be unique.");
    edgeIds.add(edge.id);
    for (const field of ["distanceKm", "fixedCost", "handlingDays", "customsDays"] as const) nonnegative(edge[field], field);
    const mode = MODES[edge.mode];
    if (!mode) throw new Error("Unsupported transport mode.");
    const cost = edge.fixedCost + input.weightT * edge.distanceKm * mode.cost;
    const co2 = input.weightT * edge.distanceKm * mode.co2g / 1000;
    const transitDays = edge.distanceKm / mode.kmPerDay;
    const days = transitDays + edge.handlingDays + edge.customsDays;
    const carbonCost = co2 * price / 1000;
    const timePenalty = days * input.weightT * URGENCY[input.urgency].delayPerTonDay;
    const generalizedCost = cost + carbonCost + timePenalty;
    const weight = input.objective === "cost" ? cost : input.objective === "time" ? days : generalizedCost;
    for (const value of [cost, co2, transitDays, days, carbonCost, timePenalty, generalizedCost, weight]) nonnegative(value, "Calculated edge value");
    return { ...edge, cost, co2, transitDays, days, carbonCost, timePenalty, generalizedCost, weight };
  });
}

/**
 * Genuine O(V² + VE) Dijkstra, intentionally readable for this small network.
 * Exact ties: first node in graph order is settled first; equal relaxations retain
 * the first predecessor encountered in edge order. No complete paths are enumerated.
 */
export function optimizeNetwork(network: TransportationNetwork, input: NetworkInputs): NetworkResult {
  const evaluated = evaluateNetworkEdges(network, input);
  const missingNodes = [...new Set([input.origin, input.destination])].filter((id) => !network.nodes.some((node) => node.id === id));
  if (missingNodes.length) return { status: "unsupported", missingNodes };
  const edges = evaluated.filter((edge) => !(input.disruption && edge.usesSuezCanal));
  const excludedEdges = evaluated.length - edges.length;
  const distances = new Map(network.nodes.map((node) => [node.id, Infinity]));
  const previous = new Map<string, EvaluatedNetworkEdge>();
  const settled = new Set<string>();
  distances.set(input.origin, 0);
  while (settled.size < network.nodes.length) {
    let current: string | undefined;
    let smallest = Infinity;
    for (const node of network.nodes) {
      const value = distances.get(node.id) ?? Infinity;
      if (!settled.has(node.id) && value < smallest) { current = node.id; smallest = value; }
    }
    if (current === undefined) break;
    settled.add(current);
    if (current === input.destination) break;
    for (const edge of edges) {
      if (edge.from !== current || settled.has(edge.to)) continue;
      const candidate = smallest + edge.weight;
      nonnegative(candidate, "Cumulative path weight");
      if (candidate < (distances.get(edge.to) ?? Infinity)) {
        distances.set(edge.to, candidate);
        previous.set(edge.to, edge);
      }
    }
  }
  if (!settled.has(input.destination)) return { status: "unreachable", excludedEdges };
  const selected: EvaluatedNetworkEdge[] = [];
  let cursor = input.destination;
  while (cursor !== input.origin) {
    const edge = previous.get(cursor);
    if (!edge) return { status: "unreachable", excludedEdges };
    selected.unshift(edge);
    cursor = edge.from;
  }
  const nodeIds = [input.origin, ...selected.map((edge) => edge.to)];
  const nodes = nodeIds.map((id) => {
    const node = network.nodes.find((item) => item.id === id);
    if (!node) throw new Error("Path node is missing.");
    return node;
  });
  const sum = (field: "distanceKm" | "cost" | "co2" | "days" | "carbonCost" | "timePenalty" | "generalizedCost" | "weight") => selected.reduce((total, edge) => total + edge[field], 0);
  return { status: "ok", excludedEdges, path: { nodes, edges: selected, modes: selected.map((edge) => edge.mode),
    distanceKm: sum("distanceKm"), cost: sum("cost"), co2: sum("co2"), days: sum("days"),
    carbonCost: sum("carbonCost"), timePenalty: sum("timePenalty"), generalizedCost: sum("generalizedCost"), objectiveValue: sum("weight") } };
}