# BELT-DSS — Methodology (Phases 1–3)

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

### Data References

The following verified publication references provide **methodological and sector context only**, not numerical validation of the model:

- **ISO (2023), ISO 14083:2023**, *Greenhouse gases — Quantification and reporting of greenhouse gas emissions arising from transport chain operations*, Edition 1. [Official standard page](https://www.iso.org/standard/78864.html). Relevant to transport-chain GHG accounting and reporting; referencing it does not establish compliance with the standard.
- **Smart Freight Centre (2023), GLEC Framework for Logistics Emissions Accounting and Reporting, Version 3.0**. [Official release notice](https://www.smartfreightcentre.org/en/about-sfc/news/a-solid-foundation-to-further-accelerate-freight-decarbonization-smart-freight-centre-releases-updated-glec-framework-version-30/). Provides logistics emissions-accounting context; the publisher describes alignment with ISO 14083. No claim is made that BELT-DSS implements its accounting procedures or uses its factors.
- **UNCTAD (2023), Review of Maritime Transport 2023: Towards a green and just transition**. [Official publication page](https://unctad.org/publication/review-maritime-transport-2023). Provides maritime transport and decarbonization context, not a validation source for the calculator’s freight rates, speeds or distances.

No specific published value has been verified against the current emission factors, freight cost coefficients, effective speeds, or distances. All remain **illustrative assumptions**, unchanged from Phase 1. A future source-verified coefficient would need an identifiable publication and exact value, matching units, relevant operating conditions and emissions boundaries. A CO₂-only estimate is not automatically equivalent to a full greenhouse-gas inventory in CO₂-equivalent units.

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

## 10. Carbon price sensitivity analysis

Sensitivity analysis varies one assumption while holding other inputs constant to observe its influence on results. Phase 2 varies the shadow carbon price from **$0 to $300/tonne CO₂ in $25 steps**, with **$100/tonne CO₂** as the default. This range and step are educational scenario choices, not externally validated policy or market values.

For a selected price p in $/tonne CO₂, the calculator uses **λ = p / 1000** in $/kg CO₂. It recomputes `Zᵣ = Cᵣ + (p / 1000)Eᵣ + μWTᵣ`, ranks the same three alternatives, and reports the best–second-best gap. Freight costs, emissions, distances, handling, customs, transit times, urgency penalties and disruption multipliers remain unchanged for each route. The default exactly reproduces Phase 1 results.

Increasing the price makes emissions more expensive in the objective, which may favor lower-emission alternatives. A recommendation need not change if freight and time differences still dominate; the comparison explicitly reports the recommendation at zero and at the selected price. Carbon-price effects are compared under the same shipment, urgency and disruption inputs. Dashboard disruption comparisons likewise use the same selected carbon price in both scenarios.

This is a one-parameter deterministic analysis, not a probability-based uncertainty study, empirical calibration, Pareto analysis or a new optimization algorithm. The limited range may not reach a switching point, and an unchanged recommendation does not prove robustness outside that range or under other assumptions. The shadow price is an economic modeling weight, not an actual government tax.

Validation additionally checks exact $100 baseline preservation, unchanged physical calculations, price-to-objective conversion at $0/$100/$300, and minimum-cost ranking and explanation decomposition at every $25 step across the tested city/urgency/disruption/weight combinations.

## 11. Educational network optimization (Phase 3)

Phase 3 adds a **separate directed network optimizer**, leaving the original three alternatives, their numerical calculations, carbon sensitivity and recommendation unchanged. It is an educational network model, not a real-world logistics routing service or real-time global optimizer.

### Graph and geographic context

The graph has 12 nodes: Shanghai, Shenzhen, Xi'an, Khorgos, Aktau, Baku, Tbilisi, Kars, Istanbul, Izmir, Singapore and a Suez Canal transit waypoint. Its 16 directed edges aggregate plausible westbound corridors; they do not establish nonstop or scheduled services. Shanghai/Shenzhen feed Xi'an, then rail crosses Kazakhstan toward Aktau; a Caspian maritime link connects to Baku, followed by rail through Tbilisi/Kars to Istanbul and a road connection to Izmir. An assumed maritime corridor passes Singapore and Suez toward Türkiye; illustrative air links connect the Chinese origins to Istanbul. No reverse connectivity is inferred. Ningbo, Qingdao, Mersin and Ankara are not represented: the interface reports unsupported locations rather than substituting another city.

Geographic plausibility was checked against these publications, **not numerical model calibration**:

- [China State Council portal, 3 July 2024: Xi'an–Baku freight route](https://english.www.gov.cn/news/202407/03/content_WS6684f6fec6d0868f4e8e8cf9.html): describes Xi'an, Horgos/Khorgos, Kazakhstan and the Caspian crossing to Baku; it does not identify Aktau as the departure port for that service.
- [Republic of Türkiye Ministry of Foreign Affairs: Türkiye's Multilateral Transportation Policy](https://www.mfa.gov.tr/turkiye_s-multilateral-transportation-policy.en.mfa): describes the Middle Corridor via Kazakhstan/Caspian/Azerbaijan/Georgia/Türkiye, Aktau/Kuryk and Baku/Alat ports, and Baku–Tbilisi–Kars railway.
- [Maersk Asia–Türkiye westbound service map](https://www.maersk.com/~/media_sc9/maersk/local-information/map/files/asia-pacific/shipping-from-asia-pacific-to-europe/ae15-westbound-v3.pdf): shows Shanghai/Shekou, Singapore, Red Sea/Port Said and Türkiye-area port geography. It does not verify current sailings, İzmir calls or model distances.

City nodes simplify port/station locations (for example Baku/Alat and Istanbul-area ports). Chinese feeder legs, direct air links and Istanbul–Izmir trucking are illustrative plausible connections, not verified operating services. The Suez node is a transit waypoint, not a cargo transfer terminal. The Caspian edge uses the existing ocean cost/emission/speed coefficients as an illustrative proxy, not a calibrated ferry model. All network distances, charges and delays are illustrative assumptions; none are measured or externally verified. Typed graph data live in `src/lib/transport-network.ts`; chosen edge assumptions are inspectable in the interface. Map coordinates and intermediate waypoints are schematic display data only and never determine weights.

### Additive edge calculations

For each edge i, freight `Cᵢ = Fᵢ + W dᵢ cᵢ`, emissions `Eᵢ = W dᵢ eᵢ / 1000`, and lead time `Tᵢ = dᵢ / vᵢ + Hᵢ + Bᵢ`. Fixed charges, handling and customs are added once per traversed edge. No original-template route-level additions are added again. The graph explicitly assigns illustrative delay/charge values per edge, including zero where none is modeled. It reuses the unchanged mode coefficients and urgency penalties from `src/lib/model-assumptions.ts`.

The selected objective is edge freight dollars, edge lead-time days, or `Zᵢ = Cᵢ + (p/1000)Eᵢ + μWTᵢ` dollars. Here p is the selected $/tonne CO₂ price, W is selected cargo tonnes, and μ is selected urgency $/tonne/day. Each path total is the sum of its traversed edge values, so `ΣZᵢ = ΣCᵢ + λΣEᵢ + μWΣTᵢ`. Emissions alone are reported, not a fourth optimization objective. Cost/time objectives still report the resulting generalized cost but do not minimize it.

### Dijkstra's algorithm

Dijkstra repeatedly settles the reachable node with the smallest tentative objective value and relaxes outgoing edges. A predecessor is updated only for a strictly lower cumulative value; the returned node sequence is reconstructed from predecessors. It searches the graph rather than selecting from predefined complete paths. All calculated edge weights are checked to be finite and non-negative, satisfying Dijkstra's requirement. A simple array scan is sufficient for this small graph (O(V² + VE) worst case for the readable implementation). Missing endpoints and disconnected destinations return explicit states. Identical origin/destination yields a zero-edge, zero-total path.

**Deterministic exact ties:** node settlement follows graph node order; equal relaxations keep the first predecessor encountered in edge order. This is not a secondary preference for fewer stops or lower emissions. Full precision is retained for decisions and totals; only display values are rounded.

### Suez disruption and limitations

In the network only, enabling disruption **removes edges explicitly marked `usesSuezCanal: true`**. The Singapore–Suez and Suez–Türkiye edges are unavailable. Other ocean edges, particularly Aktau–Baku, remain unchanged. Dijkstra runs on the remaining connectivity; it reports no route if the destination cannot be reached. No Cape diversion or invented replacement distances are generated. This differs intentionally from the preserved original comparison, which still applies +40% time/+20% variable cost to every ocean leg with unchanged emissions.

Optimality means minimum additive objective **within this illustrative graph and its assumptions**, not a globally optimal real shipment. The model omits schedules, capacity, congestion, uncertainty, service availability, transfer compatibility and calibrated border/port operations. It models neither Pareto optimization nor live markets. The overlay is a distinguishable schematic network trace, not an operational itinerary, and is shown only while the network section is expanded.

Validation adds known shortest-path graphs, different objectives, directionality, disconnected/unsupported endpoints, zero-weight cycles, exact ties, Suez-only exclusion, edge delay/fixed-charge accounting, weight/carbon units, invalid inputs and unchanged original reference results. Supported shipment pairs are exercised over all urgency levels, 1/20/100 tonnes, $0/$100/$300 carbon prices, both disruption states and all three objectives. These tests establish algorithmic consistency, not real-world predictive validity.

## 12. Future improvements

Potential later work includes externally verified coefficient provenance, multi-parameter sensitivity and uncertainty analysis, mode-specific emissions boundaries, empirically calibrated time penalties, verified network distances and Suez-dependent services, actual diversion impacts, capacity/reliability constraints, and Pareto analysis. Phase 3 demonstrates graph-based shortest paths on illustrative data only. Real-time market integration or forecasting would require suitable data and separate validation; these broader capabilities are not implemented.

> Results are model-based estimates using illustrative transport parameters. They are intended for educational scenario analysis and do not represent live freight quotations.