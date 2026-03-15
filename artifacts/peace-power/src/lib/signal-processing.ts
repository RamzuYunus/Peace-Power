/**
 * HeartMath-style PPG Signal Processing & HRV Metrics
 * Pure JavaScript implementation with no external math dependencies.
 */

export interface ScanResult {
  timestamp: number;
  durationSeconds: number;
  heartRate: number;
  rmssd: number;
  sdnn: number;
  coherenceScore: number;
  coherenceLevel: "Low" | "Medium" | "High";
  validPeaks: number;
  quality: "Poor" | "Fair" | "Good" | "Excellent";
}

// 1. In-place Radix-2 FFT
function fft(real: Float64Array, imag: Float64Array) {
  const n = real.length;
  if (n <= 1) return;

  // Bit reversal sorting
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

  // Cooley-Tukey decimation-in-time
  for (let l = 2; l <= n; l <<= 1) {
    const halfL = l >> 1;
    const theta = -2.0 * Math.PI / l;
    const wReal = Math.cos(theta);
    const wImag = Math.sin(theta);
    
    for (let i = 0; i < n; i += l) {
      let ur = 1.0;
      let ui = 0.0;
      for (let k = 0; k < halfL; k++) {
        const i1 = i + k;
        const i2 = i + k + halfL;
        const tr = ur * real[i2] - ui * imag[i2];
        const ti = ur * imag[i2] + ui * real[i2];
        real[i2] = real[i1] - tr;
        imag[i2] = imag[i1] - ti;
        real[i1] += tr;
        imag[i1] += ti;
        
        const nextUr = ur * wReal - ui * wImag;
        const nextUi = ur * wImag + ui * wReal;
        ur = nextUr;
        ui = nextUi;
      }
    }
  }
}

// 2. Main processing function
export function processPpgSignal(timestampsMs: number[], values: number[]): ScanResult {
  if (values.length < 100) {
    throw new Error("Insufficient data points collected.");
  }

  const durationMs = timestampsMs[timestampsMs.length - 1] - timestampsMs[0];
  const durationSec = durationMs / 1000;

  // A. Detrending (subtract heavily smoothed signal)
  const windowSize = Math.floor(values.length / (durationSec / 1.5)); // ~1.5 sec window
  const detrended = new Float64Array(values.length);
  
  for (let i = 0; i < values.length; i++) {
    let sum = 0;
    let count = 0;
    const start = Math.max(0, i - windowSize);
    const end = Math.min(values.length - 1, i + windowSize);
    for (let j = start; j <= end; j++) {
      sum += values[j];
      count++;
    }
    const localMean = sum / count;
    detrended[i] = values[i] - localMean;
  }

  // B. Light Smoothing
  const smoothWindow = 3;
  const smoothed = new Float64Array(values.length);
  for (let i = 0; i < values.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - smoothWindow); j <= Math.min(values.length - 1, i + smoothWindow); j++) {
      sum += detrended[j];
      count++;
    }
    smoothed[i] = sum / count;
  }

  // C. Peak Detection
  const peaks: { time: number, val: number }[] = [];
  const minPeakDistMs = 350; // Max HR ~170 bpm
  let lastPeakTime = -minPeakDistMs;

  // Dynamic thresholding
  let maxRecent = 0;
  for (let i = 2; i < smoothed.length - 2; i++) {
    const val = smoothed[i];
    maxRecent = Math.max(maxRecent * 0.99, val); // Decay threshold
    
    if (val > smoothed[i - 1] && val > smoothed[i + 1] && 
        val > smoothed[i - 2] && val > smoothed[i + 2] && 
        val > maxRecent * 0.3) {
        
      const t = timestampsMs[i];
      if (t - lastPeakTime > minPeakDistMs) {
        peaks.push({ time: t, val });
        lastPeakTime = t;
      }
    }
  }

  // D. Calculate IBIs (Inter-Beat Intervals)
  let ibis: number[] = [];
  let validPeakCount = peaks.length;
  for (let i = 1; i < peaks.length; i++) {
    const ibi = peaks[i].time - peaks[i - 1].time;
    // Filter completely impossible physiological values
    if (ibi > 300 && ibi < 2000) {
      ibis.push(ibi);
    }
  }

  if (ibis.length < 5) {
    return {
      timestamp: Date.now(),
      durationSeconds: durationSec,
      heartRate: 0, rmssd: 0, sdnn: 0, coherenceScore: 0,
      coherenceLevel: "Low", validPeaks: validPeakCount, quality: "Poor"
    };
  }

  // E. Time-Domain HRV Metrics
  const meanIbi = ibis.reduce((a, b) => a + b, 0) / ibis.length;
  const heartRate = Math.round(60000 / meanIbi);
  
  let sumSqDiff = 0;
  for (let i = 1; i < ibis.length; i++) {
    const diff = ibis[i] - ibis[i - 1];
    sumSqDiff += diff * diff;
  }
  const rmssd = Math.round(Math.sqrt(sumSqDiff / (ibis.length - 1)));

  let sumSqDev = 0;
  for (let i = 0; i < ibis.length; i++) {
    const dev = ibis[i] - meanIbi;
    sumSqDev += dev * dev;
  }
  const sdnn = Math.round(Math.sqrt(sumSqDev / ibis.length));

  // F. Frequency-Domain (Coherence via FFT)
  // 1. Resample IBIs to an evenly spaced time series at 4Hz (0.25s)
  const sampleRateHz = 4;
  const sampleIntervalMs = 1000 / sampleRateHz;
  const numSamples = 512; // Power of 2 for FFT
  
  const resampledIbis = new Float64Array(numSamples);
  let currentTime = peaks[0].time;
  let ibiIndex = 0;

  // Simple step interpolation
  for (let i = 0; i < numSamples; i++) {
    while (ibiIndex < peaks.length - 2 && peaks[ibiIndex + 1].time < currentTime) {
      ibiIndex++;
    }
    // Interpolate
    const p1 = peaks[ibiIndex];
    const p2 = peaks[ibiIndex + 1];
    if (!p2) {
      resampledIbis[i] = ibis[ibis.length - 1] || meanIbi;
    } else {
      const progress = (currentTime - p1.time) / (p2.time - p1.time);
      const currentIbi = p2.time - p1.time; // Or actual stored IBI
      resampledIbis[i] = currentIbi; // simplified zero-order hold
    }
    
    // Apply Hann window
    const multiplier = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (numSamples - 1)));
    resampledIbis[i] *= multiplier;
    
    currentTime += sampleIntervalMs;
  }

  const real = new Float64Array(resampledIbis);
  const imag = new Float64Array(numSamples);
  
  fft(real, imag);

  // Compute Power Spectrum
  const power = new Float64Array(numSamples / 2);
  for (let i = 0; i < numSamples / 2; i++) {
    power[i] = (real[i] * real[i] + imag[i] * imag[i]) / numSamples;
  }

  // Calculate Coherence
  // HeartMath Coherence: Power in LF (0.04-0.26Hz) peak / Total Power (0.0033-0.4Hz)
  const freqResolution = sampleRateHz / numSamples;
  
  let peakLfPower = 0;
  let totalLfPower = 0;
  
  for (let i = 1; i < numSamples / 2; i++) {
    const freq = i * freqResolution;
    if (freq >= 0.04 && freq <= 0.26) {
      totalLfPower += power[i];
      if (power[i] > peakLfPower) {
        peakLfPower = power[i];
      }
    }
  }

  // Simplified ratio (0 to 1)
  let coherenceRaw = totalLfPower > 0 ? (peakLfPower / totalLfPower) : 0;
  
  // Scale to make it look like a 0-10 score (HeartMath uses arbitrary units, we will use a 0-10 scale)
  // Usually, a peak taking up 30%+ of the LF band is considered highly coherent.
  let coherenceScore = Math.min(10, Math.round(coherenceRaw * 2.5 * 10 * 10) / 10);
  if (isNaN(coherenceScore)) coherenceScore = 0;

  let coherenceLevel: "Low" | "Medium" | "High" = "Low";
  if (coherenceScore >= 4.0) coherenceLevel = "High";
  else if (coherenceScore >= 1.5) coherenceLevel = "Medium";

  // Quality heuristic
  let quality: "Poor" | "Fair" | "Good" | "Excellent" = "Good";
  const expectedPeaks = (durationSec / 60) * heartRate;
  if (validPeakCount < expectedPeaks * 0.6) quality = "Poor";
  else if (validPeakCount < expectedPeaks * 0.8) quality = "Fair";
  else if (sdnn > 150 || rmssd > 150) quality = "Fair"; // likely noisy
  else if (validPeakCount > expectedPeaks * 0.95) quality = "Excellent";

  return {
    timestamp: Date.now(),
    durationSeconds: durationSec,
    heartRate,
    rmssd,
    sdnn,
    coherenceScore,
    coherenceLevel,
    validPeaks: validPeakCount,
    quality
  };
}
