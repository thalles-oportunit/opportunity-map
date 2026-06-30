import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  bulkCreateEvents,
  createEvent,
  getEventById,
  getEvents,
  getRecentEvents,
} from "../db";
import {
  fetchContratacoes,
  fetchContratos,
  normalizeContratacao,
  normalizeContrato,
  toApiDate,
} from "../pncp";

export const eventsRouter = router({
  list: publicProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        search: z.string().optional(),
        type: z.enum(["licitacao", "dispensa", "contrato", "obra", "convenio", "inauguracao", "plano"]).optional(),
        status: z.enum(["active", "closed", "cancelled", "archived"]).optional(),
        municipality: z.string().optional(),
        state: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return getEvents(input);
    }),

  byId: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const event = await getEventById(input.id);
      if (!event) throw new Error("Evento não encontrado");
      return event;
    }),

  recent: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(10) }))
    .query(async ({ input }) => {
      return getRecentEvents(input.limit);
    }),

  create: publicProcedure
    .input(
      z.object({
        type: z.enum(["licitacao", "dispensa", "contrato", "obra", "convenio", "inauguracao", "plano"]),
        title: z.string().min(1),
        description: z.string().optional(),
        entity: z.string().optional(),
        municipality: z.string().optional(),
        state: z.string().optional(),
        category: z.string().optional(),
        valueBrl: z.string().optional(),
        eventDate: z.string().optional(),
        processNumber: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return createEvent(input as any);
    }),

  /**
   * Sincroniza eventos reais do PNCP para o banco de dados.
   * Busca licitações e contratos dos últimos N dias.
   */
  syncFromPncp: publicProcedure
    .input(
      z.object({
        daysBack: z.number().int().min(1).max(90).default(30),
        sourceId: z.number().int().default(1),
      })
    )
    .mutation(async ({ input }) => {
      const { daysBack, sourceId } = input;
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - daysBack);

      const dataInicial = toApiDate(start);
      const dataFinal = toApiDate(end);

      let imported = 0;
      const errors: string[] = [];

      // Busca pregões eletrônicos (modalidade 6)
      try {
        const result = await fetchContratacoes({
          dataInicial,
          dataFinal,
          tamanhoPagina: 50,
          codigoModalidadeContratacao: 6,
        });
        const normalized = (result.data ?? []).map((c) => normalizeContratacao(c, sourceId));
        await bulkCreateEvents(normalized as any);
        imported += normalized.length;
      } catch (e: any) {
        errors.push(`Pregão: ${e.message}`);
      }

      // Busca concorrências (modalidade 8)
      try {
        const result = await fetchContratacoes({
          dataInicial,
          dataFinal,
          tamanhoPagina: 50,
          codigoModalidadeContratacao: 8,
        });
        const normalized = (result.data ?? []).map((c) => normalizeContratacao(c, sourceId));
        await bulkCreateEvents(normalized as any);
        imported += normalized.length;
      } catch (e: any) {
        errors.push(`Concorrência: ${e.message}`);
      }

      // Busca contratos
      try {
        const result = await fetchContratos({ dataInicial, dataFinal, tamanhoPagina: 50 });
        const normalized = (result.data ?? []).map((c) => normalizeContrato(c, sourceId));
        await bulkCreateEvents(normalized as any);
        imported += normalized.length;
      } catch (e: any) {
        errors.push(`Contratos: ${e.message}`);
      }

      return { imported, errors, period: { dataInicial, dataFinal } };
    }),
});
