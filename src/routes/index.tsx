import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState, useEffect } from "react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  ORIGINS, DESTINATIONS, URGENCY, MODES, CARBON_PRICE, computeRoutes, recommend,
  type Origin, type Destination, type Urgency,
} from "@/lib/routing";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CorridorMap } from "@/components/corridor-map";
import { Activity, ArrowDownRight, ArrowUpRight, ArrowRight, Check, Clock3, DollarSign, Leaf, Ship, Plane, TrainFront, Truck, AlertTriangle, type LucideIcon } from "lucide-react";

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
    <section className={cn("glass-panel p-5 md:p-6", className)}>
      <h2 className="mb-4 text-xs font-medium text-muted-foreground">{title}</h2>
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
    if (prev.current === best.id) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 900);
    prev.current = best.id;
    return () => clearTimeout(t);
  }, [best.id]);

  const radar = [
    { axis: "Cost Efficiency", key: "cost" as const },
    { axis: "Speed", key: "speed" as const },
    { axis: "Eco-Friendliness", key: "eco" as const },
  ].map((a) => Object.fromEntries([["axis", a.axis], ...routes.map((r) => [r.name, r.scores[a.key]])]));

  const air = routes.find((r) => r.id === "air");
  const costChange = baseline.cost ? (best.cost / baseline.cost - 1) * 100 : 0;
  const dayChange = best.days - baseline.days;
  const carbonSaving = air ? (1 - best.co2 / air.co2) * 100 : 0;
  const barData = routes.map((r) => ({ name: r.name, cost: Math.round(r.cost), disrupted: r.legs.some((l) => l.disrupted) }));

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <div className="border-b border-border bg-secondary/30">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-[11px] sm:px-8">
          <div className="flex items-center gap-2 text-muted-foreground"><span className="relative flex h-2 w-2"><span className="status-pulse absolute inline-flex h-full w-full rounded-full bg-primary/40" /><span className="relative h-2 w-2 rounded-full bg-primary" /></span>Real-time Freight &amp; Carbon Analytics Engine</div>
          <span className="text-muted-foreground">Designed by <span className="text-foreground">Alp Ayvat</span> (Industrial Engineering Portfolio)</span>
        </div>
      </div>
      <header className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-5 px-5 py-7 sm:px-8">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><Activity className="h-3.5 w-3.5 text-primary" /> BELT &amp; ROAD <span className="text-border">/</span> CHINA → TÜRKİYE</div>
          <h1 className="brand-title text-2xl font-bold sm:text-3xl">Global Supply Chain &amp; Eco-Routing</h1>
          <p className="mt-2 text-sm text-muted-foreground">Freight intelligence across the East Asia–Europe corridor</p>
        </div>
        <div className={cn("flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs", disruption ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-primary/20 bg-primary/5 text-primary")}>
          <span className={cn("h-1.5 w-1.5 rounded-full", disruption ? "bg-destructive" : "bg-primary")} />{disruption ? "Disruption active" : "Network nominal"}
        </div>
      </header>
      {disruption && <div role="alert" className="border-y border-destructive/30 bg-destructive/10"><p className="mx-auto flex max-w-[1440px] items-center gap-2 px-5 py-3 text-sm text-destructive sm:px-8"><AlertTriangle className="h-4 w-4 shrink-0" />Alert: Suez Canal blocked. Rerouting algorithms engaged.</p></div>}
      <main className="mx-auto max-w-[1440px] space-y-6 px-5 pb-10 sm:px-8">
        <Panel title="Shipment parameters">
          <div className="grid items-start gap-6 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.1fr_1.5fr]">
            <Field label="Origin"><Select value={origin} onValueChange={(v) => setOrigin(v as Origin)}><SelectTrigger aria-label="Origin" className="h-11 rounded-lg bg-secondary/40"><SelectValue /></SelectTrigger><SelectContent>{ORIGINS.map((o) => <SelectItem key={o} value={o}>{o}, CN</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Destination"><Select value={destination} onValueChange={(v) => setDestination(v as Destination)}><SelectTrigger aria-label="Destination" className="h-11 rounded-lg bg-secondary/40"><SelectValue /></SelectTrigger><SelectContent>{DESTINATIONS.map((d) => <SelectItem key={d} value={d}>{d}, TR</SelectItem>)}</SelectContent></Select></Field>
            <Field label={`Cargo weight · ${weightT} tonnes`}><div className="pt-4"><Slider aria-label="Cargo weight" className="transition-all duration-300 hover:drop-shadow-sm" min={1} max={100} step={1} value={[weightT]} onValueChange={([v]) => setWeight(v ?? 1)} /><div className="mt-3 flex justify-between text-[10px] text-muted-foreground"><span>1 tonne</span><span>100 tonnes</span></div></div></Field>
            <Field label="Urgency level"><div className="grid grid-cols-4 gap-1 rounded-lg border border-border bg-secondary/30 p-1">{(Object.keys(URGENCY) as Urgency[]).map((u) => <Button key={u} variant="ghost" aria-pressed={urgency === u} title={URGENCY[u].note} onClick={() => setUrgency(u)} className={cn("h-9 px-1 text-xs transition-all duration-300 hover:bg-primary/10 hover:text-primary", urgency === u && "bg-primary/15 text-primary")}>{URGENCY[u].label}</Button>)}</div><p className="mt-2 text-[10px] text-muted-foreground">{URGENCY[urgency].note}</p></Field>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <label className="flex cursor-pointer items-center gap-3 text-xs"><Switch aria-label="Simulate Suez Canal Blockage" checked={disruption} onCheckedChange={setDisruption} /><span className={cn(disruption && "text-destructive")}>Simulate Suez Canal Blockage</span></label>
            <span className="text-[11px] text-muted-foreground">Ocean legs only: lead time +40% · cost +20%</span>
          </div>
        </Panel>

        <CorridorMap origin={origin} destination={destination} disruption={disruption} routeId={best.id} routeName={best.name} />

        <div className="grid gap-4 md:grid-cols-3">
          <Stat label="Total estimated cost" value={usd(best.cost)} icon={DollarSign} tone="primary" trend={Math.abs(costChange) < 0.05 ? "Unchanged vs. nominal network" : `${Math.abs(costChange).toFixed(1)}% ${costChange > 0 ? "higher" : "lower"} vs. nominal`} adverse={costChange > 0} />
          <Stat label="Total CO₂ footprint" value={num(best.co2)} unit="kg" icon={Leaf} tone="accent" trend={carbonSaving > 0 ? `${carbonSaving.toFixed(1)}% less than direct air` : "Direct air baseline"} />
          <Stat label="Estimated lead time" value={best.days.toFixed(1)} unit="days" icon={Clock3} tone="chart-2" trend={Math.abs(dayChange) < 0.05 ? "On nominal transit schedule" : `${Math.abs(dayChange).toFixed(1)} days ${dayChange > 0 ? "longer" : "faster"} vs. nominal`} adverse={dayChange > 0} />
        </div>

        <section className={cn("recommendation-panel rounded-2xl border border-primary/60 p-5 transition-all duration-300 md:p-7", flash && "recommendation-flash")}>
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary"><Leaf className="h-6 w-6" /></div><div><p className="mb-1 text-xs font-medium text-primary">System recommendation</p><h2 className="text-2xl font-bold">{best.name}</h2></div></div>
            <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs text-primary"><Check className="h-3.5 w-3.5" />Optimal trade-off</div>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm"><div className="flex items-center gap-3"><span>{origin}</span><ArrowRight className="h-4 w-4 text-primary" /><span>{destination}</span><span className="border-l border-border pl-3 text-muted-foreground">{URGENCY[urgency].label} urgency</span></div><div className="text-muted-foreground">Generalized cost <span className="ml-2 font-mono font-semibold text-foreground">{usd(best.generalizedCost)}</span></div></div>
          {rerouted && <p className="mt-4 flex items-center gap-2 text-xs text-warning"><AlertTriangle className="h-4 w-4" />Rerouted from {baseline.name} due to disruption</p>}
          <p className="mt-5 border-t border-primary/15 pt-4 text-[11px] leading-relaxed text-muted-foreground">Algorithm optimizes based on Total Cost + (Carbon Emissions × Carbon Tax) + (Lead Time × Urgency Penalty)<span className="mt-1 block text-[10px]">Carbon tax ${CARBON_PRICE}/kg · urgency penalty ${URGENCY[urgency].delayPerTonDay}/t/day</span></p>
        </section>

        <div><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Route comparison</h2><span className="text-xs text-muted-foreground">3 intermodal options</span></div><div className="grid gap-4 lg:grid-cols-3">{routes.map((r, i) => {
          const Icon = r.id === "air" ? Plane : r.id === "rail-ocean" ? TrainFront : Ship;
          return <article key={r.id} className={cn("glass-panel p-5 transition-all duration-300 hover:border-primary/50", r.id === best.id && "border-primary/35")}>
            <div className="flex items-center justify-between"><div className="flex items-center gap-2.5"><Icon className={cn("h-4 w-4", i === 0 ? "text-chart-1" : i === 1 ? "text-chart-2" : "text-chart-3")} /><h3 className="text-sm font-semibold">{r.name}</h3></div>{r.id === best.id && <Check aria-label="Recommended" className="h-4 w-4 text-primary" />}</div>
            <div className="mt-4 flex flex-wrap gap-1.5">{r.legs.map((l, j) => <span key={j} className={cn("flex items-center gap-1 rounded-md border px-2 py-1 text-[10px]", l.disrupted ? "border-destructive/20 bg-destructive/10 text-destructive" : "border-border bg-secondary/30 text-muted-foreground")}>{l.mode === "truck" && <Truck className="h-3 w-3" />}{MODES[l.mode].label} · {num(l.km)} km</span>)}</div>
            <dl className="mt-5 space-y-3"><Row k="Total cost" v={usd(r.cost)} /><Row k="CO₂ footprint" v={`${num(r.co2)} kg`} /><Row k="Border customs delay" v={`${r.customsDays} days`} /><Row k="Lead time" v={`${r.days.toFixed(1)} days`} /><div className="border-t border-border pt-3"><Row k="Generalized cost" v={usd(r.generalizedCost)} muted /></div></dl>
          </article>;
        })}</div></div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Performance index"><div className="mb-2 text-[11px] text-muted-foreground">Cost efficiency · speed · eco-friendliness / best = 100</div><div className="h-72 sm:h-80"><ResponsiveContainer width="100%" height="100%"><RadarChart data={radar} outerRadius="67%"><PolarGrid stroke="var(--border)" /><PolarAngleAxis dataKey="axis" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} /><PolarRadiusAxis domain={[0, 100]} tick={{ fill: "var(--muted-foreground)", fontSize: 9 }} />{routes.map((r, i) => <Radar key={r.id} name={r.name} dataKey={r.name} stroke={r.legs.some((l) => l.disrupted) ? "var(--destructive)" : COLORS[i]} fill={r.legs.some((l) => l.disrupted) ? "var(--destructive)" : COLORS[i]} fillOpacity={0.12} strokeWidth={2} />)}<Legend wrapperStyle={{ fontSize: 11 }} /><Tooltip contentStyle={chartTooltipStyle} /></RadarChart></ResponsiveContainer></div></Panel>
          <Panel title="Freight cost by route"><div className="mb-2 text-[11px] text-muted-foreground">Estimated total freight cost · USD</div><div className="h-72 sm:h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={barData} margin={{ top: 20, right: 8, left: 0, bottom: 12 }}><CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 5" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} dy={10} /><YAxis width={54} axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickFormatter={(v: number) => `$${v / 1000}k`} /><Tooltip cursor={{ fill: "var(--secondary)", opacity: 0.3 }} contentStyle={chartTooltipStyle} formatter={(value: number) => [usd(value), "Freight cost"]} /><Bar dataKey="cost" radius={[5, 5, 0, 0]} maxBarSize={64}>{barData.map((r, i) => <Cell key={r.name} fill={r.disrupted ? "var(--destructive)" : COLORS[i]} />)}</Bar></BarChart></ResponsiveContainer></div></Panel>
        </div>
        <footer className="flex flex-wrap justify-between gap-2 border-t border-border pt-5 text-[10px] text-muted-foreground"><span>Alp Ayvat / Industrial Engineering Portfolio</span><span>Scenario estimates · Indicative industry averages · Not live freight quotes</span></footer>
      </main>
    </div>
  );
}

const chartTooltipStyle = { background: "var(--popover)", color: "var(--foreground)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 };
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="min-w-0"><div className="mb-2.5 text-xs text-muted-foreground">{label}</div>{children}</div>;
}
function Stat({ label, value, unit, icon: Icon, tone, trend, adverse = false }: { label: string; value: string; unit?: string; icon: LucideIcon; tone: "primary" | "accent" | "chart-2"; trend: string; adverse?: boolean }) {
  return <article className="glass-panel p-5 transition-all duration-300 hover:border-primary/50 md:p-6"><div className="flex items-center justify-between gap-2"><h2 className="text-xs text-muted-foreground">{label}</h2><div className={cn("flex h-9 w-9 items-center justify-center rounded-lg border", tone === "primary" ? "border-primary/20 bg-primary/10 text-primary" : tone === "accent" ? "border-accent/20 bg-accent/10 text-accent" : "border-chart-2/20 bg-chart-2/10 text-chart-2")}><Icon className="h-4 w-4" /></div></div><div className="mt-3 flex flex-wrap items-baseline gap-2"><span className="text-3xl font-bold tabular-nums">{value}</span>{unit && <span className="text-sm text-muted-foreground">{unit}</span>}</div><p className={cn("mt-4 flex items-center gap-1.5 text-[11px]", adverse ? "text-destructive" : "text-primary")}>{adverse ? <ArrowUpRight className="h-3.5 w-3.5 shrink-0" /> : <ArrowDownRight className="h-3.5 w-3.5 shrink-0" />}{trend}</p></article>;
}
function Row({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return <div className="flex items-baseline justify-between gap-3"><dt className="text-xs text-muted-foreground">{k}</dt><dd className={cn("shrink-0 font-mono text-xs", muted && "text-muted-foreground")}>{v}</dd></div>;
}
