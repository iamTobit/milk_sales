const API_BASE = "https://setting-untimely-flyover.ngrok-free.dev";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  created_at: string;
  last_purchase?: string | null;
  total_liters?: number;
  total_paid?: number;
}

export interface Sale {
  id: number;
  customer_id: number;
  customer_name: string;
  liters: number;
  price_per_liter: number;
  amount_paid: number;
  sold_at: string;
}

export interface DailySummary {
  date: string;
  number_of_sales: number;
  total_liters: number;
  total_revenue: number;
}

export const api = {
  listCustomers: () => request<Customer[]>("/api/customers"),
  addCustomer: (data: { name: string; phone: string }) =>
    request<Customer>("/api/customers", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteCustomer: (id: number) =>
    request<{ deleted: boolean; id: number }>(`/api/customers/${id}`, {
      method: "DELETE",
    }),
  listSales: () => request<Sale[]>("/api/sales"),
  addSale: (data: {
    customer_id: number;
    liters: number;
    price_per_liter: number;
    amount_paid: number;
  }) =>
    request<Sale>("/api/sales", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  dailySummary: (date?: string) =>
    request<DailySummary>(
      `/api/summary/daily${date ? `?date=${date}` : ""}`,
    ),
};
