# Trading Journal Database Schema Design

## Core Tables

### 1. `propFirmAccounts`
Represents each prop firm account a user owns.

```
- id: int (PK)
- userId: int (FK → users.id)
- accountName: varchar (e.g., "FTMO Account #1")
- firmName: varchar (e.g., "FTMO", "Topstep", "Funded")
- accountNumber: varchar (optional, for reference)
- isActive: boolean (default: true)
- createdAt: timestamp
- updatedAt: timestamp
```

### 2. `propFirmPurchases`
Tracks when and how many accounts are purchased.

```
- id: int (PK)
- userId: int (FK → users.id)
- firmName: varchar
- purchaseDate: timestamp
- accountCount: int (how many accounts purchased in this batch)
- costPerAccount: decimal
- totalCost: decimal
- notes: text (optional)
- createdAt: timestamp
```

### 3. `trades`
Core trade record with all entry/exit details.

```
- id: int (PK)
- userId: int (FK → users.id)
- propFirmAccountId: int (FK → propFirmAccounts.id)
- instrument: varchar (e.g., "ES", "NQ", "GC")
- direction: enum ('LONG', 'SHORT')
- entryPrice: decimal
- exitPrice: decimal
- quantity: int
- entryTime: timestamp
- exitTime: timestamp
- grossPnL: decimal (calculated or imported)
- commission: decimal (optional)
- netPnL: decimal (calculated: grossPnL - commission)
- winRate: boolean (derived: netPnL > 0)
- strategy: varchar (optional, from NT8 or user-entered)
- importedFrom: varchar (e.g., "NT8", "MANUAL")
- createdAt: timestamp
- updatedAt: timestamp
```

### 4. `tradeJournalEntries`
Free-text journal entries linked to trades (1:1 or 1:many).

```
- id: int (PK)
- tradeId: int (FK → trades.id)
- content: text (free-text journal entry)
- tags: varchar (comma-separated or JSON: "setup:breakout,emotion:confident,mistake:none")
- createdAt: timestamp
- updatedAt: timestamp
```

### 5. `tradeScreenshots`
Screenshots or images attached to trades.

```
- id: int (PK)
- tradeId: int (FK → trades.id)
- storageKey: varchar (reference to S3 storage)
- storageUrl: varchar (URL to the image)
- caption: varchar (optional, user-provided description)
- uploadedAt: timestamp
```

## Derived/Aggregated Metrics (Computed in Backend)

For each user and account, compute:
- **Daily P&L**: Sum of netPnL for trades with exitTime on that day
- **Win Rate**: Count(netPnL > 0) / Count(all trades)
- **Profit Factor**: Sum(winning trades) / Sum(losing trades)
- **Average Win**: Sum(winning trades) / Count(winning trades)
- **Average Loss**: Sum(losing trades) / Count(losing trades)
- **Consecutive Wins/Losses**: Derived from sorted trade history
- **Monthly/Weekly Aggregates**: Grouped sums and stats

## Relationships Summary

```
users (1) ──→ (many) propFirmAccounts
users (1) ──→ (many) propFirmPurchases
propFirmAccounts (1) ──→ (many) trades
trades (1) ──→ (1) tradeJournalEntries
trades (1) ──→ (many) tradeScreenshots
```

## Notes

- All timestamps stored in UTC.
- P&L calculations done server-side to ensure consistency.
- Screenshots stored in S3 via `storagePut()` helper; only metadata and URL stored in DB.
- LLM coaching feature queries both `trades` and `tradeJournalEntries` to generate insights.
- NT8 import maps CSV columns to `trades` table fields.
