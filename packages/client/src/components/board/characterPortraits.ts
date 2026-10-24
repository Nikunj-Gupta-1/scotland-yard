import type { PlayerRole } from "@scotland-yard/common";

export interface OperativeDossier {
  role: PlayerRole;
  callsign: string;
  name: string;
  department: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  badgeSymbol: string;
  avatarIcon: string;
}

export const OPERATIVE_DOSSIERS: Record<PlayerRole, OperativeDossier> = {
  misterX: {
    role: "misterX",
    callsign: "PHANTOM",
    name: "Mister X",
    department: "Syndicate Fugitive",
    tagline: "Always one stop ahead in the London fog.",
    primaryColor: "#1E1B4B",
    secondaryColor: "#8B5CF6",
    glowColor: "rgba(139, 92, 246, 0.8)",
    badgeSymbol: "X",
    avatarIcon: "🕵️‍♂️"
  },
  detective_red: {
    role: "detective_red",
    callsign: "RED CID",
    name: "Inspector John Vance",
    department: "Criminal Investigation Dept",
    tagline: "Relentless street pursuit across the West End.",
    primaryColor: "#7F1D1D",
    secondaryColor: "#EF4444",
    glowColor: "rgba(239, 68, 68, 0.8)",
    badgeSymbol: "R",
    avatarIcon: "🔍"
  },
  detective_green: {
    role: "detective_green",
    callsign: "GREEN YARD",
    name: "Constable George MacIntyre",
    department: "Metropolitan Yard Division",
    tagline: "Knows every alley, dock, and Underground exit.",
    primaryColor: "#064E3B",
    secondaryColor: "#10B981",
    glowColor: "rgba(16, 185, 129, 0.8)",
    badgeSymbol: "G",
    avatarIcon: "🛡️"
  },
  detective_yellow: {
    role: "detective_yellow",
    callsign: "YELLOW BRANCH",
    name: "Special Agent Arthur Pendelton",
    department: "Special Branch Counter-Espionage",
    tagline: "Mathematical cordon and transit chokepoint analysis.",
    primaryColor: "#78350F",
    secondaryColor: "#F59E0B",
    glowColor: "rgba(245, 158, 11, 0.8)",
    badgeSymbol: "Y",
    avatarIcon: "📡"
  },
  detective_blue: {
    role: "detective_blue",
    callsign: "BLUE SQUAD",
    name: "Inspector Evelyn Sterling",
    department: "Flying Squad Intercept",
    tagline: "Rapid tactical deployment on arterial bus routes.",
    primaryColor: "#1E3A8A",
    secondaryColor: "#3B82F6",
    glowColor: "rgba(59, 130, 246, 0.8)",
    badgeSymbol: "B",
    avatarIcon: "⚡"
  },
  detective_purple: {
    role: "detective_purple",
    callsign: "PURPLE INTERPOL",
    name: "Commissioner Lucian Moreau",
    department: "Interpol Central Liaison",
    tagline: "International surveillance net tightening around London.",
    primaryColor: "#581C87",
    secondaryColor: "#A855F7",
    glowColor: "rgba(168, 85, 247, 0.8)",
    badgeSymbol: "P",
    avatarIcon: "🌐"
  }
};

/**
 * Draws an authentic 3D brass/enamel tabletop pawn onto the 2D canvas context.
 * Features:
 * - Contact ambient occlusion shadow
 * - Heavy beveled metallic outer rim (brass/chrome)
 * - Deep colored enamel fill with radial gradient
 * - Center insignia / monogram with crisp typography
 * - Specular top glass curved highlight
 * - Animated rotating radar beacon if active turn
 */
export function drawTabletopPawn(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  role: PlayerRole,
  isCurrentTurn: boolean,
  zoom: number,
  customLabel?: string
): void {
  const dossier = OPERATIVE_DOSSIERS[role] || OPERATIVE_DOSSIERS.detective_red;
  const isMisterX = role === "misterX";
  const radius = (isMisterX ? 17 : 15) * Math.max(0.7, Math.min(1.3, zoom));

  ctx.save();

  // 1. Animated Radar Beacon if Active Turn
  if (isCurrentTurn) {
    const beaconRadius = radius + 10 * zoom;
    const now = performance.now();
    const rotation = (now / 1200) % (Math.PI * 2);

    // Soft beacon wave
    ctx.beginPath();
    ctx.arc(x, y, beaconRadius, 0, Math.PI * 2);
    ctx.fillStyle = isMisterX ? "rgba(168, 85, 247, 0.22)" : `${dossier.secondaryColor}25`;
    ctx.fill();
    ctx.strokeStyle = dossier.secondaryColor;
    ctx.lineWidth = 1.8 * zoom;
    ctx.setLineDash([5 * zoom, 4 * zoom]);
    ctx.stroke();

    // Radar tick marks
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.beginPath();
    ctx.arc(0, 0, beaconRadius + 4 * zoom, 0, Math.PI * 0.7);
    ctx.strokeStyle = dossier.secondaryColor;
    ctx.lineWidth = 2.2 * zoom;
    ctx.setLineDash([]);
    ctx.stroke();
    ctx.restore();
  }

  // 2. Tabletop Cast Contact Shadow
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y + radius * 0.45, radius * 1.15, radius * 0.65, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.filter = `blur(${Math.max(2, Math.round(3.5 * zoom))}px)`;
  ctx.fill();
  ctx.restore();

  // 3. Beveled Metallic Outer Ring (Brass for detectives, Dark Obsidian/Chrome for X)
  ctx.save();
  const rimGrad = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
  if (isMisterX) {
    rimGrad.addColorStop(0, "#C084FC");
    rimGrad.addColorStop(0.5, "#4C1D95");
    rimGrad.addColorStop(1, "#1E1B4B");
  } else {
    rimGrad.addColorStop(0, "#FDE68A");
    rimGrad.addColorStop(0.4, "#D97706");
    rimGrad.addColorStop(0.7, "#92400E");
    rimGrad.addColorStop(1, "#FDE68A");
  }

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = rimGrad;
  ctx.fill();
  ctx.strokeStyle = isMisterX ? "#A855F7" : "rgba(0, 0, 0, 0.5)";
  ctx.lineWidth = 1 * zoom;
  ctx.stroke();
  ctx.restore();

  // 4. Enamel Body Infill
  ctx.save();
  const enamelRadius = radius * 0.82;
  const enamelGrad = ctx.createRadialGradient(
    x - enamelRadius * 0.3,
    y - enamelRadius * 0.3,
    enamelRadius * 0.1,
    x,
    y,
    enamelRadius
  );
  enamelGrad.addColorStop(0, dossier.secondaryColor);
  enamelGrad.addColorStop(1, dossier.primaryColor);

  ctx.beginPath();
  ctx.arc(x, y, enamelRadius, 0, Math.PI * 2);
  ctx.fillStyle = enamelGrad;
  ctx.fill();

  // Inner beveled stroke
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 1.2 * zoom;
  ctx.stroke();
  ctx.restore();

  // 5. Center Badge Monogram / Emblem
  ctx.save();
  const innerRadius = enamelRadius * 0.68;
  ctx.beginPath();
  ctx.arc(x, y, innerRadius, 0, Math.PI * 2);
  ctx.fillStyle = isMisterX ? "#0F0A1E" : "#090D16";
  ctx.fill();
  ctx.strokeStyle = isMisterX ? "#C084FC" : dossier.secondaryColor;
  ctx.lineWidth = 1.2 * zoom;
  ctx.stroke();

  // Monogram / Insignia Text
  const symbol = customLabel || dossier.badgeSymbol;
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `900 ${Math.round(11 * zoom)}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = dossier.glowColor;
  ctx.shadowBlur = 6 * zoom;
  ctx.fillText(symbol, x, y);
  ctx.restore();

  // 6. Specular Curved Glass Reflection
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(
    x,
    y - radius * 0.38,
    radius * 0.58,
    radius * 0.28,
    -Math.PI / 16,
    0,
    Math.PI * 2
  );
  const specGrad = ctx.createLinearGradient(x, y - radius * 0.6, x, y - radius * 0.1);
  specGrad.addColorStop(0, "rgba(255, 255, 255, 0.45)");
  specGrad.addColorStop(1, "rgba(255, 255, 255, 0.0)");
  ctx.fillStyle = specGrad;
  ctx.fill();
  ctx.restore();

  ctx.restore();
}
