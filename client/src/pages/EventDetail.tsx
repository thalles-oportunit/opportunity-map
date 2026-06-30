import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { BloombergLayout } from "@/components/BloombergLayout";
import {
  SectionHeader,
  EventTypeBadge,
  StatusBadge,
  EmptyState,
} from "@/components/bloomberg";
import { formatBRL, formatDate } from "@/lib/format";
import { ArrowLeft, ExternalLink } from "lucide-react";

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const eventId = parseInt(id || "0", 10);

  const query = trpc.events.byId.useQuery({ id: eventId });
  const event = query.data;

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

  if (!event) {
    return (
      <BloombergLayout>
        <button
          onClick={() => navigate("/events")}
          className="btn btn-ghost btn-sm mb-4"
        >
          <ArrowLeft size={16} />
          Voltar
        </button>
        <EmptyState message="Evento não encontrado" />
      </BloombergLayout>
    );
  }

  return (
    <BloombergLayout>
      <button
        onClick={() => navigate("/events")}
        className="btn btn-ghost btn-sm mb-6"
      >
        <ArrowLeft size={16} />
        Voltar para Licitações
      </button>

      <SectionHeader title={event.title} sub={event.entity ?? "Entidade não informada"} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Badges */}
          <div className="card flex flex-wrap items-center gap-2">
            <EventTypeBadge type={event.type} />
            <StatusBadge status={event.status} />
            {event.modalidade && (
              <span className="badge-outline">{event.modalidade}</span>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <div className="card">
              <h3 className="font-semibold mb-2">Descrição</h3>
              <p className="text-sm text-foreground leading-relaxed">{event.description}</p>
            </div>
          )}

          {/* Details */}
          <div className="card">
            <h3 className="font-semibold mb-4">Detalhes</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-muted-foreground">Categoria</span>
                <p className="font-medium text-foreground">{event.category ?? "—"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Valor</span>
                <p className="font-medium text-foreground">{formatBRL(event.valueBrl)}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Data do Evento</span>
                <p className="font-medium text-foreground">{formatDate(event.eventDate)}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Data de Abertura</span>
                <p className="font-medium text-foreground">{formatDate(event.openDate)}</p>
              </div>
              {event.closeDate && (
                <div>
                  <span className="text-xs text-muted-foreground">Data de Encerramento</span>
                  <p className="font-medium text-foreground">{formatDate(event.closeDate)}</p>
                </div>
              )}
              <div>
                <span className="text-xs text-muted-foreground">Localização</span>
                <p className="font-medium text-foreground">
                  {event.municipality ?? "—"} / {event.state ?? "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Process Number */}
          {event.processNumber && (
            <div className="card">
              <span className="text-xs text-muted-foreground">Número do Processo</span>
              <p className="font-mono text-sm text-foreground mt-1">{event.processNumber}</p>
            </div>
          )}

          {/* Raw Data */}
          {event.rawData && (
            <div className="card">
              <span className="text-xs text-muted-foreground">Dados Brutos</span>
              <pre className="text-xs bg-secondary/50 p-2 rounded mt-2 overflow-x-auto text-foreground/70">
                {JSON.stringify(JSON.parse(event.rawData), null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Source */}
          <div className="card">
            <span className="text-xs text-muted-foreground">Fonte</span>
            <p className="font-medium text-foreground mt-1">ID: {event.sourceId}</p>
          </div>

          {/* External Link */}
          {event.sourceUrl && (
            <div className="card">
              <a
                href={event.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary w-full justify-center"
              >
                <ExternalLink size={16} />
                Ver no Portal Original
              </a>
            </div>
          )}

          {/* CNPJ */}
          {event.entityCnpj && (
            <div className="card">
              <span className="text-xs text-muted-foreground">CNPJ da Entidade</span>
              <p className="font-mono text-sm text-foreground mt-1">{event.entityCnpj}</p>
            </div>
          )}

          {/* Dates */}
          <div className="card">
            <span className="text-xs text-muted-foreground">Registrado em</span>
            <p className="text-sm text-foreground mt-1">{formatDate(event.createdAt)}</p>
            <span className="text-xs text-muted-foreground mt-3 block">Atualizado em</span>
            <p className="text-sm text-foreground mt-1">{formatDate(event.updatedAt)}</p>
          </div>
        </div>
      </div>
    </BloombergLayout>
  );
}
