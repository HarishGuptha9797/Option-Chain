import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Data structures mimicking Python ones
export interface SideData {
  ltp: number;
  p_change: number;
  oi: number;
  oi_change: number;
  oi_change_pct: number;
  volume: number;
}

export interface StrikeRow {
  strike: number;
  ce: SideData;
  pe: SideData;
}

export interface ChainSnapshot {
  symbol: string;
  underlying: number;
  expiry: string;
  timestamp: string;
  rows: StrikeRow[];
  vix?: number | null;
  vix_change?: number | null;
  total_call_oi: number;
  total_put_oi: number;
  total_call_oi_change: number;
  total_put_oi_change: number;
  pcr: number;
  atm_index: number;
}
