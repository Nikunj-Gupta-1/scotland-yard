import type { FrameCtx } from "./boardDraw.ts";
import { worldToScreen } from "../../lib/canvasMath.ts";
import type { Point } from "../../lib/canvasMath.ts";

export interface DistrictWatermark {
  name: string;
  x: number;
  y: number;
  rotation?: number;
  size?: number;
}

export interface LandmarkBadge {
  stationId: number;
  name: string;
  category: "palace" | "museum" | "bridge" | "park" | "cathedral" | "station" | "monument";
  icon: string;
  x: number;
  y: number;
}

export interface VectorPolygon {
  name?: string;
  color?: string;
  points: Point[];
}

export interface CityCartographyData {
  cityId: string;
  rivers: Point[][];
  parks: VectorPolygon[];
  districts: DistrictWatermark[];
  landmarks: LandmarkBadge[];
}

/**
 * Curated topological geographic vectors for London (1650 x 1250).
 * Matches the classic Scotland Yard board layout and River Thames S-curve.
 */
export const LONDON_CARTOGRAPHY: CityCartographyData = {
  cityId: "london",
  rivers: [
    // River Thames main spline (coordinates aligned with ferry stations 194, 157, 115, 117, 108, 107)
    [
      { x: -50, y: 940 },
      { x: 120, y: 970 },
      { x: 280, y: 1020 },
      { x: 420, y: 1070 },
      { x: 534, y: 1128 }, // Station 194
      { x: 640, y: 1130 },
      { x: 760, y: 1080 },
      { x: 860, y: 1010 },
      { x: 949, y: 917 },  // Station 157
      { x: 980, y: 820 },
      { x: 972, y: 700 },
      { x: 972, y: 553 },  // Station 115 (Westminster)
      { x: 1050, y: 560 },
      { x: 1180, y: 620 },
      { x: 1294, y: 670 }, // Station 117
      { x: 1393, y: 642 }, // Station 108 (Tower)
      { x: 1500, y: 590 },
      { x: 1591, y: 548 }, // Station 107
      { x: 1720, y: 510 }
    ]
  ],
  parks: [
    // Hyde Park & Kensington Gardens
    {
      name: "Hyde Park",
      points: [
        { x: 170, y: 390 },
        { x: 380, y: 390 },
        { x: 490, y: 440 },
        { x: 530, y: 580 },
        { x: 470, y: 690 },
        { x: 340, y: 690 },
        { x: 170, y: 580 }
      ]
    },
    // Regent's Park
    {
      name: "Regent's Park",
      points: [
        { x: 450, y: 80 },
        { x: 680, y: 80 },
        { x: 740, y: 180 },
        { x: 720, y: 300 },
        { x: 520, y: 320 },
        { x: 430, y: 220 }
      ]
    },
    // Green Park & St. James's Park
    {
      name: "St. James's Park",
      points: [
        { x: 690, y: 650 },
        { x: 860, y: 630 },
        { x: 910, y: 720 },
        { x: 850, y: 770 },
        { x: 720, y: 730 }
      ]
    },
    // Battersea Park
    {
      name: "Battersea Park",
      points: [
        { x: 490, y: 1170 },
        { x: 720, y: 1170 },
        { x: 750, y: 1260 },
        { x: 470, y: 1260 }
      ]
    }
  ],
  districts: [
    { name: "MARYLEBONE", x: 440, y: 270, size: 14 },
    { name: "BLOOMSBURY", x: 820, y: 260, size: 14 },
    { name: "MAYFAIR", x: 520, y: 510, size: 16 },
    { name: "SOHO", x: 730, y: 460, size: 15 },
    { name: "COVENT GARDEN", x: 880, y: 460, size: 13 },
    { name: "THE CITY", x: 1220, y: 430, size: 18 },
    { name: "WHITECHAPEL", x: 1480, y: 410, size: 15 },
    { name: "WESTMINSTER", x: 850, y: 660, size: 16 },
    { name: "SOUTHWARK", x: 1200, y: 760, size: 15 },
    { name: "BERMONDSEY", x: 1460, y: 790, size: 14 },
    { name: "KENSINGTON", x: 190, y: 670, size: 15 },
    { name: "CHELSEA", x: 420, y: 920, size: 15 },
    { name: "LAMBETH", x: 960, y: 960, size: 14 }
  ],
  landmarks: [
    { stationId: 13, name: "Baker Street (Sherlock Holmes)", category: "museum", icon: "🔍", x: 438, y: 282 },
    { stationId: 67, name: "British Museum", category: "museum", icon: "🏛️", x: 820, y: 350 },
    { stationId: 79, name: "St. Paul's Cathedral", category: "cathedral", icon: "⛪", x: 1205, y: 450 },
    { stationId: 89, name: "Buckingham Palace", category: "palace", icon: "👑", x: 742, y: 670 },
    { stationId: 108, name: "Tower of London", category: "monument", icon: "🏰", x: 1393, y: 642 },
    { stationId: 115, name: "Houses of Parliament / Big Ben", category: "monument", icon: "🕰️", x: 972, y: 553 },
    { stationId: 128, name: "Waterloo Station", category: "station", icon: "🚂", x: 1056, y: 712 },
    { stationId: 93, name: "Piccadilly Circus", category: "monument", icon: "🌟", x: 775, y: 535 },
    { stationId: 1, name: "Paddington Station", category: "station", icon: "🚂", x: 190, y: 40 }
  ]
};

/**
 * Curated geographic vectors for Paris (1850 x 1350).
 */
export const PARIS_CARTOGRAPHY: CityCartographyData = {
  cityId: "paris",
  rivers: [
    // River Seine flowing NW to SE through central Paris
    [
      { x: -50, y: 680 },
      { x: 250, y: 640 },
      { x: 500, y: 580 },
      { x: 750, y: 550 },
      { x: 925, y: 620 }, // Île de la Cité north
      { x: 1100, y: 700 },
      { x: 1350, y: 820 },
      { x: 1600, y: 960 },
      { x: 1920, y: 1100 }
    ],
    // Île de la Cité southern branch
    [
      { x: 850, y: 620 },
      { x: 940, y: 690 },
      { x: 1050, y: 730 }
    ]
  ],
  parks: [
    // Champ de Mars (Eiffel Tower)
    {
      name: "Champ de Mars",
      points: [
        { x: 420, y: 640 },
        { x: 540, y: 600 },
        { x: 610, y: 720 },
        { x: 480, y: 770 }
      ]
    },
    // Jardin des Tuileries & Louvre
    {
      name: "Jardin des Tuileries",
      points: [
        { x: 720, y: 500 },
        { x: 920, y: 470 },
        { x: 960, y: 560 },
        { x: 750, y: 580 }
      ]
    },
    // Jardin du Luxembourg
    {
      name: "Jardin du Luxembourg",
      points: [
        { x: 870, y: 790 },
        { x: 1040, y: 770 },
        { x: 1060, y: 910 },
        { x: 890, y: 930 }
      ]
    }
  ],
  districts: [
    { name: "MONTMARTRE", x: 930, y: 180, size: 16 },
    { name: "OPÉRA", x: 850, y: 360, size: 14 },
    { name: "CHAMPS-ÉLYSÉES", x: 520, y: 440, size: 15 },
    { name: "LE MARAIS", x: 1200, y: 490, size: 15 },
    { name: "LATIN QUARTER", x: 1050, y: 800, size: 14 },
    { name: "SAINT-GERMAIN", x: 780, y: 700, size: 14 },
    { name: "MONTPARNASSE", x: 720, y: 980, size: 15 },
    { name: "BASTILLE", x: 1400, y: 660, size: 15 }
  ],
  landmarks: [
    { stationId: 1, name: "Tour Eiffel", category: "monument", icon: "🗼", x: 460, y: 610 },
    { stationId: 4, name: "Notre-Dame de Paris", category: "cathedral", icon: "⛪", x: 980, y: 660 },
    { stationId: 10, name: "Musée du Louvre", category: "museum", icon: "🏛️", x: 880, y: 520 },
    { stationId: 25, name: "Arc de Triomphe", category: "monument", icon: "🏛️", x: 420, y: 390 },
    { stationId: 50, name: "Sacré-Cœur", category: "cathedral", icon: "⛪", x: 950, y: 150 }
  ]
};

/**
 * Curated geographic vectors for New York (2200 x 1600).
 */
export const NEWYORK_CARTOGRAPHY: CityCartographyData = {
  cityId: "newyork",
  rivers: [
    // Hudson River (West side of Manhattan)
    [
      { x: 450, y: -50 },
      { x: 510, y: 350 },
      { x: 560, y: 700 },
      { x: 620, y: 1050 },
      { x: 690, y: 1350 },
      { x: 770, y: 1680 }
    ],
    // East River (East side of Manhattan)
    [
      { x: 1350, y: -50 },
      { x: 1280, y: 350 },
      { x: 1220, y: 650 },
      { x: 1260, y: 950 },
      { x: 1140, y: 1250 },
      { x: 980, y: 1450 },
      { x: 920, y: 1680 }
    ]
  ],
  parks: [
    // Central Park
    {
      name: "Central Park",
      points: [
        { x: 740, y: 220 },
        { x: 1060, y: 240 },
        { x: 1010, y: 780 },
        { x: 700, y: 760 }
      ]
    },
    // Battery Park
    {
      name: "Battery Park",
      points: [
        { x: 810, y: 1470 },
        { x: 910, y: 1460 },
        { x: 930, y: 1560 },
        { x: 810, y: 1560 }
      ]
    }
  ],
  districts: [
    { name: "UPPER WEST SIDE", x: 650, y: 440, size: 14 },
    { name: "UPPER EAST SIDE", x: 1120, y: 440, size: 14 },
    { name: "MIDTOWN MANHATTAN", x: 880, y: 920, size: 17 },
    { name: "CHELSEA", x: 680, y: 1080, size: 14 },
    { name: "GREENWICH VILLAGE", x: 780, y: 1220, size: 14 },
    { name: "SOHO", x: 820, y: 1330, size: 14 },
    { name: "FINANCIAL DISTRICT", x: 860, y: 1450, size: 15 },
    { name: "BROOKLYN", x: 1350, y: 1380, size: 18 }
  ],
  landmarks: [
    { stationId: 1, name: "Times Square", category: "monument", icon: "🌟", x: 820, y: 880 },
    { stationId: 6, name: "Wall Street / NYSE", category: "monument", icon: "📈", x: 880, y: 1460 },
    { stationId: 15, name: "Empire State Building", category: "monument", icon: "🏙️", x: 860, y: 980 },
    { stationId: 30, name: "Grand Central Terminal", category: "station", icon: "🚂", x: 940, y: 890 },
    { stationId: 45, name: "Brooklyn Bridge", category: "bridge", icon: "🌉", x: 1040, y: 1400 },
    { stationId: 80, name: "Central Park Great Lawn", category: "park", icon: "🌲", x: 880, y: 480 }
  ]
};

export const CITY_CARTOGRAPHY_REGISTRY: Record<string, CityCartographyData> = {
  london: LONDON_CARTOGRAPHY,
  paris: PARIS_CARTOGRAPHY,
  newyork: NEWYORK_CARTOGRAPHY
};

export function getCartographyForCity(cityId: string): CityCartographyData {
  return CITY_CARTOGRAPHY_REGISTRY[cityId] || LONDON_CARTOGRAPHY;
}

/**
 * Draws the vector waterways with realistic water gradients, shoreline glow,
 * and river surface ripples.
 */
export function drawVectorRivers(frame: FrameCtx, cartography: CityCartographyData): void {
  const { ctx, viewport, width, height } = frame;
  const rivers = cartography.rivers;
  if (!rivers || rivers.length === 0) return;

  ctx.save();
  for (const spline of rivers) {
    if (spline.length < 2) continue;

    // Convert world points to screen
    const screenPoints = spline.map((p) => worldToScreen(p.x, p.y, viewport, width, height));

    // River bed outline
    ctx.beginPath();
    ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
    for (let i = 1; i < screenPoints.length - 1; i++) {
      const xc = (screenPoints[i].x + screenPoints[i + 1].x) / 2;
      const yc = (screenPoints[i].y + screenPoints[i + 1].y) / 2;
      ctx.quadraticCurveTo(screenPoints[i].x, screenPoints[i].y, xc, yc);
    }
    const last = screenPoints[screenPoints.length - 1];
    ctx.lineTo(last.x, last.y);

    // River water styling
    const riverWidth = Math.max(34, 54 * viewport.zoom);
    ctx.lineWidth = riverWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Shoreline soft glow
    ctx.strokeStyle = "rgba(14, 116, 144, 0.18)";
    ctx.stroke();

    // River inner deep water
    ctx.lineWidth = riverWidth * 0.8;
    ctx.strokeStyle = "rgba(8, 47, 73, 0.45)";
    ctx.stroke();

    // River core subtle stream highlight
    ctx.lineWidth = riverWidth * 0.35;
    ctx.strokeStyle = "rgba(56, 189, 248, 0.12)";
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draws vector parks and urban green spaces.
 */
export function drawVectorParks(frame: FrameCtx, cartography: CityCartographyData): void {
  const { ctx, viewport, width, height } = frame;
  const parks = cartography.parks;
  if (!parks || parks.length === 0) return;

  ctx.save();
  for (const park of parks) {
    if (park.points.length < 3) continue;
    const pts = park.points.map((p) => worldToScreen(p.x, p.y, viewport, width, height));

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.closePath();

    // Dark emerald park tint with faint border
    ctx.fillStyle = "rgba(6, 78, 59, 0.14)";
    ctx.fill();
    ctx.strokeStyle = "rgba(16, 185, 129, 0.12)";
    ctx.lineWidth = Math.max(1, 1.5 * viewport.zoom);
    ctx.stroke();

    // Park label
    if (park.name && viewport.zoom > 0.5) {
      const centerX = pts.reduce((acc, p) => acc + p.x, 0) / pts.length;
      const centerY = pts.reduce((acc, p) => acc + p.y, 0) / pts.length;

      ctx.fillStyle = "rgba(110, 231, 183, 0.35)";
      ctx.font = `600 ${Math.round(11 * viewport.zoom)}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(park.name.toUpperCase(), centerX, centerY);
    }
  }
  ctx.restore();
}

/**
 * Draws typographic district watermarks in tactical noir style.
 */
export function drawDistrictWatermarks(frame: FrameCtx, cartography: CityCartographyData): void {
  const { ctx, viewport, width, height } = frame;
  if (viewport.zoom < 0.45) return; // Hide when zoomed out too far

  ctx.save();
  for (const d of cartography.districts) {
    const sp = worldToScreen(d.x, d.y, viewport, width, height);
    if (sp.x < -100 || sp.x > width + 100 || sp.y < -50 || sp.y > height + 50) continue;

    ctx.save();
    ctx.translate(sp.x, sp.y);
    if (d.rotation) ctx.rotate(d.rotation);

    const fontSize = Math.max(9, Math.round((d.size || 14) * viewport.zoom));
    ctx.font = `800 ${fontSize}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
    ctx.letterSpacing = "2px";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(148, 163, 184, 0.08)"; // Subtle atmospheric watermark
    ctx.fillText(d.name, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

/**
 * Draws distinctive landmark badges on prominent hub stations.
 */
export function drawLandmarkBadges(
  frame: FrameCtx,
  cartography: CityCartographyData,
  hoveredStationId: number | null
): void {
  const { ctx, viewport, width, height } = frame;
  if (viewport.zoom < 0.55) return; // Hide when zoomed out

  ctx.save();
  for (const lm of cartography.landmarks) {
    const sp = worldToScreen(lm.x, lm.y, viewport, width, height);
    if (sp.x < -50 || sp.x > width + 50 || sp.y < -50 || sp.y > height + 50) continue;

    const isHovered = hoveredStationId === lm.stationId;
    const badgeY = sp.y - (isHovered ? 26 : 22) * viewport.zoom;

    // Small landmark callout pill
    ctx.save();
    ctx.translate(sp.x, badgeY);

    const label = `${lm.icon} ${lm.name}`;
    const fontSize = Math.max(9, Math.round(9.5 * viewport.zoom));
    ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
    const textWidth = ctx.measureText(label).width;
    const paddingX = 6 * viewport.zoom;
    const pillHeight = 16 * viewport.zoom;

    // Pill background
    ctx.beginPath();
    const r = pillHeight / 2;
    const left = -textWidth / 2 - paddingX;
    const right = textWidth / 2 + paddingX;
    ctx.roundRect(left, -r, right - left, pillHeight, r);
    ctx.fillStyle = isHovered ? "rgba(15, 23, 42, 0.95)" : "rgba(15, 23, 42, 0.75)";
    ctx.fill();
    ctx.strokeStyle = isHovered ? "#38BDF8" : "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Text
    ctx.fillStyle = isHovered ? "#F8FAFC" : "#CBD5E1";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 0, 0);

    ctx.restore();
  }
  ctx.restore();
}
