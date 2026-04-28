import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import TradingDashboardLayout from "@/components/TradingDashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Loader2, Plus } from "lucide-react";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  // Fetch accounts
  const { data: accounts, isLoading: accountsLoading } = trpc.accounts.getAll.useQuery();

  // Set first account as default
  useEffect(() => {
    if (accounts && accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  // Fetch stats for selected account
  const { data: stats } = trpc.accounts.getStats.useQuery(
    { accountId: selectedAccountId || 0 },
    { enabled: !!selectedAccountId }
  );

  // Fetch recent trades
  const { data: trades } = trpc.trades.getByAccount.useQuery(
    { accountId: selectedAccountId || 0 },
    { enabled: !!selectedAccountId }
  );

  const recentTrades = trades?.slice(0, 5) || [];

  return (
    <TradingDashboardLayout currentPage="Dashboard">
      <div className="space-y-6">
        {/* Account Selector */}
        <div className="flex items-center gap-4 flex-wrap">
          <label className="text-sm font-semibold text-muted-foreground">
            Active Account:
          </label>
          {accountsLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : accounts && accounts.length > 0 ? (
            <select
              value={selectedAccountId || ""}
              onChange={(e) => setSelectedAccountId(Number(e.target.value))}
              className="px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.accountName} ({acc.firmName})
                </option>
              ))}
            </select>
          ) : (
            <p className="text-muted-foreground">No accounts yet</p>
          )}
          <Button
            onClick={() => navigate("/accounts")}
            variant="outline"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Account
          </Button>
        </div>

        {/* Stats Grid */}
        {selectedAccountId && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="card-neon">
              <div className="text-sm text-muted-foreground">Total Trades</div>
              <div className="text-3xl font-bold text-primary neon-glow mt-2">
                {stats.totalTrades}
              </div>
            </Card>

            <Card className="card-neon">
              <div className="text-sm text-muted-foreground">Win Rate</div>
              <div className="text-3xl font-bold text-accent neon-glow mt-2">
                {(stats.winRate * 100).toFixed(1)}%
              </div>
            </Card>

            <Card className="card-neon">
              <div className="text-sm text-muted-foreground">Profit Factor</div>
              <div className="text-3xl font-bold text-secondary neon-glow mt-2">
                {stats.profitFactor.toFixed(2)}
              </div>
            </Card>

            <Card className="card-neon">
              <div className="text-sm text-muted-foreground">Total P&L</div>
              <div
                className={`text-3xl font-bold neon-glow mt-2 ${
                  stats.totalPnL >= 0 ? "text-success" : "text-destructive"
                }`}
              >
                ${stats.totalPnL.toFixed(2)}
              </div>
            </Card>

            <Card className="card-neon">
              <div className="text-sm text-muted-foreground">Avg Win / Loss</div>
              <div className="text-sm font-bold mt-2 space-y-1">
                <div className="text-success">
                  W: ${stats.avgWin.toFixed(2)}
                </div>
                <div className="text-destructive">
                  L: ${stats.avgLoss.toFixed(2)}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Recent Trades */}
        <div className="card-neon">
          <h3 className="text-xl font-bold mb-4">Recent Trades</h3>
          {recentTrades.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-primary">Instrument</th>
                    <th className="text-left p-3 text-primary">Direction</th>
                    <th className="text-left p-3 text-primary">Entry</th>
                    <th className="text-left p-3 text-primary">Exit</th>
                    <th className="text-left p-3 text-primary">P&L</th>
                    <th className="text-left p-3 text-primary">Exit Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrades.map((trade) => (
                    <tr
                      key={trade.id}
                      className="border-b border-border hover:bg-input hover:bg-opacity-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/trades?id=${trade.id}`)}
                    >
                      <td className="p-3 font-semibold">{trade.instrument}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold ${
                            trade.direction === "LONG"
                              ? "bg-success bg-opacity-20 text-success"
                              : "bg-destructive bg-opacity-20 text-destructive"
                          }`}
                        >
                          {trade.direction}
                        </span>
                      </td>
                      <td className="p-3">{trade.entryPrice}</td>
                      <td className="p-3">{trade.exitPrice}</td>
                      <td className="p-3">
                        <span
                          className={`font-bold ${
                            parseFloat(String(trade.netPnL)) >= 0
                              ? "text-success"
                              : "text-destructive"
                          }`}
                        >
                          ${trade.netPnL}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {new Date(trade.exitTime).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No trades yet. Start by logging your first trade!</p>
              <Button
                onClick={() => navigate("/log-trade")}
                className="mt-4"
                variant="default"
              >
                Log Your First Trade
              </Button>
            </div>
          )}
        </div>
      </div>
    </TradingDashboardLayout>
  );
}
