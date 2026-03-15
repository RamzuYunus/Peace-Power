import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { useScans } from "@/hooks/use-scans";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Wind, Heart, Sparkles, Plus, Leaf } from "lucide-react";
import { format } from "date-fns";

export default function Home() {
  const { todayScans, isLoaded } = useScans();
  const maxScans = 5;
  const scansLeft = Math.max(0, maxScans - todayScans.length);
  
  const latestScan = todayScans.length > 0 ? todayScans[0] : null;

  if (!isLoaded) return <Layout><div className="p-8 text-center text-muted-foreground">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div className="space-y-2">
          <h2 className="text-3xl font-display text-foreground">Good day,</h2>
          <p className="text-muted-foreground text-lg">Take a moment to align your heart and mind.</p>
        </div>

        {/* Progress Tracker */}
        <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20 overflow-hidden relative">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
          <CardContent className="p-6">
            <div className="flex justify-between items-end mb-4">
              <div>
                <p className="text-sm font-medium text-primary">Daily Goal</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">
                  {todayScans.length} <span className="text-muted-foreground text-lg font-normal">/ {maxScans} scans</span>
                </h3>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/20 text-primary">
                  <Sparkles className="w-5 h-5" />
                </span>
              </div>
            </div>
            
            <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(100, (todayScans.length / maxScans) * 100)}%` }}
              />
            </div>
            
            <p className="text-sm text-muted-foreground mt-4">
              {scansLeft > 0 
                ? `${scansLeft} recommended scans left today.` 
                : "You've met your daily goal! Excellent work."}
            </p>
          </CardContent>
        </Card>

        {/* Latest Scan Summary */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-display font-semibold">Latest Session</h3>
            {latestScan && (
              <span className="text-xs text-muted-foreground">
                {format(latestScan.timestamp, "h:mm a")}
              </span>
            )}
          </div>

          {latestScan ? (
            <div className="grid grid-cols-2 gap-4">
              <MetricCard 
                title="Coherence" 
                value={latestScan.coherenceScore.toFixed(1)} 
                unit="/ 10"
                icon={<Wind className="w-4 h-4 text-accent" />}
                highlight={latestScan.coherenceLevel === "High"}
              />
              <MetricCard 
                title="Heart Rate" 
                value={latestScan.heartRate.toString()} 
                unit="bpm"
                icon={<Heart className="w-4 h-4 text-destructive" />}
              />
              <MetricCard 
                title="HRV (RMSSD)" 
                value={latestScan.rmssd.toString()} 
                unit="ms"
                icon={<Activity className="w-4 h-4 text-primary" />}
              />
              <div className="bg-card rounded-2xl p-4 border border-border/50 flex flex-col justify-center items-center text-center shadow-sm">
                <span className="text-xs text-muted-foreground mb-1">State</span>
                <span className={`text-lg font-bold ${
                  latestScan.coherenceLevel === 'High' ? 'text-primary' : 
                  latestScan.coherenceLevel === 'Medium' ? 'text-accent' : 'text-muted-foreground'
                }`}>
                  {latestScan.coherenceLevel}
                </span>
              </div>
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center flex flex-col items-center justify-center text-muted-foreground">
                <Leaf className="w-12 h-12 mb-4 opacity-20" />
                <p>No scans yet today.</p>
                <p className="text-sm mt-1">Take 2 minutes to center yourself.</p>
              </CardContent>
            </Card>
          )}
        </div>

        <Link href="/scan">
          <button className="w-full flex items-center justify-center gap-2 bg-foreground text-background py-4 rounded-xl font-semibold text-lg shadow-xl shadow-foreground/10 hover:-translate-y-1 transition-transform active:translate-y-0">
            <Plus className="w-5 h-5" />
            Start New Scan
          </button>
        </Link>

      </div>
    </Layout>
  );
}

function MetricCard({ title, value, unit, icon, highlight = false }: { title: string, value: string, unit: string, icon: React.ReactNode, highlight?: boolean }) {
  return (
    <div className={`bg-card rounded-2xl p-4 border flex flex-col shadow-sm ${highlight ? 'border-accent/50 bg-accent/5' : 'border-border/50'}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-muted rounded-md">{icon}</div>
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
      </div>
      <div className="flex items-baseline gap-1 mt-auto">
        <span className="text-2xl font-bold text-foreground">{value}</span>
        <span className="text-xs text-muted-foreground font-medium">{unit}</span>
      </div>
    </div>
  );
}
