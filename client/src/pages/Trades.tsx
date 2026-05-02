import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import TradingDashboardLayout from "@/components/TradingDashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  Loader2, Save, Upload, X, ImageIcon, ExternalLink,
  ChevronDown, ChevronRight, Brain,
} from "lucide-react";
import { toast } from "sonner";

const EMOTION_TAGS = ["fomo", "revenge", "patient", "anxious", "confident", "greedy", "fearful", "disciplined"];
const MISTAKE_TAGS = ["early-entry", "late-entry", "moved-stop", "no-stop", "overtraded", "chased", "sized-too-big", "ignored-signal"];
const SETUP_TAGS = ["breakout", "pullback", "reversal", "trend-follow", "range", "news-play"];

type EntryRuleRating = "yes" | "partial" | "no";

function tvSnapshotToImageUrl(url: string): string | null {
  const match = url.match(/tradingview\.com\/x\/([A-Za-z0-9]+)\/?/);
  if (match) return `https://s.tradingview.com/i/${match[1]}.png`;
  return null;
}

function AnalysisText({ text }: { text: string }) {
  // Render **bold** markers and newlines cleanly
  const lines = text.split("\n").filter((l) => l.trim());
  return (
    <div className="space-y-2 text-sm">
      {lines.map((line, i) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i} className="text-foreground/90">
            {parts.map((part, j) =>
              part.startsWith("**") && part.endsWith("**") ? (
                <strong key={j} className="text-primary font-semibold">
                  {part.slice(2, -2)}
                </strong>
              ) : (
                <span key={j}>{part}</span>
              )
            )}
          </p>
        );
      })}
    </div>
  );
}

export default function Trades() {
  const [, navigate] = useLocation();
  const [selectedTradeId, setSelectedTradeId] = useState<number | null>(null);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());

  // Journal state
  const [journalContent, setJournalContent] = useState("");
  const [journalPsychology, setJournalPsychology] = useState("");
  const [journalTags, setJournalTags] = useState<string[]>([]);
  const [meetsEntryRules, setMeetsEntryRules] = useState<EntryRuleRating | null>(null);
  const [chartUrl, setChartUrl] = useState("");
  const [journalSaving, setJournalSaving] = useState(false);

  // AI analysis state
  const [analysisVisible, setAnalysisVisible] = useState(false);

  // Screenshot upload
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  const { data: tradeGroups, isLoading } = trpc.trades.getAllGrouped.useQuery();
  const { data: tradeDetails } = trpc.trades.getById.useQuery(
    { tradeId: selectedTradeId || 0 },
    { enabled: !!selectedTradeId }
  );
  const analyzeOne = trpc.trades.analyzeOne.useMutation();
  const upsertJournal = trpc.journal.upsert.useMutation();
  const uploadScreenshot = trpc.screenshots.upload.useMutation();
  const deleteScreenshot = trpc.screenshots.delete.useMutation();

  // Sync journal state when selected trade changes
  useEffect(() => {
    setAnalysisVisible(false);
    analyzeOne.reset();
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

  const handleAnalyze = () => {
    if (!selectedTradeId) return;
    setAnalysisVisible(true);
    analyzeOne.mutate({ tradeId: selectedTradeId });
  };

  const toggleTag = (tag: string) => {
    setJournalTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleGroupExpand = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const pnlColor = (pnl: number) =>
    pnl >= 0 ? "text-success" : "text-destructive";

  return (
    <TradingDashboardLayout currentPage="Trades">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Trades List ── */}
        <div className="lg:col-span-2">
          <Card className="card-neon">
            <h3 className="text-xl font-bold mb-4">All Trades</h3>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : tradeGroups && tradeGroups.length > 0 ? (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {tradeGroups.map((group) => {
                  const isGroup = group.partials.length > 1;
                  const listKey = group.groupId ?? `solo-${group.primaryTradeId}`;
                  const isExpanded = expandedGroupIds.has(listKey);
                  const isSelected = selectedTradeId === group.primaryTradeId;

                  return (
                    <div key={listKey}>
                      {/* Group / Standalone row */}
                      <button
                        onClick={() => setSelectedTradeId(group.primaryTradeId)}
                        className={`w-full text-left p-4 rounded-lg border transition-all ${
                          isSelected
                            ? "bg-primary bg-opacity-20 border-primary neon-box-glow"
                            : "bg-input bg-opacity-30 border-border hover:border-primary"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            {/* Expand toggle for groups */}
                            {isGroup && (
                              <span
                                role="button"
                                onClick={(e) => toggleGroupExpand(listKey, e)}
                                className="text-muted-foreground hover:text-primary transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </span>
                            )}
                            <span className="font-bold text-primary">{group.instrument}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold ${
                                group.direction === "LONG"
                                  ? "bg-success bg-opacity-20 text-success"
                                  : "bg-destructive bg-opacity-20 text-destructive"
                              }`}
                            >
                              {group.direction}
                            </span>
                            {isGroup && (
                              <span className="px-2 py-0.5 bg-primary bg-opacity-10 text-primary text-xs rounded border border-primary border-opacity-30">
                                {group.partials.length} partials
                              </span>
                            )}
                          </div>
                          <span className={`text-sm font-bold ${pnlColor(group.totalNetPnL)}`}>
                            ${group.totalNetPnL.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground ml-6">
                          <span>Entry: {group.entryPrice}</span>
                          <span>{new Date(group.exitTime).toLocaleDateString()}</span>
                          {new Date(group.entryTime).toLocaleDateString() !==
                            new Date(group.exitTime).toLocaleDateString() && (
                            <span className="text-yellow-500 text-xs">overnight</span>
                          )}
                        </div>
                      </button>

                      {/* Expanded partials */}
                      {isGroup && isExpanded && (
                        <div className="ml-6 mt-1 space-y-1">
                          {group.partials.map((partial, i) => (
                            <div
                              key={partial.id}
                              className="flex items-center justify-between px-3 py-2 rounded border border-border bg-input bg-opacity-20 text-xs"
                            >
                              <span className="text-muted-foreground">
                                TP{i + 1}
                              </span>
                              <span className="text-foreground">
                                {partial.entryPrice} → {partial.exitPrice}
                              </span>
                              <span className="text-muted-foreground">
                                {partial.quantity} ct
                              </span>
                              <span className={`font-bold ${pnlColor(partial.netPnL)}`}>
                                ${partial.netPnL.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
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

        {/* ── Detail Panel ── */}
        <div>
          {selectedTradeId && tradeDetails ? (
            <Card className="card-neon overflow-y-auto max-h-[92vh]">
              <h3 className="text-lg font-bold mb-4 text-primary">Trade Details</h3>

              {/* Trade Info */}
              <div className="space-y-3 text-sm mb-5">
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
                    <p className="text-muted-foreground text-xs">Entry</p>
                    <p className="font-bold">{tradeDetails.trade.entryPrice}</p>
                  </div>
                </div>

                {/* Partials breakdown (when grouped) */}
                {tradeDetails.partials.length > 1 ? (
                  <div>
                    <p className="text-muted-foreground text-xs mb-2">Partial Exits</p>
                    <div className="rounded border border-border overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-input bg-opacity-50">
                          <tr>
                            <th className="text-left px-3 py-1.5 text-muted-foreground font-medium"></th>
                            <th className="text-right px-3 py-1.5 text-muted-foreground font-medium">Exit</th>
                            <th className="text-right px-3 py-1.5 text-muted-foreground font-medium">Qty</th>
                            <th className="text-right px-3 py-1.5 text-muted-foreground font-medium">P&L</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tradeDetails.partials.map((p, i) => (
                            <tr key={p.id} className="border-t border-border">
                              <td className="px-3 py-1.5 text-primary font-semibold">TP{i + 1}</td>
                              <td className="px-3 py-1.5 text-right">{p.exitPrice}</td>
                              <td className="px-3 py-1.5 text-right">{p.quantity}</td>
                              <td className={`px-3 py-1.5 text-right font-bold ${pnlColor(p.netPnL)}`}>
                                ${p.netPnL.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t-2 border-border bg-input bg-opacity-30">
                            <td colSpan={3} className="px-3 py-1.5 text-muted-foreground text-xs">Total</td>
                            <td className={`px-3 py-1.5 text-right font-bold ${pnlColor(tradeDetails.totalNetPnL)}`}>
                              ${tradeDetails.totalNetPnL.toFixed(2)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-input bg-opacity-50 p-3 rounded border border-border text-center">
                    <p className="text-muted-foreground text-xs mb-1">Net P&L</p>
                    <p className={`text-2xl font-bold ${pnlColor(tradeDetails.trade.netPnL)}`}>
                      ${tradeDetails.trade.netPnL}
                    </p>
                  </div>
                )}

                {tradeDetails.trade.strategy && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Strategy</p>
                    <p className="text-sm bg-input bg-opacity-50 p-2 rounded">{tradeDetails.trade.strategy}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Entry time</p>
                    <p>{new Date(tradeDetails.trade.entryTime).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last exit</p>
                    <p>{new Date(tradeDetails.partials[tradeDetails.partials.length - 1].exitTime).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* ── Screenshots ── */}
              <div className="border-t border-border pt-4 mb-5">
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
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />

                <input
                  type="url"
                  value={chartUrl}
                  onChange={(e) => setChartUrl(e.target.value)}
                  placeholder="Paste TradingView snapshot link (tradingview.com/x/...)"
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-xs focus:border-primary focus:ring-1 focus:ring-primary mb-2"
                />

                {chartUrl.trim() && (() => {
                  const imgUrl = tvSnapshotToImageUrl(chartUrl);
                  return imgUrl ? (
                    <div className="relative group rounded-lg overflow-hidden border border-border mb-2">
                      <img src={imgUrl} alt="TradingView chart" className="w-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      <a href={chartUrl} target="_blank" rel="noopener noreferrer"
                        className="absolute top-2 right-2 p-1 bg-black bg-opacity-60 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink className="w-3 h-3 text-white" />
                      </a>
                    </div>
                  ) : (
                    <a href={chartUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-primary hover:underline mb-2">
                      <ImageIcon className="w-3 h-3" />Open chart<ExternalLink className="w-3 h-3" />
                    </a>
                  );
                })()}

                {tradeDetails.screenshots.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {tradeDetails.screenshots.map((s) => (
                      <div key={s.id} className="relative group rounded-lg overflow-hidden border border-border">
                        <img src={s.storageUrl} alt={s.caption || "Screenshot"}
                          className="w-full object-cover aspect-video bg-input" />
                        <button onClick={() => handleDeleteScreenshot(s.id)}
                          className="absolute top-1 right-1 p-0.5 bg-black bg-opacity-70 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {tradeDetails.screenshots.length === 0 && !chartUrl && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Upload screenshots or paste a TradingView snapshot link
                  </p>
                )}
              </div>

              {/* ── AI Analysis ── */}
              <div className="border-t border-border pt-4 mb-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI Coaching</p>
                  <button
                    onClick={handleAnalyze}
                    disabled={analyzeOne.isPending}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs bg-primary bg-opacity-15 text-primary border border-primary border-opacity-40 rounded hover:bg-opacity-25 transition-all disabled:opacity-50"
                  >
                    {analyzeOne.isPending ? (
                      <><Loader2 className="w-3 h-3 animate-spin" />Analyzing...</>
                    ) : (
                      <><Brain className="w-3 h-3" />Analyze Trade</>
                    )}
                  </button>
                </div>

                {analyzeOne.isPending && (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    Reading your trade...
                  </div>
                )}

                {analyzeOne.data?.analysis && (
                  <div className="bg-input bg-opacity-40 border border-border rounded-lg p-3">
                    <AnalysisText text={analyzeOne.data.analysis} />
                  </div>
                )}

                {!analysisVisible && !analyzeOne.data && !analyzeOne.isPending && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Get instant AI coaching feedback on this trade
                  </p>
                )}
              </div>

              {/* ── Journal ── */}
              <div className="border-t border-border pt-4 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trade Journal</p>

                {/* Entry Criteria */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Did this trade meet your entry rules?</p>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: "yes" as const, label: "Yes ✓", activeClass: "bg-success bg-opacity-20 border-success text-success" },
                      { value: "partial" as const, label: "Partial", activeClass: "bg-yellow-500 bg-opacity-20 border-yellow-500 text-yellow-400" },
                      { value: "no" as const, label: "No ✗", activeClass: "bg-destructive bg-opacity-20 border-destructive text-destructive" },
                    ]).map(({ value, label, activeClass }) => (
                      <button
                        key={value}
                        onClick={() => setMeetsEntryRules(meetsEntryRules === value ? null : value)}
                        className={`py-2 text-xs font-bold rounded border transition-all ${
                          meetsEntryRules === value
                            ? activeClass
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
                  <p className="text-xs text-muted-foreground mb-1">Emotions</p>
                  <div className="flex flex-wrap gap-1">
                    {EMOTION_TAGS.map((tag) => (
                      <button key={tag} onClick={() => toggleTag(tag)}
                        className={`px-2 py-0.5 rounded text-xs border transition-all ${
                          journalTags.includes(tag)
                            ? "bg-primary border-primary text-primary-foreground"
                            : "bg-transparent border-border text-muted-foreground hover:border-primary"
                        }`}>
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mistake Tags */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Mistakes</p>
                  <div className="flex flex-wrap gap-1">
                    {MISTAKE_TAGS.map((tag) => (
                      <button key={tag} onClick={() => toggleTag(tag)}
                        className={`px-2 py-0.5 rounded text-xs border transition-all ${
                          journalTags.includes(tag)
                            ? "bg-destructive border-destructive text-destructive-foreground"
                            : "bg-transparent border-border text-muted-foreground hover:border-destructive"
                        }`}>
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Setup Tags */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Setup</p>
                  <div className="flex flex-wrap gap-1">
                    {SETUP_TAGS.map((tag) => (
                      <button key={tag} onClick={() => toggleTag(tag)}
                        className={`px-2 py-0.5 rounded text-xs border transition-all ${
                          journalTags.includes(tag)
                            ? "bg-primary/30 border-primary text-primary"
                            : "bg-transparent border-border text-muted-foreground hover:border-primary"
                        }`}>
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* What happened */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">What happened</p>
                  <textarea value={journalContent} onChange={(e) => setJournalContent(e.target.value)}
                    placeholder="Walk through the trade — setup, execution, exit. What did you see?"
                    rows={3}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary resize-none" />
                </div>

                {/* Psychology */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Psychology</p>
                  <textarea value={journalPsychology} onChange={(e) => setJournalPsychology(e.target.value)}
                    placeholder="How were you feeling? Revenge trading? Did fear or greed drive a decision? What will you do differently?"
                    rows={3}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary resize-none" />
                </div>

                <Button onClick={handleSaveJournal} disabled={journalSaving}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm">
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
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
