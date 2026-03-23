import { Layout } from "@/components/layout";
import { useScans } from "@/hooks/use-scans";
import { format } from "date-fns";
import { Trash2, Wind, Activity } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function History() {
  const { scans, clearHistory, isLoaded } = useScans();
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isLoaded) return <Layout><div className="p-8 text-center">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="p-6 space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-display font-bold">History</h2>
          {scans.length > 0 && (
            <button 
              onClick={() => setShowConfirm(true)}
              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {showConfirm && (
          <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-2xl animate-in slide-in-from-top-2">
            <p className="text-destructive font-medium mb-3">Delete all scan history?</p>
            <div className="flex gap-2">
              <button 
                onClick={() => { clearHistory(); setShowConfirm(false); }}
                className="flex-1 bg-destructive text-destructive-foreground py-2 rounded-lg font-medium"
              >
                Delete
              </button>
              <button 
                onClick={() => setShowConfirm(false)}
                className="flex-1 bg-background border border-border py-2 rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {scans.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <HistoryIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p>No history yet.</p>
            <p className="text-sm mt-1">Your past scans will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {scans.map((scan, i) => (
              <div 
                key={i} 
                className="bg-card border border-border/50 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex items-center justify-between gap-4"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    {format(scan.timestamp, "MMM d, yyyy")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(scan.timestamp, "h:mm a")}
                  </span>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1 text-xs font-medium bg-muted px-2 py-1 rounded-md">
                      <Wind className="w-3 h-3 text-primary" />
                      {scan.coherenceScore.toFixed(1)}
                    </div>
                    <div className="flex items-center gap-1 text-xs font-medium bg-muted px-2 py-1 rounded-md">
                      <Activity className="w-3 h-3 text-destructive" />
                      {scan.heartRate} bpm
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end justify-center gap-1">
                  {scan.isStillnessMode && scan.stillnessBadge ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
                      {scan.stillnessBadge} L{scan.stillnessLevel}
                    </span>
                  ) : (
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold",
                      scan.coherenceLevel === "High" ? "bg-primary/10 text-primary border border-primary/20" :
                      scan.coherenceLevel === "Medium" ? "bg-accent/10 text-accent-foreground border border-accent/20" :
                      "bg-destructive/10 text-destructive border border-destructive/20"
                    )}>
                      {scan.coherenceLevel}
                    </span>
                  )}
                  {scan.isStillnessMode && scan.stillnessLabel && (
                    <span className="text-[9px] text-indigo-500 dark:text-indigo-400 font-medium text-right leading-tight max-w-[90px]">
                      {scan.stillnessLabel}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground text-right">
                    Quality: {scan.quality}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

// Just a tiny icon helper
function HistoryIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
      <path d="M3 3v5h5"/>
      <path d="M12 7v5l4 2"/>
    </svg>
  );
}
