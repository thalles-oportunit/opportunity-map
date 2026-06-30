import { and, asc, count, desc, eq, gte, like, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  alerts,
  events,
  opportunities,
  opportunityEvents,
  sources,
  users,
  type InsertAlert,
  type InsertEvent,
  type InsertOpportunity,
  type InsertOpportunityEvent,
  type InsertSource,
  type InsertUser,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// ─── Sources ──────────────────────────────────────────────────────────────────
export async function getSources(activeOnly = false) {
  const db = await getDb();
  if (!db) return [];
  const q = db.select().from(sources);
  if (activeOnly) return q.where(eq(sources.active, true)).orderBy(asc(sources.name));
  return q.orderBy(asc(sources.name));
}

export async function getSourceById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sources).where(eq(sources.id, id)).limit(1);
  return result[0];
}

export async function createSource(data: InsertSource) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(sources).values(data);
  const result = await db.select().from(sources).orderBy(desc(sources.id)).limit(1);
  return result[0];
}

export async function updateSource(id: number, data: Partial<InsertSource>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(sources).set(data).where(eq(sources.id, id));
  return getSourceById(id);
}

export async function toggleSourceActive(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const src = await getSourceById(id);
  if (!src) throw new Error("Source not found");
  await db.update(sources).set({ active: !src.active }).where(eq(sources.id, id));
  return getSourceById(id);
}

// ─── Events ───────────────────────────────────────────────────────────────────
export async function getEvents(opts: {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
  status?: string;
  municipality?: string;
  state?: string;
}) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  const { page = 1, pageSize = 20, search, type, status, municipality, state } = opts;
  const offset = (page - 1) * pageSize;

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        like(events.title, `%${search}%`),
        like(events.entity, `%${search}%`),
        like(events.description, `%${search}%`),
        like(events.processNumber, `%${search}%`)
      )
    );
  }
  if (type) conditions.push(eq(events.type, type as any));
  if (status) conditions.push(eq(events.status, status as any));
  if (municipality) conditions.push(like(events.municipality, `%${municipality}%`));
  if (state) conditions.push(eq(events.state, state));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(events)
      .where(where)
      .orderBy(desc(events.eventDate), desc(events.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ count: count() }).from(events).where(where),
  ]);

  return { data, total: countResult[0]?.count ?? 0 };
}

export async function getEventById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return result[0];
}

export async function createEvent(data: InsertEvent) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(events).values(data);
  const result = await db.select().from(events).orderBy(desc(events.id)).limit(1);
  return result[0];
}

export async function bulkCreateEvents(data: InsertEvent[]) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  if (data.length === 0) return;
  await db.insert(events).values(data).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
}

export async function getRecentEvents(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(events).orderBy(desc(events.createdAt)).limit(limit);
}

export async function getEventsByEntity(entity: string, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(events)
    .where(like(events.entity, `%${entity}%`))
    .orderBy(desc(events.eventDate))
    .limit(limit);
}

// ─── Opportunities ────────────────────────────────────────────────────────────
export async function getOpportunities(opts: {
  page?: number;
  pageSize?: number;
  category?: string;
  status?: string;
  minScore?: number;
  daysAhead?: number;
}) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  const { page = 1, pageSize = 20, category, status, minScore, daysAhead } = opts;
  const offset = (page - 1) * pageSize;

  const conditions = [];
  if (category) conditions.push(eq(opportunities.category, category));
  if (status) conditions.push(eq(opportunities.status, status as any));
  if (minScore !== undefined) conditions.push(gte(opportunities.confidenceScore, minScore));
  if (daysAhead !== undefined) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    conditions.push(sql`${opportunities.predictedOpenDate} <= ${futureDate.toISOString().split("T")[0]}`);
    conditions.push(sql`${opportunities.predictedOpenDate} >= ${new Date().toISOString().split("T")[0]}`);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(opportunities)
      .where(where)
      .orderBy(asc(opportunities.predictedOpenDate))
      .limit(pageSize)
      .offset(offset),
    db.select({ count: count() }).from(opportunities).where(where),
  ]);

  return { data, total: countResult[0]?.count ?? 0 };
}

export async function getOpportunityById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(opportunities).where(eq(opportunities.id, id)).limit(1);
  return result[0];
}

export async function getOpportunityTriggerEvents(opportunityId: number) {
  const db = await getDb();
  if (!db) return [];
  const links = await db
    .select()
    .from(opportunityEvents)
    .where(eq(opportunityEvents.opportunityId, opportunityId));
  if (links.length === 0) return [];
  const eventIds = links.map((l) => l.eventId);
  return db
    .select()
    .from(events)
    .where(sql`${events.id} IN (${sql.join(eventIds.map((id) => sql`${id}`), sql`, `)})`)
    .orderBy(desc(events.eventDate));
}

export async function createOpportunity(data: InsertOpportunity) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(opportunities).values(data);
  const result = await db.select().from(opportunities).orderBy(desc(opportunities.id)).limit(1);
  return result[0]!;
}

export async function linkOpportunityEvent(data: InsertOpportunityEvent) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(opportunityEvents).values(data);
}

export async function getUpcomingOpportunities(daysAhead = 180, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  const today = new Date().toISOString().split("T")[0];
  const future = new Date();
  future.setDate(future.getDate() + daysAhead);
  const futureStr = future.toISOString().split("T")[0];
  return db
    .select()
    .from(opportunities)
    .where(
      and(
        sql`${opportunities.predictedOpenDate} >= ${today}`,
        sql`${opportunities.predictedOpenDate} <= ${futureStr}`,
        eq(opportunities.status, "predicted")
      )
    )
    .orderBy(asc(opportunities.predictedOpenDate))
    .limit(limit);
}

// ─── Alerts ───────────────────────────────────────────────────────────────────
export async function getAlerts(activeOnly = false) {
  const db = await getDb();
  if (!db) return [];
  if (activeOnly) {
    return db.select().from(alerts).where(eq(alerts.active, true)).orderBy(desc(alerts.createdAt));
  }
  return db.select().from(alerts).orderBy(desc(alerts.createdAt));
}

export async function getAlertById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(alerts).where(eq(alerts.id, id)).limit(1);
  return result[0];
}

export async function createAlert(data: InsertAlert) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(alerts).values(data);
  const result = await db.select().from(alerts).orderBy(desc(alerts.id)).limit(1);
  return result[0]!;
}

export async function updateAlert(id: number, data: Partial<InsertAlert>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(alerts).set(data).where(eq(alerts.id, id));
  return getAlertById(id);
}

export async function deleteAlert(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(alerts).where(eq(alerts.id, id));
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export async function getDashboardKpis() {
  const db = await getDb();
  if (!db) return { totalEvents: 0, totalOpportunities: 0, activeAlerts: 0, activeSources: 0 };

  const [eventsCount, opportunitiesCount, alertsCount, sourcesCount] = await Promise.all([
    db.select({ count: count() }).from(events),
    db.select({ count: count() }).from(opportunities).where(eq(opportunities.status, "predicted")),
    db.select({ count: count() }).from(alerts).where(eq(alerts.active, true)),
    db.select({ count: count() }).from(sources).where(eq(sources.active, true)),
  ]);

  return {
    totalEvents: eventsCount[0]?.count ?? 0,
    totalOpportunities: opportunitiesCount[0]?.count ?? 0,
    activeAlerts: alertsCount[0]?.count ?? 0,
    activeSources: sourcesCount[0]?.count ?? 0,
  };
}

export async function getCategoryBreakdown() {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({ category: events.category, count: count() })
    .from(events)
    .groupBy(events.category)
    .orderBy(desc(count()))
    .limit(10);
  return result;
}

export async function getTypeBreakdown() {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({ type: events.type, count: count() })
    .from(events)
    .groupBy(events.type)
    .orderBy(desc(count()));
  return result;
}
