import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ASSUMPTION_GROUPS, DISRUPTION_LIMITATION, SHADOW_CARBON_PRICE, URGENCY, type Urgency } from "@/lib/model-assumptions";
import { explainRecommendation, type RouteResult } from "@/lib/routing";

const dollars = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function RecommendationExplanation({ routes, weightT, urgency, carbonPricePerTonne = SHADOW_CARBON_PRICE * 1000 }: { routes: RouteResult[]; weightT: number; urgency: Urgency; carbonPricePerTonne?: number }) {
  const { winner, runnerUp, gap, contributions, fasterDespiteHigherFreight } = explainRecommendation(routes);
  const tied = gap === 0;
  return <div className="mt-5 space-y-3 border-t border-primary/15 pt-4 text-xs leading-relaxed">
    <p>{winner.name} is recommended because it {tied ? "shares the lowest generalized cost; the original template order breaks the tie" : "achieves the lowest generalized cost"} under the selected {weightT}-tonne cargo weight and {URGENCY[urgency].label.toLowerCase()} urgency level.</p>
    <dl className="grid gap-3 sm:grid-cols-3">
      <div><dt className="text-muted-foreground">Winning Z · {winner.name}</dt><dd className="mt-1 font-mono text-primary">{dollars(winner.generalizedCost)}</dd></div>
      <div><dt className="text-muted-foreground">Second-best Z · {runnerUp.name}</dt><dd className="mt-1 font-mono">{dollars(runnerUp.generalizedCost)}</dd></div>
      <div><dt className="text-muted-foreground">Difference · second-best − winner</dt><dd className="mt-1 font-mono">{dollars(gap)}</dd></div>
    </dl>
    <p className="text-muted-foreground">Winner’s objective: freight {dollars(winner.cost)} + shadow carbon cost {dollars(winner.carbonCost)} + time penalty {dollars(winner.timePenalty)}. Current weights: λ = ${(carbonPricePerTonne / 1000).toFixed(3)}/kg CO₂ ({dollars(carbonPricePerTonne)}/tonne CO₂); μ = {dollars(URGENCY[urgency].delayPerTonDay)}/tonne/day.</p>
    <p className="text-muted-foreground">Contributions to the gap (second-best − winner): freight {dollars(contributions.freight)}; carbon {dollars(contributions.carbon)}; time {dollars(contributions.time)}. Positive values favor {winner.name}; negative values favor {runnerUp.name}. Distances, mode coefficients, fixed costs, handling/customs delays, and any active ocean penalties feed these terms.</p>
    {fasterDespiteHigherFreight && <p className="text-primary">Compared with {runnerUp.name}, {winner.name} has higher freight cost but shorter lead time ({winner.days.toFixed(2)} vs. {runnerUp.days.toFixed(2)} days); its lower time penalty offsets that freight disadvantage in the combined objective.</p>}
  </div>;
}

export function ModelTransparency({ carbonPricePerTonne = SHADOW_CARBON_PRICE * 1000 }: { carbonPricePerTonne?: number }) {
  return <Accordion type="multiple" className="glass-panel px-5 md:px-6">
    <AccordionItem value="methodology" className="border-border">
      <AccordionTrigger>Methodology &amp; Mathematical Model</AccordionTrigger>
      <AccordionContent className="space-y-4 text-xs leading-relaxed text-muted-foreground">
        <p>The original BELT-DSS comparison evaluates three predefined transport alternatives with the same inputs, then selects the smallest generalized cost. The separate Network Route Optimization section uses Dijkstra’s algorithm on a simplified educational graph; it does not replace this comparison.</p>
        <div className="font-mono text-lg text-primary">Z = C + λE + μWT</div>
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {[["Z", "Generalized Cost ($)"], ["C", "Freight Cost ($)"], ["E", "CO₂ Emissions (kg)"], ["λ", "Shadow Carbon Price ($/kg CO₂)"], ["μ", "Urgency-Dependent Time Penalty ($/tonne/day)"], ["W", "Cargo Weight (tonnes)"], ["T", "Total Lead Time (days)"]].map(([symbol, definition]) => <div key={symbol} className="flex gap-2"><dt className="font-mono text-foreground">{symbol}</dt><dd>{definition}</dd></div>)}
        </dl>
        <ol className="list-decimal space-y-2 pl-5">
          <li><strong className="text-foreground">Freight cost:</strong> C = fixed shipment cost + Σ(W × leg distance × mode cost factor × scenario cost multiplier). Rates are in $/tonne-km; distances are in km.</li>
          <li><strong className="text-foreground">Transport emissions:</strong> E = Σ(W × leg distance × mode emission factor / 1000). Dividing grams by 1000 gives kg CO₂. This is not a full lifecycle footprint.</li>
          <li><strong className="text-foreground">Lead time:</strong> T = Σ(leg distance / mode speed × scenario time multiplier) + handling days + customs days. Both route-level delays are added once. Speed is in km/day.</li>
          <li><strong className="text-foreground">Decision:</strong> freight, carbon valuation (λE), and the economic time penalty (μWT) are added in dollars. Higher urgency raises μ, which can favor faster options despite higher freight costs. The lowest Z wins; exact ties retain original template order.</li>
        </ol>
        <p>Current Shadow Carbon Price: ${(carbonPricePerTonne / 1000).toFixed(3)}/kg CO₂ ({dollars(carbonPricePerTonne)}/tonne CO₂). Baseline: $0.10/kg CO₂ ($100/tonne CO₂). This is a modeling valuation, not a government-imposed tax.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{Object.values(URGENCY).map((u) => <p key={u.label}><span className="text-foreground">{u.label} urgency</span><br />{dollars(u.delayPerTonDay)}/tonne/day</p>)}</div>
        <p>Urgency penalties are illustrative economic costs of time, not universally accepted freight industry standards.</p>
        <p>Performance scores = 100 × (minimum value among the three options / route value), separately for freight cost, time, and transport CO₂. They are relative comparison scores, not the selection algorithm.</p>
        <p><strong className="text-warning">Suez scenario limitation.</strong> {DISRUPTION_LIMITATION}</p>
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="sources" className="border-0">
      <AccordionTrigger>Data Sources &amp; Assumptions</AccordionTrigger>
      <AccordionContent className="space-y-5 text-xs leading-relaxed text-muted-foreground">
        <p>All current numerical inputs are illustrative assumptions with no documented external evidence. No verified external sources are claimed. Displayed route totals, objective terms, gaps, and scores are model-derived calculations, not observed transport data. Map tiles provide geographic context only; drawn corridors do not supply model distances.</p>
        {ASSUMPTION_GROUPS.map((group) => <section key={group.title}>
          <h3 className="mb-2 font-medium text-foreground">{group.title}</h3>
          <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left">
            <caption className="sr-only">{group.title}: parameter values, units, source status, and explanation</caption>
            <thead><tr className="border-b border-border">{["Parameter", "Value", "Unit", "Source status", "Explanation"].map((label) => <th key={label} scope="col" className="px-2 py-2 font-medium text-foreground">{label}</th>)}</tr></thead>
            <tbody>{group.rows.map((row) => <tr key={row.parameter} className="border-b border-border/50"><th scope="row" className="px-2 py-2 font-normal text-foreground">{row.parameter}</th><td className="px-2 py-2 font-mono">{row.value.toLocaleString("en-US", { maximumFractionDigits: 3 })}</td><td className="px-2 py-2">{row.unit}</td><td className="px-2 py-2">{row.sourceStatus}</td><td className="px-2 py-2">{row.explanation}</td></tr>)}</tbody>
          </table></div>
        </section>)}
      </AccordionContent>
    </AccordionItem>
  </Accordion>;
}