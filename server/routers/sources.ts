import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  createSource,
  getSources,
  getSourceById,
  toggleSourceActive,
  updateSource,
} from "../db";

export const sourcesRouter = router({
  list: publicProcedure
    .input(z.object({ activeOnly: z.boolean().default(false) }))
    .query(async ({ input }) => {
      return getSources(input.activeOnly);
    }),

  byId: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const src = await getSourceById(input.id);
      if (!src) throw new Error("Fonte não encontrada");
      return src;
    }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        url: z.string().url(),
        type: z.enum(["pncp", "compras_gov", "tribunal", "diario_oficial", "portal_transparencia", "outro"]).default("outro"),
        active: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      return createSource(input as any);
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number().int(),
        name: z.string().min(1).max(255).optional(),
        url: z.string().url().optional(),
        type: z.enum(["pncp", "compras_gov", "tribunal", "diario_oficial", "portal_transparencia", "outro"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateSource(id, data as any);
    }),

  toggleActive: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      return toggleSourceActive(input.id);
    }),
});
