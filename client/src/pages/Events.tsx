import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { BloombergLayout } from "@/components/BloombergLayout";
import {
  SectionHeader,
  TableSkeleton,
  EmptyState,
  EventTypeBadge,
  StatusBadge,
  Pagination,
  SearchInput,
  FilterSelect,
} from "@/components/bloomberg";
import { formatBRLCompact, formatDate, EVENT_TYPE_LABELS } from "@/lib/format";
import { ExternalLink, ChevronRight } from "lucide-react";

export default function Events() {
  const [, navigate] = useLocation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const query = trpc.events.list.useQuery({
    page,
    pageSize: 20,
    search: search || undefined,
    type: (typeFilter || undefined) as any,
    status: (statusFilter || undefined) as any,
  });

  const typeOptions = Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }));
  const statusOptions = [
    { value: "active", label: "Ativo" },
    { value: "closed", label: "Encerrado" },
    { value: "cancelled", label: "Cancelado" },
  ];

  return (
    <BloombergLayout>
      <SectionHeader
        title="Licitações e Eventos"
        sub="Monitore todas as licitações, contratos e editais públicos"
        action={
          <div className="text-xs text-muted-foreground">
            {query.data?.total ?? 0} eventos encontrados
          </div>
        }
      />

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por título, entidade..." />
          <FilterSelect
            value={typeFilter}
            onChange={setTypeFilter}
            options={typeOptions}
            placeholder="Todos os tipos"
          />
          <FilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions}
            placeholder="Todos os status"
          />
        </div>
      </div>

      {/* Events List */}
      <div className="card">
        {query.isLoading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : query.data?.data && query.data.data.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground">Tipo</th>
                    <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground">Descrição</th>
                    <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground">Entidade</th>
                    <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground">Valor</th>
                    <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground">Data</th>
                    <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground">Status</th>
                    <th className="text-center py-3 px-3 font-semibold text-xs text-muted-foreground">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.data.map((event) => (
                    <tr
                      key={event.id}
                      className="border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/events/${event.id}`)}
                    >
                      <td className="py-3 px-3">
                        <EventTypeBadge type={event.type} />
                      </td>
                      <td className="py-3 px-3 text-foreground max-w-xs truncate">{event.title}</td>
                      <td className="py-3 px-3 text-muted-foreground text-xs truncate">{event.entity ?? "—"}</td>
                      <td className="py-3 px-3 text-foreground font-medium">{formatBRLCompact(event.valueBrl)}</td>
                      <td className="py-3 px-3 text-muted-foreground text-xs">{formatDate(event.eventDate)}</td>
                      <td className="py-3 px-3">
                        <StatusBadge status={event.status} />
                      </td>
                      <td className="py-3 px-3 text-center">
                        <ChevronRight size={16} className="mx-auto text-muted-foreground" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              total={query.data.total}
              pageSize={20}
              onPage={setPage}
            />
          </>
        ) : (
          <EmptyState message="Nenhum evento encontrado com os filtros selecionados" />
        )}
      </div>
    </BloombergLayout>
  );
}
