import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { Focus, Globe2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Origin, Destination } from "@/lib/routing";

type Point = [number, number];
const origins: Record<Origin, Point> = { Shanghai: [31.23, 121.47], Shenzhen: [22.54, 114.06], Ningbo: [29.87, 121.55], Qingdao: [36.07, 120.38] };
const destinations: Record<Destination, Point> = { Istanbul: [41.01, 28.98], Izmir: [38.42, 27.14], Mersin: [36.8, 34.63], Ankara: [39.93, 32.86] };
const suez: Point = [30.6, 32.3];

export function CorridorMap({ origin, destination, disruption, routeId, routeName }: { origin: Origin; destination: Destination; disruption: boolean; routeId: string; routeName: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [engine, setEngine] = useState<{ L: typeof Leaflet; map: Leaflet.Map }>();
  const [failed, setFailed] = useState(false);
  const [tilesFailed, setTilesFailed] = useState(false);
  const bounds = useRef<Leaflet.LatLngBounds>();

  useEffect(() => {
    let cancelled = false;
    let instance: Leaflet.Map | undefined;
    let resize: ResizeObserver | undefined;
    import("leaflet").then((L) => {
      if (cancelled || !container.current) return;
      instance = L.map(container.current, { zoomControl: false, scrollWheelZoom: false, minZoom: 2, maxZoom: 8, worldCopyJump: true });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd", maxZoom: 19,
      }).on("tileerror", () => { if (!cancelled) setTilesFailed(true); }).addTo(instance);
      const map = instance;
      resize = new ResizeObserver(() => { map.invalidateSize(); if (bounds.current) map.fitBounds(bounds.current, { padding: [35, 40], animate: false }); });
      resize.observe(container.current);
      setEngine({ L, map });
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; resize?.disconnect(); instance?.remove(); };
  }, []);

  useEffect(() => {
    if (!engine) return;
    const { L, map } = engine;
    const layer = L.layerGroup().addTo(map);
    const start = origins[origin];
    const end = destinations[destination];
    // Illustrative corridor waypoints only; routing estimates remain in lib/routing.ts.
    const port: Point = destination === "Mersin" ? [36.5, 34.6] : [38.2, 26.5];
    const ocean: Point[] = [start, [24, 123], [15, 113], [1.3, 104], [5, 80], [12, 49], [14, 42], [22, 37], [29.9, 32.55], suez, [31.3, 32.3], [34, 30], port];
    const rail: Point[] = [start, [34.3, 108.9], [43.8, 87.6], [43.2, 76.9], [44, 65], [43.6, 51.2], [40.4, 49.9], [41.7, 44.8], [40.6, 43.1], end];
    const line = (points: Point[], cls: string, tooltip: string) => L.polyline(points, { className: `corridor-line ${cls}`, weight: 3, opacity: 0.95 }).bindTooltip(tooltip, { sticky: true }).addTo(layer);
    if (routeId === "ocean-truck" || disruption) {
      line(ocean, disruption ? "corridor-ocean-blocked" : "corridor-ocean", disruption ? "Ocean corridor · Suez blockage" : "Ocean corridor · via Suez");
      line([port, end], "corridor-truck", "Last-mile truck");
    }
    if (routeId === "rail-ocean" || disruption) line(rail, "corridor-rail", disruption ? "Alternative Eurasian rail corridor" : "Eurasian rail corridor");
    if (routeId === "air") {
      const air: Point[] = Array.from({ length: 41 }, (_, i) => {
        const t = i / 40;
        return [start[0] * (1 - t) + end[0] * t + 12 * Math.sin(Math.PI * t), start[1] * (1 - t) + end[1] * t];
      });
      line(air, "corridor-air", "Direct air corridor");
    }
    for (const [city, point, kind] of [[origin, start, "origin"], [destination, end, "destination"]] as const) {
      L.marker(point, { icon: L.divIcon({ className: `corridor-city corridor-city-${kind}`, html: '<span class="corridor-city-dot"></span>', iconSize: [18, 18], iconAnchor: [9, 9] }), title: city })
        .bindTooltip(`${city} · ${kind === "origin" ? "CN" : "TR"}`, { permanent: true, direction: kind === "origin" ? "right" : "left", className: "corridor-city-label", offset: [kind === "origin" ? 8 : -8, 0] }).addTo(layer);
    }
    if (disruption) {
      L.marker(suez, { icon: L.divIcon({ className: "corridor-suez", html: '<span class="corridor-warning-ring"></span><span class="corridor-warning-dot">!</span>', iconSize: [28, 28], iconAnchor: [14, 14] }), title: "Suez Canal blocked" })
        .bindTooltip("Suez Canal blocked", { permanent: true, direction: "bottom", className: "corridor-warning-label", offset: [0, 12] }).addTo(layer);
    }
    const visible = disruption || routeId === "ocean-truck" ? [...ocean, ...rail] : routeId === "air" ? [start, end, [52, 80] as Point] : rail;
    bounds.current = L.latLngBounds(visible);
    map.fitBounds(bounds.current, { padding: [35, 40], animate: false });
    return () => { layer.remove(); };
  }, [engine, origin, destination, disruption, routeId]);

  return <section className="glass-panel overflow-hidden" aria-label="Supply chain corridor map">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
      <div className="flex items-center gap-2"><Globe2 className="h-4 w-4 text-accent" /><h2 className="text-sm font-semibold">Global corridor</h2><span className="hidden text-xs text-muted-foreground sm:inline">{origin} → {destination}</span></div>
      <span className="text-xs text-primary">{routeName}</span>
    </div>
    <div className="relative isolate">
      <div ref={container} className="corridor-map h-[320px] w-full sm:h-[380px]" aria-label={`Interactive map from ${origin} to ${destination}`} />
      {!engine && <div className="absolute inset-0 z-[500] flex items-center justify-center bg-card text-sm text-muted-foreground">{failed ? "Map unavailable" : "Loading corridor map…"}</div>}
      {tilesFailed && <div className="absolute bottom-7 left-3 z-[500] rounded-md bg-card/90 px-2 py-1 text-[10px] text-warning">Some map tiles unavailable</div>}
      <div className="absolute right-3 top-3 z-[500] flex flex-col gap-1 rounded-lg border border-border bg-card/90 p-1 backdrop-blur">
        <Button variant="ghost" size="icon" aria-label="Zoom in map" title="Zoom in" disabled={!engine} onClick={() => engine?.map.zoomIn()}><Plus /></Button>
        <Button variant="ghost" size="icon" aria-label="Zoom out map" title="Zoom out" disabled={!engine} onClick={() => engine?.map.zoomOut()}><Minus /></Button>
        <Button variant="ghost" size="icon" aria-label="Fit corridor map" title="Fit corridor" disabled={!engine} onClick={() => { if (engine && bounds.current) engine.map.fitBounds(bounds.current, { padding: [35, 40] }); }}><Focus /></Button>
      </div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3 text-[10px] text-muted-foreground">
      <div className="flex flex-wrap items-center gap-4"><span className="flex items-center gap-1.5"><span className={`w-5 border-t-2 ${disruption ? "border-destructive" : "border-accent"}`} />{disruption ? "Ocean · disrupted" : routeId === "air" ? "Air corridor" : "Ocean corridor"}</span>{(disruption || routeId === "rail-ocean") && <span className="flex items-center gap-1.5"><span className="w-5 border-t-2 border-dashed border-primary" />Eurasian rail</span>}</div>
      <span>Illustrative corridors · Not navigational routes</span>
    </div>
  </section>;
}