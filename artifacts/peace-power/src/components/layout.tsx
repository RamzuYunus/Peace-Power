import { ReactNode } from "react";
import { Link, useRoute } from "wouter";
import { HeartPulse, Activity, History, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex flex-col min-h-[100dvh] max-w-md mx-auto bg-background shadow-2xl overflow-hidden relative">
      <header className="px-6 py-5 bg-card/50 backdrop-blur-xl border-b border-border/50 sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary">
          <Leaf className="w-6 h-6" />
          <h1 className="text-xl font-display font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Peace Power
          </h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overflow-x-hidden relative pb-24 no-scrollbar">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-card border-t border-border/50 pb-safe">
        <div className="flex justify-around items-center p-2">
          <NavItem href="/" icon={<HeartPulse />} label="Today" />
          <NavItem href="/scan" icon={<Activity />} label="Scan" activeStyle />
          <NavItem href="/history" icon={<History />} label="History" />
        </div>
      </nav>
    </div>
  );
}

function NavItem({ href, icon, label, activeStyle = false }: { href: string, icon: React.ReactNode, label: string, activeStyle?: boolean }) {
  const [isActive] = useRoute(href);
  
  return (
    <Link href={href} className="flex-1 flex justify-center">
      <div className={cn(
        "flex flex-col items-center justify-center w-full py-2 px-1 rounded-2xl transition-all duration-300",
        isActive 
          ? activeStyle 
            ? "text-primary-foreground bg-primary shadow-lg shadow-primary/25 -translate-y-2" 
            : "text-primary bg-primary/10" 
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}>
        <div className={cn("mb-1 transition-transform", isActive && activeStyle && "scale-110")}>
          {icon}
        </div>
        <span className={cn(
          "text-[10px] font-medium tracking-wide",
          isActive ? "opacity-100" : "opacity-80"
        )}>
          {label}
        </span>
      </div>
    </Link>
  );
}
