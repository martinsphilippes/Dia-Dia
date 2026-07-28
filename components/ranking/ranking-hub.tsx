"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconBack } from "@/components/icons";
import type { LeagueSummary, OpenLeague } from "@/lib/types";

export function RankingHub() {
  const supabase = createClient();
  const router = useRouter();
  const [mine, setMine] = useState<LeagueSummary[]>([]);
  const [open, setOpen] = useState<OpenLeague[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: m }, { data: o }] = await Promise.all([
      supabase.rpc("get_my_leagues"),
      supabase.rpc("get_open_leagues"),
    ]);
    setMine((m as unknown as LeagueSummary[]) ?? []);
    setOpen((o as unknown as OpenLeague[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function createLeague(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setError("Dê um nome à liga.");
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.rpc("create_league", {
      p_name: name.trim(),
      p_city: city.trim() || null,
    });
    setBusy(false);
    if (error) return setError(error.message);
    router.push(`/ranking/${data}`);
  }

  async function join(id: string) {
    setBusy(true);
    await supabase.rpc("join_league", { p_league_id: id });
    setBusy(false);
    router.push(`/ranking/${id}`);
  }

  const notMember = open.filter((l) => !l.am_member);

  return (
    <main className="min-h-[100dvh] bg-amber-50/40">
      <header className="bg-gradient-to-br from-amber-500 to-amber-700 px-5 pb-10 pt-6 text-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/inicio" className="flex items-center gap-1 text-sm text-amber-50">
            <IconBack className="h-5 w-5" /> Início
          </Link>
          <form action="/auth/signout" method="post">
            <button className="rounded-full px-3 py-1.5 text-sm text-amber-50 ring-1 ring-white/25">
              Sair
            </button>
          </form>
        </div>
        <div className="mx-auto mt-6 max-w-2xl">
          <h1 className="text-3xl font-extrabold">🏆 Ranking</h1>
          <p className="mt-1 text-amber-50">
            Ligas de clubes e grupos. Jogue as rodadas e suba na classificação.
          </p>
        </div>
      </header>

      <div className="mx-auto -mt-5 max-w-2xl px-5 pb-24">
        {/* Minhas ligas */}
        <section className="rounded-3xl bg-white p-5 shadow-card">
          <h2 className="text-lg font-bold">Minhas ligas</h2>
          {loading ? (
            <p className="mt-3 text-sm text-slate-400">Carregando...</p>
          ) : mine.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              Você ainda não participa de nenhuma liga. Crie a sua ou entre numa
              aberta abaixo.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {mine.map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/ranking/${l.id}`}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-amber-200"
                  >
                    <div>
                      <div className="font-semibold">{l.name}</div>
                      <div className="text-xs text-slate-500">
                        {l.city ? `${l.city} · ` : ""}
                        {l.member_count} jogador{l.member_count === 1 ? "" : "es"}
                      </div>
                    </div>
                    {l.is_organizer && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        organizador
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {/* Criar liga */}
          {creating ? (
            <form onSubmit={createLeague} className="mt-4 space-y-3 rounded-2xl bg-amber-50 p-4">
              <input
                className="input"
                placeholder="Nome da liga (ex.: Clube X 2026)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className="input"
                placeholder="Cidade (opcional)"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1" disabled={busy}>
                  {busy ? "Criando..." : "Criar liga"}
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setCreating(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="mt-4 w-full rounded-2xl border-2 border-dashed border-amber-300 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
            >
              + Criar uma liga
            </button>
          )}
        </section>

        {/* Inscrições abertas */}
        {notMember.length > 0 && (
          <section className="mt-6 rounded-3xl bg-white p-5 shadow-card">
            <h2 className="text-lg font-bold">Inscrições abertas</h2>
            <ul className="mt-3 space-y-2">
              {notMember.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <div>
                    <div className="font-semibold">{l.name}</div>
                    <div className="text-xs text-slate-500">
                      {l.city ? `${l.city} · ` : ""}org.: {l.organizer_name} ·{" "}
                      {l.member_count} jogadores
                    </div>
                  </div>
                  <button
                    onClick={() => join(l.id)}
                    className="btn-primary text-sm"
                    disabled={busy}
                  >
                    Entrar
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
