import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://fncfbywkemsxwuiowxxe.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuY2ZieXdrZW1zeHd1aW93eHhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NjgyNzUsImV4cCI6MjA4MjQ0NDI3NX0.wlccZnaj9Awd03LkDSaSlZFqIiSSOgOedX-aCsqeLek";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: localStorage,
  },
});

export type { User, Session } from '@supabase/supabase-js';
