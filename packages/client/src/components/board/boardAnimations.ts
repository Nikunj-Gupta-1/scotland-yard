import type { PlayerRole } from "@scotland-yard/common";
import type { Point } from "../../lib/canvasMath";

export interface PawnGlideAnimation {
  role: PlayerRole;
  fromStation: number;
  toStation: number;
  startTime: number;
  duration: number; // ms (typically 500-650ms)
  p1: Point;        // World space start
  p2: Point;        // World space end
  cp: Point;        // World space Bezier control point
}

export interface SurfacingShockwave {
  stationId: number;
  startTime: number;
  duration: number; // ms (e.g. 2400ms)
  color: string;
}

export class BoardAnimationManager {
  private glides = new Map<PlayerRole, PawnGlideAnimation>();
  private shockwaves: SurfacingShockwave[] = [];

  /**
   * Registers a new glide animation for an operative.
   */
  public startPawnGlide(
    role: PlayerRole,
    fromStation: number,
    toStation: number,
    p1: Point,
    p2: Point,
    cp: Point,
    duration = 550
  ): void {
    if (fromStation === toStation) return;
    this.glides.set(role, {
      role,
      fromStation,
      toStation,
      startTime: performance.now(),
      duration,
      p1,
      p2,
      cp
    });
  }

  /**
   * Gets current world-space position of a pawn if actively gliding.
   * Returns null if pawn is at rest.
   */
  public getGlidingPawnPosition(role: PlayerRole, now: number = performance.now()): Point | null {
    const glide = this.glides.get(role);
    if (!glide) return null;

    const elapsed = now - glide.startTime;
    if (elapsed >= glide.duration) {
      this.glides.delete(role);
      return null;
    }

    const rawT = Math.min(1, Math.max(0, elapsed / glide.duration));
    // Easing: easeOutCubic
    const t = 1 - Math.pow(1 - rawT, 3);

    // Quadratic Bezier interpolation: B(t) = (1-t)^2 * P1 + 2(1-t)t * CP + t^2 * P2
    const oneMinusT = 1 - t;
    const x =
      oneMinusT * oneMinusT * glide.p1.x +
      2 * oneMinusT * t * glide.cp.x +
      t * t * glide.p2.x;
    const y =
      oneMinusT * oneMinusT * glide.p1.y +
      2 * oneMinusT * t * glide.cp.y +
      t * t * glide.p2.y;

    return { x, y };
  }

  /**
   * Triggers a surfacing sonar shockwave from a station.
   */
  public triggerSurfacingShockwave(stationId: number, color = "#A855F7"): void {
    this.shockwaves.push({
      stationId,
      startTime: performance.now(),
      duration: 2500,
      color
    });
  }

  public getActiveShockwaves(now: number = performance.now()): SurfacingShockwave[] {
    // Clean expired
    this.shockwaves = this.shockwaves.filter((sw) => now - sw.startTime < sw.duration);
    return this.shockwaves;
  }

  public hasActiveAnimations(): boolean {
    return this.glides.size > 0 || this.shockwaves.length > 0;
  }
}

export const boardAnimationManager = new BoardAnimationManager();
