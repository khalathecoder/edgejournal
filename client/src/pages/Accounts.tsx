import { useState } from "react";
import { trpc } from "@/lib/trpc";
import TradingDashboardLayout from "@/components/TradingDashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";

export default function Accounts() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    accountName: "",
    firmName: "",
    accountNumber: "",
  });

  // Fetch accounts
  const { data: accounts, refetch } = trpc.accounts.getAll.useQuery();

  // Mutations
  const createAccount = trpc.accounts.create.useMutation();
  const deleteAccount = trpc.accounts.delete.useMutation();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.accountName || !formData.firmName) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      await createAccount.mutateAsync({
        accountName: formData.accountName,
        firmName: formData.firmName,
        accountNumber: formData.accountNumber,
      });

      toast.success("Account created successfully!");
      setFormData({ accountName: "", firmName: "", accountNumber: "" });
      setShowForm(false);
      refetch();
    } catch (error) {
      toast.error("Failed to create account");
      console.error(error);
    }
  };

  const handleDelete = async (accountId: number) => {
    if (window.confirm("Are you sure you want to delete this account?")) {
      try {
        await deleteAccount.mutateAsync({ accountId });
        toast.success("Account deleted");
        refetch();
      } catch (error) {
        toast.error("Failed to delete account");
        console.error(error);
      }
    }
  };

  return (
    <TradingDashboardLayout currentPage="Accounts">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Prop Firm Accounts</h2>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Account
          </Button>
        </div>

        {/* Create Form */}
        {showForm && (
          <Card className="card-neon">
            <h3 className="text-lg font-bold mb-4">Create New Account</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Account Name *
                </label>
                <input
                  type="text"
                  name="accountName"
                  value={formData.accountName}
                  onChange={handleChange}
                  placeholder="e.g., Main Account"
                  className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Firm Name *
                </label>
                <input
                  type="text"
                  name="firmName"
                  value={formData.firmName}
                  onChange={handleChange}
                  placeholder="e.g., Apex Trader Funding"
                  className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Account Number (Optional)
                </label>
                <input
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleChange}
                  placeholder="e.g., ATF-12345"
                  className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={createAccount.isPending}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  {createAccount.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowForm(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Accounts List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts && accounts.length > 0 ? (
            accounts.map((account) => (
              <Card key={account.id} className="card-neon-hover">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-primary">
                      {account.accountName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {account.firmName}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(account.id)}
                    disabled={deleteAccount.isPending}
                    className="p-2 hover:bg-input rounded-lg transition-colors text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {account.accountNumber && (
                  <div className="mb-4 p-2 bg-input bg-opacity-50 rounded text-xs text-muted-foreground">
                    <span className="font-semibold">Account #:</span> {account.accountNumber}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {account.isActive ? (
                      <span className="text-success">● Active</span>
                    ) : (
                      <span className="text-muted-foreground">● Inactive</span>
                    )}
                  </span>
                  <span>
                    Created {new Date(account.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </Card>
            ))
          ) : (
            <div className="col-span-full card-neon text-center py-12">
              <p className="text-muted-foreground mb-4">No accounts yet</p>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Account
              </Button>
            </div>
          )}
        </div>
      </div>
    </TradingDashboardLayout>
  );
}
