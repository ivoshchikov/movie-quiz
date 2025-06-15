import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://vgjfbcihppxbtrjcxoci.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnamZiY2locHB4YnRyamN4b2NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MTE0MTUsImV4cCI6MjA2NTQ4NzQxNX0.lIhRN58OZJuhNBCkE1CRzzfEiU601rrKmlJIdqScHpA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
