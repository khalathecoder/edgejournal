import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const propFirmAccounts = sqliteTable("propFirmAccounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  accountName: text("accountName").notNull(),
  firmName: text("firmName").notNull(),
  accountNumber: text("accountNumber"),
  isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export type PropFirmAccount = typeof propFirmAccounts.$inferSelect;
export type InsertPropFirmAccount = typeof propFirmAccounts.$inferInsert;

export const propFirmPurchases = sqliteTable("propFirmPurchases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  firmName: text("firmName").notNull(),
  purchaseDate: integer("purchaseDate", { mode: "timestamp" }).notNull(),
  accountCount: integer("accountCount").notNull(),
  costPerAccount: real("costPerAccount"),
  totalCost: real("totalCost"),
  notes: text("notes"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export type PropFirmPurchase = typeof propFirmPurchases.$inferSelect;
export type InsertPropFirmPurchase = typeof propFirmPurchases.$inferInsert;

export const trades = sqliteTable("trades", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  propFirmAccountId: integer("propFirmAccountId").notNull(),
  instrument: text("instrument").notNull(),
  direction: text("direction", { enum: ["LONG", "SHORT"] }).notNull(),
  entryPrice: real("entryPrice").notNull(),
  exitPrice: real("exitPrice").notNull(),
  quantity: integer("quantity").notNull(),
  entryTime: integer("entryTime", { mode: "timestamp" }).notNull(),
  exitTime: integer("exitTime", { mode: "timestamp" }).notNull(),
  grossPnL: real("grossPnL").notNull(),
  commission: real("commission").default(0),
  netPnL: real("netPnL").notNull(),
  strategy: text("strategy"),
  importedFrom: text("importedFrom").default("MANUAL").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export type Trade = typeof trades.$inferSelect;
export type InsertTrade = typeof trades.$inferInsert;

export const tradeJournalEntries = sqliteTable("tradeJournalEntries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tradeId: integer("tradeId").notNull(),
  userId: integer("userId").notNull(),
  content: text("content"),
  tags: text("tags"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export type TradeJournalEntry = typeof tradeJournalEntries.$inferSelect;
export type InsertTradeJournalEntry = typeof tradeJournalEntries.$inferInsert;

export const tradeScreenshots = sqliteTable("tradeScreenshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tradeId: integer("tradeId").notNull(),
  userId: integer("userId").notNull(),
  storageKey: text("storageKey").notNull(),
  storageUrl: text("storageUrl").notNull(),
  caption: text("caption"),
  uploadedAt: integer("uploadedAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export type TradeScreenshot = typeof tradeScreenshots.$inferSelect;
export type InsertTradeScreenshot = typeof tradeScreenshots.$inferInsert;
