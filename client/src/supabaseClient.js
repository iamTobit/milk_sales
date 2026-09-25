import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fvkneilqrxkkbfttbthh.supabase.co';
// Public anon key — safe to keep in the app's code.
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2a25laWxxcnhra2JmdHRidGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMDE3NTAsImV4cCI6MjEwNTg3Nzc1MH0.CMNi7AHv2F7WCZMpe7vw_J0flnbFhOpORVF5X4NbZjg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
