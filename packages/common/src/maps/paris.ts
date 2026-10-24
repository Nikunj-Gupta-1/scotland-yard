import type { CityMapData } from "../types/index.ts";
import parisJson from "./paris.json" with { type: "json" };

export const PARIS_MAP: CityMapData = parisJson as unknown as CityMapData;
