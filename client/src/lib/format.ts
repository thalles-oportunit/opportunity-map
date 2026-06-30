/**
 * Utilitários de formatação para a interface Bloomberg terminal.
 * Toda a interface é em português brasileiro, sem emojis.
 */

export function formatBRL(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatBRLCompact(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  if (num >= 1_000_000) return `R$ ${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `R$ ${(num / 1_000).toFixed(0)}K`;
  return formatBRL(num);
}

export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = typeof dateStr === "string" ? new Date(dateStr + (dateStr.includes("T") ? "" : "T00:00:00")) : dateStr;
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
  } catch {
    return String(dateStr).split("T")[0] ?? "—";
  }
}

export function formatDateTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "—";
  }
}

export function daysUntil(dateStr: string | Date | null | undefined): number {
  if (!dateStr) return 0;
  const d = typeof dateStr === "string" ? new Date(dateStr + (dateStr.includes("T") ? "" : "T00:00:00")) : dateStr;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((d.getTime() - today.getTime()) / 86_400_000));
}

export function daysUntilLabel(dateStr: string | Date | null | undefined): string {
  const n = daysUntil(dateStr);
  if (n === 0) return "Hoje";
  if (n === 1) return "Amanhã";
  if (n <= 7) return `${n}d`;
  if (n <= 30) return `${n}d`;
  if (n <= 60) return `${Math.round(n / 7)}sem`;
  return `${Math.round(n / 30)}m`;
}

export function confidencePct(score: number): number {
  return Math.round(Math.min(1, Math.max(0, score)) * 100);
}

export function confidenceLabel(score: number): string {
  const pct = confidencePct(score);
  if (pct >= 85) return "Alta";
  if (pct >= 60) return "Média";
  return "Baixa";
}

export function confidenceColor(score: number): string {
  const pct = confidencePct(score);
  if (pct >= 85) return "text-primary";
  if (pct >= 60) return "text-chart-3";
  return "text-destructive";
}

export function confidenceBg(score: number): string {
  const pct = confidencePct(score);
  if (pct >= 85) return "bg-primary";
  if (pct >= 60) return "bg-chart-3";
  return "bg-destructive";
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  licitacao: "Licitação",
  dispensa: "Dispensa",
  contrato: "Contrato",
  obra: "Obra",
  convenio: "Convênio",
  inauguracao: "Inauguração",
  plano: "Plano/Programa",
};

export const EVENT_STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  closed: "Encerrado",
  cancelled: "Cancelado",
  archived: "Arquivado",
};

export const OPP_STATUS_LABELS: Record<string, string> = {
  predicted: "Previsto",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
  expired: "Expirado",
};

export const SOURCE_TYPE_LABELS: Record<string, string> = {
  pncp: "PNCP",
  compras_gov: "Compras.gov",
  tribunal: "Tribunal de Contas",
  diario_oficial: "Diário Oficial",
  portal_transparencia: "Portal Transparência",
  outro: "Outro",
};

export const ALERT_TYPE_LABELS: Record<string, string> = {
  ...EVENT_TYPE_LABELS,
  all: "Todos os tipos",
};

export function truncate(str: string | null | undefined, max = 80): string {
  if (!str) return "—";
  return str.length > max ? str.slice(0, max) + "…" : str;
}

export function stateLabel(uf: string | null | undefined): string {
  if (!uf) return "—";
  return uf.toUpperCase();
}
