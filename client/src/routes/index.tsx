import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import {
  Milk,
  Users,
  ShoppingCart,
  Trash2,
  Plus,
  RefreshCw,
  Droplets,
  Banknote,
  Receipt,
  Phone,
} from "lucide-react";
import { api, type Customer } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Milk Tracker — Daily Milk Sales Dashboard" },
      {
        name: "description",
        content:
          "Track milk sales, customers, liters sold and daily revenue summaries.",
      },
      { property: "og:title", content: "Milk Tracker — Daily Milk Sales Dashboard" },
      {
        property: "og:description",
        content:
          "Track milk sales, customers, liters sold and daily revenue summaries.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function fmtMoney(n: number) {
  return `KES ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Dashboard() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<string | null>(null);

  const customers = useQuery({
    queryKey: ["customers"],
    queryFn: api.listCustomers,
  });
  const sales = useQuery({ queryKey: ["sales"], queryFn: api.listSales });
  const summary = useQuery({
    queryKey: ["summary"],
    queryFn: () => api.dailySummary(),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    queryClient.invalidateQueries({ queryKey: ["sales"] });
    queryClient.invalidateQueries({ queryKey: ["summary"] });
  };

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // --- Add customer ---
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const addCustomer = useMutation({
    mutationFn: api.addCustomer,
    onSuccess: () => {
      setName("");
      setPhone("");
      notify("Customer added");
      invalidateAll();
    },
    onError: (e) => notify(`Error: ${e.message}`),
  });

  const deleteCustomer = useMutation({
    mutationFn: api.deleteCustomer,
    onSuccess: () => {
      notify("Customer deleted");
      invalidateAll();
    },
    onError: (e) => notify(`Error: ${e.message}`),
  });

  // --- Add sale ---
  const [saleCustomerId, setSaleCustomerId] = useState("");
  const [liters, setLiters] = useState("");
  const [price, setPrice] = useState("60");
  const [paid, setPaid] = useState("");

  const addSale = useMutation({
    mutationFn: api.addSale,
    onSuccess: () => {
      setLiters("");
      setPaid("");
      notify("Sale recorded");
      invalidateAll();
    },
    onError: (e) => notify(`Error: ${e.message}`),
  });

  const submitCustomer = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addCustomer.mutate({ name: name.trim(), phone: phone.trim() });
  };

  const submitSale = (e: FormEvent) => {
    e.preventDefault();
    const l = parseFloat(liters);
    const p = parseFloat(price);
    const a = paid.trim() === "" ? l * p : parseFloat(paid);
    if (!saleCustomerId || !l || !p) return;
    addSale.mutate({
      customer_id: Number(saleCustomerId),
      liters: l,
      price_per_liter: p,
      amount_paid: a,
    });
  };

  const loading =
    customers.isLoading || sales.isLoading || summary.isLoading;
  const loadError = customers.error || sales.error || summary.error;

  const sortedSales = [...(sales.data ?? [])].sort(
    (a, b) => new Date(b.sold_at).getTime() - new Date(a.sold_at).getTime(),
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Milk className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Milk Tracker</h1>
              <p className="text-xs text-muted-foreground">
                Daily sales & customer records
              </p>
            </div>
          </div>
          <button
            onClick={invalidateAll}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {toast && (
          <div className="animate-fade-up rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            {toast}
          </div>
        )}

        {loadError && (
          <div className="rounded-lg bg-destructive px-4 py-3 text-sm text-destructive-foreground">
            Could not reach the backend: {loadError.message}
          </div>
        )}

        {/* Daily summary */}
        <section className="animate-fade-up">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Today's Summary {summary.data && `· ${summary.data.date}`}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryCard
              icon={<Droplets className="h-5 w-5" />}
              label="Liters sold"
              value={
                summary.data
                  ? `${summary.data.total_liters.toLocaleString()} L`
                  : "—"
              }
            />
            <SummaryCard
              icon={<Banknote className="h-5 w-5" />}
              label="Revenue"
              value={summary.data ? fmtMoney(summary.data.total_revenue) : "—"}
            />
            <SummaryCard
              icon={<Receipt className="h-5 w-5" />}
              label="Number of sales"
              value={summary.data ? String(summary.data.number_of_sales) : "—"}
            />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Record a sale */}
          <section className="animate-fade-up rounded-2xl border border-border bg-card p-5 card-shadow lg:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Record a Sale</h2>
            </div>
            <form onSubmit={submitSale} className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Customer</span>
                <select
                  value={saleCustomerId}
                  onChange={(e) => setSaleCustomerId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select customer…</option>
                  {(customers.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Liters</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={liters}
                    onChange={(e) => setLiters(e.target.value)}
                    required
                    placeholder="e.g. 2.5"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Price / liter</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
              </div>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">
                  Amount paid{" "}
                  <span className="font-normal text-muted-foreground">
                    (leave blank = liters × price)
                  </span>
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paid}
                  onChange={(e) => setPaid(e.target.value)}
                  placeholder={
                    liters && price
                      ? String(parseFloat(liters) * parseFloat(price) || "")
                      : ""
                  }
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <button
                type="submit"
                disabled={addSale.isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {addSale.isPending ? "Saving…" : "Add Sale"}
              </button>
            </form>
          </section>

          {/* Sales list */}
          <section className="animate-fade-up rounded-2xl border border-border bg-card p-5 card-shadow lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Recent Sales</h2>
              </div>
              <span className="text-xs text-muted-foreground">
                {sales.data?.length ?? 0} total
              </span>
            </div>
            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {loading && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Loading…
                </p>
              )}
              {!loading && sortedSales.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No sales yet.
                </p>
              )}
              {sortedSales.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{s.customer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtTime(s.sold_at)} · {s.liters} L @{" "}
                      {fmtMoney(s.price_per_liter)}/L
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-primary">
                    {fmtMoney(s.amount_paid)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Customers */}
        <section className="animate-fade-up rounded-2xl border border-border bg-card p-5 card-shadow">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Customers</h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {customers.data?.length ?? 0} registered
            </span>
          </div>

          <form
            onSubmit={submitCustomer}
            className="mb-4 flex flex-col gap-2 sm:flex-row"
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Customer name"
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone (optional)"
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={addCustomer.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {addCustomer.isPending ? "Adding…" : "Add Customer"}
            </button>
          </form>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(customers.data ?? []).map((c: Customer) => (
              <div
                key={c.id}
                className="flex items-start justify-between rounded-xl border border-border bg-background px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  {c.phone && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {c.phone}
                    </p>
                  )}
                  {typeof c.total_liters === "number" && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {c.total_liters.toLocaleString()} L total ·{" "}
                      {fmtMoney(c.total_paid ?? 0)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (confirm(`Delete ${c.name}?`)) deleteCustomer.mutate(c.id);
                  }}
                  className="ml-2 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
                  aria-label={`Delete ${c.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 card-shadow">
      <div className="flex items-center gap-2 text-primary">{icon}</div>
      <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
