"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconBack } from "@/components/icons";
import {
  LeagueSummary,
  OpenLeague,
  OpenTournament,
  TOURNAMENT_STATUS_LABELS,
  TournamentSummary,
} from "@/lib/types";

export function RankingHub({ isOwner }: { isOwner: boolean }) {
  const supabase = createClient();
  const router = useRouter();
  const [mine, setMine] = useState<LeagueSummary[]>([]);
  const [open, setOpen] = useState<OpenLeague[]>([]);
  const [myTours, setMyTours] = useState<TournamentSummary[]>([]);
  const [openTours, setOpenTours] = useState<OpenTournament[]>([]);
  const [loading, setLoading] = useState(true);

  const [creating, setCreating] = useState<null | "league" | "tournament">(null);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: m }, { data: o }, { data: mt }, { data: ot }] = await Promise.all([
      supabase.rpc("get_my_leagues"),
      supabase.rpc("get_open_leagues"),
      supabase.rpc("get_my_tournaments"),
      supabase.rpc("get_open_tournaments"),
    ]);
    setMine((m as unknown as LeagueSummary[]) ?? []);
    setOpen((o as unknown as OpenLeague[]) ?? []);
    setMyTours((mt as unknown as TournamentSummary[]) ?? []);
    setOpenTours((ot as unknown as OpenTournament[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setError("Dê um nome.");
    setBusy(true);
    setError(null);
    if (creating === "league") {
      const { data, error } = await supabase.rpc("create_league", {
        p_name: name.trim(),
        p_city: city.trim() || null,
      });
      setBusy(false);
      if (error) return setError(error.message);
      router.push(`/ranking/${data}`);
    } else {
      const { data, error } = await supabase.rpc("create_tournament", {
        p_name: name.trim(),
        p_city: city.trim() || null,
      });
      setBusy(false);
      if (error) return setError(error.message);
      router.push(`/ranking/torneio/${data}`);
    }
  }

  async function join(id: string) {
    setBusy(true);
    await supabase.rpc("join_league", { p_league_id: id });
    setBusy(false);
    router.push(`/ranking/${id}`);
  }

  const notMember = open.filter((l) => !l.am_member);
  const myTourIds = new Set(myTours.map((t) => t.id));
  const openToursToShow = openTours.filter((t) => !myTourIds.has(t.id));

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
            Ligas e torneios de clubes e grupos. Jogue e suba na classificação.
          </p>
        </div>
      </header>

      <div className="mx-auto -mt-5 max-w-2xl space-y-6 px-5 pb-24">
        {/* Ligas */}
        <section className="rounded-3xl bg-white p-5 shadow-card">
          <h2 className="text-lg font-bold">Minhas ligas</h2>
          {loading ? (
            <p className="mt-3 text-sm text-slate-400">Carregando...</p>
          ) : mine.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              Você ainda não participa de nenhuma liga.
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
                    {l.is_organizer && <Badge>organizador</Badge>}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {isOwner &&
            (creating === "league" ? (
              <CreateForm
                label="liga"
                name={name}
                city={city}
                setName={setName}
                setCity={setCity}
                busy={busy}
                error={error}
                onSubmit={submitCreate}
                onCancel={() => setCreating(null)}
              />
            ) : (
              <DashedButton onClick={() => { setCreating("league"); setName(""); setCity(""); setError(null); }}>
                + Criar uma liga (ranking contínuo)
              </DashedButton>
            ))}
        </section>

        {/* Ligas abertas */}
        {notMember.length > 0 && (
          <section className="rounded-3xl bg-white p-5 shadow-card">
            <h2 className="text-lg font-bold">Ligas abertas</h2>
            <ul className="mt-3 space-y-2">
              {notMember.map((l) => (
                <li key={l.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div>
                    <div className="font-semibold">{l.name}</div>
                    <div className="text-xs text-slate-500">
                      {l.city ? `${l.city} · ` : ""}org.: {l.organizer_name} · {l.member_count} jogadores
                    </div>
                  </div>
                  <button onClick={() => join(l.id)} className="btn-primary text-sm" disabled={busy}>
                    Entrar
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Torneios */}
        <section className="rounded-3xl bg-white p-5 shadow-card">
          <h2 className="text-lg font-bold">Meus torneios</h2>
          {loading ? (
            <p className="mt-3 text-sm text-slate-400">Carregando...</p>
          ) : myTours.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Você ainda não está em nenhum torneio.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {myTours.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/ranking/torneio/${t.id}`}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-amber-200"
                  >
                    <div>
                      <div className="font-semibold">{t.name}</div>
                      <div className="text-xs text-slate-500">
                        {t.city ? `${t.city} · ` : ""}
                        {TOURNAMENT_STATUS_LABELS[t.status]}
                      </div>
                    </div>
                    {t.is_organizer && <Badge>organizador</Badge>}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {isOwner &&
            (creating === "tournament" ? (
              <CreateForm
                label="torneio"
                name={name}
                city={city}
                setName={setName}
                setCity={setCity}
                busy={busy}
                error={error}
                onSubmit={submitCreate}
                onCancel={() => setCreating(null)}
              />
            ) : (
              <DashedButton onClick={() => { setCreating("tournament"); setName(""); setCity(""); setError(null); }}>
                + Criar um torneio (chaveamento)
              </DashedButton>
            ))}
        </section>

        {/* Inscrições abertas */}
        {openToursToShow.length > 0 && (
          <section className="rounded-3xl bg-white p-5 shadow-card">
            <h2 className="text-lg font-bold">Inscrições abertas</h2>
            <ul className="mt-3 space-y-2">
              {openToursToShow.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/ranking/torneio/${t.id}`}
                    className="flex items-center justify-between rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 transition hover:border-amber-300"
                  >
                    <div>
                      <div className="font-semibold">{t.name}</div>
                      <div className="text-xs text-slate-500">
                        {t.city ? `${t.city} · ` : ""}org.: {t.organizer_name} · {Number(t.entry_count)} inscritos
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-amber-700">Inscrever →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
      {children}
    </span>
  );
}

function DashedButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="mt-4 w-full rounded-2xl border-2 border-dashed border-amber-300 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
    >
      {children}
    </button>
  );
}

function CreateForm({
  label,
  name,
  city,
  setName,
  setCity,
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  label: string;
  name: string;
  city: string;
  setName: (v: string) => void;
  setCity: (v: string) => void;
  busy: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3 rounded-2xl bg-amber-50 p-4">
      <input className="input" placeholder={`Nome do ${label}`} value={name} onChange={(e) => setName(e.target.value)} />
      <input className="input" placeholder="Cidade (opcional)" value={city} onChange={(e) => setCity(e.target.value)} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary flex-1" disabled={busy}>
          {busy ? "Criando..." : `Criar ${label}`}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
