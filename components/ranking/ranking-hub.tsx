"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NearbyLeagues, MyInvites } from "@/components/ranking/discovery";
import { NotificationsBell } from "@/components/matchpoint/notifications-bell";
import { cachedRpc, invalidateCache } from "@/lib/cache";
import { PlaceAutocomplete } from "@/components/place-autocomplete";

const CLUBS_CACHE_KEY = "mp:my_clubs";
import {
  LeagueSummary,
  MyClub,
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
  const [requested, setRequested] = useState<Set<string>>(new Set());

  // clube ao qual o ranking pertence
  const [clubs, setClubs] = useState<MyClub[]>([]);
  const [clubMode, setClubMode] = useState<"existing" | "new">("new");
  const [clubId, setClubId] = useState("");
  const [newClub, setNewClub] = useState("");
  const [bookingReq, setBookingReq] = useState(true);

  const load = useCallback(async () => {
    const [{ data: m }, { data: o }, { data: mt }, { data: ot }, cl] = await Promise.all([
      supabase.rpc("get_my_leagues"),
      supabase.rpc("get_open_leagues"),
      supabase.rpc("get_my_tournaments"),
      supabase.rpc("get_open_tournaments"),
      // clubes mudam pouco na sessão → cache curto com revalidação
      cachedRpc<MyClub[]>(CLUBS_CACHE_KEY, 60000, async () => {
        const { data } = await supabase.rpc("get_my_clubs");
        return (data as unknown as MyClub[]) ?? [];
      }),
    ]);
    setMine((m as unknown as LeagueSummary[]) ?? []);
    setOpen((o as unknown as OpenLeague[]) ?? []);
    setMyTours((mt as unknown as TournamentSummary[]) ?? []);
    setOpenTours((ot as unknown as OpenTournament[]) ?? []);
    const myClubs = cl ?? [];
    setClubs(myClubs);
    if (myClubs.length > 0) {
      setClubMode("existing");
      setClubId((cur) => cur || myClubs[0].id);
    }
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
      const useExisting = clubMode === "existing" && clubId;
      if (!useExisting && newClub.trim().length < 2) {
        setBusy(false);
        return setError("Escolha ou crie um clube para o ranking.");
      }
      const { data, error } = await supabase.rpc("create_league", {
        p_name: name.trim(),
        p_club_id: useExisting ? clubId : null,
        p_new_club_name: useExisting ? null : newClub.trim(),
        p_booking_required: bookingReq,
        p_city: city.trim() || null,
      });
      setBusy(false);
      if (error) return setError(error.message);
      invalidateCache(CLUBS_CACHE_KEY); // pode ter criado um clube novo
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

  async function requestJoin(id: string) {
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc("request_league_join", { p_league_id: id, p_message: null });
    setBusy(false);
    if (error) return setError(error.message);
    setRequested((prev) => new Set(prev).add(id));
  }

  const notMember = open.filter((l) => !l.am_member);
  const myTourIds = new Set(myTours.map((t) => t.id));
  const openToursToShow = openTours.filter((t) => !myTourIds.has(t.id));

  return (
    <main className="min-h-[100dvh] bg-amber-50/40">
      <header className="pt-safe bg-gradient-to-br from-amber-500 to-amber-700 px-5 pb-10 text-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="text-sm font-semibold text-amber-50">
              ← Voltar
            </button>
            <Link href="/inicio" className="text-sm font-semibold text-amber-50">
              🏠 Início
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <NotificationsBell />
            <form action="/auth/signout" method="post">
              <button className="rounded-full px-3 py-1.5 text-sm text-amber-50 ring-1 ring-white/25">
                Sair
              </button>
            </form>
          </div>
        </div>
        <div className="mx-auto mt-6 max-w-2xl">
          <h1 className="text-3xl font-extrabold">🏆 Ranking</h1>
          <p className="mt-1 text-amber-50">
            Ligas e torneios de clubes e grupos. Jogue e suba na classificação.
          </p>
        </div>
      </header>

      <div className="mx-auto -mt-5 max-w-2xl space-y-6 px-5 pb-24">
        {/* Convites recebidos */}
        <MyInvites />

        {/* Gestão (só dono) */}
        {isOwner && (
          <Link
            href="/admin"
            className="flex items-center justify-between rounded-3xl bg-white p-5 shadow-card transition hover:-translate-y-0.5"
          >
            <div>
              <div className="text-lg font-bold">🛡️ Gestão</div>
              <div className="text-xs text-slate-500">
                Cadastros, matches e organizadores
              </div>
            </div>
            <span className="text-sm font-semibold text-court-700">Abrir →</span>
          </Link>
        )}

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
              <form onSubmit={submitCreate} className="mt-4 space-y-3 rounded-2xl bg-amber-50 p-4">
                <div>
                  <label className="label">Clube (dono do ranking)</label>
                  {clubs.length > 0 && (
                    <div className="mb-2 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setClubMode("existing")}
                        className={`flex-1 rounded-full px-2 py-1.5 text-xs font-semibold ${clubMode === "existing" ? "bg-amber-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
                      >
                        Clube existente
                      </button>
                      <button
                        type="button"
                        onClick={() => setClubMode("new")}
                        className={`flex-1 rounded-full px-2 py-1.5 text-xs font-semibold ${clubMode === "new" ? "bg-amber-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
                      >
                        Novo clube
                      </button>
                    </div>
                  )}
                  {clubMode === "existing" && clubs.length > 0 ? (
                    <select className="input" value={clubId} onChange={(e) => setClubId(e.target.value)}>
                      {clubs.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.court_count} quadra{c.court_count === 1 ? "" : "s"})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="space-y-2">
                      <input
                        className="input"
                        placeholder="Nome do clube"
                        value={newClub}
                        onChange={(e) => setNewClub(e.target.value)}
                      />
                      <label className="flex items-center gap-2 text-xs text-slate-600">
                        <input type="checkbox" checked={bookingReq} onChange={(e) => setBookingReq(e.target.checked)} />
                        Reserva de quadra obrigatória
                      </label>
                    </div>
                  )}
                </div>
                <div>
                  <label className="label">Nome do ranking</label>
                  <input className="input" placeholder="Ex.: Ranking Masculino" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <PlaceAutocomplete cityOnly className="input" placeholder="Cidade (opcional)" value={city} onChange={setCity} />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary flex-1" disabled={busy}>
                    {busy ? "Criando..." : "Criar ranking"}
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => setCreating(null)}>
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <DashedButton onClick={() => { setCreating("league"); setName(""); setCity(""); setNewClub(""); setError(null); }}>
                + Criar uma liga (ranking contínuo)
              </DashedButton>
            ))}
        </section>

        {/* Rankings próximos */}
        <NearbyLeagues />

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
                  {requested.has(l.id) ? (
                    <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700">
                      Solicitação enviada
                    </span>
                  ) : (
                    <button
                      onClick={() => requestJoin(l.id)}
                      className="btn-primary text-sm"
                      disabled={busy}
                    >
                      Solicitar entrada
                    </button>
                  )}
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
      <PlaceAutocomplete cityOnly className="input" placeholder="Cidade (opcional)" value={city} onChange={setCity} />
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
