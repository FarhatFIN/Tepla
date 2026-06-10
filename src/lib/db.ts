import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedPublicClient: SupabaseClient | null = null;
let cachedServiceClient: SupabaseClient | null = null;

export const getPublicSupabaseClient = (): SupabaseClient => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are not configured.");
  }
  if (!cachedPublicClient) {
    cachedPublicClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    });
  }
  return cachedPublicClient;
};

export const getServiceSupabaseClient = (): SupabaseClient => {
  if (typeof window !== "undefined") {
    throw new Error("Service role Supabase client must not be used in the browser.");
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase environment variables are not configured.");
  }
  if (!cachedServiceClient) {
    cachedServiceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
      },
    });
  }

  return cachedServiceClient;
};

