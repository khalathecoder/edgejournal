import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import TradingDashboardLayout from "@/components/TradingDashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

const PRESET_TAGS: Record<string, string[]> = {
  Emotion: ["fomo", "revenge", "patient", "anxious", "confident", "greedy"],
  Mistake: ["early-entry", "late-entry", "moved-stop", "no-stop", "overtraded", "chased"],
  Setup: ["breakout", "pullback", "reversal", "trend-follow", "range"],
};

export default function Trades() {
  const [, navigate] = useLocation();
  const [selectedTradeId, setSelectedTradeId] = useState<number | null>(null);
  const [journalContent, setJournalContent] = useState("");
  const [journalTags, setJournalTags] = useState<string[]>([]);
  const [journalSaving, setJournalSaving] = useState(false);

  const utils = trpc.useUtils();

  // Fetch all trades
  const { data: trades, isLoading } = trpc.trades.getAll.useQuery();

  // Fetch selected trade details
  const { data: tradeDetails } = trpc.trades.getById.useQuery(
    { tradeId: selectedTradeId || 0 },
    { enabled: !!selectedTradeId }
  );

  const upsertJournal = trpc.journal.upsert.useMutation();

  // Sync journal state when selected trade changes
  useEffect(() => {
    if (tradeDetails?.journal) {
      setJournalContent(tradeDetails.journal.content || "");
      setJournalTags(
        tradeDetails.journal.tags
          ? tradeDetails.journal.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : []
      );
    } else {
      setJournalContent("");
      setJournalTags([]);
    }
  }, [selectedTradeId, tradeDetails?.journal]);

  const handleSaveJournal = async () => {
    if (!selectedTradeId) return;
    setJournalSaving(true);
    try {
      await upsertJournal.mutateAsync({
        tradeId: selectedTradeId,
        content: journalContent,
        tags: journalTags.join(","),
      });
      await utils.trades.getById.invalidate({ tradeId: selectedTradeId });
      toast.success("Journal saved!");
    } catch {
      toast.error("Failed to save journal");
    } finally {
      setJournalSaving(false);
    }
  };

  const toggleTag = (tag: string) => {
    setJournalTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

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
            <Card className="card-neon sticky top-6 overflow-y-auto max-h-[90vh]">
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

                {/* Journal Editor */}
                <div className="border-t border-border pt-4">
                  <p className="text-muted-foreground text-xs mb-2 font-semibold uppercase tracking-wide">
                    Journal Entry
                  </p>
                  <textarea
                    value={journalContent}
                    onChange={(e) => setJournalContent(e.target.value)}
                    placeholder="What happened in this trade? How did you feel? What would you do differently?"
                    rows={4}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                  />

                  {/* Tag Presets */}
                  <div className="mt-3 space-y-2">
                    {Object.entries(PRESET_TAGS).map(([category, tags]) => (
                      <div key={category}>
                        <p className="text-muted-foreground text-xs mb-1">{category}</p>
                        <div className="flex flex-wrap gap-1">
                          {tags.map((tag) => (
                            <button
                              key={tag}
                              onClick={() => toggleTag(tag)}
                              className={`px-2 py-0.5 rounded text-xs border transition-all ${
                                journalTags.includes(tag)
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : "bg-transparent border-border text-muted-foreground hover:border-primary hover:text-foreground"
                              }`}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Active tags summary */}
                  {journalTags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {journalTags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-primary bg-opacity-20 text-primary rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <Button
                    onClick={handleSaveJournal}
                    disabled={journalSaving}
                    className="mt-3 w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm py-2"
                  >
                    {journalSaving ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-3 h-3 mr-2" />
                        Save Journal
                      </>
                    )}
                  </Button>
                </div>
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
