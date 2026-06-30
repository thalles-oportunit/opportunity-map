import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { BloombergLayout } from "@/components/BloombergLayout";
import {
  SectionHeader,
  TableSkeleton,
  EmptyState,
  StatusBadge,
} from "@/components/bloomberg";
import { formatDate, SOURCE_TYPE_LABELS } from "@/lib/format";
import { ExternalLink, Power, Plus } from "lucide-react";

export default function Sources() {
  const [showForm, setShowForm] = useState(false);
  const [newSource, setNewSource] = useState({ name: "", url: "", type: "outro" as const });

  const sourcesQuery = trpc.sources.list.useQuery({ activeOnly: false });
  const createMutation = trpc.sources.create.useMutation({
    onSuccess: () => {
      sourcesQuery.refetch();
      setNewSource({ name: "", url: "", type: "outro" });
      setShowForm(false);
    },
  });
  const toggleMutation = trpc.sources.toggleActive.useMutation({
    onSuccess: () => sourcesQuery.refetch(),
  });

  const handleCreate = () => {
    if (!newSource.name || !newSource.url) return;
    createMutation.mutate(newSource);
  };

  return (
    <BloombergLayout>
      <SectionHeader
        title="Gerenciar Fontes de Dados"
        sub="Configure os portais e sistemas que você deseja monitorar"
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary btn-sm"
          >
            <Plus size={16} />
            Nova Fonte
          </button>
        }
      />

      {/* Add Form */}
      {showForm && (
        <div className="card mb-6">
          <h3 className="font-semibold mb-4">Adicionar Nova Fonte</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Nome da Fonte
              </label>
              <input
                type="text"
                value={newSource.name}
                onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                placeholder="Ex: Hospital Bíblico do Rio de Janeiro"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                URL do Portal
              </label>
              <input
                type="url"
                value={newSource.url}
                onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                placeholder="https://..."
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Tipo de Fonte
              </label>
              <select
                value={newSource.type}
                onChange={(e) => setNewSource({ ...newSource, type: e.target.value as any })}
                className="w-full"
              >
                <option value="pncp">PNCP</option>
                <option value="compras_gov">Compras.gov</option>
                <option value="tribunal">Tribunal de Contas</option>
                <option value="diario_oficial">Diário Oficial</option>
                <option value="portal_transparencia">Portal Transparência</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="btn btn-primary btn-sm flex-1"
              >
                {createMutation.isPending ? "Adicionando..." : "Adicionar"}
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

      {/* Sources List */}
      <div className="card">
        <h3 className="font-semibold mb-4">Fontes Configuradas</h3>
        {sourcesQuery.isLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : sourcesQuery.data && sourcesQuery.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground">
                    Nome
                  </th>
                  <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground">
                    Tipo
                  </th>
                  <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground">
                    URL
                  </th>
                  <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground">
                    Status
                  </th>
                  <th className="text-center py-3 px-3 font-semibold text-xs text-muted-foreground">
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody>
                {sourcesQuery.data.map((source) => (
                  <tr key={source.id} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="py-3 px-3 font-medium text-foreground">{source.name}</td>
                    <td className="py-3 px-3 text-xs text-muted-foreground">
                      {SOURCE_TYPE_LABELS[source.type] ?? source.type}
                    </td>
                    <td className="py-3 px-3">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80 flex items-center gap-1 text-xs truncate"
                      >
                        {source.url.replace(/^https?:\/\//, "").slice(0, 30)}
                        <ExternalLink size={12} className="shrink-0" />
                      </a>
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={source.active ? "active" : "closed"} type="source" />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => toggleMutation.mutate({ id: source.id })}
                        disabled={toggleMutation.isPending}
                        className="inline-flex items-center justify-center p-1 hover:bg-secondary rounded transition-colors"
                      >
                        <Power size={16} className="text-muted-foreground" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="Nenhuma fonte configurada" />
        )}
      </div>

      {/* Info */}
      <div className="card mt-6 bg-secondary/30 border-primary/20">
        <h4 className="font-semibold text-sm mb-2">Dica: Adicionar Portais Customizados</h4>
        <p className="text-xs text-muted-foreground">
          Você pode adicionar URLs de portais individuais como Hospital Bíblico, escolas municipais, prefeituras e outros órgãos que publicam editais em seus próprios sites. O sistema irá monitorar automaticamente essas fontes.
        </p>
      </div>
    </BloombergLayout>
  );
}
