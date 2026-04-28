import { eq, and, gte, lte, desc, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, trades, propFirmAccounts, propFirmPurchases, tradeJournalEntries, tradeScreenshots, Trade, PropFirmAccount } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
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

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ Prop Firm Accounts ============

export async function getPropFirmAccountsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(propFirmAccounts).where(eq(propFirmAccounts.userId, userId)).orderBy(desc(propFirmAccounts.createdAt));
}

export async function getPropFirmAccountById(accountId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(propFirmAccounts).where(and(eq(propFirmAccounts.id, accountId), eq(propFirmAccounts.userId, userId))).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createPropFirmAccount(userId: number, accountName: string, firmName: string, accountNumber?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(propFirmAccounts).values({
    userId,
    accountName,
    firmName,
    accountNumber,
    isActive: true,
  });

  return result;
}

export async function updatePropFirmAccount(accountId: number, userId: number, updates: Partial<PropFirmAccount>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(propFirmAccounts).set(updates).where(and(eq(propFirmAccounts.id, accountId), eq(propFirmAccounts.userId, userId)));
}

export async function deletePropFirmAccount(accountId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.delete(propFirmAccounts).where(and(eq(propFirmAccounts.id, accountId), eq(propFirmAccounts.userId, userId)));
}

// ============ Prop Firm Purchases ============

export async function getPropFirmPurchasesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(propFirmPurchases).where(eq(propFirmPurchases.userId, userId)).orderBy(desc(propFirmPurchases.purchaseDate));
}

export async function createPropFirmPurchase(userId: number, firmName: string, purchaseDate: Date, accountCount: number, costPerAccount?: number, totalCost?: number, notes?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(propFirmPurchases).values({
    userId,
    firmName,
    purchaseDate,
    accountCount,
    costPerAccount: costPerAccount ? String(costPerAccount) : undefined,
    totalCost: totalCost ? String(totalCost) : undefined,
    notes,
  });
}

// ============ Trades ============

export async function getTradesByAccountId(accountId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(trades).where(and(eq(trades.propFirmAccountId, accountId), eq(trades.userId, userId))).orderBy(desc(trades.exitTime));
}

export async function getTradesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(trades).where(eq(trades.userId, userId)).orderBy(desc(trades.exitTime));
}

export async function getTradeById(tradeId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(trades).where(and(eq(trades.id, tradeId), eq(trades.userId, userId))).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createTrade(tradeData: {
  userId: number;
  propFirmAccountId: number;
  instrument: string;
  direction: "LONG" | "SHORT";
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  entryTime: Date;
  exitTime: Date;
  grossPnL: number;
  commission?: number;
  netPnL: number;
  strategy?: string;
  importedFrom?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(trades).values({
    userId: tradeData.userId,
    propFirmAccountId: tradeData.propFirmAccountId,
    instrument: tradeData.instrument,
    direction: tradeData.direction,
    entryPrice: String(tradeData.entryPrice),
    exitPrice: String(tradeData.exitPrice),
    quantity: tradeData.quantity,
    entryTime: tradeData.entryTime,
    exitTime: tradeData.exitTime,
    grossPnL: String(tradeData.grossPnL),
    commission: tradeData.commission ? String(tradeData.commission) : "0",
    netPnL: String(tradeData.netPnL),
    strategy: tradeData.strategy,
    importedFrom: tradeData.importedFrom || "MANUAL",
  });
}

export async function updateTrade(tradeId: number, userId: number, updates: Partial<Trade>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, any> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && typeof value === 'number' && ['entryPrice', 'exitPrice', 'grossPnL', 'commission', 'netPnL'].includes(key)) {
      updateData[key] = String(value);
    } else {
      updateData[key] = value;
    }
  }

  return db.update(trades).set(updateData).where(and(eq(trades.id, tradeId), eq(trades.userId, userId)));
}

export async function deleteTrade(tradeId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.delete(trades).where(and(eq(trades.id, tradeId), eq(trades.userId, userId)));
}

// ============ Trade Journal Entries ============

export async function getJournalEntryByTradeId(tradeId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(tradeJournalEntries).where(and(eq(tradeJournalEntries.tradeId, tradeId), eq(tradeJournalEntries.userId, userId))).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createOrUpdateJournalEntry(tradeId: number, userId: number, content: string, tags?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getJournalEntryByTradeId(tradeId, userId);

  if (existing) {
    return db.update(tradeJournalEntries).set({ content, tags }).where(eq(tradeJournalEntries.id, existing.id));
  } else {
    return db.insert(tradeJournalEntries).values({
      tradeId,
      userId,
      content,
      tags,
    });
  }
}

// ============ Trade Screenshots ============

export async function getScreenshotsByTradeId(tradeId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(tradeScreenshots).where(and(eq(tradeScreenshots.tradeId, tradeId), eq(tradeScreenshots.userId, userId))).orderBy(asc(tradeScreenshots.uploadedAt));
}

export async function createScreenshot(tradeId: number, userId: number, storageKey: string, storageUrl: string, caption?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(tradeScreenshots).values({
    tradeId,
    userId,
    storageKey,
    storageUrl,
    caption,
  });
}

export async function deleteScreenshot(screenshotId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.delete(tradeScreenshots).where(and(eq(tradeScreenshots.id, screenshotId), eq(tradeScreenshots.userId, userId)));
}

// ============ Analytics Helpers ============

export async function calculateDailyPnL(userId: number, accountId: number, date: Date) {
  const db = await getDb();
  if (!db) return null;

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const dailyTrades = await db.select().from(trades).where(
    and(
      eq(trades.userId, userId),
      eq(trades.propFirmAccountId, accountId),
      gte(trades.exitTime, startOfDay),
      lte(trades.exitTime, endOfDay)
    )
  );

  const totalPnL = dailyTrades.reduce((sum, trade) => sum + parseFloat(String(trade.netPnL)), 0);
  const winCount = dailyTrades.filter(t => parseFloat(String(t.netPnL)) > 0).length;

  return {
    date,
    totalPnL,
    tradeCount: dailyTrades.length,
    winCount,
    lossCount: dailyTrades.length - winCount,
  };
}

export async function calculateAccountStats(userId: number, accountId: number) {
  const db = await getDb();
  if (!db) return null;

  const accountTrades = await db.select().from(trades).where(and(eq(trades.userId, userId), eq(trades.propFirmAccountId, accountId)));

  if (accountTrades.length === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      profitFactor: 0,
      totalPnL: 0,
      avgWin: 0,
      avgLoss: 0,
    };
  }

  const wins = accountTrades.filter(t => parseFloat(String(t.netPnL)) > 0);
  const losses = accountTrades.filter(t => parseFloat(String(t.netPnL)) < 0);

  const totalWins = wins.reduce((sum, t) => sum + parseFloat(String(t.netPnL)), 0);
  const totalLosses = Math.abs(losses.reduce((sum, t) => sum + parseFloat(String(t.netPnL)), 0));
  const totalPnL = totalWins - totalLosses;

  return {
    totalTrades: accountTrades.length,
    winRate: wins.length / accountTrades.length,
    profitFactor: totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0,
    totalPnL,
    avgWin: wins.length > 0 ? totalWins / wins.length : 0,
    avgLoss: losses.length > 0 ? totalLosses / losses.length : 0,
  };
}
