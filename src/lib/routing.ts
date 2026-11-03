import {
  MODES, URGENCY, SHADOW_CARBON_PRICE, ORIGIN_OFFSET_KM, DESTINATION_DISTANCES_KM,
  DISTANCE_RULES, ROUTE_ASSUMPTIONS, DISRUPTION_ASSUMPTION,
  type Origin, type Destination, type Urgency, type Mode, type RouteId,
} from "./model-assumptions";
export { ORIGINS, DESTINATIONS, MODES, URGENCY, SHADOW_CARBON_PRICE, type Origin, type Destination, type Urgency, type Mode } from "./model-assumptions";
/** Backward-compatible alias; this parameter is a shadow price, not a tax. */
export const CARBON_PRICE = SHADOW_CARBON_PRICE;

interface Leg {
  mode: Mode;
  km: number;
  /** Unspecified in Phase 1; future network data may identify individual Suez edges. */
  suezDependency: "unspecified" | "dependent" | "independent";
}
interface Template { id: RouteId; name: string; legs: Leg[]; handlingDays: number; customsDays: number; fixed: number }
const leg = (mode: Mode, km: number): Leg => ({ mode, km, suezDependency: "unspecified" });

/** Phase 1 scope deliberately ignores Suez dependency; preserves legacy behavior. */
function isDisrupted(l: Leg, enabled: boolean): boolean {
  return enabled && DISRUPTION_ASSUMPTION.scope === "all-ocean-legs" && l.mode === "ocean";
}

function templates(o: Origin, d: Destination): Template[] {
  const off = ORIGIN_OFFSET_KM[o];
  const t = DESTINATION_DISTANCES_KM[d];
  const rule = DISTANCE_RULES;
  return [
    { id: "ocean-truck", ...ROUTE_ASSUMPTIONS["ocean-truck"],
      legs: [leg("ocean", t.sea - off * rule.oceanOffsetMultiplier), leg("truck", t.truck + rule.oceanTruckAdditionalKm)] },
    { id: "air", ...ROUTE_ASSUMPTIONS.air,
      legs: [leg("air", t.air + off * rule.airOffsetMultiplier), leg("truck", rule.airTruckKm)] },
    { id: "rail-ocean", ...ROUTE_ASSUMPTIONS["rail-ocean"],
      legs: [leg("rail", t.rail + off * rule.railOffsetMultiplier), leg("ocean", rule.railOceanKm), leg("truck", t.truck)] },
  ];
}

export interface RouteResult {
  id: RouteId; name: string;
  legs: (Leg & { days: number; cost: number; co2: number; disrupted: boolean })[];
  /** cost: USD; co2: kg CO₂; days/customsDays/handlingDays: days. */
  cost: number; co2: number; days: number; customsDays: number; handlingDays: number;
  fixedCost: number; variableCost: number; carbonCost: number; timePenalty: number;
  generalizedCost: number;
  scores: { cost: number; speed: number; eco: number };
}

export interface Inputs { origin: Origin; destination: Destination; weightT: number; urgency: Urgency; disruption: boolean }

export function computeRoutes(inp: Inputs): RouteResult[] {
  const raw = templates(inp.origin, inp.destination).map((tpl) => {
    const legs = tpl.legs.map((l) => {
      const m = MODES[l.mode];
      const disrupted = isDisrupted(l, inp.disruption);
      const days = (l.km / m.kmPerDay) * (disrupted ? DISRUPTION_ASSUMPTION.timeMultiplier : 1);
      const cost = inp.weightT * l.km * m.cost * (disrupted ? DISRUPTION_ASSUMPTION.costMultiplier : 1);
      const co2 = (inp.weightT * l.km * m.co2g) / 1000;
      return { ...l, days, cost, co2, disrupted };
    });
    const variableCost = legs.reduce((s, l) => s + l.cost, 0);
    const cost = tpl.fixed + variableCost;
    const days = tpl.handlingDays + tpl.customsDays + legs.reduce((s, l) => s + l.days, 0);
    const co2 = legs.reduce((s, l) => s + l.co2, 0);
    const timePenalty = days * URGENCY[inp.urgency].delayPerTonDay * inp.weightT;
    const carbonCost = co2 * SHADOW_CARBON_PRICE;
    // Addition order retained to preserve baseline floating-point results.
    const generalizedCost = cost + timePenalty + carbonCost;
    return { id: tpl.id, name: tpl.name, legs, cost, days, customsDays: tpl.customsDays,
      handlingDays: tpl.handlingDays, fixedCost: tpl.fixed, variableCost, carbonCost, timePenalty, co2, generalizedCost };
  });
  const minC = Math.min(...raw.map((r) => r.cost));
  const minD = Math.min(...raw.map((r) => r.days));
  const minE = Math.min(...raw.map((r) => r.co2));
  return raw.map((r) => ({
    ...r,
    scores: {
      cost: Math.round((minC / r.cost) * 100),
      speed: Math.round((minD / r.days) * 100),
      eco: Math.round((minE / r.co2) * 100),
    },
  }));
}

/** Pick the route with the lowest generalized cost (freight + urgency-weighted delay + carbon). */
export function recommend(routes: RouteResult[]): RouteResult {
  return routes.reduce((best, r) => (r.generalizedCost < best.generalizedCost ? r : best));
}

/** Stable ranking matches recommend's first-in-template-order tie policy. */
export function explainRecommendation(routes: RouteResult[]) {
  const ranked = [...routes].sort((a, b) => a.generalizedCost - b.generalizedCost);
  const winner = ranked[0];
  const runnerUp = ranked[1];
  if (!winner || !runnerUp) throw new Error("Recommendation comparison requires at least two routes.");
  return {
    winner, runnerUp, gap: runnerUp.generalizedCost - winner.generalizedCost,
    contributions: {
      freight: runnerUp.cost - winner.cost,
      carbon: runnerUp.carbonCost - winner.carbonCost,
      time: runnerUp.timePenalty - winner.timePenalty,
    },
    fasterDespiteHigherFreight: winner.cost > runnerUp.cost && winner.days < runnerUp.days,
  };
}
