// Valores públicos do Supabase (safe para o client). Preferimos env vars,
// com fallback para o projeto conhecido para que o build nunca quebre.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://srszapxkzmflqdavxvmt.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_90pStRmCk2rtli8u2xy-JQ_g78iENIA";
