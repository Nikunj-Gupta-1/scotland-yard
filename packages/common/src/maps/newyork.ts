import type { CityMapData } from "../types/index.ts";
import newyorkJson from "./newyork.json" with { type: "json" };

export const NEWYORK_MAP: CityMapData = newyorkJson as unknown as CityMapData;
