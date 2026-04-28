import { useState } from "react";
import { trpc } from "@/lib/trpc";
import TradingDashboardLayout from "@/components/TradingDashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function LogTrade() {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);

  // Fetch accounts
  const { data: accounts } = trpc.accounts.getAll.useQuery();

  // Form state
  const [formData, setFormData] = useState({
    propFirmAccountId: accounts?.[0]?.id || 0,
    instrument: "",
    direction: "LONG" as "LONG" | "SHORT",
    entryPrice: "",
    exitPrice: "",
    quantity: "",
    entryTime: "",
    exitTime: "",
    strategy: "",
  });

  const createTrade = trpc.trades.create.useMutation();

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const calculatePnL = () => {
    const entry = parseFloat(formData.entryPrice);
    const exit = parseFloat(formData.exitPrice);
    const qty = parseInt(formData.quantity);

    if (isNaN(entry) || isNaN(exit) || isNaN(qty)) return 0;

    const priceDiff = exit - entry;
    const direction = formData.direction === "LONG" ? 1 : -1;
    return priceDiff * qty * direction;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.instrument || !formData.entryPrice || !formData.exitPrice) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!formData.propFirmAccountId) {
      toast.error("Please select an account");
      return;
    }

    setLoading(true);

    try {
      const netPnL = calculatePnL();

      await createTrade.mutateAsync({
        propFirmAccountId: formData.propFirmAccountId,
        instrument: formData.instrument,
        direction: formData.direction,
        entryPrice: parseFloat(formData.entryPrice),
        exitPrice: parseFloat(formData.exitPrice),
        quantity: parseInt(formData.quantity),
        entryTime: new Date(formData.entryTime),
        exitTime: new Date(formData.exitTime),
        grossPnL: netPnL,
        netPnL: netPnL,
        strategy: formData.strategy,
      });

      toast.success("Trade logged successfully!");
      setFormData({
        propFirmAccountId: formData.propFirmAccountId,
        instrument: "",
        direction: "LONG",
        entryPrice: "",
        exitPrice: "",
        quantity: "",
        entryTime: "",
        exitTime: "",
        strategy: "",
      });

      // Navigate to dashboard
      setTimeout(() => navigate("/"), 1000);
    } catch (error) {
      toast.error("Failed to log trade");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TradingDashboardLayout currentPage="Log Trade">
      <div className="max-w-2xl mx-auto">
        <Card className="card-neon">
          <h2 className="text-2xl font-bold mb-6">Log a New Trade</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Account Selection */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Trading Account *
              </label>
              <select
                name="propFirmAccountId"
                value={formData.propFirmAccountId}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {accounts?.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountName} ({acc.firmName})
                  </option>
                ))}
              </select>
            </div>

            {/* Instrument */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Instrument *
              </label>
              <input
                type="text"
                name="instrument"
                value={formData.instrument}
                onChange={handleChange}
                placeholder="e.g., ES, NQ, AAPL"
                className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Direction */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Direction *
              </label>
              <div className="flex gap-4">
                {(["LONG", "SHORT"] as const).map((dir) => (
                  <label key={dir} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="direction"
                      value={dir}
                      checked={formData.direction === dir}
                      onChange={handleChange}
                      className="w-4 h-4"
                    />
                    <span className={dir === "LONG" ? "text-success" : "text-destructive"}>
                      {dir}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Entry & Exit Prices */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Entry Price *
                </label>
                <input
                  type="number"
                  name="entryPrice"
                  value={formData.entryPrice}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Exit Price *
                </label>
                <input
                  type="number"
                  name="exitPrice"
                  value={formData.exitPrice}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Quantity *
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="0"
                className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Entry & Exit Times */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Entry Time *
                </label>
                <input
                  type="datetime-local"
                  name="entryTime"
                  value={formData.entryTime}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Exit Time *
                </label>
                <input
                  type="datetime-local"
                  name="exitTime"
                  value={formData.exitTime}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Strategy */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Strategy (Optional)
              </label>
              <textarea
                name="strategy"
                value={formData.strategy}
                onChange={handleChange}
                placeholder="Describe your trading strategy for this trade..."
                rows={3}
                className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* P&L Preview */}
            {formData.entryPrice && formData.exitPrice && formData.quantity && (
              <div className="bg-input bg-opacity-50 p-4 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground mb-2">Estimated P&L:</p>
                <p
                  className={`text-2xl font-bold ${
                    calculatePnL() >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  ${calculatePnL().toFixed(2)}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Logging Trade...
                </>
              ) : (
                "Log Trade"
              )}
            </Button>
          </form>
        </Card>
      </div>
    </TradingDashboardLayout>
  );
}
