import type { TransportType } from "@scotland-yard/common";

// Colors for transit lines and rings
export const TRANSIT_COLORS: Record<TransportType, string> = {
  taxi: "#F59E0B",        // Amber / Yellow
  bus: "#10B981",         // Emerald Green
  underground: "#EF4444", // Crimson Red
  ferry: "#06B6D4"        // Cyan Waterway
};

export const DETECTIVE_COLORS: Record<string, string> = {
  detective_red: "#EF4444",
  detective_green: "#10B981",
  detective_yellow: "#FBBF24",
  detective_blue: "#3B82F6",
  detective_purple: "#A855F7"
};

export const DEFAULT_ZOOM = 0.75;
export const MIN_ZOOM = 0.3;
export const MAX_ZOOM = 3.0;
