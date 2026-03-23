import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  useGetAdminMembers,
  useGetAdminStats,
  useGetAdminMemberScans,
  useSetAdminRole,
  getGetAdminMembersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Heart, Users, Activity, Wind, ArrowLeft, ChevronDown, ChevronUp, Shield, ShieldOff, LogOut, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Admin() {
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading, isAdmin, logout } = useAuth();
  const queryClient = useQueryClient();

  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [reclassifyStatus, setReclassifyStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [reclassifyResult, setReclassifyResult] = useState<{ total: number; updated: number; unchanged: number } | null>(null);

  const handleReclassify = async () => {
    setReclassifyStatus("loading");
    setReclassifyResult(null);
    try {
      const res = await fetch("/api/admin/reclassify-stillness", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      setReclassifyResult(data);
      setReclassifyStatus("done");
    } catch {
      setReclassifyStatus("error");
    }
  };

  const { data: members, isLoading: membersLoading } = useGetAdminMembers({
    query: { enabled: isAdmin },
  });
  const { data: stats } = useGetAdminStats({
    query: { enabled: isAdmin },
  });
  const setAdminRole = useSetAdminRole();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
        <Shield className="w-16 h-16 text-muted-foreground/30" />
        <h2 className="text-xl font-bold">Admin Access Required</h2>
        <p className="text-muted-foreground">You don't have permission to view this page.</p>
        <Link href="/dashboard">
          <button className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-medium">
            Go to Dashboard
          </button>
        </Link>
      </div>
    );
  }

  const handleToggleAdmin = async (userId: number, currentIsAdmin: boolean) => {
    await setAdminRole.mutateAsync({
      userId,
      data: { isAdmin: !currentIsAdmin },
    });
    queryClient.invalidateQueries({ queryKey: getGetAdminMembersQueryKey() });
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const coherenceColor = (level: string) =>
    level === "High" ? "text-primary bg-primary/10 border-primary/20" :
    level === "Medium" ? "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800/50" :
    "text-destructive bg-destructive/10 border-destructive/20";

  return (
    <div className="min-h-screen bg-background">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/50 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </button>
            </Link>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="font-bold text-lg">Admin Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{user.name}</span>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-destructive"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Members", value: stats?.totalMembers ?? "—", icon: <Users className="w-4 h-4 text-primary" /> },
            { label: "Total Scans", value: stats?.totalScans ?? "—", icon: <Activity className="w-4 h-4 text-primary" /> },
            { label: "Avg Coherence", value: stats?.avgCoherenceScore != null ? stats.avgCoherenceScore.toFixed(1) : "—", icon: <Wind className="w-4 h-4 text-accent" /> },
            { label: "High Coherence", value: stats?.highCoherenceCount ?? "—", icon: <Heart className="w-4 h-4 text-primary fill-primary/30" /> },
          ].map((s, i) => (
            <div key={i} className="bg-card border border-border/60 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <div className="p-1 bg-muted rounded-md">{s.icon}</div>
                {s.label}
              </div>
              <div className="text-2xl font-bold text-foreground">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Coherence breakdown */}
        {stats && stats.totalScans > 0 && (
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wider">Global Coherence Distribution</h3>
            <div className="flex gap-3">
              {[
                { level: "High", count: stats.highCoherenceCount, color: "bg-primary" },
                { level: "Medium", count: stats.mediumCoherenceCount, color: "bg-amber-400" },
                { level: "Low", count: stats.lowCoherenceCount, color: "bg-destructive" },
              ].map((item) => {
                const pct = stats.totalScans > 0 ? Math.round((item.count / stats.totalScans) * 100) : 0;
                return (
                  <div key={item.level} className="flex-1">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                      <span>{item.level}</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{item.count} scans</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Admin Tools */}
        <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Admin Tools</h3>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <button
              onClick={handleReclassify}
              disabled={reclassifyStatus === "loading"}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border",
                reclassifyStatus === "loading"
                  ? "opacity-50 cursor-not-allowed bg-muted border-border text-muted-foreground"
                  : "bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300"
              )}
            >
              <RefreshCw className={cn("w-4 h-4", reclassifyStatus === "loading" && "animate-spin")} />
              {reclassifyStatus === "loading" ? "Reclassifying..." : "Recalculate All Sessions"}
            </button>
            {reclassifyStatus === "done" && reclassifyResult && (
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>
                  Done — {reclassifyResult.total} scans checked, <strong>{reclassifyResult.updated}</strong> updated,{" "}
                  {reclassifyResult.unchanged} unchanged.
                </span>
              </div>
            )}
            {reclassifyStatus === "error" && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span>Reclassification failed. Check server logs.</span>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Re-runs the tiered Deep Stillness detection (Sakīnah I–II, Qalb Polished, Fanā' Union) over all stored scans. Uses raw IBI data where available for precise recalculation; falls back to stored HR/SDNN/RMSSD.
          </p>
        </div>

        {/* Members Table */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Members</h2>
          {membersLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading members...</div>
          ) : (members?.length ?? 0) === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-card border border-border/60 rounded-2xl">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No members yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {members!.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  isExpanded={expandedUser === member.id}
                  onToggle={() => setExpandedUser(expandedUser === member.id ? null : member.id)}
                  onToggleAdmin={() => handleToggleAdmin(member.id, member.isAdmin)}
                  coherenceColor={coherenceColor}
                  currentUserId={user.id}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function MemberCard({ member, isExpanded, onToggle, onToggleAdmin, coherenceColor, currentUserId }: any) {
  const { data: memberScans, isLoading } = useGetAdminMemberScans(member.id, {
    query: { enabled: isExpanded },
  });

  return (
    <div className="bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-bold text-primary">
            {member.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{member.name}</span>
              {member.isAdmin && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                  <Shield className="w-2.5 h-2.5" />
                  Admin
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground truncate">{member.email}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-2">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-muted-foreground">{member.scanCount} scans</div>
            {member.lastScan && (
              <div className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", coherenceColor(member.lastScan.coherenceLevel))}>
                {member.lastScan.coherenceLevel}
              </div>
            )}
          </div>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-border/50 p-4 space-y-4 bg-background/50">
          {/* Member stats */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-card border border-border/50 rounded-xl p-3">
              <div className="text-lg font-bold">{member.scanCount}</div>
              <div className="text-xs text-muted-foreground">Total Scans</div>
            </div>
            <div className="bg-card border border-border/50 rounded-xl p-3">
              <div className="text-lg font-bold">
                {member.avgCoherenceScore != null ? member.avgCoherenceScore.toFixed(1) : "—"}
              </div>
              <div className="text-xs text-muted-foreground">Avg Coherence</div>
            </div>
            <div className="bg-card border border-border/50 rounded-xl p-3">
              <div className="text-lg font-bold">
                {member.avgHeartRate != null ? Math.round(member.avgHeartRate) : "—"}
              </div>
              <div className="text-xs text-muted-foreground">Avg HR (bpm)</div>
            </div>
          </div>

          {/* Joined */}
          <p className="text-xs text-muted-foreground">
            Member since {format(new Date(member.createdAt), "MMM d, yyyy")}
          </p>

          {/* Scan history */}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading scans...</p>
          ) : (memberScans?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No scans recorded yet.</p>
          ) : (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Scan History</h4>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {memberScans!.map((scan: any) => (
                  <div key={scan.id} className="flex items-center justify-between text-sm bg-card border border-border/50 rounded-xl px-3 py-2">
                    <div>
                      <div className="font-medium text-xs">{format(new Date(scan.scannedAt), "MMM d, h:mm a")}</div>
                      <div className="text-xs text-muted-foreground">HR: {scan.heartRate} bpm · RMSSD: {scan.rmssd} ms</div>
                    </div>
                    <div className="text-right">
                      <div className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", coherenceColor(scan.coherenceLevel))}>
                        {scan.coherenceLevel}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{scan.coherenceScore.toFixed(1)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin toggle - don't show for self */}
          {member.id !== currentUserId && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleAdmin(); }}
              className={cn(
                "flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl border transition-colors",
                member.isAdmin
                  ? "text-destructive border-destructive/30 bg-destructive/5 hover:bg-destructive/10"
                  : "text-primary border-primary/30 bg-primary/5 hover:bg-primary/10"
              )}
            >
              {member.isAdmin ? <ShieldOff className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
              {member.isAdmin ? "Remove Admin Role" : "Grant Admin Role"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
