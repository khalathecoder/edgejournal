import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import TradingDashboardLayout from "@/components/TradingDashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Loader2, Save, Upload, X, ImageIcon, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const EMOTION_TAGS = ["fomo", "revenge", "patient", "anxious", "confident", "greedy", "fearful", "disciplined"];
const MISTAKE_TAGS = ["early-entry", "late-entry", "moved-stop", "no-stop", "overtraded", "chased", "sized-too-big", "ignored-signal"];
const SETUP_TAGS = ["breakout", "pullback", "reversal", "trend-follow", "range", "news-play"];

type EntryRuleRating = "yes" | "partial" | "no";

function tvSnapshotToImageUrl(url: string): string | null {
  // Converts https://www.tradingview.com/x/AbCdEfGh/ → https://s.tradingview.com/i/AbCdEfGh.png
  const match = url.match(/tradingview\.com\/x\/([A-Za-z0-9]+)\/?/);
  if (match) return `https://s.tradingview.com/i/${match[1]}.png`;
  return null;
}

export default function Trades() {
  const [, navigate] = useLocation();
  const [selectedTradeId, setSelectedTradeId] = useState<number | null>(null);

  // Journal state
  const [journalContent, setJournalContent] = useState("");
  const [journalPsychology, setJournalPsychology] = useState("");
  const [journalTags, setJournalTags] = useState<string[]>([]);
  const [meetsEntryRules, setMeetsEntryRules] = useState<EntryRuleRating | null>(null);
  const [chartUrl, setChartUrl] = useState("");
  const [journalSaving, setJournalSaving] = useState(false);

  // Screenshot upload state
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  const { data: trades, isLoading } = trpc.trades.getAll.useQuery();
  const { data: tradeDetails } = trpc.trades.getById.useQuery(
    { tradeId: selectedTradeId || 0 },
    { enabled: !!selectedTradeId }
  );

  const upsertJournal = trpc.journal.upsert.useMutation();
  const uploadScreenshot = trpc.screenshots.upload.useMutation();
  const deleteScreenshot = trpc.screenshots.delete.useMutation();

  // Sync journal state when selected trade changes
  useEffect(() => {
    const j = tradeDetails?.journal;
    setJournalContent(j?.content || "");
    setJournalPsychology(j?.psychology || "");
    setChartUrl(j?.chartUrl || "");
    setMeetsEntryRules((j?.meetsEntryRules as EntryRuleRating) || null);
    setJournalTags(
      j?.tags ? j.tags.split(",").map((t) => t.trim()).filter(Boolean) : []
    );
  }, [selectedTradeId, tradeDetails?.journal]);

  const handleSaveJournal = async () => {
    if (!selectedTradeId) return;
    setJournalSaving(true);
    try {
      await upsertJournal.mutateAsync({
        tradeId: selectedTradeId,
        content: journalContent,
        tags: journalTags.join(","),
        psychology: journalPsychology,
        meetsEntryRules: meetsEntryRules ?? undefined,
        chartUrl: chartUrl.trim() || undefined,
      });
      await utils.trades.getById.invalidate({ tradeId: selectedTradeId });
      toast.success("Journal saved!");
    } catch {
      toast.error("Failed to save journal");
    } finally {
      setJournalSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !selectedTradeId) return;
    setUploadingScreenshot(true);
    try {
      for (const file of files) {
        const base64 = await fileToBase64(file);
        await uploadScreenshot.mutateAsync({
          tradeId: selectedTradeId,
          fileData: base64,
          fileName: file.name,
        });
      }
      await utils.trades.getById.invalidate({ tradeId: selectedTradeId });
      toast.success(files.length > 1 ? `${files.length} screenshots uploaded` : "Screenshot uploaded");
    } catch {
      toast.error("Failed to upload screenshot");
    } finally {
      setUploadingScreenshot(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteScreenshot = async (screenshotId: number) => {
    try {
      await deleteScreenshot.mutateAsync({ screenshotId });
      await utils.trades.getById.invalidate({ tradeId: selectedTradeId || 0 });
    } catch {
      toast.error("Failed to delete screenshot");
    }
  };

  const toggleTag = (tag: string) => {
    setJournalTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const sortedTrades = trades?.sort((a, b) =>
    new Date(b.exitTime).getTime() - new Date(a.exitTime).getTime()
  ) || [];

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
                      <span className="font-bold text-primary">{trade.instrument}</span>
                      <span className={`text-sm font-bold ${parseFloat(String(trade.netPnL)) >= 0 ? "text-success" : "text-destructive"}`}>
                        ${trade.netPnL}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className={`px-2 py-1 rounded ${trade.direction === "LONG" ? "bg-success bg-opacity-20 text-success" : "bg-destructive bg-opacity-20 text-destructive"}`}>
                        {trade.direction}
                      </span>
                      <span>{trade.entryPrice} → {trade.exitPrice}</span>
                      <span>{new Date(trade.exitTime).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No trades yet</p>
                <Button onClick={() => navigate("/log-trade")} className="mt-4 bg-primary hover:bg-primary/90">
                  Log Your First Trade
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Trade Details + Journal */}
        <div>
          {selectedTradeId && tradeDetails ? (
            <Card className="card-neon overflow-y-auto max-h-[92vh]">
              <h3 className="text-lg font-bold mb-4 text-primary">Trade Details</h3>

              {/* Trade Info */}
              <div className="space-y-3 text-sm mb-6">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground">Instrument</p>
                  <p className="font-bold text-lg">{tradeDetails.trade.instrument}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-muted-foreground text-xs">Direction</p>
                    <p className={`font-bold ${tradeDetails.trade.direction === "LONG" ? "text-success" : "text-destructive"}`}>
                      {tradeDetails.trade.direction}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Qty</p>
                    <p className="font-bold">{tradeDetails.trade.quantity}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Entry</p>
                    <p className="font-bold">{tradeDetails.trade.entryPrice}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Exit</p>
                    <p className="font-bold">{tradeDetails.trade.exitPrice}</p>
                  </div>
                </div>
                <div className="bg-input bg-opacity-50 p-3 rounded border border-border text-center">
                  <p className="text-muted-foreground text-xs mb-1">Net P&L</p>
                  <p className={`text-2xl font-bold ${parseFloat(String(tradeDetails.trade.netPnL)) >= 0 ? "text-success" : "text-destructive"}`}>
                    ${tradeDetails.trade.netPnL}
                  </p>
                </div>
                {tradeDetails.trade.strategy && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Strategy</p>
                    <p className="text-sm bg-input bg-opacity-50 p-2 rounded">{tradeDetails.trade.strategy}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <p className="mb-0.5">Entry</p>
                    <p className="text-foreground">{new Date(tradeDetails.trade.entryTime).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="mb-0.5">Exit</p>
                    <p className="text-foreground">{new Date(tradeDetails.trade.exitTime).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Screenshots Section */}
              <div className="border-t border-border pt-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Charts & Screenshots</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingScreenshot}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    {uploadingScreenshot ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                    Upload
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {/* Chart URL (TradingView link) */}
                <div className="mb-3">
                  <input
                    type="url"
                    value={chartUrl}
                    onChange={(e) => setChartUrl(e.target.value)}
                    placeholder="Paste TradingView snapshot link (tradingview.com/x/...)"
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-xs focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Render TradingView snapshot or link */}
                {chartUrl.trim() && (() => {
                  const imgUrl = tvSnapshotToImageUrl(chartUrl);
                  return imgUrl ? (
                    <div className="relative group rounded-lg overflow-hidden border border-border mb-2">
                      <img
                        src={imgUrl}
                        alt="TradingView chart"
                        className="w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <a
                        href={chartUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute top-2 right-2 p-1 bg-black bg-opacity-60 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ExternalLink className="w-3 h-3 text-white" />
                      </a>
                    </div>
                  ) : (
                    <a
                      href={chartUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-primary hover:underline mb-2"
                    >
                      <ImageIcon className="w-3 h-3" />
                      Open chart link
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  );
                })()}

                {/* Uploaded screenshots grid */}
                {tradeDetails.screenshots.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {tradeDetails.screenshots.map((s) => (
                      <div key={s.id} className="relative group rounded-lg overflow-hidden border border-border">
                        <img
                          src={s.storageUrl}
                          alt={s.caption || "Screenshot"}
                          className="w-full object-cover aspect-video bg-input"
                        />
                        <button
                          onClick={() => handleDeleteScreenshot(s.id)}
                          className="absolute top-1 right-1 p-0.5 bg-black bg-opacity-70 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                        {s.caption && (
                          <p className="absolute bottom-0 left-0 right-0 text-xs text-white bg-black bg-opacity-60 px-2 py-1 truncate">
                            {s.caption}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {tradeDetails.screenshots.length === 0 && !chartUrl && (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    No charts yet — upload a screenshot or paste a TradingView link
                  </p>
                )}
              </div>

              {/* Journal Section */}
              <div className="border-t border-border pt-4 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trade Journal</p>

                {/* Entry Criteria */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Did this trade meet your entry rules?</p>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: "yes" as const, label: "Yes", color: "text-success border-success bg-success" },
                      { value: "partial" as const, label: "Partial", color: "text-yellow-400 border-yellow-500 bg-yellow-500" },
                      { value: "no" as const, label: "No", color: "text-destructive border-destructive bg-destructive" },
                    ]).map(({ value, label, color }) => (
                      <button
                        key={value}
                        onClick={() => setMeetsEntryRules(meetsEntryRules === value ? null : value)}
                        className={`py-2 text-xs font-bold rounded border transition-all ${
                          meetsEntryRules === value
                            ? `${color} bg-opacity-20 border-opacity-80`
                            : "border-border text-muted-foreground hover:border-primary"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Emotion Tags */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Emotions during trade</p>
                  <div className="flex flex-wrap gap-1">
                    {EMOTION_TAGS.map((tag) => (
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

                {/* Mistake Tags */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Mistakes made</p>
                  <div className="flex flex-wrap gap-1">
                    {MISTAKE_TAGS.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-2 py-0.5 rounded text-xs border transition-all ${
                          journalTags.includes(tag)
                            ? "bg-destructive border-destructive text-destructive-foreground"
                            : "bg-transparent border-border text-muted-foreground hover:border-destructive hover:text-foreground"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Setup Tags */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Setup type</p>
                  <div className="flex flex-wrap gap-1">
                    {SETUP_TAGS.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-2 py-0.5 rounded text-xs border transition-all ${
                          journalTags.includes(tag)
                            ? "bg-primary/30 border-primary text-primary"
                            : "bg-transparent border-border text-muted-foreground hover:border-primary hover:text-foreground"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* What happened */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">What happened</p>
                  <textarea
                    value={journalContent}
                    onChange={(e) => setJournalContent(e.target.value)}
                    placeholder="Walk through the trade — setup, execution, exit. What did you see?"
                    rows={3}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>

                {/* Psychology */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Psychology & mental notes</p>
                  <textarea
                    value={journalPsychology}
                    onChange={(e) => setJournalPsychology(e.target.value)}
                    placeholder="How were you feeling? Were you revenge trading? Did fear or greed drive a decision? What will you do differently?"
                    rows={3}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>

                <Button
                  onClick={handleSaveJournal}
                  disabled={journalSaving}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
                >
                  {journalSaving ? (
                    <><Loader2 className="w-3 h-3 mr-2 animate-spin" />Saving...</>
                  ) : (
                    <><Save className="w-3 h-3 mr-2" />Save Journal</>
                  )}
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="card-neon text-center py-12">
              <p className="text-muted-foreground">Select a trade to journal it</p>
            </Card>
          )}
        </div>
      </div>
    </TradingDashboardLayout>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip data URL prefix, return only base64 payload
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
