import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  getCategoryBreakdown,
  getDashboardKpis,
  getRecentEvents,
  getTypeBreakdown,
  getUpcomingOpportunities,
} from "../db";

export const dashboardRouter = router({
  kpis: publicProcedure.query(async () => {
    return getDashboardKpis();
  }),

  categoryBreakdown: publicProcedure.query(async () => {
    return getCategoryBreakdown();
  }),

  typeBreakdown: publicProcedure.query(async () => {
    return getTypeBreakdown();
  }),

  recentActivity: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(15) }))
    .query(async ({ input }) => {
      return getRecentEvents(input.limit);
    }),

  upcomingOpportunities: publicProcedure
    .input(
      z.object({
        daysAhead: z.number().int().min(1).max(365).default(180),
        limit: z.number().int().min(1).max(20).default(8),
      })
    )
    .query(async ({ input }) => {
      return getUpcomingOpportunities(input.daysAhead, input.limit);
    }),
});
