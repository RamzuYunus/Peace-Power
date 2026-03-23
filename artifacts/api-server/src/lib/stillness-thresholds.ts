/**
 * Stillness detection thresholds — server-side copy.
 * Must stay in sync with signal-processing.ts on the frontend.
 */

export interface StillnessMatch {
  level: 1 | 2 | 3 | 4;
  label: string;
  badge: string;
}

const THRESHOLDS: { level: 1 | 2 | 3 | 4; hrMax: number; sdnnMax: number; rmssdMin: number }[] = [
  { level: 4, hrMax: 46,  sdnnMax: 8,  rmssdMin: 250 },
  { level: 3, hrMax: 50,  sdnnMax: 12, rmssdMin: 180 },
  { level: 2, hrMax: 54,  sdnnMax: 18, rmssdMin: 120 },
  { level: 1, hrMax: 58,  sdnnMax: 25, rmssdMin: 80  },
];

const LABELS: Record<number, { label: string; badge: string }> = {
  4: { label: "Fanā' Union",    badge: "☀️"  },
  3: { label: "Qalb Polished",  badge: "🌙✨" },
  2: { label: "Sakīnah II",     badge: "🌙"  },
  1: { label: "Sakīnah I",      badge: "🌙"  },
};

/** Check precise float metrics (no rounding artifacts). */
export function detectStillnessLevel(
  heartRate: number,
  sdnn: number,
  rmssd: number,
  isFlat: boolean = false
): StillnessMatch | null {
  for (const t of THRESHOLDS) {
    if (heartRate < t.hrMax && sdnn < t.sdnnMax && rmssd > t.rmssdMin) {
      return { level: t.level, ...LABELS[t.level] };
    }
  }
  // Flatness backup for Level 1
  if (isFlat && rmssd > 150 && heartRate < 60 && sdnn < 30) {
    return { level: 1, ...LABELS[1] };
  }
  return null;
}

/** Re-classify using stored integer metrics (for retroactive migration). */
export function reclassifyFromMetrics(
  heartRate: number,
  sdnn: number,
  rmssd: number
): {
  isStillnessMode: boolean;
  stillnessLevel: number;
  stillnessLabel: string;
  stillnessBadge: string;
  coherenceScore: number;
  coherenceLevel: string;
} {
  for (const t of THRESHOLDS) {
    if (heartRate < t.hrMax && sdnn < t.sdnnMax && rmssd > t.rmssdMin) {
      const info = LABELS[t.level];
      return {
        isStillnessMode: true,
        stillnessLevel: t.level,
        stillnessLabel: info.label,
        stillnessBadge: info.badge,
        coherenceScore: 10,
        coherenceLevel: "Deep Stillness",
      };
    }
  }
  return {
    isStillnessMode: false,
    stillnessLevel: 0,
    stillnessLabel: "",
    stillnessBadge: "",
    coherenceScore: -1,
    coherenceLevel: "",
  };
}
