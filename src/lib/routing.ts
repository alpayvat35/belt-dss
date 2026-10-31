export const ORIGINS = ["Shanghai", "Shenzhen", "Ningbo", "Qingdao"] as const;
export const DESTINATIONS = ["Istanbul", "Izmir", "Mersin", "Ankara"] as const;
export type Origin = (typeof ORIGINS)[number];
export type Destination = (typeof DESTINATIONS)[number];
export type Urgency = "low" | "medium" | "high" | "critical";
export type Mode = "ocean" | "rail" | "truck" | "air";

export const URGENCY: Record<Urgency, { label: string; delayPerTonDay: number; note: string }> = {
  low: { label: "Low", delayPerTonDay: 15, note: "Cost & carbon first" },
  medium: { label: "Medium", delayPerTonDay: 60, note: "Balanced trade-off" },
  high: { label: "High", delayPerTonDay: 250, note: "Lead time weighted" },
  critical: { label: "Critical", delayPerTonDay: 1000, note: "Line-down risk" },
};

// Per tonne-km parameters (indicative industry averages)
export const MODES: Record<Mode, { cost: number; co2g: number; kmPerDay: number; label: string }> = {
  ocean: { cost: 0.02, co2g: 10, kmPerDay: 650, label: "Ocean" },
  rail: { cost: 0.06, co2g: 22, kmPerDay: 900, label: "Rail" },
  truck: { cost: 0.12, co2g: 90, kmPerDay: 700, label: "Truck" },
  air: { cost: 1.1, co2g: 600, kmPerDay: 9000, label: "Air" },
};

export const CARBON_PRICE = 0.1; // $ per kg CO2 (shadow price, $100/t)

const ORIGIN_OFFSET: Record<Origin, number> = { Shanghai: 0, Shenzhen: 900, Ningbo: 150, Qingdao: 700 };
const DEST: Record<Destination, { sea: number; truck: number; air: number; rail: number }> = {
  Istanbul: { sea: 16000, truck: 60, air: 8000, rail: 10500 },
  Izmir: { sea: 15600, truck: 80, air: 8400, rail: 11000 },
  Mersin: { sea: 14900, truck: 70, air: 7600, rail: 10800 },
  Ankara: { sea: 16000, truck: 450, air: 7300, rail: 10200 },
};

interface Leg { mode: Mode; km: number }
interface Template { id: string; name: string; legs: Leg[]; handlingDays: number; customsDays: number; fixed: number }

function templates(o: Origin, d: Destination): Template[] {
  const off = ORIGIN_OFFSET[o];
  const t = DEST[d];
  return [
    { id: "ocean-truck", name: "Ocean + Truck", handlingDays: 4, customsDays: 5, fixed: 1500,
      legs: [{ mode: "ocean", km: t.sea - off * 0.6 }, { mode: "truck", km: t.truck + 240 }] },
    { id: "air", name: "Direct Air", handlingDays: 2, customsDays: 1, fixed: 900,
      legs: [{ mode: "air", km: t.air + off * 0.3 }, { mode: "truck", km: 50 }] },
    { id: "rail-ocean", name: "Rail + Ocean", handlingDays: 5, customsDays: 3, fixed: 1800,
      legs: [{ mode: "rail", km: t.rail + off * 0.8 }, { mode: "ocean", km: 1000 }, { mode: "truck", km: t.truck }] },
  ];
}

export interface RouteResult {
  id: string; name: string;
  legs: (Leg & { days: number; cost: number; co2: number; disrupted: boolean })[];
  cost: number; co2: number; days: number; customsDays: number;
  generalizedCost: number;
  scores: { cost: number; speed: number; eco: number };
}

export interface Inputs { origin: Origin; destination: Destination; weightT: number; urgency: Urgency; disruption: boolean }

export function computeRoutes(inp: Inputs): RouteResult[] {
  const raw = templates(inp.origin, inp.destination).map((tpl) => {
    const legs = tpl.legs.map((l) => {
      const m = MODES[l.mode];
      const disrupted = inp.disruption && l.mode === "ocean";
      const days = (l.km / m.kmPerDay) * (disrupted ? 1.4 : 1);
      const cost = inp.weightT * l.km * m.cost * (disrupted ? 1.2 : 1);
      const co2 = (inp.weightT * l.km * m.co2g) / 1000;
      return { ...l, days, cost, co2, disrupted };
    });
    const cost = tpl.fixed + legs.reduce((s, l) => s + l.cost, 0);
    const days = tpl.handlingDays + tpl.customsDays + legs.reduce((s, l) => s + l.days, 0);
    const co2 = legs.reduce((s, l) => s + l.co2, 0);
    const generalizedCost =
      cost + days * URGENCY[inp.urgency].delayPerTonDay * inp.weightT + co2 * CARBON_PRICE;
    return { id: tpl.id, name: tpl.name, legs, cost, days, customsDays: tpl.customsDays, co2, generalizedCost };
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
