import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut } from "lucide-react";
import { useLocation } from "wouter";

interface TradingDashboardLayoutProps {
  children: React.ReactNode;
  currentPage: string;
}

export default function TradingDashboardLayout({
  children,
  currentPage,
}: TradingDashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  const navItems = [
    { label: "Dashboard", path: "/", icon: "📊" },
    { label: "Log Trade", path: "/log-trade", icon: "📝" },
    { label: "Accounts", path: "/accounts", icon: "💼" },
    { label: "Trades", path: "/trades", icon: "📈" },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:static md:z-auto accent-line-right`}
      >
        <div className="flex flex-col h-full p-6">
          {/* Logo */}
          <div className="mb-8">
            <h1 className="text-2xl font-black neon-glow-strong">TradeZella</h1>
            <p className="text-muted-foreground text-sm mt-1">Trading Journal</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${
                  currentPage === item.path
                    ? "bg-primary text-primary-foreground neon-box-glow"
                    : "hover:bg-input text-foreground"
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          {/* User Info */}
          <div className="border-t border-border pt-4 space-y-3">
            <div className="text-sm">
              <p className="text-muted-foreground">Logged in as</p>
              <p className="font-semibold truncate">{user?.name || user?.email}</p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between md:justify-end accent-line-left">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 hover:bg-input rounded-lg transition-colors"
          >
            {sidebarOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
          <div className="text-right">
            <h2 className="text-lg font-bold neon-glow">{currentPage}</h2>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
