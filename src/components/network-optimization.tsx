import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GitBranch } from "lucide-react";
import { MODES } from "@/lib/model-assumptions";
import { NETWORK_NOTICE } from "@/lib/transport-network";
import type { NetworkObjective, NetworkResult } from "@/lib/network-optimization";

const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const labels: Record<NetworkObjective, string> = { cost: "Minimum Cost", time: "Fastest Delivery", tradeoff: "Best Overall Trade-off" };

export function NetworkOptimization({ result, objective, onObjectiveChange, open, onOpenChange, disruption }: {
  result: NetworkResult; objective: NetworkObjective; onObjectiveChange: (value: NetworkObjective) => void;
  open: boolean; onOpenChange: (value: boolean) => void; disruption: boolean;
}) {
  const path = result.status === "ok" ? result.path : undefined;
  return <Accordion type="single" collapsible value={open ? "network" : ""} onValueChange={(value) => onOpenChange(value === "network")} className="glass-panel px-5 md:px-6">
    <AccordionItem value="network" className="border-0">
      <AccordionTrigger><span className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-chart-3" />Network Route Optimization</span></AccordionTrigger>
      <AccordionContent className="space-y-4 text-xs leading-relaxed">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-muted-foreground">Dijkstra · 12 nodes · directed graph</span>
          <Select value={objective} onValueChange={(value) => onObjectiveChange(value as NetworkObjective)}><SelectTrigger aria-label="Network optimization objective" className="w-full sm:w-64"><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(labels) as NetworkObjective[]).map((key) => <SelectItem key={key} value={key}>{labels[key]}</SelectItem>)}</SelectContent></Select>
        </div>
        <p className="text-muted-foreground">{NETWORK_NOTICE}</p>
        {disruption && result.status !== "unsupported" && <p className="text-warning">Network scenario: {result.excludedEdges} explicitly Suez-dependent edges removed. Other ocean links remain available; no diversion is invented. Original three-route penalties are unchanged.</p>}
        <div aria-live="polite" aria-atomic="true" data-testid="network-result">
          {result.status === "unsupported" && <p className="text-warning">Not represented in this simplified network: {result.missingNodes.join(", ")}. No substitute location is used. Supported shipment pairs: Shanghai or Shenzhen → Istanbul or Izmir.</p>}
          {result.status === "unreachable" && <p className="text-warning">No connected route is available between the selected locations{disruption ? " with Suez-dependent connections removed" : ""}.</p>}
          {path && <div className="space-y-4">
            <ol aria-label="Optimized network route" className="flex flex-wrap items-start gap-x-3 gap-y-2">{path.nodes.map((node, index) => <li key={node.id} className="flex min-w-0 items-center gap-3"><span className="font-medium">{node.id}</span>{path.edges[index] && <span className="text-[10px] text-chart-3">— {MODES[path.edges[index].mode].label} →</span>}</li>)}</ol>
            <dl className="grid grid-cols-2 gap-x-5 gap-y-4 lg:grid-cols-5">
              {[["Estimated freight", money(path.cost)], ["Transport CO₂", `${path.co2.toLocaleString("en-US", { maximumFractionDigits: 1 })} kg`], ["Estimated lead time", `${path.days.toFixed(2)} days`], ["Assumed distance", `${path.distanceKm.toLocaleString("en-US")} km`], ["Generalized cost Z", money(path.generalizedCost)]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-mono text-sm">{value}</dd></div>)}
            </dl>
            <p>Dijkstra selected this node sequence because it has the lowest summed {objective === "cost" ? `freight cost (${money(path.cost)})` : objective === "time" ? `lead time (${path.days.toFixed(2)} days), including edge handling and customs` : `generalized cost (${money(path.generalizedCost)})`} among reachable paths in the current graph. {objective === "tradeoff" && `Z = freight ${money(path.cost)} + carbon valuation ${money(path.carbonCost)} + urgency-weighted time ${money(path.timePenalty)}.`}</p>
            <p className="text-muted-foreground">Separate from the original three-route recommendation. Network delays and fixed charges are added once per traversed edge, not again at route level. Exact ties retain the first predecessor encountered under graph node/edge order.</p>
            <details className="border-t border-border pt-3"><summary className="cursor-pointer text-muted-foreground">Selected segment assumptions</summary><ul className="mt-3 space-y-2">{path.edges.map((edge) => <li key={edge.id}>{edge.from} → {edge.to} · {MODES[edge.mode].label} · {edge.distanceKm.toLocaleString("en-US")} km · handling {edge.handlingDays} d · customs {edge.customsDays} d · fixed {money(edge.fixedCost)}{edge.usesSuezCanal ? " · Suez-dependent" : ""}</li>)}</ul></details>
          </div>}
        </div>
      </AccordionContent>
    </AccordionItem>
  </Accordion>;
}