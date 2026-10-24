import { LONDON_MAP } from "./london.ts";
import { PARIS_MAP } from "./paris.ts";
import { NEWYORK_MAP } from "./newyork.ts";
import type { CityMapData } from "../types/index.ts";

export * from "./london.ts";
export * from "./paris.ts";
export * from "./newyork.ts";

export const CITY_MAPS: Record<string, CityMapData> = {
  london: LONDON_MAP,
  paris: PARIS_MAP,
  newyork: NEWYORK_MAP
};

export function getMapById(id: string): CityMapData {
  return CITY_MAPS[id] || LONDON_MAP;
}
