<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Routing math lives in src/lib/routing.ts (pure, unit-tested); UI only renders its results — keeps the algorithm testable.
- Model coefficients and provenance live in src/lib/model-assumptions.ts; calculator and transparency views consume that single source to prevent undocumented drift.
- Recommendation explanations derive objective decompositions and stable rankings in the pure routing module; this keeps explanations consistent with the actual selection rule.
- Dashboard metrics and comparisons derive from the same routing results and nominal-network baseline; trend indicators must not imply historical or live market data.
- Leaflet loads dynamically inside the corridor map effect, with instance and observer cleanup, so browser-only imports never execute during SSR; map waypoints are illustrative and never feed routing calculations.
