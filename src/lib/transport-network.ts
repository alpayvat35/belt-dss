import type { NetworkEdge, TransportationNetwork } from "./network-optimization";
import type { Mode } from "./model-assumptions";

export const NETWORK_NOTICE = "Simplified educational network · all distances, charges and delays are illustrative, not verified service data. Links aggregate corridors, not direct scheduled services.";
const edge = (id: string, from: string, to: string, mode: Mode, distanceKm: number, handlingDays: number, customsDays = 0, fixedCost = 0, usesSuezCanal = false, waypoints?: [number, number][]): NetworkEdge =>
  ({ id, from, to, mode, distanceKm, handlingDays, customsDays, fixedCost, usesSuezCanal, ...(waypoints ? { waypoints } : {}) });

/** Directed westbound corridor abstractions; no reverse service is assumed. */
export const TRANSPORT_NETWORK: TransportationNetwork = {
  nodes: [
    { id: "Shanghai", coordinates: [31.23, 121.47] }, { id: "Shenzhen", coordinates: [22.54, 114.06] },
    { id: "Xi'an", coordinates: [34.34, 108.94] }, { id: "Khorgos", coordinates: [44.21, 80.41] },
    { id: "Aktau", coordinates: [43.65, 51.2] }, { id: "Baku", coordinates: [40.4, 49.87] },
    { id: "Tbilisi", coordinates: [41.72, 44.79] }, { id: "Kars", coordinates: [40.6, 43.1] },
    { id: "Istanbul", coordinates: [41.01, 28.98] }, { id: "Izmir", coordinates: [38.42, 27.14] },
    { id: "Singapore", coordinates: [1.3, 103.8] }, { id: "Suez Canal", coordinates: [30.6, 32.3] },
  ],
  edges: [
    edge("shanghai-xian", "Shanghai", "Xi'an", "rail", 1550, 0.5),
    edge("shenzhen-xian", "Shenzhen", "Xi'an", "rail", 1800, 0.5),
    edge("xian-khorgos", "Xi'an", "Khorgos", "rail", 3300, 0.5),
    edge("khorgos-aktau", "Khorgos", "Aktau", "rail", 3100, 0.5, 1),
    // Caspian maritime crossing uses the existing ocean coefficient as a proxy.
    edge("aktau-baku", "Aktau", "Baku", "ocean", 450, 1, 1),
    edge("baku-tbilisi", "Baku", "Tbilisi", "rail", 550, 0.5, 1),
    edge("tbilisi-kars", "Tbilisi", "Kars", "rail", 300, 0.5, 1),
    edge("kars-istanbul", "Kars", "Istanbul", "rail", 1700, 0.5),
    edge("istanbul-izmir", "Istanbul", "Izmir", "truck", 480, 0.5),
    edge("shanghai-singapore", "Shanghai", "Singapore", "ocean", 4200, 1, 0, 0, false, [[24,123], [15,113]]),
    edge("shenzhen-singapore", "Shenzhen", "Singapore", "ocean", 3000, 1, 0, 0, false, [[15,113]]),
    edge("singapore-suez", "Singapore", "Suez Canal", "ocean", 10500, 0, 0, 0, true, [[5,80], [12,49], [14,42], [22,37], [29.9,32.55]]),
    edge("suez-istanbul", "Suez Canal", "Istanbul", "ocean", 2000, 3, 5, 1500, true, [[31.3,32.3], [34,30], [36,25], [38,25], [40.1,26.4]]),
    edge("suez-izmir", "Suez Canal", "Izmir", "ocean", 1600, 3, 5, 1500, true, [[31.3,32.3], [34,30], [36,25], [38,26]]),
    edge("shanghai-istanbul-air", "Shanghai", "Istanbul", "air", 8000, 2, 1, 900),
    edge("shenzhen-istanbul-air", "Shenzhen", "Istanbul", "air", 8300, 2, 1, 900),
  ],
};