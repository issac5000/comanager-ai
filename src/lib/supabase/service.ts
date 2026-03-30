import { createClient } from "@supabase/supabase-js";
import { Database } from "@/lib/types/database";

/**
 * Service-role Supabase client. Bypasses RLS.
 * Only use server-side for background jobs (webhooks, crons).
 */
export function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
