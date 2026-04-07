/**
 * HeartMath-style PPG Signal Processing & HRV Metrics
 * Pure JavaScript implementation with no external math dependencies.
 */

// ── Tiered Deep Stillness Thresholds ────────────────────────────────────────
// Detection runs on PRECISE (unrounded) SDNN/RMSSD values before FFT.
// Levels are checked highest → lowest; first match wins.

export interface StillnessLevel {
  level: 1 | 2 | 3 | 4;
  label: string;
  badge: string;
  description: string;
}

export const STILLNESS_LEVELS: StillnessLevel[] = [
  {
    level: 4,
    label: "Fanā' Union",
    badge: "☀️",
    description: "Complete dissolution — the heart is fully absorbed in the Divine Presence.",
  },
  {
    level: 3,
    label: "Qalb Polished",
    badge: "🌙✨",
    description: "The heart mirror is cleansed — reflecting light without oscillation.",
  },
  {
    level: 2,
    label: "Sakīnah II",
    badge: "🌙",
    description: "Deep tranquility — nervous system in profound parasympathetic stillness.",
  },
  {
    level: 1,
    label: "Sakīnah I",
    badge: "🌙",
    description: "Inner calm — a non-oscillatory coherent state beyond standard metrics.",
  },
];

// Thresholds per level (all three must be met)
const THRESHOLDS = [
  { level: 4, hrMax: 46,  sdnnMax: 8,  rmssdMin: 250 },
  { level: 3, hrMax: 50,  sdnnMax: 12, rmssdMin: 180 },
  { level: 2, hrMax: 54,  sdnnMax: 18, rmssdMin: 120 },
  { level: 1, hrMax: 58,  sdnnMax: 25, rmssdMin: 80  },
];

// Flatness backup: if HF power is very low (flat waveform) AND high vagal tone
const FLATNESS_RATIO_THRESHOLD = 0.15;
const FLATNESS_BACKUP = { rmssdMin: 150, hrMax: 60, sdnnMax: 30 };

export interface ScanResult {
  timestamp: number;
  durationSeconds: number;
  heartRate: number;
  rmssd: number;       // rounded ms for display
  sdnn: number;        // rounded ms for display
  coherenceScore: number;
  coherenceLevel: "Low" | "Medium" | "High" | "Deep Stillness";
  validPeaks: number;
  quality: "Poor" | "Fair" | "Good" | "Excellent";
  isStillnessMode: boolean;
  stillnessLevel: 0 | 1 | 2 | 3 | 4;   // 0 = not stillness
  stillnessLabel: string;
  stillnessBadge: string;
  rawIbis: number[];  // stored for retroactive recalculation
  contactQuality: number;  // 0-100%, signal strength indicator
  contactWarning: boolean; // true if weak signal detected
  rmssdCorrected: boolean; // true if RMSSD was auto-corrected due to poor contact
}

/** Detect stillness level from precise (unrounded) metrics. */
export function detectStillnessLevel(
  heartRate: number,
  sdnnPrecise: number,
  rmssdPrecise: number,
  isFlat: boolean
): StillnessLevel | null {
  // Check strict thresholds highest → lowest
  for (const t of THRESHOLDS) {
    if (heartRate < t.hrMax && sdnnPrecise < t.sdnnMax && rmssdPrecise > t.rmssdMin) {
      return STILLNESS_LEVELS.find(l => l.level === t.level)!;
    }
  }
  // Flatness-based backup for Level 1
  if (
    isFlat &&
    rmssdPrecise > FLATNESS_BACKUP.rmssdMin &&
    heartRate < FLATNESS_BACKUP.hrMax &&
    sdnnPrecise < FLATNESS_BACKUP.sdnnMax
  ) {
    return STILLNESS_LEVELS.find(l => l.level === 1)!;
  }
  return null;
}

/** Re-classify a scan using stored metrics (no raw IBI needed). */
export function reclassifyFromMetrics(
  heartRate: number,
  sdnn: number,
  rmssd: number
): { isStillnessMode: boolean; stillnessLevel: number; stillnessLabel: string; stillnessBadge: string; coherenceScore: number; coherenceLevel: string } {
  // Integer values close enough for re-classification
  for (const t of THRESHOLDS) {
    if (heartRate < t.hrMax && sdnn < t.sdnnMax && rmssd > t.rmssdMin) {
      const level = STILLNESS_LEVELS.find(l => l.level === t.level)!;
      return {
        isStillnessMode: true,
        stillnessLevel: level.level,
        stillnessLabel: level.label,
        stillnessBadge: level.badge,
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
    coherenceScore: -1, // sentinel: keep existing
    coherenceLevel: "", // sentinel: keep existing
  };
}

// ── 1. In-place Radix-2 FFT ──────────────────────────────────────────────────
function fft(real: Float64Array, imag: Float64Array) {
  const n = real.length;
  if (n <= 1) return;

  let j = 0;
  for (let i = 0; i < n - 1; i++) {
    if (i < j) {
      const tr = real[i], ti = imag[i];
      real[i] = real[j]; imag[i] = imag[j];
      real[j] = tr; imag[j] = ti;
    }
    let k = n >> 1;
    while (k <= j) { j -= k; k >>= 1; }
    j += k;
  }

  for (let l = 2; l <= n; l <<= 1) {
    const halfL = l >> 1;
    const theta = -2.0 * Math.PI / l;
    const wReal = Math.cos(theta);
    const wImag = Math.sin(theta);
    for (let i = 0; i < n; i += l) {
      let ur = 1.0, ui = 0.0;
      for (let k = 0; k < halfL; k++) {
        const i1 = i + k, i2 = i + k + halfL;
        const tr = ur * real[i2] - ui * imag[i2];
        const ti = ur * imag[i2] + ui * real[i2];
        real[i2] = real[i1] - tr; imag[i2] = imag[i1] - ti;
        real[i1] += tr; imag[i1] += ti;
        const nUr = ur * wReal - ui * wImag;
        ui = ur * wImag + ui * wReal;
        ur = nUr;
      }
    }
  }
}

// ── 2. Main processing function ──────────────────────────────────────────────
export function processPpgSignal(timestampsMs: number[], values: number[]): ScanResult {
  if (values.length < 100) {
    throw new Error("Insufficient data points collected.");
  }

  const durationMs = timestampsMs[timestampsMs.length - 1] - timestampsMs[0];
  const durationSec = durationMs / 1000;

  // A. Detrending
  const windowSize = Math.floor(values.length / (durationSec / 1.5));
  const detrended = new Float64Array(values.length);
  for (let i = 0; i < values.length; i++) {
    let sum = 0, count = 0;
    const start = Math.max(0, i - windowSize);
    const end = Math.min(values.length - 1, i + windowSize);
    for (let j = start; j <= end; j++) { sum += values[j]; count++; }
    detrended[i] = values[i] - sum / count;
  }

  // B. Light Smoothing
  const smoothWindow = 3;
  const smoothed = new Float64Array(values.length);
  for (let i = 0; i < values.length; i++) {
    let sum = 0, count = 0;
    for (let j = Math.max(0, i - smoothWindow); j <= Math.min(values.length - 1, i + smoothWindow); j++) {
      sum += detrended[j]; count++;
    }
    smoothed[i] = sum / count;
  }

  // C. Peak Detection
  const peaks: { time: number, val: number }[] = [];
  const minPeakDistMs = 350;
  let lastPeakTime = -minPeakDistMs;
  let maxRecent = 0;

  for (let i = 2; i < smoothed.length - 2; i++) {
    const val = smoothed[i];
    maxRecent = Math.max(maxRecent * 0.99, val);
    if (
      val > smoothed[i - 1] && val > smoothed[i + 1] &&
      val > smoothed[i - 2] && val > smoothed[i + 2] &&
      val > maxRecent * 0.3
    ) {
      const t = timestampsMs[i];
      if (t - lastPeakTime > minPeakDistMs) {
        peaks.push({ time: t, val });
        lastPeakTime = t;
      }
    }
  }

  // D. IBIs
  const ibis: number[] = [];
  const validPeakCount = peaks.length;
  for (let i = 1; i < peaks.length; i++) {
    const ibi = peaks[i].time - peaks[i - 1].time;
    if (ibi > 300 && ibi < 2000) ibis.push(ibi);
  }

  const emptyResult: ScanResult = {
    timestamp: Date.now(), durationSeconds: durationSec,
    heartRate: 0, rmssd: 0, sdnn: 0, coherenceScore: 0,
    coherenceLevel: "Low", validPeaks: validPeakCount, quality: "Poor",
    isStillnessMode: false, stillnessLevel: 0, stillnessLabel: "", stillnessBadge: "",
    rawIbis: [], contactQuality: 0, contactWarning: true, rmssdCorrected: false,
  };

  if (ibis.length < 5) return emptyResult;

  // E. Precise HRV Metrics (NO rounding — used for stillness detection)
  const meanIbi = ibis.reduce((a, b) => a + b, 0) / ibis.length;
  const heartRate = Math.round(60000 / meanIbi);

  // RMSSD — precise float, no Math.round
  let sumSqDiff = 0;
  for (let i = 1; i < ibis.length; i++) {
    const diff = ibis[i] - ibis[i - 1];
    sumSqDiff += diff * diff;
  }
  const rmssdPrecise = Math.sqrt(sumSqDiff / (ibis.length - 1));

  // SDNN — precise float, direct from IBIs (NOT estimated from RMSSD)
  let sumSqDev = 0;
  for (let i = 0; i < ibis.length; i++) {
    const dev = ibis[i] - meanIbi;
    sumSqDev += dev * dev;
  }
  const sdnnPrecise = Math.sqrt(sumSqDev / ibis.length);

  // Rounded for display/storage
  const rmssd = Math.round(rmssdPrecise);
  const sdnn = Math.round(sdnnPrecise);

  // Quality heuristic
  let quality: "Poor" | "Fair" | "Good" | "Excellent" = "Good";
  const expectedPeaks = (durationSec / 60) * heartRate;
  if (validPeakCount < expectedPeaks * 0.6) quality = "Poor";
  else if (validPeakCount < expectedPeaks * 0.8) quality = "Fair";
  else if (sdnnPrecise > 150 || rmssdPrecise > 150) quality = "Fair";
  else if (validPeakCount > expectedPeaks * 0.95) quality = "Excellent";

  // F. FFT — needed for both coherence score AND flatness check
  const sampleRateHz = 4;
  const sampleIntervalMs = 1000 / sampleRateHz;
  const numSamples = 512;
  const resampledIbis = new Float64Array(numSamples);
  let currentTime = peaks[0].time;
  let ibiIndex = 0;

  for (let i = 0; i < numSamples; i++) {
    while (ibiIndex < peaks.length - 2 && peaks[ibiIndex + 1].time < currentTime) ibiIndex++;
    const p2 = peaks[ibiIndex + 1];
    resampledIbis[i] = p2 ? (p2.time - peaks[ibiIndex].time) : (ibis[ibis.length - 1] || meanIbi);
    resampledIbis[i] *= 0.5 * (1 - Math.cos((2 * Math.PI * i) / (numSamples - 1)));
    currentTime += sampleIntervalMs;
  }

  const real = new Float64Array(resampledIbis);
  const imag = new Float64Array(numSamples);
  fft(real, imag);

  const power = new Float64Array(numSamples / 2);
  for (let i = 0; i < numSamples / 2; i++) {
    power[i] = (real[i] * real[i] + imag[i] * imag[i]) / numSamples;
  }

  const freqResolution = sampleRateHz / numSamples;
  let peakLfPower = 0, totalLfPower = 0, totalHfPower = 0, totalAllPower = 0;

  for (let i = 1; i < numSamples / 2; i++) {
    const freq = i * freqResolution;
    totalAllPower += power[i];
    if (freq >= 0.04 && freq <= 0.26) {
      totalLfPower += power[i];
      if (power[i] > peakLfPower) peakLfPower = power[i];
    }
    if (freq > 0.15 && freq <= 0.4) totalHfPower += power[i];
  }

  // G. Waveform Flatness Check & Contact Quality
  const flatnessRatio = totalAllPower > 0 ? totalHfPower / totalAllPower : 0;
  const isFlat = flatnessRatio < FLATNESS_RATIO_THRESHOLD;

  // Contact quality based on peak amplitude and signal strength
  // High amplitude peaks = good finger contact, low amplitude = hovering/weak contact
  let peakAmplitude = 0;
  for (const peak of peaks) {
    peakAmplitude = Math.max(peakAmplitude, peak.val);
  }
  
  // Scale contact quality 0-100 based on peak amplitude and valid peaks
  const amplitudeScore = Math.min(100, (peakAmplitude / 50) * 100);
  const peakCountScore = Math.min(100, (validPeakCount / Math.max(1, expectedPeaks * 0.9)) * 100);
  const contactQuality = Math.round((amplitudeScore + peakCountScore) / 2);
  
  const contactWarning = contactQuality < 50;
  let rmssdCorrected = false;
  let correctedRmssd = rmssdPrecise;
  
  // Auto-correct RMSSD if contact is poor (multiply by 2.5 to get original)
  if (contactWarning && rmssdPrecise > 0) {
    correctedRmssd = rmssdPrecise / 2.5;
    rmssdCorrected = true;
  }

  // H. Deep Stillness Detection (BEFORE returning coherence score)
  // Uses precise (unrounded) SDNN and RMSSD to avoid rounding artifacts.
  const stillnessMatch = detectStillnessLevel(heartRate, sdnnPrecise, rmssdPrecise, isFlat);

  if (stillnessMatch) {
    return {
      timestamp: Date.now(),
      durationSeconds: durationSec,
      heartRate,
      rmssd: Math.round(correctedRmssd),
      sdnn,
      coherenceScore: 10,
      coherenceLevel: "Deep Stillness",
      validPeaks: validPeakCount,
      quality,
      isStillnessMode: true,
      stillnessLevel: stillnessMatch.level,
      stillnessLabel: stillnessMatch.label,
      stillnessBadge: stillnessMatch.badge,
      rawIbis: ibis,
      contactQuality,
      contactWarning,
      rmssdCorrected,
    };
  }

  // I. Standard FFT Coherence Score
  const coherenceRaw = totalLfPower > 0 ? peakLfPower / totalLfPower : 0;
  let coherenceScore = Math.min(10, Math.round(coherenceRaw * 2.5 * 10 * 10) / 10);
  if (isNaN(coherenceScore)) coherenceScore = 0;

  let coherenceLevel: "Low" | "Medium" | "High" = "Low";
  if (coherenceScore >= 4.0) coherenceLevel = "High";
  else if (coherenceScore >= 1.5) coherenceLevel = "Medium";

  return {
    timestamp: Date.now(),
    durationSeconds: durationSec,
    heartRate, 
    rmssd: Math.round(correctedRmssd),
    sdnn,
    coherenceScore, coherenceLevel,
    validPeaks: validPeakCount,
    quality,
    isStillnessMode: false,
    stillnessLevel: 0,
    stillnessLabel: "",
    stillnessBadge: "",
    rawIbis: ibis,
    contactQuality,
    contactWarning,
    rmssdCorrected,
  };
}
