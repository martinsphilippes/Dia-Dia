"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

// Cliente do Supabase para o browser. As respostas são tipadas nos
// pontos de consumo com os tipos de domínio em lib/types.ts.
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
