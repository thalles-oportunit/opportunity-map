import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { BloombergLayout } from "@/components/BloombergLayout";
import {
  SectionHeader,
  TableSkeleton,
  EmptyState,
  StatusBadge,
} from "@/components/bloomberg";
import { ALERT_TYPE_LABELS, EVENT_TYPE_LABELS } from "@/lib/format";
import { Plus, Trash2, Power } from "lucide-react";

export default function Alerts() {
  const [showForm, setShowForm] = useState(false);
  const [newAlert, setNewAlert] = useState({
    name: "",
    eventType: "all" as const,
    category: "",
    minConfidenceScore: 0.5,
  });

  const alertsQuery = trpc.alerts.list.useQuery({ activeOnly: false });
  const createMutation = trpc.alerts.create.useMutation({
    onSuccess: () => {
      alertsQuery.refetch();
      setNewAlert({ name: "", eventType: "all", category: "", minConfidenceScore: 0.5 });
      setShowForm(false);
    },
  });
  const deleteMutation = trpc.alerts.delete.useMutation({
    onSuccess: () => alertsQuery.refetch(),
  });
  const toggleMutation = trpc.alerts.toggleActive.useMutation({
    onSuccess: () => alertsQuery.refetch(),
  });

  const handleCreate = () => {
    if (!newAlert.name) return;
    createMutation.mutate(newAlert);
  };

  return (
    <BloombergLayout>
      <SectionHeader
        title="Meus Alertas"
        sub="Configure alertas automáticos para ser notificado sobre novas oportunidades"
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary btn-sm"
          >
            <Plus size={16} />
            Novo Alerta
          </button>
        }
      />

      {/* Add Form */}
      {showForm && (
        <div className="card mb-6">
          <h3 className="font-semibold mb-4">Criar Novo Alerta</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Nome do Alerta
              </label>
              <input
                type="text"
                value={newAlert.name}
                onChange={(e) => setNewAlert({ ...newAlert, name: e.target.value })}
                placeholder="Ex: Licitações de TI acima de R$ 500 mil"
                className="w-full"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Tipo de Evento
                </label>
                <select
                  value={newAlert.eventType}
                  onChange={(e) => setNewAlert({ ...newAlert, eventType: e.target.value as any })}
                  className="w-full"
                >
                  {Object.entries(ALERT_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Confiança Mínima
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={newAlert.minConfidenceScore}
                  onChange={(e) =>
                    setNewAlert({ ...newAlert, minConfidenceScore: parseFloat(e.target.value) })
                  }
                  className="w-full"
                />
                <span className="text-xs text-muted-foreground">
                  {Math.round(newAlert.minConfidenceScore * 100)}%
                </span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Categoria (opcional)
              </label>
              <input
                type="text"
                value={newAlert.category}
                onChange={(e) => setNewAlert({ ...newAlert, category: e.target.value })}
                placeholder="Ex: Tecnologia da Informação"
                className="w-full"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="btn btn-primary btn-sm flex-1"
              >
                {createMutation.isPending ? "Criando..." : "Criar Alerta"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="btn btn-outline btn-sm flex-1"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alerts List */}
      <div className="card">
        <h3 className="font-semibold mb-4">Alertas Configurados</h3>
        {alertsQuery.isLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : alertsQuery.data && alertsQuery.data.length > 0 ? (
          <div className="space-y-2">
            {alertsQuery.data.map((alert) => (
              <div
                key={alert.id}
                className="p-3 bg-secondary/30 rounded-lg border border-border hover:border-primary/40 transition-colors flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground">{alert.name}</h4>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span>Tipo: {ALERT_TYPE_LABELS[alert.eventType] ?? alert.eventType}</span>
                    {alert.category && <span>•</span>}
                    {alert.category && <span>Categoria: {alert.category}</span>}
                    <span>•</span>
                    <span>Confiança mín: {Math.round((alert.minConfidenceScore ?? 0.5) * 100)}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <StatusBadge status={alert.active ? "active" : "closed"} />
                  <button
                    onClick={() => toggleMutation.mutate({ id: alert.id })}
                    disabled={toggleMutation.isPending}
                    className="inline-flex items-center justify-center p-1.5 hover:bg-secondary rounded transition-colors"
                  >
                    <Power size={16} className="text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate({ id: alert.id })}
                    disabled={deleteMutation.isPending}
                    className="inline-flex items-center justify-center p-1.5 hover:bg-destructive/10 rounded transition-colors"
                  >
                    <Trash2 size={16} className="text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="Nenhum alerta configurado. Crie um para começar a monitorar!" />
        )}
      </div>

      {/* Info */}
      <div className="card mt-6 bg-secondary/30 border-primary/20">
        <h4 className="font-semibold text-sm mb-2">Como Funcionam os Alertas</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Alertas são verificados automaticamente a cada sincronização com PNCP</li>
          <li>• Você será notificado quando uma nova oportunidade corresponder aos seus critérios</li>
          <li>• Configure múltiplos alertas para diferentes tipos de oportunidades</li>
          <li>• Ative/desative alertas sem precisar deletá-los</li>
        </ul>
      </div>
    </BloombergLayout>
  );
}
