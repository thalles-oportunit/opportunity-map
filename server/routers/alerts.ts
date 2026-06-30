import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { createAlert, deleteAlert, getAlertById, getAlerts, updateAlert } from "../db";

export const alertsRouter = router({
  list: publicProcedure
    .input(z.object({ activeOnly: z.boolean().default(false) }))
    .query(async ({ input }) => {
      return getAlerts(input.activeOnly);
    }),

  byId: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const alert = await getAlertById(input.id);
      if (!alert) throw new Error("Alerta não encontrado");
      return alert;
    }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        eventType: z.enum(["licitacao", "dispensa", "contrato", "obra", "convenio", "inauguracao", "plano", "all"]).default("all"),
        category: z.string().optional(),
        entity: z.string().optional(),
        municipality: z.string().optional(),
        minConfidenceScore: z.number().min(0).max(1).default(0.5),
        minValueBrl: z.string().optional(),
        active: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      return createAlert(input as any);
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number().int(),
        name: z.string().min(1).max(255).optional(),
        eventType: z.enum(["licitacao", "dispensa", "contrato", "obra", "convenio", "inauguracao", "plano", "all"]).optional(),
        category: z.string().optional(),
        entity: z.string().optional(),
        municipality: z.string().optional(),
        minConfidenceScore: z.number().min(0).max(1).optional(),
        minValueBrl: z.string().optional(),
        active: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateAlert(id, data as any);
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await deleteAlert(input.id);
      return { success: true };
    }),

  toggleActive: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const alert = await getAlertById(input.id);
      if (!alert) throw new Error("Alerta não encontrado");
      return updateAlert(input.id, { active: !alert.active });
    }),
});
