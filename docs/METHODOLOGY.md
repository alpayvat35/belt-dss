# BELT-DSS — Phase 1 Methodology

Developed by **Alp Ayvat**, a high school student interested in Industrial Engineering, Operations Research, Supply Chain Optimization, and Sustainable Transportation. This educational portfolio project studies the China–Türkiye corridor within the broader Belt and Road context.

## 1. Research problem

Transport decisions involve competing economic, environmental, and delivery-time considerations. A low freight price does not necessarily imply the lowest economic cost once time and emissions are valued. This project asks: **which of three predefined transport alternatives minimizes modeled generalized cost for a selected shipment and urgency level?**

## 2. Project objectives

- Compare freight costs, transport CO₂, and lead times consistently.
- Make coefficients, units, calculations, and recommendation reasons inspectable.
- Examine an illustrative disruption scenario without claiming operational prediction.
- Support reproducible educational analysis rather than carrier procurement.

## 3. Decision-support approach

The user selects an origin, destination, cargo weight (1–100 tonnes), urgency, and optional disruption. A deterministic calculator evaluates Ocean + Truck, Direct Air, and Rail + Ocean. No live market or transport API supplies the numerical inputs. The map shows illustrative geographic corridors; its coordinates do not determine model distances.

## 4. Mathematical equations

For route r and leg i, W is cargo weight (tonnes), dᵢ is distance (km), cᵢ is a cost factor ($/tonne-km), eᵢ is an emission factor (g CO₂/tonne-km), and vᵢ is effective speed (km/day). Fᵣ is fixed shipment cost ($), Hᵣ is handling time (days), and Bᵣ is customs delay (days). Scenario multipliers aᵢ and bᵢ affect variable cost and transit time, respectively.

```text
Variable freight cost Vᵣ = Σᵢ W dᵢ cᵢ aᵢ
Total freight cost    Cᵣ = Fᵣ + Vᵣ
Transport CO₂         Eᵣ = Σᵢ W dᵢ eᵢ / 1000
Total lead time       Tᵣ = Hᵣ + Bᵣ + Σᵢ (dᵢ / vᵢ) bᵢ
Generalized cost      Zᵣ = Cᵣ + λEᵣ + μWTᵣ
Recommendation          = arg minᵣ Zᵣ
```

Z and C are dollars; E is kg CO₂; λ is $/kg CO₂; μ is $/tonne/day. Thus every objective term is in dollars. The gram-to-kilogram conversion is explicit. Handling and customs enter T once per route; they also influence the time penalty. Full precision is retained internally, with rounding only for display. Exact objective ties select the first alternative in template order.

## 5. Parameters and assumptions

**Source status: all current numerical inputs are illustrative assumptions.** There are no documented verified external references for these values. No study, citation, or empirical calibration is claimed. Outputs are model-derived calculations, not measurements.

| Mode | Cost ($/tonne-km) | Emissions (g CO₂/tonne-km) | Effective speed (km/day) |
|---|---:|---:|---:|
| Ocean | 0.02 | 10 | 650 |
| Rail | 0.06 | 22 | 900 |
| Truck | 0.12 | 90 | 700 |
| Air | 1.10 | 600 | 9,000 |

The shadow carbon price is **$0.10/kg CO₂**, equivalent to **$100/tonne CO₂**. It represents a modeling valuation, not an actual government-imposed carbon tax.

| Urgency | μ ($/tonne/day) |
|---|---:|
| Low | 15 |
| Medium | 60 |
| High | 250 |
| Critical | 1,000 |

Urgency penalties are illustrative economic costs of time, not universally accepted freight industry standards. They are not calibrated to a specific business's inventory, stockout, or production-loss costs.

### Distance assumptions

Origin offset O (km): Shanghai 0; Shenzhen 900; Ningbo 150; Qingdao 700.

| Destination | Sea base (km) | Truck base (km) | Air base (km) | Rail base (km) |
|---|---:|---:|---:|---:|
| Istanbul | 16,000 | 60 | 8,000 | 10,500 |
| Izmir | 15,600 | 80 | 8,400 | 11,000 |
| Mersin | 14,900 | 70 | 7,600 | 10,800 |
| Ankara | 16,000 | 450 | 7,300 | 10,200 |

These are predefined distance assumptions, not measured network paths. Mode-specific offset multipliers, additional road distances, and the 1,000 km rail-option sea leg are also illustrative. The application’s Data Sources & Assumptions section lists every coefficient with value, unit, source status, and explanation, generated from `src/lib/model-assumptions.ts`.

## 6. Existing route templates

Let S, D, A, and R denote the destination sea, truck, air, and rail base distances.

| Template | Leg distances (km), in order | Handling (days) | Customs (days) | Fixed cost ($/shipment) |
|---|---|---:|---:|---:|
| Ocean + Truck | Ocean: S − 0.6O; Truck: D + 240 | 4 | 5 | 1,500 |
| Direct Air | Air: A + 0.3O; Truck: 50 | 2 | 1 | 900 |
| Rail + Ocean | Rail: R + 0.8O; Ocean: 1,000; Truck: D | 5 | 3 | 1,800 |

The name Direct Air includes an assumed last-mile truck leg. Rail + Ocean is a modeled combination, not a validated door-to-door service itinerary. Handling, customs, and fixed costs are route-level additions rather than per-leg additions.

## 7. Multi-criteria decision methodology

This is a **weighted generalized-cost model**: freight is added to monetized emissions and urgency-weighted lead time. It compares a finite set of predefined alternatives rather than solving a graph-based shortest-path problem. It does not compute a Pareto frontier or forecast live markets.

The radar chart is descriptive only. Each score is `round(100 × minimum metric / route metric)` for cost, lead time, or transport CO₂. Scores are finite in the 0–100 range for the supported input domain and depend on the current three alternatives. They are not inputs to recommendation selection or a comprehensive sustainability measure.

Recommendation explanations show the winning and second-best objective values, their difference, and differences in freight, carbon valuation, and time penalty. A positive difference (second-best minus winner) favors the winner. A negative contribution favors the second-best on that term. Higher urgency can select a faster option despite a higher physical freight cost.

## 8. Suez Canal disruption assumptions

Phase 1 intentionally preserves the existing illustrative scenario:

- Every ocean leg's transit time is multiplied by **1.4**.
- Every ocean leg's variable freight cost is multiplied by **1.2**.
- CO₂ emissions and modeled distances remain unchanged.
- Non-ocean legs, fixed shipment charges, handling, and customs are unchanged.

Not every ocean leg necessarily traverses Suez. In particular, the Rail + Ocean sea leg has no identified canal dependency. The model does not calculate actual diversion distances or an alternative shipping path. A real longer diversion could increase emissions, which this scenario does not capture. Leg metadata explicitly leaves Suez dependency unspecified so a future network version can represent dependent segments individually. The map's red warning is a simulated scenario indicator, not a report of an actual canal closure.

## 9. Model limitations and validation

- Coefficients are illustrative, with no documented external validation or uncertainty ranges.
- Constant tonne-km costs ignore capacity, container pricing, minimum charges, fuel variability, service availability, and economies of scale.
- Transport CO₂ factors do not represent a full lifecycle assessment or a validated cross-mode emissions inventory.
- Fixed delays and effective speeds omit timetable, congestion, border variability, capacity, reliability, and geographic feasibility.
- No stochastic uncertainty, graph search, operational rerouting, or empirical disruption calibration is implemented.
- A minimum generalized cost is optimal only among these templates under these assumptions, not globally optimal or universally preferable.
- The supported interface domain is 4 origins × 4 destinations, 1–100 tonnes, 4 urgency levels, and 2 disruption states. The pure calculator assumes valid typed inputs; it is not an externally exposed input-validation service.

Automated Vitest checks cover coefficient preservation, baseline outputs, non-negative costs/emissions, positive lead times, weight scaling, urgency independence of physical metrics, objective decomposition, minimum-cost selection, ocean-only scenario multipliers, unchanged emissions, and finite bounded scores. All city pairs and urgency/disruption combinations are checked at 1, 20, and 100 tonnes. Tie ordering and explanation decomposition are tested too. These checks establish mathematical consistency, not real-world predictive accuracy.

### Reproducible reference scenario

Shanghai → Istanbul, 20 tonnes, Low urgency, no disruption:

| Route | Freight ($) | CO₂ (kg) | Lead time (days, rounded) | Z ($, rounded) |
|---|---:|---:|---:|---:|
| Ocean + Truck | 8,620 | 3,740 | 34.04396 | 19,207.19 |
| Direct Air | 177,020 | 96,090 | 3.96032 | 187,817.10 |
| Rail + Ocean | 14,944 | 4,928 | 21.29084 | 21,824.05 |

Ocean + Truck is selected. With the illustrative disruption, Rail + Ocean is selected. Baseline coefficients and numerical behavior are preserved in Phase 1; no verified numerical bug was identified. Run `bunx vitest run` from the repository root to reproduce validation.

## 10. Future improvements

Potential later work includes externally verified coefficient provenance, uncertainty/sensitivity analysis, mode-specific emissions boundaries, empirically calibrated time penalties, network-based distances and Suez-dependent edges, actual diversion impacts, graph-based shortest-path optimization, capacity/reliability constraints, and Pareto analysis. Real-time market integration or forecasting would require suitable data and separate validation. None of these capabilities is claimed for Phase 1.

> Results are model-based estimates using illustrative transport parameters. They are intended for educational scenario analysis and do not represent live freight quotations.