import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY; // Service role key

// Regular client for normal operations
export const supabaseClient = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
);

// Service client for admin operations and tests (bypasses RLS)
export const supabaseServiceClient = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey, // Fallback to anon key if service key not available
);
