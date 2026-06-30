import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Radar,
  Target,
  Database,
  Bell,
  RefreshCw,
  Activity,
  Menu,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Painel de Controle", icon: LayoutDashboard },
  { href: "/events", label: "Licitações e Eventos", icon: Radar },
  { href: "/opportunities", label: "Oportunidades Previstas", icon: Target },
  { href: "/sources", label: "Gerenciar Fontes", icon: Database },
  { href: "/alerts", label: "Meus Alertas", icon: Bell },
];

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link href={href}>
      <div
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all duration-150",
          active
            ? "bg-primary/15 text-primary border-l-4 border-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary border-l-4 border-transparent"
        )}
      >
        <Icon size={18} className="shrink-0" />
        <span className="text-sm font-medium">{label}</span>
      </div>
    </Link>
  );
}

function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const syncMutation = trpc.events.syncFromPncp.useMutation({
    onSuccess: (data) => {
      setResult(`${data.imported} eventos sincronizados`);
      setSyncing(false);
      setTimeout(() => setResult(null), 4000);
    },
    onError: () => {
      setResult("Erro na sincronização");
      setSyncing(false);
      setTimeout(() => setResult(null), 4000);
    },
  });

  return (
    <button
      onClick={() => {
        setSyncing(true);
        setResult(null);
        syncMutation.mutate({ daysBack: 7, sourceId: 1 });
      }}
      disabled={syncing}
      className={cn(
        "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
        syncing
          ? "bg-secondary text-muted-foreground cursor-not-allowed"
          : "bg-primary/10 text-primary hover:bg-primary/20"
      )}
    >
      <RefreshCw size={16} className={cn("shrink-0", syncing && "animate-spin")} />
      <span>{result ?? (syncing ? "Sincronizando..." : "Sincronizar com PNCP")}</span>
    </button>
  );
}

export function BloombergLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-72 shrink-0 flex-col bg-sidebar border-r border-sidebar-border">
        {/* Logo / Header */}
        <div className="px-6 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center">
              <Activity size={18} className="text-primary" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">Opportunity</div>
              <div className="text-xs text-primary font-semibold">Map</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="status-dot-active" />
            <span>Sistema ativo</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={item.href === "/" ? location === "/" : location.startsWith(item.href)}
            />
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-sidebar-border space-y-3">
          <SyncButton />
          <div className="text-xs text-muted-foreground text-center py-2">
            <div>Fontes: PNCP, Compras.gov</div>
            <div className="text-xs mt-1">Portais customizados em breve</div>
          </div>
        </div>
      </aside>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed md:hidden left-0 top-0 h-screen w-72 bg-sidebar border-r border-sidebar-border flex flex-col z-50 transition-transform duration-300",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="px-6 py-5 border-b border-sidebar-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center">
              <Activity size={18} className="text-primary" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">Opportunity</div>
              <div className="text-xs text-primary font-semibold">Map</div>
            </div>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={item.href === "/" ? location === "/" : location.startsWith(item.href)}
              onClick={() => setMobileMenuOpen(false)}
            />
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-sidebar-border space-y-3">
          <SyncButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <button onClick={() => setMobileMenuOpen(true)} className="text-foreground">
            <Menu size={24} />
          </button>
          <div className="text-sm font-bold">Opportunity Map</div>
          <div className="w-6" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
