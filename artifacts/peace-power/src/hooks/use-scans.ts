import { useState, useEffect } from "react";
import { type ScanResult } from "@/lib/signal-processing";

const STORAGE_KEY = "peace_power_scans";

export function useScans() {
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setScans(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load scans", e);
    }
    setIsLoaded(true);
  }, []);

  const addScan = (scan: ScanResult) => {
    const updated = [scan, ...scans];
    setScans(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save scan", e);
    }
  };

  const clearHistory = () => {
    setScans([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const getTodayScans = () => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return scans.filter(s => s.timestamp >= startOfDay.getTime());
  };

  return {
    scans,
    todayScans: getTodayScans(),
    addScan,
    clearHistory,
    isLoaded
  };
}
