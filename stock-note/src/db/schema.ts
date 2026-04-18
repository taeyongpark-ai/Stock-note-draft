import { sql } from "drizzle-orm";
import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";

// ---------- instruments ----------
export const instruments = sqliteTable("instruments", {
  id: text("id").primaryKey(),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  market: text("market", {
    enum: ["KRX", "KOSDAQ", "NASDAQ", "NYSE", "CRYPTO"],
  }).notNull(),
  currency: text("currency", { enum: ["KRW", "USD", "USDT"] }).notNull(),
  color: text("color").notNull(),
  currentPrice: real("current_price").notNull(),
  dayChange: real("day_change").notNull(),
});

// ---------- trades ----------
export const trades = sqliteTable("trades", {
  id: text("id").primaryKey(),
  instrumentId: text("instrument_id")
    .notNull()
    .references(() => instruments.id),
  side: text("side", { enum: ["BUY", "SELL"] }).notNull(),
  quantity: real("quantity").notNull(),
  price: real("price").notNull(),
  fee: real("fee").notNull().default(0),
  executedAt: text("executed_at").notNull(),
  thesis: text("thesis").notNull(),
  confidence: integer("confidence").notNull(),
  tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default([]),
  fxToKrw: real("fx_to_krw"),
});

// ---------- reviews ----------
export const reviews = sqliteTable("reviews", {
  tradeId: text("trade_id")
    .primaryKey()
    .references(() => trades.id),
  reviewedAt: text("reviewed_at").notNull(),
  verdict: text("verdict", { enum: ["GOOD", "NEUTRAL", "BAD"] }).notNull(),
  reflection: text("reflection").notNull(),
  counterfactualPrice: real("counterfactual_price"),
  counterfactualAt: text("counterfactual_at"),
});

// ---------- watchlist ----------
export const watchlist = sqliteTable("watchlist", {
  instrumentId: text("instrument_id")
    .primaryKey()
    .references(() => instruments.id),
  addedAt: text("added_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ---------- market_events ----------
export const marketEvents = sqliteTable("market_events", {
  id: text("id").primaryKey(),
  instrumentId: text("instrument_id")
    .notNull()
    .references(() => instruments.id),
  date: text("date").notNull(), // YYYY-MM-DD
  dayChangePct: real("day_change_pct").notNull(),
  summary: text("summary").notNull(),
});

// ---------- news_items ----------
export const newsItems = sqliteTable("news_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventId: text("event_id")
    .notNull()
    .references(() => marketEvents.id),
  headline: text("headline").notNull(),
  source: text("source").notNull(),
  category: text("category", {
    enum: ["STOCK", "FX", "COMMODITY", "MACRO", "SECTOR"],
  }).notNull(),
  impact: text("impact", {
    enum: ["POSITIVE", "NEGATIVE", "NEUTRAL"],
  }).notNull(),
  url: text("url"),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ---------- instrument_catalysts ----------
export const instrumentCatalysts = sqliteTable("instrument_catalysts", {
  instrumentId: text("instrument_id")
    .primaryKey()
    .references(() => instruments.id),
  positives: text("positives", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default([]),
  negatives: text("negatives", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default([]),
});
