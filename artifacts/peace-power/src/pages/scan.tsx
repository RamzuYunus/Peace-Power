import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout";
import { useScans } from "@/hooks/use-scans";
import { processPpgSignal, type ScanResult } from "@/lib/signal-processing";
import { Camera, AlertCircle, RefreshCcw, CheckCircle2, HeartPulse } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

type ScanState = "idle" | "starting" | "scanning" | "processing" | "results" | "error";

const SCAN_DURATION_SEC = 120; // 2 minutes

export default function Scan() {
  const [state, setState] = useState<ScanState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [timeLeft, setTimeLeft] = useState(SCAN_DURATION_SEC);
  const [result, setResult] = useState<ScanResult | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); // Hidden canvas for reading pixels
  const waveCanvasRef = useRef<HTMLCanvasElement>(null); // Visible canvas for drawing
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  
  const rawDataRef = useRef<{time: number, val: number}[]>([]);
  const waveBufferRef = useRef<number[]>([]); // Small buffer for rendering wave
  
  const { addScan } = useScans();

  // Breathing pacer state (5s inhale, 5s exhale)
  const [breathPhase, setBreathPhase] = useState<"inhale" | "exhale">("inhale");

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    try {
      setState("starting");
      setErrorMsg("");
      rawDataRef.current = [];
      waveBufferRef.current = [];
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 640 },
          height: { ideal: 480 },
          // @ts-ignore - torch is not in standard TS types yet
          advanced: [{ torch: true }]
        },
        audio: false
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Try turning on torch if advanced constraint failed
      const track = stream.getVideoTracks()[0];
      try {
        const capabilities = track.getCapabilities();
        // @ts-ignore
        if (capabilities.torch) {
          await track.applyConstraints({ advanced: [{ torch: true }] } as any);
        }
      } catch (e) {
        console.warn("Torch not supported", e);
      }

      setState("scanning");
      setTimeLeft(SCAN_DURATION_SEC);
      startCaptureLoop();
      
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Camera access denied or unavailable. Please ensure permissions are granted.");
      setState("error");
    }
  };

  const startCaptureLoop = () => {
    const video = videoRef.current;
    const hiddenCanvas = canvasRef.current;
    const waveCanvas = waveCanvasRef.current;
    
    if (!video || !hiddenCanvas || !waveCanvas) return;
    const ctx = hiddenCanvas.getContext("2d", { willReadFrequently: true });
    const waveCtx = waveCanvas.getContext("2d");
    if (!ctx || !waveCtx) return;

    let lastTime = performance.now();
    let startTime = Date.now();
    
    // Timer interval
    const timerInt = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerInt);
          finishScan();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Breathing phase interval (10s cycle)
    const breathInt = setInterval(() => {
      setBreathPhase(p => p === "inhale" ? "exhale" : "inhale");
    }, 5000);

    const loop = (time: number) => {
      if (state === "processing" || state === "results") return;

      // Throttle to ~30fps
      if (time - lastTime >= 33) {
        lastTime = time;
        
        // Draw center ROI to hidden canvas
        const size = 30;
        const sx = (video.videoWidth - size) / 2;
        const sy = (video.videoHeight - size) / 2;
        
        if (video.videoWidth > 0) {
          ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
          const imgData = ctx.getImageData(0, 0, size, size).data;
          
          let rSum = 0;
          for (let i = 0; i < imgData.length; i += 4) {
            rSum += imgData[i]; // Red channel only
          }
          const rAvg = rSum / (imgData.length / 4);
          
          rawDataRef.current.push({ time: Date.now(), val: rAvg });
          
          // Add to wave buffer for UI
          waveBufferRef.current.push(rAvg);
          if (waveBufferRef.current.length > 100) waveBufferRef.current.shift();
          
          drawWaveform(waveCtx, waveCanvas.width, waveCanvas.height);
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    // Cleanup function attached to timer completion
    const finishScan = () => {
      clearInterval(timerInt);
      clearInterval(breathInt);
      stopCamera();
      processData();
    };
  };

  const drawWaveform = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);
    const buffer = waveBufferRef.current;
    if (buffer.length < 2) return;

    // Simple auto-scaling for display
    let min = Infinity, max = -Infinity;
    for (const v of buffer) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const range = max - min || 1;

    ctx.beginPath();
    ctx.strokeStyle = "hsl(175, 45%, 40%)"; // Primary color
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let i = 0; i < buffer.length; i++) {
      const x = (i / (buffer.length - 1)) * width;
      // Invert Y so higher red values go up
      const y = height - ((buffer[i] - min) / range) * height * 0.8 - (height * 0.1);
      
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  const processData = async () => {
    setState("processing");
    try {
      // Simulate slight delay for UX
      await new Promise(r => setTimeout(r, 1500));
      
      const times = rawDataRef.current.map(d => d.time);
      const vals = rawDataRef.current.map(d => d.val);
      
      const res = processPpgSignal(times, vals);
      setResult(res);
      addScan(res);
      setState("results");
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "Failed to process signal. Please try again and hold still.");
      setState("error");
    }
  };

  return (
    <Layout>
      <div className="p-6 h-full flex flex-col justify-center">
        
        {/* HIDDEN ELEMENTS */}
        <video ref={videoRef} playsInline muted autoPlay className="hidden" />
        <canvas ref={canvasRef} width={30} height={30} className="hidden" />

        <AnimatePresence mode="wait">
          
          {/* IDLE STATE */}
          {state === "idle" && (
            <motion.div 
              key="idle"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center text-center space-y-8 mt-12"
            >
              <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center">
                <Camera className="w-12 h-12 text-primary" />
              </div>
              <div className="space-y-4 max-w-xs">
                <h2 className="text-3xl font-display font-bold">Ready to Scan</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Place your fingertip completely over your phone's rear camera lens. The flash will turn on automatically.
                </p>
                <div className="bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 p-4 rounded-xl text-sm text-left flex gap-3 items-start border border-amber-200 dark:border-amber-800/50">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>Hold still and breathe with the pacer for the full 2 minutes for accurate results.</p>
                </div>
              </div>
              <button 
                onClick={startCamera}
                className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold text-lg shadow-xl shadow-primary/25 hover:bg-primary/90 transition-all active:scale-95"
              >
                Start 2-Min Scan
              </button>
            </motion.div>
          )}

          {/* STARTING / SCANNING STATE */}
          {(state === "starting" || state === "scanning") && (
            <motion.div 
              key="scanning"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-between h-full py-8 space-y-8"
            >
              <div className="text-center">
                <h3 className="font-display text-xl mb-1">
                  {state === "starting" ? "Initializing..." : "Reading Pulse..."}
                </h3>
                <p className="text-muted-foreground font-mono text-sm">
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </p>
              </div>

              {/* Breathing Pacer */}
              <div className="relative w-64 h-64 flex items-center justify-center">
                <motion.div 
                  className="absolute inset-0 bg-primary/20 rounded-full"
                  animate={{ 
                    scale: state === "scanning" ? (breathPhase === "inhale" ? 1.2 : 0.6) : 0.8,
                    opacity: state === "scanning" ? (breathPhase === "inhale" ? 0.8 : 0.3) : 0.5
                  }}
                  transition={{ duration: 5, ease: "easeInOut" }}
                />
                <div className="absolute inset-4 bg-background rounded-full shadow-inner flex items-center justify-center z-10 flex-col">
                  <HeartPulse className={cn("w-8 h-8 text-primary mb-2 transition-all", state === "scanning" && "animate-pulse")} />
                  <span className="text-primary font-medium tracking-widest uppercase text-sm">
                    {state === "scanning" ? breathPhase : "Wait"}
                  </span>
                </div>
              </div>

              {/* Live Waveform Canvas */}
              <div className="w-full h-24 bg-card rounded-2xl border border-border/50 p-2 shadow-inner overflow-hidden relative">
                <div className="absolute top-2 left-3 text-[10px] uppercase font-bold tracking-wider text-muted-foreground z-10">Signal Quality</div>
                <canvas ref={waveCanvasRef} className="w-full h-full" width={400} height={100} />
              </div>
            </motion.div>
          )}

          {/* PROCESSING STATE */}
          {state === "processing" && (
            <motion.div 
              key="processing"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full space-y-6 mt-20"
            >
              <RefreshCcw className="w-12 h-12 text-primary animate-spin" />
              <div className="text-center">
                <h2 className="text-2xl font-display font-bold">Analyzing Rhythm</h2>
                <p className="text-muted-foreground mt-2">Computing coherence score...</p>
              </div>
            </motion.div>
          )}

          {/* ERROR STATE */}
          {state === "error" && (
            <motion.div 
              key="error"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center space-y-6 mt-20 bg-destructive/10 p-8 rounded-3xl border border-destructive/20"
            >
              <AlertCircle className="w-16 h-16 text-destructive" />
              <div>
                <h2 className="text-2xl font-display font-bold text-destructive mb-2">Scan Failed</h2>
                <p className="text-foreground/80">{errorMsg}</p>
              </div>
              <button 
                onClick={() => setState("idle")}
                className="bg-background border border-border px-6 py-3 rounded-xl font-medium shadow-sm hover:bg-muted"
              >
                Try Again
              </button>
            </motion.div>
          )}

          {/* RESULTS STATE */}
          {state === "results" && result && (
            <motion.div 
              key="results"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col space-y-6"
            >
              <div className="text-center space-y-2 mt-4">
                <div className="inline-flex items-center justify-center p-3 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full mb-2">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-display font-bold">Scan Complete</h2>
                <p className="text-muted-foreground">Signal Quality: <span className="font-medium text-foreground">{result.quality}</span></p>
              </div>

              <div className="bg-card border border-border/50 rounded-3xl p-6 shadow-xl shadow-black/5">
                <div className="text-center mb-6">
                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider mb-2">Coherence Score</p>
                  <div className="text-6xl font-display font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
                    {result.coherenceScore.toFixed(1)}
                  </div>
                  <div className={cn(
                    "inline-flex px-3 py-1 rounded-full text-sm font-bold mt-3",
                    result.coherenceLevel === "High" ? "bg-primary/20 text-primary" :
                    result.coherenceLevel === "Medium" ? "bg-accent/20 text-accent-foreground" :
                    "bg-destructive/20 text-destructive"
                  )}>
                    {result.coherenceLevel} State
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-border/50 pt-6">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Heart Rate</p>
                    <p className="text-2xl font-semibold">{result.heartRate} <span className="text-sm font-normal text-muted-foreground">bpm</span></p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">HRV (RMSSD)</p>
                    <p className="text-2xl font-semibold">{result.rmssd} <span className="text-sm font-normal text-muted-foreground">ms</span></p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4">
                <button 
                  onClick={() => setState("idle")}
                  className="bg-card border border-border/50 py-4 rounded-xl font-medium shadow-sm hover:bg-muted"
                >
                  Scan Again
                </button>
                <Link href="/">
                  <button className="w-full bg-foreground text-background py-4 rounded-xl font-semibold shadow-md">
                    Done
                  </button>
                </Link>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </Layout>
  );
}
