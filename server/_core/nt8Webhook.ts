import type { Express } from "express";
import * as db from "../db";
import { ENV } from "./env";

export function registerNt8Webhook(app: Express) {
  app.post("/api/nt8/webhook", async (req, res) => {
    try {
      const {
        secret,
        accountName,
        instrument,
        direction,
        entryPrice,
        exitPrice,
        quantity,
        entryTime,
        exitTime,
        grossPnL,
        commission,
        netPnL,
        strategy,
      } = req.body;

      if (!ENV.nt8WebhookSecret) {
        return res.status(503).json({ error: "NT8_WEBHOOK_SECRET not configured" });
      }

      if (!secret || secret !== ENV.nt8WebhookSecret) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const ownerUser = await db.getUserByOpenId(ENV.ownerOpenId);
      if (!ownerUser) {
        return res.status(404).json({ error: "Owner user not found — log in to EdgeJournal first" });
      }

      // Find or auto-create the prop firm account by NT8 account name
      const accounts = await db.getPropFirmAccountsByUserId(ownerUser.id);
      let account = accounts.find(
        (a) => a.accountName === accountName || a.accountNumber === accountName
      );

      if (!account) {
        await db.createPropFirmAccount(ownerUser.id, accountName, "NinjaTrader", accountName);
        const refreshed = await db.getPropFirmAccountsByUserId(ownerUser.id);
        account = refreshed.find((a) => a.accountName === accountName);
      }

      if (!account) {
        return res.status(500).json({ error: "Failed to find or create account" });
      }

      await db.createTrade({
        userId: ownerUser.id,
        propFirmAccountId: account.id,
        instrument: String(instrument ?? ""),
        direction: direction === "SHORT" ? "SHORT" : "LONG",
        entryPrice: parseFloat(entryPrice) || 0,
        exitPrice: parseFloat(exitPrice) || 0,
        quantity: parseInt(quantity) || 1,
        entryTime: new Date(entryTime),
        exitTime: new Date(exitTime),
        grossPnL: parseFloat(grossPnL) || 0,
        commission: parseFloat(commission) || 0,
        netPnL: parseFloat(netPnL) || 0,
        strategy: String(strategy ?? ""),
        importedFrom: "NT8_LIVE",
      });

      console.log(`[NT8] Trade synced: ${instrument} ${direction} @ ${entryPrice} → ${exitPrice} | PnL: ${netPnL}`);
      return res.json({ success: true });
    } catch (error) {
      console.error("[NT8 Webhook]", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
}
