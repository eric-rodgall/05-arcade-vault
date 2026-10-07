import { createClient } from "@supabase/supabase-js";

// Cliente con la secret key: omite RLS. Solo para Route Handlers de escritura.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error("CONFIG_FALTANTE");
  }

  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
