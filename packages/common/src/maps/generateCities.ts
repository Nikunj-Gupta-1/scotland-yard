import * as fs from "node:fs";
import type { CityMapData, StationNode, RouteEdge, TransportType } from "../types/index.ts";

function generateCityGraph(config: {
  id: string;
  name: string;
  width: number;
  height: number;
  nodeCount: number;
  landmarks: Array<{ name: string; x: number; y: number; isHub?: boolean }>;
  riverPath: Array<{ x: number; y: number }>;
  surfacingRounds: number[];
  maxUndergroundHops: number;
}): CityMapData {
  const { id, name, width, height, nodeCount, landmarks, riverPath, surfacingRounds } = config;

  const stations: StationNode[] = [];
  const edges: RouteEdge[] = [];
  const edgeSet = new Set<string>();

  const addEdge = (from: number, to: number, transport: TransportType) => {
    if (from === to) return;
    const u = Math.min(from, to);
    const v = Math.max(from, to);
    const key = `${u}-${v}-${transport}`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      edges.push({ from: u, to: v, transport });
    }
  };

  // 1. Create landmark nodes first
  landmarks.forEach((lm, idx) => {
    stations.push({
      id: idx + 1,
      x: lm.x,
      y: lm.y,
      name: lm.name,
      transports: lm.isHub ? ["taxi", "bus", "underground"] : ["taxi", "bus"]
    });
  });

  // 2. Generate remaining stations distributed across city sectors
  let currentId = stations.length + 1;
  const padding = 120;
  const cols = Math.ceil(Math.sqrt((nodeCount - stations.length) * (width / height)));
  const rows = Math.ceil((nodeCount - stations.length) / cols);

  const cellW = (width - padding * 2) / cols;
  const cellH = (height - padding * 2) / rows;

  for (let r = 0; r < rows && currentId <= nodeCount; r++) {
    for (let c = 0; c < cols && currentId <= nodeCount; c++) {
      const seed = (r * 31 + c * 17 + currentId * 13) % 1000;
      const jitterX = ((seed / 1000) - 0.5) * cellW * 0.75;
      const jitterY = ((((seed * 7) % 1000) / 1000) - 0.5) * cellH * 0.75;

      const x = Math.round(padding + c * cellW + cellW / 2 + jitterX);
      const y = Math.round(padding + r * cellH + cellH / 2 + jitterY);

      let isNearRiver = false;
      for (const pt of riverPath) {
        if (Math.hypot(x - pt.x, y - pt.y) < 70) {
          isNearRiver = true;
          break;
        }
      }

      const transports: TransportType[] = ["taxi"];
      if (currentId % 3 === 0 || isNearRiver) {
        transports.push("bus");
      }
      if (currentId % 7 === 0) {
        transports.push("underground");
      }
      if (isNearRiver && currentId % 5 === 0) {
        transports.push("ferry");
      }

      stations.push({
        id: currentId,
        x,
        y,
        transports
      });
      currentId++;
    }
  }

  // 3. Connect Taxi network
  for (let i = 0; i < stations.length; i++) {
    const s1 = stations[i];
    const neighbors: Array<{ id: number; dist: number }> = [];

    for (let j = 0; j < stations.length; j++) {
      if (i === j) continue;
      const s2 = stations[j];
      const dist = Math.hypot(s1.x - s2.x, s1.y - s2.y);
      if (dist < 220) {
        neighbors.push({ id: s2.id, dist });
      }
    }

    neighbors.sort((a, b) => a.dist - b.dist);
    const connectCount = Math.min(neighbors.length, 3 + (s1.id % 3));
    for (let k = 0; k < connectCount; k++) {
      addEdge(s1.id, neighbors[k].id, "taxi");
    }
  }

  // 4. Connect Bus corridors
  const busStations = stations.filter(s => s.transports.includes("bus"));
  for (let i = 0; i < busStations.length; i++) {
    const b1 = busStations[i];
    const busNeighbors: Array<{ id: number; dist: number }> = [];

    for (let j = 0; j < busStations.length; j++) {
      if (i === j) continue;
      const b2 = busStations[j];
      const dist = Math.hypot(b1.x - b2.x, b1.y - b2.y);
      if (dist < 420 && dist > 100) {
        busNeighbors.push({ id: b2.id, dist });
      }
    }

    busNeighbors.sort((a, b) => a.dist - b.dist);
    const busCount = Math.min(busNeighbors.length, 2 + (b1.id % 2));
    for (let k = 0; k < busCount; k++) {
      addEdge(b1.id, busNeighbors[k].id, "bus");
    }
  }

  // 5. Connect Underground lines
  const tubeStations = stations.filter(s => s.transports.includes("underground"));
  for (let i = 0; i < tubeStations.length; i++) {
    const t1 = tubeStations[i];
    const tubeNeighbors: Array<{ id: number; dist: number }> = [];

    for (let j = 0; j < tubeStations.length; j++) {
      if (i === j) continue;
      const t2 = tubeStations[j];
      const dist = Math.hypot(t1.x - t2.x, t1.y - t2.y);
      if (dist < 750 && dist > 200) {
        tubeNeighbors.push({ id: t2.id, dist });
      }
    }

    tubeNeighbors.sort((a, b) => a.dist - b.dist);
    const tubeCount = Math.min(tubeNeighbors.length, 2);
    for (let k = 0; k < tubeCount; k++) {
      addEdge(t1.id, tubeNeighbors[k].id, "underground");
    }
  }

  // 6. Connect Ferry routes
  const ferryStations = stations.filter(s => s.transports.includes("ferry"));
  for (let i = 0; i < ferryStations.length - 1; i++) {
    addEdge(ferryStations[i].id, ferryStations[i + 1].id, "ferry");
  }

  // Start card pools
  const misterXStarts = stations
    .filter(s => s.id % 11 === 0 && s.id <= nodeCount * 0.8)
    .map(s => s.id);
  const detStarts = stations
    .filter(s => s.id % 7 === 0 && !misterXStarts.includes(s.id))
    .slice(0, 18)
    .map(s => s.id);

  return {
    id,
    name,
    width,
    height,
    surfacingRounds,
    startPositions: {
      misterX: misterXStarts.length >= 6 ? misterXStarts : [1, 10, 20, 30, 40, 50],
      detectives: detStarts.length >= 10 ? detStarts : [5, 15, 25, 35, 45, 55, 65, 75]
    },
    stations,
    edges
  };
}

// Generate Paris (280 nodes)
const parisLandmarks = [
  { name: "Tour Eiffel", x: 420, y: 720, isHub: true },
  { name: "Arc de Triomphe", x: 490, y: 440, isHub: true },
  { name: "Musée du Louvre", x: 880, y: 640, isHub: true },
  { name: "Cathédrale Notre-Dame", x: 1040, y: 760, isHub: true },
  { name: "Sacré-Cœur Montmartre", x: 870, y: 260, isHub: false },
  { name: "Place de la Bastille", x: 1320, y: 780, isHub: true },
  { name: "Gare du Nord", x: 1060, y: 340, isHub: true },
  { name: "Panthéon", x: 1020, y: 960, isHub: false },
  { name: "Jardin du Luxembourg", x: 890, y: 920, isHub: false },
  { name: "Opéra Garnier", x: 790, y: 460, isHub: true }
];

const parisRiver = [
  { x: 200, y: 950 },
  { x: 420, y: 740 },
  { x: 680, y: 670 },
  { x: 950, y: 710 },
  { x: 1150, y: 790 },
  { x: 1450, y: 880 },
  { x: 1700, y: 1050 }
];

const PARIS_MAP = generateCityGraph({
  id: "paris",
  name: "Paris (Intermediate)",
  width: 1850,
  height: 1350,
  nodeCount: 280,
  landmarks: parisLandmarks,
  riverPath: parisRiver,
  surfacingRounds: [3, 8, 13, 18, 24],
  maxUndergroundHops: 3
});

fs.writeFileSync("packages/common/src/maps/paris.json", JSON.stringify(PARIS_MAP, null, 2));
fs.writeFileSync(
  "packages/common/src/maps/paris.ts",
  `import type { CityMapData } from "../types/index.ts";\nimport parisJson from "./paris.json" with { type: "json" };\n\nexport const PARIS_MAP: CityMapData = parisJson as unknown as CityMapData;\n`
);
console.log(`Generated Paris Map: ${PARIS_MAP.stations.length} stations, ${PARIS_MAP.edges.length} edges.`);

// Generate New York City (380 nodes)
const nycLandmarks = [
  { name: "Times Square", x: 1050, y: 560, isHub: true },
  { name: "Central Park South", x: 1040, y: 380, isHub: true },
  { name: "Grand Central Terminal", x: 1180, y: 600, isHub: true },
  { name: "Empire State Building", x: 1070, y: 720, isHub: true },
  { name: "World Trade Center", x: 820, y: 1220, isHub: true },
  { name: "Wall Street", x: 890, y: 1340, isHub: true },
  { name: "Brooklyn Bridge", x: 1060, y: 1260, isHub: true },
  { name: "DUMBO Waterfront", x: 1180, y: 1320, isHub: false },
  { name: "Williamsburg Bridge", x: 1350, y: 1060, isHub: false },
  { name: "SoHo Broadway", x: 940, y: 1020, isHub: true },
  { name: "Greenwich Village", x: 880, y: 900, isHub: false },
  { name: "Union Square", x: 1100, y: 840, isHub: true }
];

const nycRiver = [
  { x: 1300, y: 450 },
  { x: 1280, y: 750 },
  { x: 1220, y: 1000 },
  { x: 1100, y: 1250 },
  { x: 920, y: 1450 },
  { x: 750, y: 1550 }
];

const NEWYORK_MAP = generateCityGraph({
  id: "newyork",
  name: "New York City (Expert)",
  width: 2200,
  height: 1600,
  nodeCount: 380,
  landmarks: nycLandmarks,
  riverPath: nycRiver,
  surfacingRounds: [4, 9, 14, 19, 24],
  maxUndergroundHops: 4
});

fs.writeFileSync("packages/common/src/maps/newyork.json", JSON.stringify(NEWYORK_MAP, null, 2));
fs.writeFileSync(
  "packages/common/src/maps/newyork.ts",
  `import type { CityMapData } from "../types/index.ts";\nimport newyorkJson from "./newyork.json" with { type: "json" };\n\nexport const NEWYORK_MAP: CityMapData = newyorkJson as unknown as CityMapData;\n`
);
console.log(`Generated New York Map: ${NEWYORK_MAP.stations.length} stations, ${NEWYORK_MAP.edges.length} edges.`);
