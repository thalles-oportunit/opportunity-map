import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const mockUser = {
  id: 1,
  openId: "test-user",
  email: "test@example.com",
  name: "Test User",
  loginMethod: "test",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const mockContext: TrpcContext = {
  user: mockUser,
  req: {
    protocol: "https",
    headers: {},
  } as any,
  res: {} as any,
};

describe("Opportunity Map Routers", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    caller = appRouter.createCaller(mockContext);
  });

  describe("Dashboard Router", () => {
    it("should fetch KPIs", async () => {
      const kpis = await caller.dashboard.kpis();
      expect(kpis).toBeDefined();
      expect(kpis).toHaveProperty("totalEvents");
      expect(kpis).toHaveProperty("totalOpportunities");
      expect(kpis).toHaveProperty("activeAlerts");
      expect(kpis).toHaveProperty("activeSources");
      expect(typeof kpis.totalEvents).toBe("number");
      expect(typeof kpis.totalOpportunities).toBe("number");
      expect(typeof kpis.activeAlerts).toBe("number");
      expect(typeof kpis.activeSources).toBe("number");
    });

    it("should fetch category breakdown", async () => {
      const breakdown = await caller.dashboard.categoryBreakdown();
      expect(Array.isArray(breakdown)).toBe(true);
      if (breakdown.length > 0) {
        expect(breakdown[0]).toHaveProperty("category");
        expect(breakdown[0]).toHaveProperty("count");
      }
    });

    it("should fetch recent activity", async () => {
      const activity = await caller.dashboard.recentActivity({ limit: 10 });
      expect(Array.isArray(activity)).toBe(true);
      if (activity.length > 0) {
        expect(activity[0]).toHaveProperty("id");
        expect(activity[0]).toHaveProperty("title");
        expect(activity[0]).toHaveProperty("type");
      }
    });

    it("should fetch upcoming opportunities", async () => {
      const upcoming = await caller.dashboard.upcomingOpportunities({
        daysAhead: 180,
        limit: 6,
      });
      expect(Array.isArray(upcoming)).toBe(true);
      if (upcoming.length > 0) {
        expect(upcoming[0]).toHaveProperty("id");
        expect(upcoming[0]).toHaveProperty("title");
        expect(upcoming[0]).toHaveProperty("predictedOpenDate");
      }
    });
  });

  describe("Events Router", () => {
    it("should list events with pagination", async () => {
      const result = await caller.events.list({
        page: 1,
        pageSize: 10,
      });
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("total");
      expect(Array.isArray(result.data)).toBe(true);
      expect(typeof result.total).toBe("number");
    });

    it("should search events by title", async () => {
      const result = await caller.events.list({
        page: 1,
        pageSize: 10,
        search: "licitação",
      });
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("total");
      expect(Array.isArray(result.data)).toBe(true);
    });

    it("should filter events by type", async () => {
      const result = await caller.events.list({
        page: 1,
        pageSize: 10,
        type: "licitacao",
      });
      expect(result).toHaveProperty("data");
      expect(Array.isArray(result.data)).toBe(true);
    });

    it("should fetch event by ID", async () => {
      const list = await caller.events.list({ page: 1, pageSize: 1 });
      if (list.data.length > 0) {
        const event = await caller.events.byId({ id: list.data[0].id });
        expect(event).toBeDefined();
        expect(event).toHaveProperty("id");
        expect(event).toHaveProperty("title");
      }
    });
  });

  describe("Opportunities Router", () => {
    it("should list opportunities with pagination", async () => {
      const result = await caller.opportunities.list({
        page: 1,
        pageSize: 10,
        daysAhead: 180,
      });
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("total");
      expect(Array.isArray(result.data)).toBe(true);
    });

    it("should filter opportunities by category", async () => {
      const result = await caller.opportunities.list({
        page: 1,
        pageSize: 10,
        category: "Saúde",
        daysAhead: 180,
      });
      expect(result).toHaveProperty("data");
      expect(Array.isArray(result.data)).toBe(true);
    });

    it("should fetch opportunity by ID", async () => {
      const list = await caller.opportunities.list({
        page: 1,
        pageSize: 1,
        daysAhead: 180,
      });
      if (list.data.length > 0) {
        const opp = await caller.opportunities.byId({ id: list.data[0].id });
        expect(opp).toBeDefined();
        expect(opp).toHaveProperty("id");
        expect(opp).toHaveProperty("title");
        expect(opp).toHaveProperty("confidenceScore");
      }
    });
  });

  describe("Sources Router", () => {
    it("should list sources", async () => {
      const sources = await caller.sources.list({ activeOnly: false });
      expect(Array.isArray(sources)).toBe(true);
      if (sources.length > 0) {
        expect(sources[0]).toHaveProperty("id");
        expect(sources[0]).toHaveProperty("name");
        expect(sources[0]).toHaveProperty("url");
        expect(sources[0]).toHaveProperty("active");
      }
    });

    it("should list only active sources", async () => {
      const sources = await caller.sources.list({ activeOnly: true });
      expect(Array.isArray(sources)).toBe(true);
      sources.forEach((source) => {
        expect(source.active).toBe(true);
      });
    });
  });

  describe("Alerts Router", () => {
    it("should list alerts", async () => {
      const alerts = await caller.alerts.list({ activeOnly: false });
      expect(Array.isArray(alerts)).toBe(true);
      if (alerts.length > 0) {
        expect(alerts[0]).toHaveProperty("id");
        expect(alerts[0]).toHaveProperty("name");
        expect(alerts[0]).toHaveProperty("active");
      }
    });

    it("should list only active alerts", async () => {
      const alerts = await caller.alerts.list({ activeOnly: true });
      expect(Array.isArray(alerts)).toBe(true);
      alerts.forEach((alert) => {
        expect(alert.active).toBe(true);
      });
    });
  });

  describe("Auth Router", () => {
    it("should return current user", async () => {
      const user = await caller.auth.me();
      expect(user).toEqual(mockUser);
    });

    it("should logout", async () => {
      const mockRes = {
        clearCookie: () => {},
      };
      const ctxWithRes: TrpcContext = {
        ...mockContext,
        res: mockRes as any,
      };
      const callerWithRes = appRouter.createCaller(ctxWithRes);
      const result = await callerWithRes.auth.logout();
      expect(result).toEqual({ success: true });
    });
  });
});
