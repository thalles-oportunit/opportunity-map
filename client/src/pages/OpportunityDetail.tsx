import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { BloombergLayout } from "@/components/BloombergLayout";
import {
  SectionHeader,
  ConfidenceBar,
  CountdownBadge,
  StatusBadge,
  EmptyState,
  EventTypeBadge,
  TableSkeleton,
} from "@/components/bloomberg";
import { formatBRL, formatDate } from "@/lib/format";
import { ArrowLeft, TrendingUp } from "lucide-react";

export default function OpportunityDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const oppId = parseInt(id || "0", 10);

  const query = trpc.opportunities.byId.useQuery({ id: oppId });
  const opp = query.data;

  if (query.isLoading) {
    return (
      <BloombergLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-secondary rounded-lg w-1/3" />
          <div className="h-4 bg-secondary rounded-lg w-2/3" />
        </div>
      </BloombergLayout>
    );
  }

  if (!opp) {
    return (
      <BloombergLayout>
        <button
          onClick={() => navigate("/opportunities")}
          className="btn btn-ghost btn-sm mb-4"
        >
          <ArrowLeft size={16} />
          Voltar
        </button>
        <EmptyState message="Oportunidade não encontrada" />
      </BloombergLayout>
    );
  }

  return (
    <BloombergLayout>
      <button
        onClick={() => navigate("/opportunities")}
        className="btn btn-ghost btn-sm mb-6"
      >
        <ArrowLeft size={16} />
        Voltar para Oportunidades
      </button>

      <SectionHeader
        title={opp.title}
        sub={opp.entity ?? "Entidade não informada"}
        action={<CountdownBadge date={opp.predictedOpenDate} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Status */}
          <div className="card flex items-center gap-3">
            <TrendingUp size={18} className="text-primary" />
            <div className="flex-1">
              <span className="text-xs text-muted-foreground">Status</span>
              <p className="mt-1">
                <StatusBadge status={opp.status} type="opp" />
              </p>
            </div>
          </div>

          {/* Fundamentação */}
          <div className="card">
            <h3 className="font-semibold mb-3">Fundamentação da Previsão</h3>
            <p className="text-sm text-foreground leading-relaxed">
              Esta oportunidade foi identificada com base em padrões históricos de licitações similares do órgão público. A data prevista foi estimada considerando ciclos anteriores de contratação.
            </p>
          </div>

          {/* Detalhes */}
          <div className="card">
            <h3 className="font-semibold mb-4">Detalhes</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-muted-foreground">Categoria</span>
                <p className="font-medium text-foreground mt-1">{opp.category}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Valor Estimado</span>
                <p className="font-medium text-foreground mt-1">{formatBRL(opp.predictedValueBrl)}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Data Prevista</span>
                <p className="font-medium text-foreground mt-1">{formatDate(opp.predictedOpenDate)}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Localização</span>
                <p className="font-medium text-foreground mt-1">{opp.municipality ?? "—"}</p>
              </div>
            </div>
          </div>

          {/* Confiança */}
          <div className="card">
            <ConfidenceBar score={opp.confidenceScore} showLabel={true} />
          </div>

          {/* Eventos Relacionados */}
          <div className="card">
            <h3 className="font-semibold mb-4">Eventos Gatilho Relacionados</h3>
            {opp.triggerEvents && opp.triggerEvents.length > 0 ? (
              <div className="space-y-2">
                {opp.triggerEvents.map((event: any) => (
                  <div
                    key={event.id}
                    onClick={() => navigate(`/events/${event.id}`)}
                    className="p-3 bg-secondary/30 rounded-lg border border-border hover:border-primary/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <EventTypeBadge type={event.type} />
                        </div>
                        <h4 className="font-medium text-foreground truncate">{event.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{event.entity}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{formatDate(event.eventDate)}</span>
                      <span className="text-primary font-semibold">{formatBRL(event.valueBrl)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="Nenhum evento relacionado encontrado" />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Metadata */}
          <div className="card">
            <span className="text-xs text-muted-foreground">Registrado em</span>
            <p className="text-sm text-foreground mt-1">{formatDate(opp.createdAt)}</p>
            <span className="text-xs text-muted-foreground mt-3 block">Atualizado em</span>
            <p className="text-sm text-foreground mt-1">{formatDate(opp.updatedAt)}</p>
          </div>

          {/* Score Breakdown */}
          <div className="card">
            <h4 className="font-semibold text-sm mb-3">Score de Confiança</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Confiança Bruta</span>
                <span className="font-mono text-foreground">{Math.round(opp.confidenceScore * 100)}%</span>
              </div>
              <div className="pt-2 border-t border-border/50">
                <p className="text-muted-foreground">
                  {opp.confidenceScore >= 0.85
                    ? "Nível: Muito Alta"
                    : opp.confidenceScore >= 0.70
                      ? "Nível: Alta"
                      : opp.confidenceScore >= 0.50
                        ? "Nível: Média"
                        : "Nível: Baixa"}
                </p>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="card bg-secondary/30 border-primary/20">
            <h4 className="font-semibold text-sm mb-2">Sobre esta Previsão</h4>
            <p className="text-xs text-muted-foreground">
              Esta oportunidade foi identificada por um agente de IA que analisa padrões históricos de licitações do órgão público. O score de confiança reflete a probabilidade estimada de abertura.
            </p>
          </div>
        </div>
      </div>
    </BloombergLayout>
  );
}
