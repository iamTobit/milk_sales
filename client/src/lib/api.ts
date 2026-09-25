import { supabase } from '../supabaseClient';

export interface Customer { /* same as before */ }
export interface Sale { /* same */ }
export interface DailySummary { /* same */ }

export const api = {
  listCustomers: async (): Promise<Customer[]> => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  addCustomer: async (input: { name: string; phone: string }): Promise<Customer> => {
    const { data, error } = await supabase
      .from('customers')
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  deleteCustomer: async (id: number) => {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw error;
    return { deleted: true, id };
  },

  listSales: async (): Promise<Sale[]> => {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('sold_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  addSale: async (input: {
    customer_id: number;
    liters: number;
    price_per_liter: number;
    amount_paid: number;
  }): Promise<Sale> => {
    const { data, error } = await supabase
      .from('sales')
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  dailySummary: async (date?: string): Promise<DailySummary> => {
    const day = date ?? new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('sales')
      .select('liters, amount_paid')
      .gte('sold_at', `${day}T00:00:00`)
      .lt('sold_at', `${day}T23:59:59.999`);
    if (error) throw error;
    const rows = data ?? [];
    return {
      date: day,
      number_of_sales: rows.length,
      total_liters: rows.reduce((s, r) => s + Number(r.liters), 0),
      total_revenue: rows.reduce((s, r) => s + Number(r.amount_paid), 0),
    };
  },
};