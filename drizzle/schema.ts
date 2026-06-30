import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  float,
  boolean,
  date,
  index,
} from "drizzle-orm/mysql-core";

// ─── Users (auth) ───────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Sources ─────────────────────────────────────────────────────────────────
export const sources = mysqlTable("sources", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  url: text("url").notNull(),
  type: mysqlEnum("type", ["pncp", "compras_gov", "tribunal", "diario_oficial", "portal_transparencia", "outro"]).notNull().default("outro"),
  active: boolean("active").notNull().default(true),
  lastSync: timestamp("lastSync"),
  syncCount: int("syncCount").notNull().default(0),
  errorCount: int("errorCount").notNull().default(0),
  lastError: text("lastError"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Source = typeof sources.$inferSelect;
export type InsertSource = typeof sources.$inferInsert;

// ─── Events ──────────────────────────────────────────────────────────────────
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  externalId: varchar("externalId", { length: 128 }),
  type: mysqlEnum("type", ["licitacao", "dispensa", "contrato", "obra", "convenio", "inauguracao", "plano"]).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  entity: varchar("entity", { length: 255 }),
  entityCnpj: varchar("entityCnpj", { length: 18 }),
  municipality: varchar("municipality", { length: 128 }),
  state: varchar("state", { length: 2 }),
  category: varchar("category", { length: 128 }),
  valueBrl: decimal("valueBrl", { precision: 18, scale: 2 }),
  eventDate: date("eventDate"),
  openDate: date("openDate"),
  closeDate: date("closeDate"),
  status: mysqlEnum("status", ["active", "closed", "cancelled", "archived"]).notNull().default("active"),
  sourceId: int("sourceId"),
  sourceUrl: text("sourceUrl"),
  processNumber: varchar("processNumber", { length: 128 }),
  modalidade: varchar("modalidade", { length: 128 }),
  rawData: text("rawData"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [
  index("idx_events_type").on(t.type),
  index("idx_events_status").on(t.status),
  index("idx_events_municipality").on(t.municipality),
  index("idx_events_entity").on(t.entity),
  index("idx_events_eventDate").on(t.eventDate),
]);

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

// ─── Opportunities ───────────────────────────────────────────────────────────
export const opportunities = mysqlTable("opportunities", {
  id: int("id").autoincrement().primaryKey(),
  title: text("title").notNull(),
  category: varchar("category", { length: 128 }).notNull(),
  description: text("description"),
  rationale: text("rationale"),
  confidenceScore: float("confidenceScore").notNull().default(0),
  predictedOpenDate: date("predictedOpenDate").notNull(),
  predictedValueBrl: decimal("predictedValueBrl", { precision: 18, scale: 2 }),
  entity: varchar("entity", { length: 255 }),
  municipality: varchar("municipality", { length: 128 }),
  state: varchar("state", { length: 2 }),
  status: mysqlEnum("status", ["predicted", "confirmed", "cancelled", "expired"]).notNull().default("predicted"),
  triggerCount: int("triggerCount").notNull().default(0),
  recurrencePattern: varchar("recurrencePattern", { length: 128 }),
  generatedByLlm: boolean("generatedByLlm").notNull().default(false),
  llmModel: varchar("llmModel", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [
  index("idx_opp_status").on(t.status),
  index("idx_opp_category").on(t.category),
  index("idx_opp_predictedOpenDate").on(t.predictedOpenDate),
  index("idx_opp_confidenceScore").on(t.confidenceScore),
]);

export type Opportunity = typeof opportunities.$inferSelect;
export type InsertOpportunity = typeof opportunities.$inferInsert;

// ─── Opportunity Events (junction) ───────────────────────────────────────────
export const opportunityEvents = mysqlTable("opportunity_events", {
  id: int("id").autoincrement().primaryKey(),
  opportunityId: int("opportunityId").notNull(),
  eventId: int("eventId").notNull(),
  relationType: mysqlEnum("relationType", ["trigger", "historical", "related"]).notNull().default("trigger"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  index("idx_oe_opportunityId").on(t.opportunityId),
  index("idx_oe_eventId").on(t.eventId),
]);

export type OpportunityEvent = typeof opportunityEvents.$inferSelect;
export type InsertOpportunityEvent = typeof opportunityEvents.$inferInsert;

// ─── Alerts ──────────────────────────────────────────────────────────────────
export const alerts = mysqlTable("alerts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  eventType: mysqlEnum("eventType", ["licitacao", "dispensa", "contrato", "obra", "convenio", "inauguracao", "plano", "all"]).notNull().default("all"),
  category: varchar("category", { length: 128 }),
  entity: varchar("entity", { length: 255 }),
  municipality: varchar("municipality", { length: 128 }),
  minConfidenceScore: float("minConfidenceScore").notNull().default(0.5),
  minValueBrl: decimal("minValueBrl", { precision: 18, scale: 2 }),
  active: boolean("active").notNull().default(true),
  triggeredCount: int("triggeredCount").notNull().default(0),
  lastTriggeredAt: timestamp("lastTriggeredAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [
  index("idx_alerts_active").on(t.active),
  index("idx_alerts_eventType").on(t.eventType),
]);

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;
