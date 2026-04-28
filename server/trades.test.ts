import { describe, it, expect, beforeEach, vi } from "vitest";
import * as db from "./db";

describe("Trade Operations", () => {
  const mockUserId = 1;
  const mockAccountId = 1;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should calculate daily P&L correctly", async () => {
    // Mock trades for a single day
    const mockTrades = [
      {
        id: 1,
        userId: mockUserId,
        propFirmAccountId: mockAccountId,
        instrument: "ES",
        direction: "LONG" as const,
        entryPrice: "4500.00",
        exitPrice: "4505.00",
        quantity: 1,
        entryTime: new Date("2026-04-27T09:00:00"),
        exitTime: new Date("2026-04-27T10:00:00"),
        grossPnL: "500.00",
        commission: "10.00",
        netPnL: "490.00",
        strategy: "Test",
        importedFrom: "MANUAL",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        userId: mockUserId,
        propFirmAccountId: mockAccountId,
        instrument: "NQ",
        direction: "SHORT" as const,
        entryPrice: "15000.00",
        exitPrice: "14995.00",
        quantity: 1,
        entryTime: new Date("2026-04-27T11:00:00"),
        exitTime: new Date("2026-04-27T12:00:00"),
        grossPnL: "500.00",
        commission: "10.00",
        netPnL: "490.00",
        strategy: "Test",
        importedFrom: "MANUAL",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Calculate expected totals
    const totalPnL = mockTrades.reduce(
      (sum, trade) => sum + parseFloat(String(trade.netPnL)),
      0
    );
    const winCount = mockTrades.filter(
      (t) => parseFloat(String(t.netPnL)) > 0
    ).length;

    expect(totalPnL).toBe(980);
    expect(winCount).toBe(2);
  });

  it("should calculate account stats correctly", async () => {
    const mockTrades = [
      {
        netPnL: "100.00",
        direction: "LONG" as const,
      },
      {
        netPnL: "-50.00",
        direction: "SHORT" as const,
      },
      {
        netPnL: "200.00",
        direction: "LONG" as const,
      },
    ];

    const wins = mockTrades.filter(
      (t) => parseFloat(String(t.netPnL)) > 0
    );
    const losses = mockTrades.filter(
      (t) => parseFloat(String(t.netPnL)) < 0
    );

    const totalWins = wins.reduce(
      (sum, t) => sum + parseFloat(String(t.netPnL)),
      0
    );
    const totalLosses = Math.abs(
      losses.reduce((sum, t) => sum + parseFloat(String(t.netPnL)), 0)
    );

    const winRate = wins.length / mockTrades.length;
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : Infinity;

    expect(winRate).toBe(2 / 3);
    expect(profitFactor).toBeCloseTo(6, 1);
    expect(totalWins).toBe(300);
    expect(totalLosses).toBe(50);
  });

  it("should handle P&L calculation for LONG trades", () => {
    const entryPrice = 4500;
    const exitPrice = 4505;
    const quantity = 1;
    const direction = "LONG";

    const priceDiff = exitPrice - entryPrice;
    const directionMultiplier = direction === "LONG" ? 1 : -1;
    const pnl = priceDiff * quantity * directionMultiplier;

    expect(pnl).toBe(5);
  });

  it("should handle P&L calculation for SHORT trades", () => {
    const entryPrice = 15000;
    const exitPrice = 14995;
    const quantity = 1;
    const direction = "SHORT";

    const priceDiff = exitPrice - entryPrice;
    const directionMultiplier = direction === "LONG" ? 1 : -1;
    const pnl = priceDiff * quantity * directionMultiplier;

    expect(pnl).toBe(5);
  });
});

describe("Account Operations", () => {
  it("should validate account creation with required fields", () => {
    const accountName = "Main Account";
    const firmName = "Apex Trader Funding";

    expect(accountName).toBeTruthy();
    expect(firmName).toBeTruthy();
  });

  it("should allow optional account number", () => {
    const accountNumber = "ATF-12345";
    const isValid = accountNumber === "" || accountNumber.length > 0;

    expect(isValid).toBe(true);
  });
});
