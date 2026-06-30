import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { BloombergLayout } from "@/components/BloombergLayout";
import {
  SectionHeader,
  TableSkeleton,
  EmptyState,
  ConfidenceBar,
  CountdownBadge,
  StatusBadge,
  Pagination,
  FilterSelect,
} from "@/components/bloomberg";
import { formatBRLCompact, formatDate } from "@/lib/format";
import { ChevronRight, TrendingUp } from "lucide-react";

const CATEGORIES = [
  "Limpeza e Conservação",
  "Tecnologia da Informação",
  "Obras e Infraestrutura",
  "Saúde",
  "Educação",
  "Alimentação",
  "Transporte",
  "Segurança",
  "Mobiliário",
  "Material de Escritório",
  "Energia e Elétrica",
  "Saneamento",
  "Consultoria e Assessoria",
  "Comunicação",
  "Outros",
];

export default function Opportunities() {
  const [, navigate] = useLocation();
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const query = trpc.opportunities.list.useQuery({
    page,
    pageSize: 20,
    category: categoryFilter || undefined,
    status: (statusFilter || undefined) as any,
    daysAhead: 180,
  });

  const categoryOptions = CATEGORIES.map((c) => ({ value: c, label: c }));
  const statusOptions = [
    { value: "predicted", label: "Previsto" },
    { value: "confirmed", label: "Confirmado" },
    { value: "cancelled", label: "Cancelado" },
    { value: "expired", label: "Expirado" },
  ];

  return (
    <BloombergLayout>
      <SectionHeader
        title="Oportunidades Previstas"
        sub="Licitações identificadas por IA com base em padrões históricos"
        action={
          <div className="text-xs text-muted-foreground">
            {query.data?.total ?? 0} oportunidades
          </div>
        }
      />

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FilterSelect
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={categoryOptions}
            placeholder="Todas as categorias"
          />
          <FilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions}
            placeholder="Todos os status"
          />
        </div>
      </div>

      {/* Opportunities Grid */}
      <div className="space-y-3">
        {query.isLoading ? (
          <TableSkeleton rows={4} cols={3} />
        ) : query.data?.data && query.data.data.length > 0 ? (
          <>
            {query.data.data.map((opp) => (
              <div
                key={opp.id}
                onClick={() => navigate(`/opportunities/${opp.id}`)}
                className="card cursor-pointer hover:border-primary/40 transition-all"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp size={16} className="text-primary shrink-0" />
                      <h3 className="font-semibold text-foreground truncate">{opp.title}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">{opp.entity}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <CountdownBadge date={opp.predictedOpenDate} />
                    <ChevronRight size={18} className="text-muted-foreground" />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Categoria</span>
                    <p className="font-medium text-foreground">{opp.category}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Valor Estimado</span>
                    <p className="font-medium text-foreground">{formatBRLCompact(opp.predictedValueBrl)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Data Prevista</span>
                    <p className="font-medium text-foreground">{formatDate(opp.predictedOpenDate)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status</span>
                    <p className="mt-1">
                      <StatusBadge status={opp.status} type="opp" />
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/50">
                  <ConfidenceBar score={opp.confidenceScore} showLabel={true} />
                </div>
              </div>
            ))}
            <Pagination
              page={page}
              total={query.data.total}
              pageSize={20}
              onPage={setPage}
            />
          </>
        ) : (
          <EmptyState message="Nenhuma oportunidade prevista encontrada" />
        )}
      </div>
    </BloombergLayout>
  );
}
