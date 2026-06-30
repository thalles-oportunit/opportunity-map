import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { dashboardRouter } from "./routers/dashboard";
import { eventsRouter } from "./routers/events";
import { opportunitiesRouter } from "./routers/opportunities";
import { sourcesRouter } from "./routers/sources";
import { alertsRouter } from "./routers/alerts";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  dashboard: dashboardRouter,
  events: eventsRouter,
  opportunities: opportunitiesRouter,
  sources: sourcesRouter,
  alerts: alertsRouter,
});

export type AppRouter = typeof appRouter;
