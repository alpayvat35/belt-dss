import { Slider } from "@/components/ui/slider";
import { CARBON_PRICE_SENSITIVITY } from "@/lib/model-assumptions";
import type { RouteResult } from "@/lib/routing";

export function CarbonPriceSensitivity({ price, onPriceChange, zeroPriceWinner, currentWinner }: {
  price: number;
  onPriceChange: (price: number) => void;
  zeroPriceWinner: RouteResult;
  currentWinner: RouteResult;
}) {
  const changed = zeroPriceWinner.id !== currentWinner.id;
  return <section aria-labelledby="carbon-sensitivity-title" className="glass-panel p-5 md:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="carbon-sensitivity-title" className="text-sm font-semibold">Sensitivity Analysis: Carbon Price</h2>
      <output className="font-mono text-sm text-primary" aria-live="polite">${price}/tonne CO₂</output>
    </div>
    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Carbon price sensitivity analysis demonstrates how assigning different economic weights to emissions may influence transportation decisions.</p>
    <div className="mt-5">
      <Slider aria-label="Shadow carbon price" min={CARBON_PRICE_SENSITIVITY.min} max={CARBON_PRICE_SENSITIVITY.max} step={CARBON_PRICE_SENSITIVITY.step} value={[price]} onValueChange={([value]) => onPriceChange(value ?? CARBON_PRICE_SENSITIVITY.default)} />
      <div className="mt-3 flex justify-between text-[10px] text-muted-foreground"><span>$0/tonne CO₂</span><span>$300/tonne CO₂</span></div>
    </div>
    <dl className="mt-5 grid gap-4 border-t border-border pt-4 text-xs sm:grid-cols-2">
      <div><dt className="text-muted-foreground">Recommended at $0/tonne CO₂</dt><dd className="mt-1 font-medium">{zeroPriceWinner.name}</dd></div>
      <div><dt className="text-muted-foreground">Recommended at ${price}/tonne CO₂</dt><dd className="mt-1 font-medium text-primary">{currentWinner.name}</dd></div>
    </dl>
    <p role="status" className="mt-3 text-xs leading-relaxed text-muted-foreground">{changed ? `The recommendation changes from ${zeroPriceWinner.name} to ${currentWinner.name} under the selected carbon price.` : "The recommended route remains unchanged under the selected carbon price."}</p>
    <p className="mt-2 text-[10px] text-muted-foreground">Illustrative shadow valuation, not a government tax. Freight, transport CO₂ and lead times remain unchanged for each route.</p>
  </section>;
}