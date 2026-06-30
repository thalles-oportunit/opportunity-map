import { cn } from "@/lib/utils";
import {
  confidenceBg,
  confidenceColor,
  confidenceLabel,
  confidencePct,
  daysUntilLabel,
  EVENT_TYPE_LABELS,
  EVENT_STATUS_LABELS,
  OPP_STATUS_LABELS,
} from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

// ─── KPI Card ─────────────────────────────────────────────────────────────────
export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  loading,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
  loading?: boolean;
}) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <Icon size={18} className={cn(accent ?? "text-muted-foreground")} />
      </div>
      {loading ? (
        <Skeleton className="h-8 w-24 bg-secondary rounded-md" />
      ) : (
        <span className={cn("text-3xl font-bold", accent ?? "text-foreground")}>{value}</span>
      )}
      {sub && <p className="text-xs text-muted-foreground mt-2">{sub}</p>}
    </div>
  );
}

// ─── Confidence Bar ───────────────────────────────────────────────────────────
export function ConfidenceBar({ score, showLabel = true }: { score: number; showLabel?: boolean }) {
  const pct = confidencePct(score);
  const color = confidenceBg(score);
  const textColor = confidenceColor(score);
  const label = confidenceLabel(score);
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-muted-foreground">Confiança</span>
          <span className={cn("text-sm font-bold", textColor)}>{pct}%</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", color)}
            style={{ width: `${pct}%` }}
          />
        </div>
        {showLabel && <span className={cn("text-xs mt-1 inline-block", textColor)}>Nível: {label}</span>}
      </div>
    </div>
  );
}

// ─── Countdown Badge ──────────────────────────────────────────────────────────
export function CountdownBadge({ date }: { date: string | Date | null | undefined }) {
  const label = daysUntilLabel(date);
  const days = typeof date === "string"
    ? Math.max(0, Math.ceil((new Date(date + (date.includes("T") ? "" : "T00:00:00")).getTime() - Date.now()) / 86400000))
    : 0;
  const urgent = days <= 14;
  const soon = days <= 30;
  return (
    <span
      className={cn(
        "badge text-xs font-semibold",
        urgent
          ? "bg-destructive/15 text-destructive"
          : soon
            ? "bg-chart-3/15 text-chart-3"
            : "bg-primary/15 text-primary"
      )}
    >
      {label}
    </span>
  );
}

// ─── Event Type Badge ─────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  licitacao: "bg-primary/15 text-primary",
  dispensa: "bg-chart-3/15 text-chart-3",
  contrato: "bg-chart-2/15 text-chart-2",
  obra: "bg-chart-5/15 text-chart-5",
  convenio: "bg-chart-4/15 text-chart-4",
  inauguracao: "bg-chart-1/15 text-chart-1",
  plano: "bg-secondary text-secondary-foreground",
};

export function EventTypeBadge({ type }: { type: string }) {
  return (
    <span
      className={cn(
        "badge text-xs font-semibold uppercase tracking-wide",
        TYPE_COLORS[type] ?? "bg-secondary text-secondary-foreground"
      )}
    >
      {EVENT_TYPE_LABELS[type] ?? type}
    </span>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
export function StatusBadge({ status, type = "event" }: { status: string; type?: "event" | "opp" | "source" }) {
  const labels = type === "opp" ? OPP_STATUS_LABELS : EVENT_STATUS_LABELS;
  const label = labels[status] ?? status;
  const cls =
    status === "active" || status === "predicted"
      ? "badge-primary"
      : status === "closed" || status === "confirmed"
        ? "badge-outline"
        : status === "cancelled"
          ? "badge-destructive"
          : "badge-outline";
  return <span className={cls}>{label}</span>;
}

// ─── Section Header ───────────────────────────────────────────────────────────
export function SectionHeader({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {sub && <p className="text-sm text-muted-foreground mt-1">{sub}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({ message = "Nenhum registro encontrado." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center mb-4">
        <span className="text-2xl text-muted-foreground">—</span>
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ─── Table Skeleton ───────────────────────────────────────────────────────────
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3 border-b border-border">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1 bg-secondary rounded-md" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export function Pagination({
  page,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
      <span className="text-xs text-muted-foreground">
        {total} registro{total !== 1 ? "s" : ""} · página {page}/{totalPages}
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="btn btn-outline btn-sm"
        >
          Anterior
        </button>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="btn btn-outline btn-sm"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}

// ─── Search Input ─────────────────────────────────────────────────────────────
export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full"
    />
  );
}

// ─── Select Filter ────────────────────────────────────────────────────────────
export function FilterSelect({
  value,
  onChange,
  options,
  placeholder = "Todos",
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 rounded-lg"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ─── Loading Spinner ──────────────────────────────────────────────────────────
export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-8 h-8" : "w-6 h-6";
  return (
    <div className={cn("animate-spin", sizeClass)}>
      <div className="w-full h-full border-2 border-primary/20 border-t-primary rounded-full" />
    </div>
  );
}
