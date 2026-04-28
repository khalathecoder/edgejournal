import { useState } from "react";
import { trpc } from "@/lib/trpc";
import TradingDashboardLayout from "@/components/TradingDashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export default function Trades() {
  const [, navigate] = useLocation();
  const [selectedTradeId, setSelectedTradeId] = useState<number | null>(null);

  // Fetch all trades
  const { data: trades, isLoading } = trpc.trades.getAll.useQuery();

  // Fetch selected trade details
  const { data: tradeDetails } = trpc.trades.getById.useQuery(
    { tradeId: selectedTradeId || 0 },
    { enabled: !!selectedTradeId }
  );

  const sortedTrades = trades?.sort((a, b) => {
    const dateA = new Date(a.exitTime).getTime();
    const dateB = new Date(b.exitTime).getTime();
    return dateB - dateA;
  }) || [];

  return (
    <TradingDashboardLayout currentPage="Trades">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trades List */}
        <div className="lg:col-span-2">
          <Card className="card-neon">
            <h3 className="text-xl font-bold mb-4">All Trades</h3>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : sortedTrades.length > 0 ? (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {sortedTrades.map((trade) => (
                  <button
                    key={trade.id}
                    onClick={() => setSelectedTradeId(trade.id)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      selectedTradeId === trade.id
                        ? "bg-primary bg-opacity-20 border-primary neon-box-glow"
                        : "bg-input bg-opacity-30 border-border hover:border-primary"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-primary">
                        {trade.instrument}
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          parseFloat(String(trade.netPnL)) >= 0
                            ? "text-success"
                            : "text-destructive"
                        }`}
                      >
                        ${trade.netPnL}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span
                        className={`px-2 py-1 rounded ${
                          trade.direction === "LONG"
                            ? "bg-success bg-opacity-20 text-success"
                            : "bg-destructive bg-opacity-20 text-destructive"
                        }`}
                      >
                        {trade.direction}
                      </span>
                      <span>
                        {trade.entryPrice} → {trade.exitPrice}
                      </span>
                      <span>
                        {new Date(trade.exitTime).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No trades yet</p>
                <Button
                  onClick={() => navigate("/log-trade")}
                  className="mt-4 bg-primary hover:bg-primary/90"
                >
                  Log Your First Trade
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Trade Details */}
        <div>
          {selectedTradeId && tradeDetails ? (
            <Card className="card-neon sticky top-6">
              <h3 className="text-lg font-bold mb-4 text-primary">
                Trade Details
              </h3>

              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Instrument</p>
                  <p className="font-bold text-lg">
                    {tradeDetails.trade.instrument}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground">Direction</p>
                    <p
                      className={`font-bold ${
                        tradeDetails.trade.direction === "LONG"
                          ? "text-success"
                          : "text-destructive"
                      }`}
                    >
                      {tradeDetails.trade.direction}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Quantity</p>
                    <p className="font-bold">
                      {tradeDetails.trade.quantity}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground">Entry</p>
                    <p className="font-bold">
                      {tradeDetails.trade.entryPrice}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Exit</p>
                    <p className="font-bold">
                      {tradeDetails.trade.exitPrice}
                    </p>
                  </div>
                </div>

                <div className="bg-input bg-opacity-50 p-3 rounded border border-border">
                  <p className="text-muted-foreground text-xs mb-1">
                    Net P&L
                  </p>
                  <p
                    className={`text-2xl font-bold ${
                      parseFloat(String(tradeDetails.trade.netPnL)) >= 0
                        ? "text-success"
                        : "text-destructive"
                    }`}
                  >
                    ${tradeDetails.trade.netPnL}
                  </p>
                </div>

                {tradeDetails.trade.strategy && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-2">
                      Strategy
                    </p>
                    <p className="text-sm bg-input bg-opacity-50 p-2 rounded">
                      {tradeDetails.trade.strategy}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Entry Time</p>
                    <p>
                      {new Date(
                        tradeDetails.trade.entryTime
                      ).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Exit Time</p>
                    <p>
                      {new Date(tradeDetails.trade.exitTime).toLocaleString()}
                    </p>
                  </div>
                </div>

                {tradeDetails.journal && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-2">
                      Journal Entry
                    </p>
                    <p className="text-sm bg-input bg-opacity-50 p-2 rounded">
                      {tradeDetails.journal.content}
                    </p>
                  </div>
                )}

                {tradeDetails.journal?.tags && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {tradeDetails.journal.tags.split(",").map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-primary bg-opacity-20 text-primary rounded text-xs"
                        >
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="card-neon text-center py-12">
              <p className="text-muted-foreground">
                Select a trade to view details
              </p>
            </Card>
          )}
        </div>
      </div>
    </TradingDashboardLayout>
  );
}
