import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  // Redirect to dashboard if authenticated
  useEffect(() => {
    if (isAuthenticated && !loading) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl text-center space-y-8">
        {/* Logo */}
        <div>
          <h1 className="text-6xl font-black neon-glow-strong mb-2">TradeZella</h1>
          <p className="text-xl text-muted-foreground">
            Your Personal Trading Journal
          </p>
        </div>

        {/* Description */}
        <div className="space-y-4 text-lg">
          <p className="text-foreground">
            Track your trades, analyze your performance, and improve your trading with our cinematic neon-noir trading journal.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="card-neon">
              <div className="text-2xl mb-2">📊</div>
              <p>Real-time P&L tracking</p>
            </div>
            <div className="card-neon">
              <div className="text-2xl mb-2">📝</div>
              <p>Journal your trades</p>
            </div>
            <div className="card-neon">
              <div className="text-2xl mb-2">💼</div>
              <p>Multi-account support</p>
            </div>
            <div className="card-neon">
              <div className="text-2xl mb-2">📈</div>
              <p>Performance analytics</p>
            </div>
          </div>
        </div>

        {/* Login Button */}
        <div>
          <Button
            onClick={() => (window.location.href = getLoginUrl())}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-3 text-lg neon-glow"
          >
            Start Trading Journal
          </Button>
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground">
          No subscription fees. Track unlimited trades. Forever free.
        </p>
      </div>
    </div>
  );
}
