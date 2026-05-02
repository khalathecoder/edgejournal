import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";

// ============ Trade Routers ============

const tradeRouter = router({
  // Get all trades for a specific account
  getByAccount: protectedProcedure
    .input(z.object({ accountId: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getTradesByAccountId(input.accountId, ctx.user.id);
    }),

  // Get all trades for the user
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return db.getTradesByUserId(ctx.user.id);
  }),

  // Get a single trade with its journal entry and screenshots
  getById: protectedProcedure
    .input(z.object({ tradeId: z.number() }))
    .query(async ({ ctx, input }) => {
      const trade = await db.getTradeById(input.tradeId, ctx.user.id);
      if (!trade) return null;

      const journal = await db.getJournalEntryByTradeId(input.tradeId, ctx.user.id);
      const screenshots = await db.getScreenshotsByTradeId(input.tradeId, ctx.user.id);

      return { trade, journal, screenshots };
    }),

  // Create a new trade
  create: protectedProcedure
    .input(
      z.object({
        propFirmAccountId: z.number(),
        instrument: z.string(),
        direction: z.enum(["LONG", "SHORT"]),
        entryPrice: z.number(),
        exitPrice: z.number(),
        quantity: z.number(),
        entryTime: z.date(),
        exitTime: z.date(),
        grossPnL: z.number(),
        commission: z.number().optional(),
        netPnL: z.number(),
        strategy: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return db.createTrade({
        userId: ctx.user.id,
        propFirmAccountId: input.propFirmAccountId,
        instrument: input.instrument,
        direction: input.direction,
        entryPrice: input.entryPrice,
        exitPrice: input.exitPrice,
        quantity: input.quantity,
        entryTime: input.entryTime,
        exitTime: input.exitTime,
        grossPnL: input.grossPnL,
        commission: input.commission,
        netPnL: input.netPnL,
        strategy: input.strategy,
        importedFrom: "MANUAL",
      });
    }),

  // Update a trade
  update: protectedProcedure
    .input(
      z.object({
        tradeId: z.number(),
        updates: z.object({
          entryPrice: z.number().optional(),
          exitPrice: z.number().optional(),
          quantity: z.number().optional(),
          netPnL: z.number().optional(),
          strategy: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, any> = {};
      if (input.updates.entryPrice !== undefined) updates.entryPrice = String(input.updates.entryPrice);
      if (input.updates.exitPrice !== undefined) updates.exitPrice = String(input.updates.exitPrice);
      if (input.updates.quantity !== undefined) updates.quantity = input.updates.quantity;
      if (input.updates.netPnL !== undefined) updates.netPnL = String(input.updates.netPnL);
      if (input.updates.strategy !== undefined) updates.strategy = input.updates.strategy;
      return db.updateTrade(input.tradeId, ctx.user.id, updates);
    }),

  // Delete a trade
  delete: protectedProcedure
    .input(z.object({ tradeId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return db.deleteTrade(input.tradeId, ctx.user.id);
    }),
});

// ============ Account Routers ============

const accountRouter = router({
  // Get all prop firm accounts for the user
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return db.getPropFirmAccountsByUserId(ctx.user.id);
  }),

  // Get a single account
  getById: protectedProcedure
    .input(z.object({ accountId: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getPropFirmAccountById(input.accountId, ctx.user.id);
    }),

  // Create a new account
  create: protectedProcedure
    .input(
      z.object({
        accountName: z.string(),
        firmName: z.string(),
        accountNumber: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return db.createPropFirmAccount(ctx.user.id, input.accountName, input.firmName, input.accountNumber);
    }),

  // Update an account
  update: protectedProcedure
    .input(
      z.object({
        accountId: z.number(),
        updates: z.object({
          accountName: z.string().optional(),
          firmName: z.string().optional(),
          isActive: z.boolean().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return db.updatePropFirmAccount(input.accountId, ctx.user.id, input.updates);
    }),

  // Delete an account
  delete: protectedProcedure
    .input(z.object({ accountId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return db.deletePropFirmAccount(input.accountId, ctx.user.id);
    }),

  // Get stats for an account
  getStats: protectedProcedure
    .input(z.object({ accountId: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.calculateAccountStats(ctx.user.id, input.accountId);
    }),
});

// ============ Purchase Routers ============

const purchaseRouter = router({
  // Get all purchases for the user
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return db.getPropFirmPurchasesByUserId(ctx.user.id);
  }),

  // Create a new purchase record
  create: protectedProcedure
    .input(
      z.object({
        firmName: z.string(),
        purchaseDate: z.date(),
        accountCount: z.number(),
        costPerAccount: z.number().optional(),
        totalCost: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return db.createPropFirmPurchase(
        ctx.user.id,
        input.firmName,
        input.purchaseDate,
        input.accountCount,
        input.costPerAccount,
        input.totalCost,
        input.notes
      );
    }),
});

// ============ Journal Routers ============

const journalRouter = router({
  // Get journal entry for a trade
  getByTrade: protectedProcedure
    .input(z.object({ tradeId: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getJournalEntryByTradeId(input.tradeId, ctx.user.id);
    }),

  // Create or update journal entry
  upsert: protectedProcedure
    .input(
      z.object({
        tradeId: z.number(),
        content: z.string(),
        tags: z.string().optional(),
        psychology: z.string().optional(),
        meetsEntryRules: z.enum(["yes", "partial", "no"]).optional(),
        chartUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return db.createOrUpdateJournalEntry(
        input.tradeId,
        ctx.user.id,
        input.content,
        input.tags,
        input.psychology,
        input.meetsEntryRules,
        input.chartUrl,
      );
    }),
});

// ============ Screenshot Routers ============

const screenshotRouter = router({
  // Get screenshots for a trade
  getByTrade: protectedProcedure
    .input(z.object({ tradeId: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getScreenshotsByTradeId(input.tradeId, ctx.user.id);
    }),

  // Upload a screenshot
  upload: protectedProcedure
    .input(
      z.object({
        tradeId: z.number(),
        fileData: z.string(), // base64 encoded
        fileName: z.string(),
        caption: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Decode base64 and upload to storage
      const buffer = Buffer.from(input.fileData, "base64");
      const storageKey = `trades/${ctx.user.id}/${input.tradeId}/${input.fileName}`;

      const { key, url } = await storagePut(storageKey, buffer, "image/png");

      return db.createScreenshot(input.tradeId, ctx.user.id, key, url, input.caption);
    }),

  // Delete a screenshot
  delete: protectedProcedure
    .input(z.object({ screenshotId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return db.deleteScreenshot(input.screenshotId, ctx.user.id);
    }),
});

// ============ LLM Coaching Router ============

const coachingRouter = router({
  // Analyze trades and generate coaching insights
  analyze: protectedProcedure
    .input(z.object({ accountId: z.number() }))
    .query(async ({ ctx, input }) => {
      const trades = await db.getTradesByAccountId(input.accountId, ctx.user.id);

      if (trades.length === 0) {
        return { insights: "No trades to analyze yet. Start logging your trades to get personalized coaching insights." };
      }

      // Gather trade data and journal entries for LLM analysis
      const tradeDetails = await Promise.all(
        trades.map(async (trade) => {
          const journal = await db.getJournalEntryByTradeId(trade.id, ctx.user.id);
          return {
            instrument: trade.instrument,
            direction: trade.direction,
            entryPrice: trade.entryPrice,
            exitPrice: trade.exitPrice,
            netPnL: trade.netPnL,
            strategy: trade.strategy,
            journalEntry: journal?.content || "No journal entry",
            tags: journal?.tags || "",
          };
        })
      );

      const stats = await db.calculateAccountStats(ctx.user.id, input.accountId);

      const prompt = `You are a professional trading coach analyzing a trader's performance. Here are their recent trades and statistics:

Trade Statistics:
- Total Trades: ${stats?.totalTrades}
- Win Rate: ${((stats?.winRate || 0) * 100).toFixed(2)}%
- Profit Factor: ${(stats?.profitFactor || 0).toFixed(2)}
- Total P&L: $${stats?.totalPnL.toFixed(2)}
- Average Win: $${stats?.avgWin.toFixed(2)}
- Average Loss: $${stats?.avgLoss.toFixed(2)}

Recent Trades:
${tradeDetails.map((t, i) => `
Trade ${i + 1}:
- Instrument: ${t.instrument} ${t.direction}
- Entry: ${t.entryPrice}, Exit: ${t.exitPrice}
- P&L: $${t.netPnL}
- Strategy: ${t.strategy || "Not specified"}
- Journal: ${t.journalEntry}
- Tags: ${t.tags}
`).join("\n")}

Please provide:
1. Key patterns you notice in their trading
2. Recurring mistakes or weaknesses
3. Strengths to build upon
4. Specific, actionable coaching tips
5. Areas for improvement

Be concise, direct, and focus on actionable insights.`;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are an expert trading coach with deep knowledge of technical analysis, risk management, and trading psychology.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const insights = response.choices[0]?.message.content || "Unable to generate insights at this time.";

      return { insights };
    }),
});

// ============ NT8 Import Router ============

const nt8Router = router({
  // Parse and import NT8 CSV
  import: protectedProcedure
    .input(
      z.object({
        accountId: z.number(),
        csvData: z.string(), // CSV content as string
      })
    )
    .mutation(async ({ ctx, input }) => {
      const lines = input.csvData.trim().split("\n");
      if (lines.length < 2) {
        throw new Error("Invalid CSV format");
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const trades = [];
      const errors = [];

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].split(",").map((v) => v.trim());
          const row: Record<string, string> = {};

          headers.forEach((header, idx) => {
            row[header] = values[idx] || "";
          });

          // Map NT8 columns to our trade schema
          const direction = (row["market position"] || row["position"])?.toUpperCase().includes("SHORT") ? "SHORT" : "LONG";
          const trade = {
            userId: ctx.user.id,
            propFirmAccountId: input.accountId,
            instrument: row["instrument"] || row["symbol"] || "",
            direction: direction as "LONG" | "SHORT",
            entryPrice: parseFloat(row["entry price"] || row["entry"] || "0"),
            exitPrice: parseFloat(row["exit price"] || row["exit"] || "0"),
            quantity: parseInt(row["quantity"] || row["qty"] || "0"),
            entryTime: new Date(row["entry time"] || row["entry date"] || ""),
            exitTime: new Date(row["exit time"] || row["exit date"] || ""),
            grossPnL: parseFloat(row["profit"] || row["gross pnl"] || "0"),
            commission: parseFloat(row["commission"] || row["fees"] || "0"),
            netPnL: parseFloat(row["profit"] || row["net pnl"] || "0"),
            strategy: row["strategy"] || "",
            importedFrom: "NT8",
          };

          if (trade.instrument && !isNaN(trade.entryPrice) && !isNaN(trade.exitPrice)) {
            trades.push(trade);
          }
        } catch (error) {
          errors.push(`Row ${i}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }

      // Insert all valid trades
      const importedResults = await Promise.all(
        trades.map((trade) =>
          db.createTrade(trade).catch((err) => {
            errors.push(`Failed to import trade: ${err instanceof Error ? err.message : "Unknown error"}`);
            return null;
          })
        )
      );
      const importedCount = importedResults.filter((r) => r !== null).length;

      return {
        importedCount,
        totalProcessed: trades.length,
        errors,
      };
    }),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Feature routers
  trades: tradeRouter,
  accounts: accountRouter,
  purchases: purchaseRouter,
  journal: journalRouter,
  screenshots: screenshotRouter,
  coaching: coachingRouter,
  nt8: nt8Router,
});

export type AppRouter = typeof appRouter;
