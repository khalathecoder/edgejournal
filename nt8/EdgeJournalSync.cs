//
// EdgeJournalSync — NinjaTrader 8 Add-On
//
// INSTALL:
//   1. Open NinjaTrader 8
//   2. New > NinjaScript Editor
//   3. Add-Ons > right-click > New > paste this file content
//   4. Save and compile (F5)
//   5. Restart NinjaTrader — the add-on activates automatically
//
// SETUP:
//   - Set WEBHOOK_SECRET below to match NT8_WEBHOOK_SECRET in your EdgeJournal .env
//   - WEBHOOK_URL points to localhost:3000 by default — change port if needed
//
// BEHAVIOR:
//   - Listens to all connected NT8 accounts simultaneously
//   - Auto-fires when any trade closes (position goes flat)
//   - POSTs trade data to EdgeJournal immediately
//   - Auto-creates the account in EdgeJournal if it doesn't exist yet
//

using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using NinjaTrader.Cbi;
using NinjaTrader.NinjaScript;

namespace NinjaTrader.NinjaScript.AddOns
{
    public class EdgeJournalSync : AddOnBase
    {
        private const string WEBHOOK_URL = "http://localhost:3000/api/nt8/webhook";
        private const string WEBHOOK_SECRET = "CHANGE_ME"; // Must match NT8_WEBHOOK_SECRET in .env

        private static readonly HttpClient _http = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };

        // Tracks open positions: key = "AccountName|InstrumentName"
        private readonly Dictionary<string, OpenPosition> _openPositions = new Dictionary<string, OpenPosition>();

        protected override void OnStateChange()
        {
            if (State == State.SetDefaults)
            {
                Description = "Syncs completed trades to EdgeJournal in real time";
                Name        = "EdgeJournalSync";
            }
            else if (State == State.Active)
            {
                lock (Account.All)
                {
                    foreach (Account account in Account.All)
                        account.ExecutionUpdate += OnExecutionUpdate;
                }
            }
            else if (State == State.Terminated)
            {
                lock (Account.All)
                {
                    foreach (Account account in Account.All)
                        account.ExecutionUpdate -= OnExecutionUpdate;
                }
            }
        }

        private void OnExecutionUpdate(object sender, ExecutionEventArgs e)
        {
            var account = sender as Account;
            if (account == null) return;

            var exec = e.Execution;
            var key  = $"{account.Name}|{exec.Instrument.FullName}";

            if (exec.MarketPosition == MarketPosition.Long || exec.MarketPosition == MarketPosition.Short)
            {
                // Position opened (or scaled in — we track the first entry only)
                if (!_openPositions.ContainsKey(key))
                {
                    _openPositions[key] = new OpenPosition
                    {
                        AccountName  = account.Name,
                        Instrument   = exec.Instrument.FullName,
                        Direction    = exec.MarketPosition == MarketPosition.Long ? "LONG" : "SHORT",
                        EntryPrice   = exec.Price,
                        Quantity     = exec.Quantity,
                        EntryTime    = exec.Time,
                        StrategyName = exec.Name ?? "",
                        PointValue   = exec.Instrument.MasterInstrument.PointValue,
                    };
                }
            }
            else if (exec.MarketPosition == MarketPosition.Flat)
            {
                // Position closed — post the trade
                if (_openPositions.TryGetValue(key, out var entry))
                {
                    _openPositions.Remove(key);

                    double grossPnL = entry.Direction == "LONG"
                        ? (exec.Price - entry.EntryPrice) * entry.Quantity * entry.PointValue
                        : (entry.EntryPrice - exec.Price) * entry.Quantity * entry.PointValue;

                    double commission = exec.Commission;
                    double netPnL     = grossPnL - commission;

                    Task.Run(() => PostTrade(new TradePayload
                    {
                        secret      = WEBHOOK_SECRET,
                        accountName = entry.AccountName,
                        instrument  = entry.Instrument,
                        direction   = entry.Direction,
                        entryPrice  = entry.EntryPrice,
                        exitPrice   = exec.Price,
                        quantity    = entry.Quantity,
                        entryTime   = entry.EntryTime.ToString("o"),
                        exitTime    = exec.Time.ToString("o"),
                        grossPnL    = grossPnL,
                        commission  = commission,
                        netPnL      = netPnL,
                        strategy    = entry.StrategyName,
                    }));
                }
            }
        }

        private async Task PostTrade(TradePayload payload)
        {
            try
            {
                var json    = BuildJson(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                var resp    = await _http.PostAsync(WEBHOOK_URL, content);

                if (!resp.IsSuccessStatusCode)
                {
                    var body = await resp.Content.ReadAsStringAsync();
                    NinjaTrader.Code.Output.Process($"[EdgeJournal] Webhook error {resp.StatusCode}: {body}", PrintTo.OutputTab1);
                }
            }
            catch (Exception ex)
            {
                NinjaTrader.Code.Output.Process($"[EdgeJournal] Failed to post trade: {ex.Message}", PrintTo.OutputTab1);
            }
        }

        // Manual JSON build — avoids adding a NuGet dependency inside NT8
        private static string BuildJson(TradePayload p) => $@"{{
  ""secret"":""{Esc(p.secret)}"",
  ""accountName"":""{Esc(p.accountName)}"",
  ""instrument"":""{Esc(p.instrument)}"",
  ""direction"":""{p.direction}"",
  ""entryPrice"":{p.entryPrice},
  ""exitPrice"":{p.exitPrice},
  ""quantity"":{p.quantity},
  ""entryTime"":""{p.entryTime}"",
  ""exitTime"":""{p.exitTime}"",
  ""grossPnL"":{p.grossPnL},
  ""commission"":{p.commission},
  ""netPnL"":{p.netPnL},
  ""strategy"":""{Esc(p.strategy)}""
}}";

        private static string Esc(string s) => s?.Replace("\\", "\\\\").Replace("\"", "\\\"") ?? "";

        private class OpenPosition
        {
            public string   AccountName;
            public string   Instrument;
            public string   Direction;
            public double   EntryPrice;
            public int      Quantity;
            public DateTime EntryTime;
            public string   StrategyName;
            public double   PointValue;
        }

        private class TradePayload
        {
            public string secret;
            public string accountName;
            public string instrument;
            public string direction;
            public double entryPrice;
            public double exitPrice;
            public int    quantity;
            public string entryTime;
            public string exitTime;
            public double grossPnL;
            public double commission;
            public double netPnL;
            public string strategy;
        }
    }
}
