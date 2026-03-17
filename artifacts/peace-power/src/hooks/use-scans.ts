import { useState, useEffect } from "react";
import { useGetMyScans } from "@workspace/api-client-react";
import { type ScanResult } from "@/lib/signal-processing";

const STORAGE_KEY = "peace_power_scans";

export function useScans() {
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Fetch scans from backend API
  const { data: backendScans = [] } = useGetMyScans({
    query: { retry: 1 }
  });

  useEffect(() => {
    // Start with backend scans (source of truth)
    if (backendScans && backendScans.length > 0) {
      const transformed = backendScans.map(scan => ({
        ...scan,
        timestamp: new Date(scan.createdAt).getTime()
      })) as ScanResult[];
      setScans(transformed);
      // Also sync to localStorage for offline access
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(transformed));
      } catch (e) {
        console.error("Failed to sync scans to localStorage", e);
      }
    } else {
      // Fallback to localStorage if no backend data
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setScans(JSON.parse(stored));
        }
      } catch (e) {
        console.error("Failed to load scans from localStorage", e);
      }
    }
    setIsLoaded(true);
  }, [backendScans]);

  const addScan = (scan: ScanResult) => {
    const updated = [scan, ...scans];
    setScans(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save scan to localStorage", e);
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
