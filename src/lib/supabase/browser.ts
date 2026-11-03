"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function browserSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  client ??= createClient(url, key);
  return client;
}

export async function accessToken(): Promise<string | null> {
  const { data } = (await browserSupabase()?.auth.getSession()) ?? { data: { session: null } };
  return data.session?.access_token ?? null;
}
