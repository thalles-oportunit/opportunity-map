import { trpc } from "@/lib/trpc";
import { BloombergLayout } from "@/components/BloombergLayout";
import {
  KpiCard,
  SectionHeader,
  TableSkeleton,
  EmptyState,
  ConfidenceBar,
  CountdownBadge,
  EventTypeBadge,
  StatusBadge,
} from "@/components/bloomberg";
import { formatBRLCompact, formatDate } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, AlertCircle, Calendar, Building2 } from "lucide-react";

export default function Home() {
  const kpisQuery = trpc.dashboard.kpis.useQuery();
  const categoryQuery = trpc.dashboard.categoryBreakdown.useQuery();
  const recentQuery = trpc.dashboard.recentActivity.useQuery({ limit: 10 });
  const upcomingQuery = trpc.dashboard.upcomingOpportunities.useQuery({ daysAhead: 180, limit: 6 });

  const COLORS = ["#c5f0fc", "#b8e6f5", "#aaddee", "#9dd4e7", "#8ccbe0"];

  return (
    <BloombergLayout>
      <SectionHeader
        title="Painel de Controle"
        sub="Visão geral do monitoramento de licitações e oportunidades públicas"
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Total de Eventos"
          value={kpisQuery.data?.totalEvents ?? 0}
          sub="Licitações, contratos e editais"
          icon={AlertCircle}
          accent="text-primary"
          loading={kpisQuery.isLoading}
        />
        <KpiCard
          label="Oportunidades Previstas"
          value={kpisQuery.data?.totalOpportunities ?? 0}
          sub="Próximas 180 dias"
          icon={TrendingUp}
          accent="text-chart-2"
          loading={kpisQuery.isLoading}
        />
        <KpiCard
          label="Alertas Ativos"
          value={kpisQuery.data?.activeAlerts ?? 0}
          sub="Monitorando automaticamente"
          icon={AlertCircle}
          accent="text-chart-3"
          loading={kpisQuery.isLoading}
        />
        <KpiCard
          label="Fontes Ativas"
          value={kpisQuery.data?.activeSources ?? 0}
          sub="Portais monitorados"
          icon={Building2}
          accent="text-chart-4"
          loading={kpisQuery.isLoading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Category Breakdown */}
        <div className="lg:col-span-2 card">
          <h2 className="text-lg font-bold mb-4">Distribuição por Categoria</h2>
          {categoryQuery.isLoading ? (
            <TableSkeleton rows={3} cols={2} />
          ) : categoryQuery.data && categoryQuery.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryQuery.data as any}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="category" stroke="rgba(255,255,255,0.5)" angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <Tooltip
                  contentStyle={{ backgroundColor: "rgba(20,30,60,0.95)", border: "1px solid rgba(197,240,252,0.2)" }}
                  cursor={{ fill: "rgba(197,240,252,0.1)" }}
                />
                <Bar dataKey="count" fill="#c5f0fc" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="Sem dados de categorias" />
          )}
        </div>

        {/* Type Breakdown */}
        <div className="card">
          <h2 className="text-lg font-bold mb-4">Por Tipo</h2>
          {categoryQuery.isLoading ? (
            <TableSkeleton rows={3} cols={1} />
          ) : categoryQuery.data && categoryQuery.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryQuery.data as any}
                  dataKey="count"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={false}
                >
                  {categoryQuery.data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "rgba(20,30,60,0.95)", border: "1px solid rgba(197,240,252,0.2)" }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="Sem dados" />
          )}
        </div>
      </div>

      {/* Upcoming Opportunities */}
      <div className="card mb-8">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Calendar size={18} className="text-primary" />
          Oportunidades Previstas (Próximos 180 dias)
        </h2>
        {upcomingQuery.isLoading ? (
          <TableSkeleton rows={4} cols={4} />
        ) : upcomingQuery.data && upcomingQuery.data.length > 0 ? (
          <div className="space-y-3">
            {upcomingQuery.data.map((opp) => (
              <div key={opp.id} className="p-3 bg-secondary/30 rounded-lg border border-border hover:border-primary/40 transition-colors">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{opp.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{opp.entity}</p>
                  </div>
                  <CountdownBadge date={opp.predictedOpenDate} />
                </div>
                <div className="flex items-center justify-between gap-4 text-xs">
                  <span className="text-muted-foreground">{opp.category}</span>
                  <span className="text-primary font-semibold">{formatBRLCompact(opp.predictedValueBrl)}</span>
                </div>
                <div className="mt-2">
                  <ConfidenceBar score={opp.confidenceScore} showLabel={false} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="Nenhuma oportunidade prevista nos próximos 180 dias" />
        )}
      </div>

      {/* Recent Events */}
      <div className="card">
        <h2 className="text-lg font-bold mb-4">Atividade Recente</h2>
        {recentQuery.isLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : recentQuery.data && recentQuery.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 font-semibold text-xs text-muted-foreground">Tipo</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs text-muted-foreground">Descrição</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs text-muted-foreground">Entidade</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs text-muted-foreground">Valor</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs text-muted-foreground">Data</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentQuery.data.map((event) => (
                  <tr key={event.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="py-2 px-2">
                      <EventTypeBadge type={event.type} />
                    </td>
                    <td className="py-2 px-2 text-foreground max-w-xs truncate">{event.title}</td>
                    <td className="py-2 px-2 text-muted-foreground text-xs truncate">{event.entity ?? "—"}</td>
                    <td className="py-2 px-2 text-foreground font-medium">{formatBRLCompact(event.valueBrl)}</td>
                    <td className="py-2 px-2 text-muted-foreground text-xs">{formatDate(event.eventDate)}</td>
                    <td className="py-2 px-2">
                      <StatusBadge status={event.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="Nenhum evento registrado" />
        )}
      </div>
    </BloombergLayout>
  );
}
