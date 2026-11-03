/** BELT-DSS Phase 1: no coefficients below have documented external evidence. */
export type SourceStatus = "Illustrative assumption" | "Model-derived calculation" | "Verified external source";
export interface Assumption {
  parameter: string;
  value: number;
  unit: string;
  sourceStatus: SourceStatus;
  explanation: string;
}
export const ORIGINS = ["Shanghai", "Shenzhen", "Ningbo", "Qingdao"] as const;
export const DESTINATIONS = ["Istanbul", "Izmir", "Mersin", "Ankara"] as const;
export type Origin = (typeof ORIGINS)[number];
export type Destination = (typeof DESTINATIONS)[number];
export type Urgency = "low" | "medium" | "high" | "critical";
export type Mode = "ocean" | "rail" | "truck" | "air";

/** cost: USD/tonne-km; co2g: g CO₂/tonne-km; kmPerDay: km/day. */
export const MODES: Record<Mode, { cost: number; co2g: number; kmPerDay: number; label: string }> = {
  ocean: { cost: 0.02, co2g: 10, kmPerDay: 650, label: "Ocean" },
  rail: { cost: 0.06, co2g: 22, kmPerDay: 900, label: "Rail" },
  truck: { cost: 0.12, co2g: 90, kmPerDay: 700, label: "Truck" },
  air: { cost: 1.1, co2g: 600, kmPerDay: 9000, label: "Air" },
};
/** delayPerTonDay: USD/tonne/day, illustrative economic costs of time. */
export const URGENCY: Record<Urgency, { label: string; delayPerTonDay: number; note: string }> = {
  low: { label: "Low", delayPerTonDay: 15, note: "Cost & carbon first" },
  medium: { label: "Medium", delayPerTonDay: 60, note: "Balanced trade-off" },
  high: { label: "High", delayPerTonDay: 250, note: "Lead time weighted" },
  critical: { label: "Critical", delayPerTonDay: 1000, note: "Line-down risk" },
};
export const SHADOW_CARBON_PRICE = 0.1; // USD/kg CO₂, equivalent to USD 100/tonne CO₂.
export const ORIGIN_OFFSET_KM: Record<Origin, number> = { Shanghai: 0, Shenzhen: 900, Ningbo: 150, Qingdao: 700 };
/** Illustrative base distances in km, not measured network paths. */
export const DESTINATION_DISTANCES_KM: Record<Destination, { sea: number; truck: number; air: number; rail: number }> = {
  Istanbul: { sea: 16000, truck: 60, air: 8000, rail: 10500 },
  Izmir: { sea: 15600, truck: 80, air: 8400, rail: 11000 },
  Mersin: { sea: 14900, truck: 70, air: 7600, rail: 10800 },
  Ankara: { sea: 16000, truck: 450, air: 7300, rail: 10200 },
};
export const DISTANCE_RULES = {
  oceanOffsetMultiplier: 0.6, railOffsetMultiplier: 0.8, airOffsetMultiplier: 0.3,
  oceanTruckAdditionalKm: 240, airTruckKm: 50, railOceanKm: 1000,
} as const;
export type RouteId = "ocean-truck" | "air" | "rail-ocean";
/** handling/customs: days; fixed: USD per shipment, separate from variable freight. */
export const ROUTE_ASSUMPTIONS: Record<RouteId, { name: string; handlingDays: number; customsDays: number; fixed: number }> = {
  "ocean-truck": { name: "Ocean + Truck", handlingDays: 4, customsDays: 5, fixed: 1500 },
  air: { name: "Direct Air", handlingDays: 2, customsDays: 1, fixed: 900 },
  "rail-ocean": { name: "Rail + Ocean", handlingDays: 5, customsDays: 3, fixed: 1800 },
};
/** Phase 1 intentionally applies penalties to all ocean legs, not identified Suez edges. */
export const DISRUPTION_ASSUMPTION = {
  scope: "all-ocean-legs" as const, timeMultiplier: 1.4, costMultiplier: 1.2, emissionsMultiplier: 1,
};
export const MODEL_DISCLAIMER = "Results are model-based estimates using illustrative transport parameters. They are intended for educational scenario analysis and do not represent live freight quotations.";
export const DISRUPTION_LIMITATION = "Illustrative scenario: every ocean leg receives +40% transit time and +20% variable freight cost; emissions remain unchanged. Suez-dependent segments and actual diversion distances are not identified. Not every ocean leg necessarily passes through Suez; a longer diversion could change emissions.";

const assumption = (parameter: string, value: number, unit: string, explanation: string): Assumption => ({ parameter, value, unit, sourceStatus: "Illustrative assumption", explanation });
export interface AssumptionGroup { title: string; rows: Assumption[] }
/** Generated from the same coefficients the calculator uses, avoiding duplicate UI values. */
export const ASSUMPTION_GROUPS: AssumptionGroup[] = [
  { title: "Transport coefficients", rows: Object.values(MODES).flatMap((m) => [
    assumption(`${m.label} cost factor`, m.cost, "$/tonne-km", "Constant variable freight rate; not a carrier quotation."),
    assumption(`${m.label} emission factor`, m.co2g, "g CO₂/tonne-km", "Constant transport emission intensity; not a complete lifecycle inventory."),
    assumption(`${m.label} average speed`, m.kmPerDay, "km/day", "Effective transit speed; handling and customs added separately."),
  ]) },
  { title: "Origin distance adjustments", rows: Object.entries(ORIGIN_OFFSET_KM).map(([city, value]) => assumption(`${city} offset`, value, "km", "Offset scaled by mode-specific multipliers, not a measured path.")) },
  { title: "Destination base distances", rows: Object.entries(DESTINATION_DISTANCES_KM).flatMap(([city, modes]) => Object.entries(modes).map(([mode, value]) => assumption(`${city} · ${mode}`, value, "km", "Predefined base distance; map waypoints do not determine this value."))) },
  { title: "Distance construction", rows: [
    assumption("Ocean origin-offset multiplier", DISTANCE_RULES.oceanOffsetMultiplier, "dimensionless", "Ocean km = destination sea km − origin offset × multiplier."),
    assumption("Rail origin-offset multiplier", DISTANCE_RULES.railOffsetMultiplier, "dimensionless", "Rail km = destination rail km + origin offset × multiplier."),
    assumption("Air origin-offset multiplier", DISTANCE_RULES.airOffsetMultiplier, "dimensionless", "Air km = destination air km + origin offset × multiplier."),
    assumption("Ocean + Truck additional road distance", DISTANCE_RULES.oceanTruckAdditionalKm, "km", "Added to destination truck distance."),
    assumption("Direct Air road leg", DISTANCE_RULES.airTruckKm, "km", "Fixed last-mile road distance."),
    assumption("Rail + Ocean sea leg", DISTANCE_RULES.railOceanKm, "km", "Fixed illustrative sea distance; Suez dependence is unspecified."),
  ] },
  { title: "Route-level additions", rows: Object.values(ROUTE_ASSUMPTIONS).flatMap((r) => [
    assumption(`${r.name} handling`, r.handlingDays, "days", "Added once per shipment, independently of cargo weight."),
    assumption(`${r.name} customs`, r.customsDays, "days", "Fixed illustrative customs delay, added once per shipment."),
    assumption(`${r.name} fixed cost`, r.fixed, "$/shipment", "Added once to variable leg costs."),
  ]) },
  { title: "Decision weights", rows: [
    assumption("Shadow carbon price", SHADOW_CARBON_PRICE, "$/kg CO₂", "Model valuation of emissions, not an actual government tax."),
    ...Object.values(URGENCY).map((u) => assumption(`${u.label} urgency penalty`, u.delayPerTonDay, "$/tonne/day", "Illustrative economic cost of time, not a universally accepted freight industry standard.")),
  ] },
  { title: "Disruption scenario", rows: [
    assumption("Ocean transit-time multiplier", DISRUPTION_ASSUMPTION.timeMultiplier, "dimensionless", "Applied to every ocean leg in Phase 1; no diversion path is calculated."),
    assumption("Ocean variable-cost multiplier", DISRUPTION_ASSUMPTION.costMultiplier, "dimensionless", "Does not multiply handling, customs, fixed costs, or non-ocean costs."),
    assumption("Ocean emissions multiplier", DISRUPTION_ASSUMPTION.emissionsMultiplier, "dimensionless", "Emissions stay unchanged despite possible real-world diversion effects."),
  ] },
];