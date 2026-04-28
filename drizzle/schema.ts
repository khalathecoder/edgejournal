import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
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

// Prop Firm Accounts
export const propFirmAccounts = mysqlTable("propFirmAccounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  accountName: varchar("accountName", { length: 255 }).notNull(),
  firmName: varchar("firmName", { length: 255 }).notNull(),
  accountNumber: varchar("accountNumber", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PropFirmAccount = typeof propFirmAccounts.$inferSelect;
export type InsertPropFirmAccount = typeof propFirmAccounts.$inferInsert;

// Prop Firm Purchases
export const propFirmPurchases = mysqlTable("propFirmPurchases", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  firmName: varchar("firmName", { length: 255 }).notNull(),
  purchaseDate: timestamp("purchaseDate").notNull(),
  accountCount: int("accountCount").notNull(),
  costPerAccount: decimal("costPerAccount", { precision: 10, scale: 2 }),
  totalCost: decimal("totalCost", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PropFirmPurchase = typeof propFirmPurchases.$inferSelect;
export type InsertPropFirmPurchase = typeof propFirmPurchases.$inferInsert;

// Trades
export const trades = mysqlTable("trades", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  propFirmAccountId: int("propFirmAccountId").notNull(),
  instrument: varchar("instrument", { length: 50 }).notNull(),
  direction: mysqlEnum("direction", ["LONG", "SHORT"]).notNull(),
  entryPrice: decimal("entryPrice", { precision: 12, scale: 4 }).notNull(),
  exitPrice: decimal("exitPrice", { precision: 12, scale: 4 }).notNull(),
  quantity: int("quantity").notNull(),
  entryTime: timestamp("entryTime").notNull(),
  exitTime: timestamp("exitTime").notNull(),
  grossPnL: decimal("grossPnL", { precision: 12, scale: 2 }).notNull(),
  commission: decimal("commission", { precision: 10, scale: 2 }).default("0"),
  netPnL: decimal("netPnL", { precision: 12, scale: 2 }).notNull(),
  strategy: varchar("strategy", { length: 255 }),
  importedFrom: varchar("importedFrom", { length: 50 }).default("MANUAL").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Trade = typeof trades.$inferSelect;
export type InsertTrade = typeof trades.$inferInsert;

// Trade Journal Entries
export const tradeJournalEntries = mysqlTable("tradeJournalEntries", {
  id: int("id").autoincrement().primaryKey(),
  tradeId: int("tradeId").notNull(),
  userId: int("userId").notNull(),
  content: text("content"),
  tags: text("tags"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TradeJournalEntry = typeof tradeJournalEntries.$inferSelect;
export type InsertTradeJournalEntry = typeof tradeJournalEntries.$inferInsert;

// Trade Screenshots
export const tradeScreenshots = mysqlTable("tradeScreenshots", {
  id: int("id").autoincrement().primaryKey(),
  tradeId: int("tradeId").notNull(),
  userId: int("userId").notNull(),
  storageKey: varchar("storageKey", { length: 255 }).notNull(),
  storageUrl: varchar("storageUrl", { length: 512 }).notNull(),
  caption: varchar("caption", { length: 255 }),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});

export type TradeScreenshot = typeof tradeScreenshots.$inferSelect;
export type InsertTradeScreenshot = typeof tradeScreenshots.$inferInsert;