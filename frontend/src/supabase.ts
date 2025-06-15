import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = "https://vgjfbcihppxbtrjcxoci.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      // скопируй целиком из Settings → API

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
