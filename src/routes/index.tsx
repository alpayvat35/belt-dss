import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState, useEffect } from "react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  ORIGINS, DESTINATIONS, URGENCY, MODES, CARBON_PRICE, computeRoutes, recommend,
  type Origin, type Destination, type Urgency,
} from "@/lib/routing";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Global Supply Chain & Eco-Routing Dashboard" },
      { name: "description", content: "Intermodal route optimizer comparing cost, CO2 and lead time with a disruption simulator." },
      { property: "og:title", content: "Global Supply Chain & Eco-Routing Dashboard" },
      { property: "og:description", content: "Intermodal route optimizer comparing cost, CO2 and lead time with a disruption simulator." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];
const usd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const num = (n: number) => Math.round(n).toLocaleString("en-US");

function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border border-border bg-card/80 p-5 backdrop-blur", className)}>
      <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Dashboard() {
  const [origin, setOrigin] = useState<Origin>("Shanghai");
  const [destination, setDestination] = useState<Destination>("Istanbul");
  const [weightT, setWeight] = useState(20);
  const [urgency, setUrgency] = useState<Urgency>("low");
  const [disruption, setDisruption] = useState(false);

  const routes = useMemo(
    () => computeRoutes({ origin, destination, weightT, urgency, disruption }),
    [origin, destination, weightT, urgency, disruption],
  );
  const best = recommend(routes);
  const baseline = recommend(computeRoutes({ origin, destination, weightT, urgency, disruption: false }));
  const rerouted = disruption && baseline.id !== best.id;

  const prev = useRef(best.id);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (prev.current !== best.id) { setFlash(true); const t = setTimeout(() => setFlash(false), 900); prev.current = best.id; return () => clearTimeout(t); }
  }, [best.id]);

  const radar = [
    { axis: "Cost Efficiency", key: "cost" as const },
    { axis: "Speed", key: "speed" as const },
    { axis: "Eco-Friendliness", key: "eco" as const },
  ].map((a) => Object.fromEntries([["axis", a.axis], ...routes.map((r) => [r.name, r.scores[a.key]])]));

  return (
    <div className="min-h-screen grid-bg bg-background font-sans text-foreground">
      <header className="border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-primary">IE · Network Optimization</p>
            <h1 className="text-xl font-bold md:text-2xl">Global Supply Chain & Eco-Routing</h1>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className={cn("h-2 w-2 animate-pulse rounded-full", disruption ? "bg-destructive" : "bg-accent")} />
            {disruption ? "DISRUPTION ACTIVE" : "NETWORK NOMINAL"}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-6 py-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-5">
          <Panel title="Shipment Parameters">
            <div className="space-y-5">
              <Field label="Origin">
                <Select value={origin} onValueChange={(v) => setOrigin(v as Origin)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ORIGINS.map((o) => <SelectItem key={o} value={o}>{o}, CN</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Destination">
                <Select value={destination} onValueChange={(v) => setDestination(v as Destination)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DESTINATIONS.map((d) => <SelectItem key={d} value={d}>{d}, TR</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label={`Cargo Weight — ${weightT} t`}>
                <Slider min={1} max={100} step={1} value={[weightT]} onValueChange={([v]) => setWeight(v)} />
                <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground"><span>1 t</span><span>100 t</span></div>
              </Field>
              <Field label="Urgency Level">
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(URGENCY) as Urgency[]).map((u) => (
                    <button key={u} onClick={() => setUrgency(u)}
                      className={cn("rounded-md border px-3 py-2 text-left text-sm transition",
                        urgency === u ? "border-primary bg-primary/10 text-primary shadow-glow" : "border-border hover:border-primary/50")}>
                      <div className="font-semibold">{URGENCY[u].label}</div>
                      <div className="text-[10px] text-muted-foreground">{URGENCY[u].note}</div>
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </Panel>

          <Panel title="Disruption Simulator" className={cn(disruption && "border-destructive/60")}>
            <label className="flex cursor-pointer items-start justify-between gap-3">
              <span className="text-sm">Simulate Supply Chain Disruption <span className="text-muted-foreground">(e.g., Canal Blockage)</span></span>
              <Switch checked={disruption} onCheckedChange={setDisruption} />
            </label>
            <p className="mt-3 font-mono text-[11px] text-muted-foreground">Ocean legs: lead time +40%, cost +20%</p>
          </Panel>
        </div>

        <div className="space-y-5">
          <section className={cn("relative overflow-hidden rounded-lg border border-primary bg-card p-6 shadow-glow transition", flash && "scale-[1.01]")}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">System Recommendation</p>
                <h2 className="mt-1 text-3xl font-bold">{best.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {origin} → {destination} · {URGENCY[urgency].label} urgency · lowest generalized cost {usd(best.generalizedCost)}
                </p>
                {rerouted && (
                  <p className="mt-3 inline-block rounded border border-warning/50 bg-warning/10 px-2 py-1 font-mono text-xs text-warning">
                    ⚠ Rerouted from {baseline.name} due to disruption
                  </p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4 text-right">
                <Kpi label="Cost" value={usd(best.cost)} />
                <Kpi label="CO₂" value={`${num(best.co2)} kg`} />
                <Kpi label="Lead time" value={`${best.days.toFixed(1)} d`} />
              </div>
            </div>
            <p className="mt-4 border-t border-border pt-3 font-mono text-[10px] text-muted-foreground">
              Score = freight cost + lead time × ${URGENCY[urgency].delayPerTonDay}/t/day delay penalty + CO₂ × ${CARBON_PRICE}/kg shadow carbon price
            </p>
          </section>

          <div className="grid gap-4 md:grid-cols-3">
            {routes.map((r, i) => (
              <div key={r.id} className={cn("rounded-lg border bg-card/80 p-4", r.id === best.id ? "border-primary" : "border-border")}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{r.name}</h3>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i] }} />
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.legs.map((l, j) => (
                    <span key={j} className={cn("rounded px-1.5 py-0.5 font-mono text-[10px]",
                      l.disrupted ? "bg-destructive/20 text-destructive" : "bg-secondary text-muted-foreground")}>
                      {MODES[l.mode].label} {num(l.km)}km
                    </span>
                  ))}
                </div>
                <dl className="mt-3 space-y-1.5 font-mono text-sm">
                  <Row k="Total Cost" v={usd(r.cost)} />
                  <Row k="CO₂ Emissions" v={`${num(r.co2)} kg`} />
                  <Row k="Lead Time" v={`${r.days.toFixed(1)} days`} />
                  <Row k="Gen. Cost" v={usd(r.generalizedCost)} muted />
                </dl>
              </div>
            ))}
          </div>

          <Panel title="Multi-Criteria Comparison (index, best = 100)">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radar} outerRadius="75%">
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="axis" tick={{ fill: "var(--foreground)", fontSize: 12 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
                  {routes.map((r, i) => (
                    <Radar key={r.id} name={r.name} dataKey={r.name} stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.15} strokeWidth={2} />
                  ))}
                  <Legend />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="mb-2 text-xs font-medium text-muted-foreground">{label}</div>{children}</div>;
}
function Kpi({ label, value }: { label: string; value: string }) {
  return <div><div className="font-mono text-[10px] uppercase text-muted-foreground">{label}</div><div className="font-mono text-lg font-semibold text-primary">{value}</div></div>;
}
function Row({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return <div className={cn("flex justify-between", muted && "text-muted-foreground")}><dt className="text-xs text-muted-foreground">{k}</dt><dd>{v}</dd></div>;
}
