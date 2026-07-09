// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/db.ts
import { and, asc, count, desc, eq, gte, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
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
  index
} from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var sources = mysqlTable("sources", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var events = mysqlTable("events", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (t2) => [
  index("idx_events_type").on(t2.type),
  index("idx_events_status").on(t2.status),
  index("idx_events_municipality").on(t2.municipality),
  index("idx_events_entity").on(t2.entity),
  index("idx_events_eventDate").on(t2.eventDate)
]);
var opportunities = mysqlTable("opportunities", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (t2) => [
  index("idx_opp_status").on(t2.status),
  index("idx_opp_category").on(t2.category),
  index("idx_opp_predictedOpenDate").on(t2.predictedOpenDate),
  index("idx_opp_confidenceScore").on(t2.confidenceScore)
]);
var opportunityEvents = mysqlTable("opportunity_events", {
  id: int("id").autoincrement().primaryKey(),
  opportunityId: int("opportunityId").notNull(),
  eventId: int("eventId").notNull(),
  relationType: mysqlEnum("relationType", ["trigger", "historical", "related"]).notNull().default("trigger"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (t2) => [
  index("idx_oe_opportunityId").on(t2.opportunityId),
  index("idx_oe_eventId").on(t2.eventId)
]);
var alerts = mysqlTable("alerts", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (t2) => [
  index("idx_alerts_active").on(t2.active),
  index("idx_alerts_eventType").on(t2.eventType)
]);

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/db.ts
var _db = null;
async function getDb() {
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
async function upsertUser(user) {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values = { openId: user.openId };
  const updateSet = {};
  const textFields = ["name", "email", "loginMethod"];
  for (const field of textFields) {
    const value = user[field];
    if (value === void 0) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }
  if (user.lastSignedIn !== void 0) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== void 0) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = /* @__PURE__ */ new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = /* @__PURE__ */ new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}
async function getSources(activeOnly = false) {
  const db = await getDb();
  if (!db) return [];
  const q = db.select().from(sources);
  if (activeOnly) return q.where(eq(sources.active, true)).orderBy(asc(sources.name));
  return q.orderBy(asc(sources.name));
}
async function getSourceById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(sources).where(eq(sources.id, id)).limit(1);
  return result[0];
}
async function createSource(data) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(sources).values(data);
  const result = await db.select().from(sources).orderBy(desc(sources.id)).limit(1);
  return result[0];
}
async function updateSource(id, data) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(sources).set(data).where(eq(sources.id, id));
  return getSourceById(id);
}
async function toggleSourceActive(id) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const src = await getSourceById(id);
  if (!src) throw new Error("Source not found");
  await db.update(sources).set({ active: !src.active }).where(eq(sources.id, id));
  return getSourceById(id);
}
async function getEvents(opts) {
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
  if (type) conditions.push(eq(events.type, type));
  if (status) conditions.push(eq(events.status, status));
  if (municipality) conditions.push(like(events.municipality, `%${municipality}%`));
  if (state) conditions.push(eq(events.state, state));
  const where = conditions.length > 0 ? and(...conditions) : void 0;
  const [data, countResult] = await Promise.all([
    db.select().from(events).where(where).orderBy(desc(events.eventDate), desc(events.createdAt)).limit(pageSize).offset(offset),
    db.select({ count: count() }).from(events).where(where)
  ]);
  return { data, total: countResult[0]?.count ?? 0 };
}
async function getEventById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return result[0];
}
async function createEvent(data) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(events).values(data);
  const result = await db.select().from(events).orderBy(desc(events.id)).limit(1);
  return result[0];
}
async function bulkCreateEvents(data) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  if (data.length === 0) return;
  await db.insert(events).values(data).onDuplicateKeyUpdate({ set: { updatedAt: /* @__PURE__ */ new Date() } });
}
async function getRecentEvents(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(events).orderBy(desc(events.createdAt)).limit(limit);
}
async function getEventsByEntity(entity, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(events).where(like(events.entity, `%${entity}%`)).orderBy(desc(events.eventDate)).limit(limit);
}
async function getOpportunities(opts) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  const { page = 1, pageSize = 20, category, status, minScore, daysAhead } = opts;
  const offset = (page - 1) * pageSize;
  const conditions = [];
  if (category) conditions.push(eq(opportunities.category, category));
  if (status) conditions.push(eq(opportunities.status, status));
  if (minScore !== void 0) conditions.push(gte(opportunities.confidenceScore, minScore));
  if (daysAhead !== void 0) {
    const futureDate = /* @__PURE__ */ new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    conditions.push(sql`${opportunities.predictedOpenDate} <= ${futureDate.toISOString().split("T")[0]}`);
    conditions.push(sql`${opportunities.predictedOpenDate} >= ${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}`);
  }
  const where = conditions.length > 0 ? and(...conditions) : void 0;
  const [data, countResult] = await Promise.all([
    db.select().from(opportunities).where(where).orderBy(asc(opportunities.predictedOpenDate)).limit(pageSize).offset(offset),
    db.select({ count: count() }).from(opportunities).where(where)
  ]);
  return { data, total: countResult[0]?.count ?? 0 };
}
async function getOpportunityById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(opportunities).where(eq(opportunities.id, id)).limit(1);
  return result[0];
}
async function getOpportunityTriggerEvents(opportunityId) {
  const db = await getDb();
  if (!db) return [];
  const links = await db.select().from(opportunityEvents).where(eq(opportunityEvents.opportunityId, opportunityId));
  if (links.length === 0) return [];
  const eventIds = links.map((l) => l.eventId);
  return db.select().from(events).where(sql`${events.id} IN (${sql.join(eventIds.map((id) => sql`${id}`), sql`, `)})`).orderBy(desc(events.eventDate));
}
async function createOpportunity(data) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(opportunities).values(data);
  const result = await db.select().from(opportunities).orderBy(desc(opportunities.id)).limit(1);
  return result[0];
}
async function linkOpportunityEvent(data) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(opportunityEvents).values(data);
}
async function getUpcomingOpportunities(daysAhead = 180, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const future = /* @__PURE__ */ new Date();
  future.setDate(future.getDate() + daysAhead);
  const futureStr = future.toISOString().split("T")[0];
  return db.select().from(opportunities).where(
    and(
      sql`${opportunities.predictedOpenDate} >= ${today}`,
      sql`${opportunities.predictedOpenDate} <= ${futureStr}`,
      eq(opportunities.status, "predicted")
    )
  ).orderBy(asc(opportunities.predictedOpenDate)).limit(limit);
}
async function getAlerts(activeOnly = false) {
  const db = await getDb();
  if (!db) return [];
  if (activeOnly) {
    return db.select().from(alerts).where(eq(alerts.active, true)).orderBy(desc(alerts.createdAt));
  }
  return db.select().from(alerts).orderBy(desc(alerts.createdAt));
}
async function getAlertById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(alerts).where(eq(alerts.id, id)).limit(1);
  return result[0];
}
async function createAlert(data) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(alerts).values(data);
  const result = await db.select().from(alerts).orderBy(desc(alerts.id)).limit(1);
  return result[0];
}
async function updateAlert(id, data) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(alerts).set(data).where(eq(alerts.id, id));
  return getAlertById(id);
}
async function deleteAlert(id) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(alerts).where(eq(alerts.id, id));
}
async function getDashboardKpis() {
  const db = await getDb();
  if (!db) return { totalEvents: 0, totalOpportunities: 0, activeAlerts: 0, activeSources: 0 };
  const [eventsCount, opportunitiesCount, alertsCount, sourcesCount] = await Promise.all([
    db.select({ count: count() }).from(events),
    db.select({ count: count() }).from(opportunities).where(eq(opportunities.status, "predicted")),
    db.select({ count: count() }).from(alerts).where(eq(alerts.active, true)),
    db.select({ count: count() }).from(sources).where(eq(sources.active, true))
  ]);
  return {
    totalEvents: eventsCount[0]?.count ?? 0,
    totalOpportunities: opportunitiesCount[0]?.count ?? 0,
    activeAlerts: alertsCount[0]?.count ?? 0,
    activeSources: sourcesCount[0]?.count ?? 0
  };
}
async function getCategoryBreakdown() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({ category: events.category, count: count() }).from(events).groupBy(events.category).orderBy(desc(count())).limit(10);
  return result;
}
async function getTypeBreakdown() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({ type: events.type, count: count() }).from(events).groupBy(events.type).orderBy(desc(count()));
  return result;
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/storageProxy.ts
function registerStorageProxy(app) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers/dashboard.ts
import { z as z2 } from "zod";
var dashboardRouter = router({
  kpis: publicProcedure.query(async () => {
    return getDashboardKpis();
  }),
  categoryBreakdown: publicProcedure.query(async () => {
    return getCategoryBreakdown();
  }),
  typeBreakdown: publicProcedure.query(async () => {
    return getTypeBreakdown();
  }),
  recentActivity: publicProcedure.input(z2.object({ limit: z2.number().int().min(1).max(50).default(15) })).query(async ({ input }) => {
    return getRecentEvents(input.limit);
  }),
  upcomingOpportunities: publicProcedure.input(
    z2.object({
      daysAhead: z2.number().int().min(1).max(365).default(180),
      limit: z2.number().int().min(1).max(20).default(8)
    })
  ).query(async ({ input }) => {
    return getUpcomingOpportunities(input.daysAhead, input.limit);
  })
});

// server/routers/events.ts
import { z as z3 } from "zod";

// server/pncp.ts
var PNCP_BASE = "https://pncp.gov.br/api/consulta";
async function pncpFetch(path3, params) {
  const url = new URL(`${PNCP_BASE}${path3}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15e3)
  });
  if (!res.ok) {
    const text2 = await res.text().catch(() => "");
    throw new Error(`PNCP ${path3} \u2192 HTTP ${res.status}: ${text2.slice(0, 200)}`);
  }
  return res.json();
}
async function fetchContratacoes(opts) {
  const {
    dataInicial,
    dataFinal,
    pagina = 1,
    tamanhoPagina = 50,
    codigoModalidadeContratacao = 6
  } = opts;
  return pncpFetch("/v1/contratacoes/publicacao", {
    dataInicial,
    dataFinal,
    pagina,
    tamanhoPagina,
    codigoModalidadeContratacao
  });
}
async function fetchContratos(opts) {
  const { dataInicial, dataFinal, pagina = 1, tamanhoPagina = 50 } = opts;
  return pncpFetch("/v1/contratos", {
    dataInicial,
    dataFinal,
    pagina,
    tamanhoPagina
  });
}
function normalizeContratacao(c, sourceId) {
  const modalidadeNome = c.modalidadeNome?.toLowerCase() ?? "";
  let type = "licitacao";
  if (modalidadeNome.includes("dispensa")) type = "dispensa";
  const openDate = c.dataAberturaProposta ? c.dataAberturaProposta.split("T")[0] : c.dataPublicacaoPncp.split("T")[0];
  const closeDate = c.dataEncerramentoProposta ? c.dataEncerramentoProposta.split("T")[0] : void 0;
  const status = c.situacaoCompraId === 1 ? "active" : c.situacaoCompraId === 4 ? "closed" : c.situacaoCompraId === 3 ? "cancelled" : "active";
  return {
    externalId: c.numeroControlePNCP,
    type,
    title: c.objetoCompra?.slice(0, 500) ?? "Sem descri\xE7\xE3o",
    description: c.amparoLegal?.descricao ?? null,
    entity: c.orgaoEntidade?.razaoSocial?.slice(0, 255) ?? null,
    entityCnpj: c.orgaoEntidade?.cnpj ?? null,
    municipality: c.unidadeOrgao?.municipioNome ?? null,
    state: c.unidadeOrgao?.ufSigla ?? null,
    category: inferCategory(c.objetoCompra),
    valueBrl: c.valorTotalEstimado?.toString() ?? c.valorTotalHomologado?.toString() ?? null,
    eventDate: openDate,
    openDate,
    closeDate: closeDate ?? null,
    status,
    sourceId,
    sourceUrl: c.linkSistemaOrigem ?? null,
    processNumber: c.processo ?? null,
    modalidade: c.modalidadeNome ?? null,
    rawData: JSON.stringify({ pncp: c.numeroControlePNCP })
  };
}
function normalizeContrato(c, sourceId) {
  return {
    externalId: c.numeroControlePNCP,
    type: "contrato",
    title: c.objetoContrato?.slice(0, 500) ?? "Contrato sem descri\xE7\xE3o",
    description: `Fornecedor: ${c.nomeRazaoSocialFornecedor}`,
    entity: c.orgaoEntidade?.razaoSocial?.slice(0, 255) ?? null,
    entityCnpj: c.orgaoEntidade?.cnpj ?? null,
    municipality: c.unidadeOrgao?.municipioNome ?? null,
    state: c.unidadeOrgao?.ufSigla ?? null,
    category: c.categoriaProcesso?.nome ?? inferCategory(c.objetoContrato),
    valueBrl: c.valorGlobal?.toString() ?? null,
    eventDate: c.dataAssinatura ?? null,
    openDate: c.dataVigenciaInicio ?? null,
    closeDate: c.dataVigenciaFim ?? null,
    status: "active",
    sourceId,
    sourceUrl: null,
    processNumber: c.processo ?? null,
    modalidade: c.tipoContrato?.nome ?? null,
    rawData: JSON.stringify({ pncp: c.numeroControlePNCP })
  };
}
function inferCategory(texto) {
  const t2 = texto?.toLowerCase() ?? "";
  if (t2.includes("limpeza") || t2.includes("higiene") || t2.includes("asseio")) return "Limpeza e Conserva\xE7\xE3o";
  if (t2.includes("inform\xE1tica") || t2.includes("computador") || t2.includes("software") || t2.includes("ti ") || t2.includes("tecnologia")) return "Tecnologia da Informa\xE7\xE3o";
  if (t2.includes("obra") || t2.includes("constru\xE7\xE3o") || t2.includes("reforma") || t2.includes("pavimenta\xE7\xE3o")) return "Obras e Infraestrutura";
  if (t2.includes("sa\xFAde") || t2.includes("m\xE9dico") || t2.includes("hospital") || t2.includes("medicamento") || t2.includes("farm\xE1cia")) return "Sa\xFAde";
  if (t2.includes("educa\xE7\xE3o") || t2.includes("escola") || t2.includes("ensino") || t2.includes("did\xE1tico")) return "Educa\xE7\xE3o";
  if (t2.includes("alimento") || t2.includes("merenda") || t2.includes("g\xEAnero aliment\xEDcio") || t2.includes("refei\xE7\xE3o")) return "Alimenta\xE7\xE3o";
  if (t2.includes("transporte") || t2.includes("ve\xEDculo") || t2.includes("\xF4nibus") || t2.includes("combust\xEDvel")) return "Transporte";
  if (t2.includes("seguran\xE7a") || t2.includes("vigil\xE2ncia") || t2.includes("monitoramento")) return "Seguran\xE7a";
  if (t2.includes("mobili\xE1rio") || t2.includes("m\xF3vel") || t2.includes("cadeira") || t2.includes("mesa")) return "Mobili\xE1rio";
  if (t2.includes("material de escrit\xF3rio") || t2.includes("papelaria") || t2.includes("expediente")) return "Material de Escrit\xF3rio";
  if (t2.includes("energia") || t2.includes("el\xE9trico") || t2.includes("ilumina\xE7\xE3o")) return "Energia e El\xE9trica";
  if (t2.includes("\xE1gua") || t2.includes("saneamento") || t2.includes("esgoto")) return "Saneamento";
  if (t2.includes("consultoria") || t2.includes("assessoria") || t2.includes("auditoria")) return "Consultoria e Assessoria";
  if (t2.includes("comunica\xE7\xE3o") || t2.includes("publicidade") || t2.includes("propaganda")) return "Comunica\xE7\xE3o";
  return "Outros";
}
function toApiDate(d) {
  return d.toISOString().split("T")[0].replace(/-/g, "");
}

// server/routers/events.ts
var eventsRouter = router({
  list: publicProcedure.input(
    z3.object({
      page: z3.number().int().min(1).default(1),
      pageSize: z3.number().int().min(1).max(100).default(20),
      search: z3.string().optional(),
      type: z3.enum(["licitacao", "dispensa", "contrato", "obra", "convenio", "inauguracao", "plano"]).optional(),
      status: z3.enum(["active", "closed", "cancelled", "archived"]).optional(),
      municipality: z3.string().optional(),
      state: z3.string().optional()
    })
  ).query(async ({ input }) => {
    return getEvents(input);
  }),
  byId: publicProcedure.input(z3.object({ id: z3.number().int() })).query(async ({ input }) => {
    const event = await getEventById(input.id);
    if (!event) throw new Error("Evento n\xE3o encontrado");
    return event;
  }),
  recent: publicProcedure.input(z3.object({ limit: z3.number().int().min(1).max(50).default(10) })).query(async ({ input }) => {
    return getRecentEvents(input.limit);
  }),
  create: publicProcedure.input(
    z3.object({
      type: z3.enum(["licitacao", "dispensa", "contrato", "obra", "convenio", "inauguracao", "plano"]),
      title: z3.string().min(1),
      description: z3.string().optional(),
      entity: z3.string().optional(),
      municipality: z3.string().optional(),
      state: z3.string().optional(),
      category: z3.string().optional(),
      valueBrl: z3.string().optional(),
      eventDate: z3.string().optional(),
      processNumber: z3.string().optional()
    })
  ).mutation(async ({ input }) => {
    return createEvent(input);
  }),
  /**
   * Sincroniza eventos reais do PNCP para o banco de dados.
   * Busca licitações e contratos dos últimos N dias.
   */
  syncFromPncp: publicProcedure.input(
    z3.object({
      daysBack: z3.number().int().min(1).max(90).default(30),
      sourceId: z3.number().int().default(1)
    })
  ).mutation(async ({ input }) => {
    const { daysBack, sourceId } = input;
    const end = /* @__PURE__ */ new Date();
    const start = /* @__PURE__ */ new Date();
    start.setDate(start.getDate() - daysBack);
    const dataInicial = toApiDate(start);
    const dataFinal = toApiDate(end);
    let imported = 0;
    const errors = [];
    try {
      const result = await fetchContratacoes({
        dataInicial,
        dataFinal,
        tamanhoPagina: 50,
        codigoModalidadeContratacao: 6
      });
      const normalized = (result.data ?? []).map((c) => normalizeContratacao(c, sourceId));
      await bulkCreateEvents(normalized);
      imported += normalized.length;
    } catch (e) {
      errors.push(`Preg\xE3o: ${e.message}`);
    }
    try {
      const result = await fetchContratacoes({
        dataInicial,
        dataFinal,
        tamanhoPagina: 50,
        codigoModalidadeContratacao: 8
      });
      const normalized = (result.data ?? []).map((c) => normalizeContratacao(c, sourceId));
      await bulkCreateEvents(normalized);
      imported += normalized.length;
    } catch (e) {
      errors.push(`Concorr\xEAncia: ${e.message}`);
    }
    try {
      const result = await fetchContratos({ dataInicial, dataFinal, tamanhoPagina: 50 });
      const normalized = (result.data ?? []).map((c) => normalizeContrato(c, sourceId));
      await bulkCreateEvents(normalized);
      imported += normalized.length;
    } catch (e) {
      errors.push(`Contratos: ${e.message}`);
    }
    return { imported, errors, period: { dataInicial, dataFinal } };
  })
});

// server/routers/opportunities.ts
import { z as z4 } from "zod";

// server/_core/llm.ts
var ensureArray = (value) => Array.isArray(value) ? value : [value];
var normalizeContentPart = (part) => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return part;
  }
  if (part.type === "image_url") {
    return part;
  }
  if (part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};
var normalizeMessage = (message) => {
  const { role, name, tool_call_id } = message;
  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
    return {
      role,
      name,
      tool_call_id,
      content
    };
  }
  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text
    };
  }
  return {
    role,
    name,
    content: contentParts
  };
};
var normalizeToolChoice = (toolChoice, tools) => {
  if (!toolChoice) return void 0;
  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }
  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }
    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }
    return {
      type: "function",
      function: { name: tools[0].function.name }
    };
  }
  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name }
    };
  }
  return toolChoice;
};
var resolveApiUrl = () => ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0 ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://forge.manus.im/v1/chat/completions";
var assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};
var normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema
}) => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }
  const schema = outputSchema || output_schema;
  if (!schema) return void 0;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
    }
  };
};
var RETRY_MAX_RETRIES = 4;
var RETRY_BASE_DELAY_MS = 500;
var RETRY_MAX_DELAY_MS = 3e4;
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var parseRetryAfter = (value) => {
  if (!value) return void 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1e3);
  const at = Date.parse(value);
  return Number.isNaN(at) ? void 0 : Math.max(0, at - Date.now());
};
var computeBackoffDelay = (attempt, retryAfterMs) => {
  const cap = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  const jittered = cap / 2 + Math.random() * (cap / 2);
  return Math.min(Math.max(jittered, retryAfterMs ?? 0), RETRY_MAX_DELAY_MS);
};
var fetchWithBackoff = async (url, init) => {
  let lastError;
  for (let attempt = 0; attempt <= RETRY_MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok || attempt === RETRY_MAX_RETRIES) {
        return response;
      }
      const retryAfterMs = parseRetryAfter(
        response.headers.get("retry-after")
      );
      try {
        await response.body?.cancel();
      } catch {
      }
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after status ${response.status}`
      );
      await sleep(computeBackoffDelay(attempt, retryAfterMs));
    } catch (error) {
      lastError = error;
      if (attempt === RETRY_MAX_RETRIES) throw error;
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after network error`
      );
      await sleep(computeBackoffDelay(attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("LLM request failed after exhausting retries");
};
async function invokeLLM(params) {
  assertApiKey();
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    model,
    thinking,
    reasoning,
    maxTokens,
    max_tokens
  } = params;
  const payload = {
    messages: messages.map(normalizeMessage)
  };
  if (model) {
    payload.model = model;
  }
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }
  const resolvedMaxTokens = max_tokens ?? maxTokens;
  if (typeof resolvedMaxTokens === "number") {
    payload.max_tokens = resolvedMaxTokens;
  }
  if (thinking) {
    payload.thinking = thinking;
  }
  if (reasoning) {
    payload.reasoning = reasoning;
  }
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema
  });
  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }
  const response = await fetchWithBackoff(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
    );
  }
  return await response.json();
}

// server/routers/opportunities.ts
var opportunitiesRouter = router({
  list: publicProcedure.input(
    z4.object({
      page: z4.number().int().min(1).default(1),
      pageSize: z4.number().int().min(1).max(100).default(20),
      category: z4.string().optional(),
      status: z4.enum(["predicted", "confirmed", "cancelled", "expired"]).optional(),
      minScore: z4.number().min(0).max(1).optional(),
      daysAhead: z4.number().int().min(1).max(365).optional()
    })
  ).query(async ({ input }) => {
    return getOpportunities(input);
  }),
  byId: publicProcedure.input(z4.object({ id: z4.number().int() })).query(async ({ input }) => {
    const opp = await getOpportunityById(input.id);
    if (!opp) throw new Error("Oportunidade n\xE3o encontrada");
    const triggerEvents = await getOpportunityTriggerEvents(input.id);
    return { ...opp, triggerEvents };
  }),
  upcoming: publicProcedure.input(
    z4.object({
      daysAhead: z4.number().int().min(1).max(365).default(180),
      limit: z4.number().int().min(1).max(50).default(10)
    })
  ).query(async ({ input }) => {
    return getUpcomingOpportunities(input.daysAhead, input.limit);
  }),
  create: publicProcedure.input(
    z4.object({
      title: z4.string().min(1),
      category: z4.string().min(1),
      description: z4.string().optional(),
      rationale: z4.string().optional(),
      confidenceScore: z4.number().min(0).max(1).default(0.5),
      predictedOpenDate: z4.string(),
      predictedValueBrl: z4.string().optional(),
      entity: z4.string().optional(),
      municipality: z4.string().optional(),
      state: z4.string().optional(),
      triggerEventIds: z4.array(z4.number().int()).optional()
    })
  ).mutation(async ({ input }) => {
    const { triggerEventIds, ...data } = input;
    const opp = await createOpportunity(data);
    if (triggerEventIds && opp) {
      for (const eventId of triggerEventIds) {
        await linkOpportunityEvent({ opportunityId: opp.id, eventId, relationType: "trigger" });
      }
    }
    return opp;
  }),
  /**
   * Agente LLM: analisa histórico de eventos de um órgão público e gera
   * automaticamente novas oportunidades previstas com score de confiança,
   * fundamentação e data estimada de abertura.
   */
  generateFromLlm: publicProcedure.input(
    z4.object({
      entity: z4.string().min(1).describe("Nome ou parte do nome do \xF3rg\xE3o p\xFAblico"),
      municipality: z4.string().optional(),
      saveToDb: z4.boolean().default(true)
    })
  ).mutation(async ({ input }) => {
    const { entity, municipality, saveToDb } = input;
    const historicalEvents = await getEventsByEntity(entity, 40);
    if (historicalEvents.length === 0) {
      return {
        opportunities: [],
        message: `Nenhum evento hist\xF3rico encontrado para "${entity}". Sincronize dados do PNCP primeiro.`
      };
    }
    const eventSummary = historicalEvents.slice(0, 30).map((e, i) => {
      const valor = e.valueBrl ? `R$ ${Number(e.valueBrl).toLocaleString("pt-BR")}` : "valor n\xE3o informado";
      return `${i + 1}. [${e.type.toUpperCase()}] ${e.title?.slice(0, 120)} | ${e.entity} | ${e.municipality ?? ""}/${e.state ?? ""} | ${valor} | Data: ${e.eventDate ?? e.openDate ?? "N/A"} | Status: ${e.status}`;
    }).join("\n");
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const municipioCtx = municipality ? ` no munic\xEDpio de ${municipality}` : "";
    const systemPrompt = `Voc\xEA \xE9 um analista de intelig\xEAncia de mercado especializado em contrata\xE7\xF5es p\xFAblicas brasileiras.
Sua fun\xE7\xE3o \xE9 analisar o hist\xF3rico de licita\xE7\xF5es, contratos e eventos de um \xF3rg\xE3o p\xFAblico e identificar padr\xF5es para prever oportunidades futuras.

Regras obrigat\xF3rias:
- Responda SEMPRE em JSON v\xE1lido, sem texto fora do JSON.
- Gere entre 3 e 6 oportunidades previstas.
- O campo "confidenceScore" deve ser um n\xFAmero entre 0.0 e 1.0.
- O campo "predictedOpenDate" deve ser uma data futura no formato YYYY-MM-DD (ap\xF3s ${today}).
- O campo "predictedValueBrl" deve ser um n\xFAmero (sem formata\xE7\xE3o), ou null.
- Baseie as previs\xF5es em padr\xF5es reais: recorr\xEAncia anual, sazonalidade, ciclos or\xE7ament\xE1rios, contratos pr\xF3ximos do vencimento.
- Seja espec\xEDfico e t\xE9cnico na fundamenta\xE7\xE3o (rationale).`;
    const userPrompt = `Analise o hist\xF3rico de eventos do \xF3rg\xE3o "${entity}"${municipioCtx} e gere oportunidades previstas.

HIST\xD3RICO DE EVENTOS (${historicalEvents.length} registros):
${eventSummary}

Retorne um JSON com o seguinte formato:
{
  "opportunities": [
    {
      "title": "T\xEDtulo descritivo da oportunidade",
      "category": "Categoria (ex: Limpeza e Conserva\xE7\xE3o, TI, Obras, Sa\xFAde, etc.)",
      "description": "Descri\xE7\xE3o breve da oportunidade",
      "rationale": "Fundamenta\xE7\xE3o detalhada baseada no hist\xF3rico: padr\xF5es observados, recorr\xEAncia, sazonalidade, contratos vencendo",
      "confidenceScore": 0.85,
      "predictedOpenDate": "2025-09-15",
      "predictedValueBrl": 250000,
      "recurrencePattern": "Anual (baseado em contratos dos \xFAltimos 3 anos)"
    }
  ]
}`;
    let llmModel = "gpt-4o-mini";
    let rawContent = "";
    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      });
      const msgContent = response.choices?.[0]?.message?.content;
      rawContent = typeof msgContent === "string" ? msgContent : JSON.stringify(msgContent ?? {});
      llmModel = response.model ?? llmModel;
    } catch (e) {
      throw new Error(`Falha ao chamar LLM: ${e.message}`);
    }
    let parsed;
    try {
      parsed = JSON.parse(rawContent);
      if (!Array.isArray(parsed.opportunities)) {
        parsed = { opportunities: [] };
      }
    } catch {
      throw new Error("LLM retornou JSON inv\xE1lido");
    }
    const results = [];
    for (const opp of parsed.opportunities) {
      const data = {
        title: String(opp.title ?? "Oportunidade prevista").slice(0, 500),
        category: String(opp.category ?? "Outros").slice(0, 128),
        description: opp.description ? String(opp.description) : null,
        rationale: opp.rationale ? String(opp.rationale) : null,
        confidenceScore: Math.min(1, Math.max(0, Number(opp.confidenceScore ?? 0.5))),
        predictedOpenDate: new Date(String(opp.predictedOpenDate ?? today)),
        predictedValueBrl: opp.predictedValueBrl ? String(opp.predictedValueBrl) : null,
        entity: entity.slice(0, 255),
        municipality: municipality ?? (historicalEvents[0]?.municipality ?? null),
        state: historicalEvents[0]?.state ?? null,
        status: "predicted",
        triggerCount: historicalEvents.length,
        recurrencePattern: opp.recurrencePattern ? String(opp.recurrencePattern).slice(0, 128) : null,
        generatedByLlm: true,
        llmModel: llmModel.slice(0, 64)
      };
      if (saveToDb) {
        const saved = await createOpportunity(data);
        for (const ev of historicalEvents.slice(0, 5)) {
          await linkOpportunityEvent({
            opportunityId: saved.id,
            eventId: ev.id,
            relationType: "historical"
          });
        }
        results.push(saved);
      } else {
        results.push(data);
      }
    }
    return {
      opportunities: results,
      eventsAnalyzed: historicalEvents.length,
      model: llmModel,
      message: `${results.length} oportunidade(s) gerada(s) com base em ${historicalEvents.length} evento(s) hist\xF3rico(s).`
    };
  })
});

// server/routers/sources.ts
import { z as z5 } from "zod";
var sourcesRouter = router({
  list: publicProcedure.input(z5.object({ activeOnly: z5.boolean().default(false) })).query(async ({ input }) => {
    return getSources(input.activeOnly);
  }),
  byId: publicProcedure.input(z5.object({ id: z5.number().int() })).query(async ({ input }) => {
    const src = await getSourceById(input.id);
    if (!src) throw new Error("Fonte n\xE3o encontrada");
    return src;
  }),
  create: publicProcedure.input(
    z5.object({
      name: z5.string().min(1).max(255),
      url: z5.string().url(),
      type: z5.enum(["pncp", "compras_gov", "tribunal", "diario_oficial", "portal_transparencia", "outro"]).default("outro"),
      active: z5.boolean().default(true)
    })
  ).mutation(async ({ input }) => {
    return createSource(input);
  }),
  update: publicProcedure.input(
    z5.object({
      id: z5.number().int(),
      name: z5.string().min(1).max(255).optional(),
      url: z5.string().url().optional(),
      type: z5.enum(["pncp", "compras_gov", "tribunal", "diario_oficial", "portal_transparencia", "outro"]).optional()
    })
  ).mutation(async ({ input }) => {
    const { id, ...data } = input;
    return updateSource(id, data);
  }),
  toggleActive: publicProcedure.input(z5.object({ id: z5.number().int() })).mutation(async ({ input }) => {
    return toggleSourceActive(input.id);
  })
});

// server/routers/alerts.ts
import { z as z6 } from "zod";
var alertsRouter = router({
  list: publicProcedure.input(z6.object({ activeOnly: z6.boolean().default(false) })).query(async ({ input }) => {
    return getAlerts(input.activeOnly);
  }),
  byId: publicProcedure.input(z6.object({ id: z6.number().int() })).query(async ({ input }) => {
    const alert = await getAlertById(input.id);
    if (!alert) throw new Error("Alerta n\xE3o encontrado");
    return alert;
  }),
  create: publicProcedure.input(
    z6.object({
      name: z6.string().min(1).max(255),
      eventType: z6.enum(["licitacao", "dispensa", "contrato", "obra", "convenio", "inauguracao", "plano", "all"]).default("all"),
      category: z6.string().optional(),
      entity: z6.string().optional(),
      municipality: z6.string().optional(),
      minConfidenceScore: z6.number().min(0).max(1).default(0.5),
      minValueBrl: z6.string().optional(),
      active: z6.boolean().default(true)
    })
  ).mutation(async ({ input }) => {
    return createAlert(input);
  }),
  update: publicProcedure.input(
    z6.object({
      id: z6.number().int(),
      name: z6.string().min(1).max(255).optional(),
      eventType: z6.enum(["licitacao", "dispensa", "contrato", "obra", "convenio", "inauguracao", "plano", "all"]).optional(),
      category: z6.string().optional(),
      entity: z6.string().optional(),
      municipality: z6.string().optional(),
      minConfidenceScore: z6.number().min(0).max(1).optional(),
      minValueBrl: z6.string().optional(),
      active: z6.boolean().optional()
    })
  ).mutation(async ({ input }) => {
    const { id, ...data } = input;
    return updateAlert(id, data);
  }),
  delete: publicProcedure.input(z6.object({ id: z6.number().int() })).mutation(async ({ input }) => {
    await deleteAlert(input.id);
    return { success: true };
  }),
  toggleActive: publicProcedure.input(z6.object({ id: z6.number().int() })).mutation(async ({ input }) => {
    const alert = await getAlertById(input.id);
    if (!alert) throw new Error("Alerta n\xE3o encontrado");
    return updateAlert(input.id, { active: !alert.active });
  })
});

// server/routers.ts
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  dashboard: dashboardRouter,
  events: eventsRouter,
  opportunities: opportunitiesRouter,
  sources: sourcesRouter,
  alerts: alertsRouter
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs2 from "fs";
import { nanoid } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var PROJECT_ROOT = import.meta.dirname;
var LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
var MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024;
var TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6);
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}
function trimLogFile(logPath, maxSize) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }
    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines = [];
    let keptBytes = 0;
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}
`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }
    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
  }
}
function writeToLogFile(source, entries) {
  if (entries.length === 0) return;
  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);
  const lines = entries.map((entry) => {
    const ts = (/* @__PURE__ */ new Date()).toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });
  fs.appendFileSync(logPath, `${lines.join("\n")}
`, "utf-8");
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}
function vitePluginManusDebugCollector() {
  return {
    name: "manus-debug-collector",
    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true
            },
            injectTo: "head"
          }
        ]
      };
    },
    configureServer(server) {
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }
        const handlePayload = (payload) => {
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };
        const reqBody = req.body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    }
  };
}
var plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime(), vitePluginManusDebugCollector()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path2.resolve(import.meta.dirname, "../..", "dist", "public") : path2.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express2();
  const server = createServer(app);
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
startServer().catch(console.error);
