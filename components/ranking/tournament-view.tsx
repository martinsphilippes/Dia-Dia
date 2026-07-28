"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { IconBack } from "@/components/icons";
import { cx, initials } from "@/lib/utils";
import {
  BracketMatch,
  bracketRoundLabel,
  CategoryEntry,
  TOURNAMENT_STATUS_LABELS,
  TournamentCategory,
  TournamentDetail,
} from "@/lib/types";

export function TournamentView({
  tournamentId,
  meId,
}: {
  tournamentId: string;
  meId: string;
}) {
  const supabase = createClient();
  const [t, setT] = useState<TournamentDetail | null>(null);
  const [cats, setCats] = useState<TournamentCategory[]>([]);
  const [selCat, setSelCat] = useState<string | null>(null);
  const [newCat, setNewCat] = useState("");
  const [addingCat, setAddingCat] = useState(false);

  const loadTournament = useCallback(async () => {
    const [{ data: td }, { data: cd }] = await Promise.all([
      supabase.rpc("get_tournament", { p_id: tournamentId }),
      supabase.rpc("get_tournament_categories", { p_tournament_id: tournamentId }),
    ]);
    setT((td as unknown as TournamentDetail[] | null)?.[0] ?? null);
    const clist = (cd as unknown as TournamentCategory[]) ?? [];
    setCats(clist);
    setSelCat((cur) => cur ?? clist[0]?.id ?? null);
  }, [supabase, tournamentId]);

  useEffect(() => {
    loadTournament();
  }, [loadTournament]);

  async function setStatus(status: string) {
    await supabase.rpc("set_tournament_status", { p_tournament_id: tournamentId, p_status: status });
    loadTournament();
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (newCat.trim().length < 1) return;
    const { data } = await supabase.rpc("add_tournament_category", {
      p_tournament_id: tournamentId,
      p_name: newCat.trim(),
    });
    setNewCat("");
    setAddingCat(false);
    await loadTournament();
    if (data) setSelCat(data as string);
  }

  if (!t) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-amber-50/40 text-amber-700">
        <div className="animate-pulse text-4xl">🏆</div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-amber-50/40">
      <header className="bg-gradient-to-br from-amber-500 to-amber-700 px-5 pb-12 pt-6 text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/ranking" className="flex items-center gap-1 text-sm text-amber-50">
            <IconBack className="h-5 w-5" /> Ranking
          </Link>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/25">
            {TOURNAMENT_STATUS_LABELS[t.status]}
          </span>
        </div>
        <div className="mx-auto mt-5 max-w-3xl">
          <h1 className="text-2xl font-extrabold">🏆 {t.name}</h1>
          <p className="mt-1 text-sm text-amber-50">
            {t.city ? `${t.city} · ` : ""}organizador: {t.organizer_name}
          </p>
        </div>
      </header>

      <div className="mx-auto -mt-8 max-w-3xl space-y-4 px-4 pb-24">
        {/* Controles do organizador */}
        {t.is_organizer && (
          <div className="rounded-2xl bg-white p-4 shadow-card">
            <div className="text-sm font-semibold text-slate-700">Painel do organizador</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {t.status !== "inscricoes" && (
                <button onClick={() => setStatus("inscricoes")} className="btn-ghost text-xs">
                  Reabrir inscrições
                </button>
              )}
              {t.status === "inscricoes" && (
                <button onClick={() => setStatus("em_andamento")} className="btn-ghost text-xs">
                  Fechar inscrições
                </button>
              )}
              {t.status !== "encerrado" && (
                <button onClick={() => setStatus("encerrado")} className="btn-ghost text-xs">
                  Encerrar torneio
                </button>
              )}
            </div>
          </div>
        )}

        {/* Categorias */}
        <div className="rounded-3xl bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Categorias</h2>
            {t.is_organizer && !addingCat && (
              <button onClick={() => setAddingCat(true)} className="text-sm font-semibold text-amber-700">
                + Categoria
              </button>
            )}
          </div>

          {addingCat && (
            <form onSubmit={addCategory} className="mt-3 flex gap-2">
              <input
                className="input flex-1"
                placeholder="Ex.: Masculino A, Feminino, Iniciante"
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                autoFocus
              />
              <button className="btn-primary text-sm">Add</button>
              <button type="button" className="btn-ghost text-sm" onClick={() => setAddingCat(false)}>
                ✕
              </button>
            </form>
          )}

          {cats.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              {t.is_organizer
                ? "Crie ao menos uma categoria para abrir inscrições."
                : "Sem categorias ainda."}
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {cats.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelCat(c.id)}
                  className={cx(
                    "rounded-full px-4 py-2 text-sm font-semibold transition",
                    selCat === c.id ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-600"
                  )}
                >
                  {c.name} · {Number(c.entry_count)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Categoria selecionada */}
        {selCat && (
          <CategoryPanel
            key={selCat}
            categoryId={selCat}
            tournament={t}
            category={cats.find((c) => c.id === selCat)!}
            meId={meId}
            onChange={loadTournament}
          />
        )}
      </div>
    </main>
  );
}

/* -------- Painel da categoria (inscritos + chaveamento) -------- */
function CategoryPanel({
  categoryId,
  tournament,
  category,
  meId,
  onChange,
}: {
  categoryId: string;
  tournament: TournamentDetail;
  category: TournamentCategory;
  meId: string;
  onChange: () => void;
}) {
  const supabase = createClient();
  const [entries, setEntries] = useState<CategoryEntry[] | null>(null);
  const [bracket, setBracket] = useState<BracketMatch[] | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: e }, { data: b }] = await Promise.all([
      supabase.rpc("get_category_entries", { p_category_id: categoryId }),
      supabase.rpc("get_bracket", { p_category_id: categoryId }),
    ]);
    setEntries((e as unknown as CategoryEntry[]) ?? []);
    setBracket((b as unknown as BracketMatch[]) ?? []);
  }, [supabase, categoryId]);

  useEffect(() => {
    load();
  }, [load]);

  const registered = (entries ?? []).some((e) => e.player_id === meId);
  const hasBracket = (bracket ?? []).length > 0;

  async function register() {
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.rpc("register_tournament", { p_category_id: categoryId });
    setBusy(false);
    if (error) return setMsg(error.message);
    load();
    onChange();
  }

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { data } = await supabase.rpc("add_tournament_entry", {
      p_category_id: categoryId,
      p_email: email.trim(),
    });
    setBusy(false);
    if (data === "não encontrado") setMsg("Jogador não encontrado (precisa ter conta no app).");
    setEmail("");
    load();
    onChange();
  }

  async function generate() {
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.rpc("generate_bracket", { p_category_id: categoryId });
    setBusy(false);
    if (error) return setMsg(error.message);
    load();
    onChange();
  }

  return (
    <div className="rounded-3xl bg-white p-5 shadow-card">
      <h3 className="text-lg font-bold">{category.name}</h3>

      {!hasBracket ? (
        <>
          {/* Inscritos */}
          <div className="mt-3">
            {entries === null ? (
              <p className="text-sm text-slate-400">Carregando...</p>
            ) : entries.length === 0 ? (
              <p className="text-sm text-slate-500">Ninguém inscrito ainda.</p>
            ) : (
              <ul className="space-y-1.5">
                {entries.map((e) => (
                  <li key={e.player_id} className="flex items-center gap-2 text-sm">
                    {e.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <div className="grid h-7 w-7 place-items-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
                        {initials(e.name)}
                      </div>
                    )}
                    <span>{e.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {msg && <p className="mt-3 text-sm text-red-600">{msg}</p>}

          {/* Ações */}
          <div className="mt-4 space-y-2">
            {tournament.status === "inscricoes" && !registered && (
              <button onClick={register} disabled={busy} className="btn-primary w-full text-sm">
                {busy ? "..." : "Inscrever-se nesta categoria"}
              </button>
            )}
            {registered && (
              <p className="rounded-xl bg-court-50 px-4 py-2 text-center text-sm text-court-700">
                ✅ Você está inscrito
              </p>
            )}

            {tournament.is_organizer && (
              <>
                <form onSubmit={addEntry} className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder="Adicionar por email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <button className="btn-ghost text-sm">Add</button>
                </form>
                <button
                  onClick={generate}
                  disabled={busy || (entries?.length ?? 0) < 2}
                  className="btn-ball w-full text-sm"
                >
                  🎾 Gerar chaveamento ({entries?.length ?? 0} inscritos)
                </button>
              </>
            )}
          </div>
        </>
      ) : (
        <Bracket
          matches={bracket!}
          meId={meId}
          canReport={(m) =>
            tournament.is_organizer || m.player_a_id === meId || m.player_b_id === meId
          }
          onReported={() => {
            load();
            onChange();
          }}
          canRegenerate={tournament.is_organizer}
          onRegenerate={generate}
          busy={busy}
        />
      )}
    </div>
  );
}

/* -------- Chaveamento -------- */
function Bracket({
  matches,
  meId,
  canReport,
  onReported,
  canRegenerate,
  onRegenerate,
  busy,
}: {
  matches: BracketMatch[];
  meId: string;
  canReport: (m: BracketMatch) => boolean;
  onReported: () => void;
  canRegenerate: boolean;
  onRegenerate: () => void;
  busy: boolean;
}) {
  const total = matches[0]?.total_rounds ?? 1;
  const rounds = Array.from(new Set(matches.map((m) => m.round_no))).sort((a, b) => a - b);

  return (
    <div className="mt-3">
      {canRegenerate && (
        <button onClick={onRegenerate} disabled={busy} className="mb-3 text-xs font-semibold text-amber-700">
          🔄 Refazer sorteio
        </button>
      )}
      <div className="space-y-5">
        {rounds.map((r) => (
          <div key={r}>
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-600">
              {bracketRoundLabel(r, total)}
            </div>
            <ul className="space-y-2">
              {matches
                .filter((m) => m.round_no === r)
                .sort((a, b) => a.slot - b.slot)
                .map((m) => (
                  <BracketMatchCard
                    key={m.match_id}
                    m={m}
                    meId={meId}
                    canReport={canReport(m)}
                    onReported={onReported}
                  />
                ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function BracketMatchCard({
  m,
  meId,
  canReport,
  onReported,
}: {
  m: BracketMatch;
  meId: string;
  canReport: boolean;
  onReported: () => void;
}) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [sa, setSa] = useState("");
  const [sb, setSb] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const played = m.status === "jogado";
  const ready = m.status === "pronto";

  async function report(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const { error } = await supabase.rpc("report_tournament_match", {
      p_match_id: m.match_id,
      p_sets_a: Number(sa),
      p_sets_b: Number(sb),
    });
    setBusy(false);
    if (error) return setErr(error.message);
    setOpen(false);
    onReported();
  }

  return (
    <li className="rounded-2xl border border-slate-100 bg-slate-50 p-2.5">
      <BracketSide
        name={m.player_a_name}
        avatar={m.player_a_avatar}
        sets={m.sets_a}
        isWinner={played && m.winner_id === m.player_a_id}
        isMe={m.player_a_id === meId}
      />
      <div className="my-1 border-t border-dashed border-slate-200" />
      <BracketSide
        name={m.player_b_name}
        avatar={m.player_b_avatar}
        sets={m.sets_b}
        isWinner={played && m.winner_id === m.player_b_id}
        isMe={m.player_b_id === meId}
      />

      {canReport && ready && (
        <div className="mt-2 text-center">
          {open ? (
            <form onSubmit={report} className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="max-w-[70px] truncate text-slate-500">{m.player_a_name?.split(" ")[0]}</span>
                <input className="input w-12 text-center" inputMode="numeric" value={sa} onChange={(e) => setSa(e.target.value)} placeholder="2" />
                <span className="text-slate-400">x</span>
                <input className="input w-12 text-center" inputMode="numeric" value={sb} onChange={(e) => setSb(e.target.value)} placeholder="0" />
                <span className="max-w-[70px] truncate text-slate-500">{m.player_b_name?.split(" ")[0]}</span>
              </div>
              {err && <p className="text-xs text-red-600">{err}</p>}
              <div className="flex gap-2">
                <button className="btn-primary text-xs" disabled={busy}>Salvar</button>
                <button type="button" className="btn-ghost text-xs" onClick={() => setOpen(false)}>Cancelar</button>
              </div>
            </form>
          ) : (
            <button onClick={() => setOpen(true)} className="text-xs font-semibold text-amber-700">
              Lançar resultado
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function BracketSide({
  name,
  avatar,
  sets,
  isWinner,
  isMe,
}: {
  name: string | null;
  avatar: string | null;
  sets: number | null;
  isWinner: boolean;
  isMe: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {name ? (
        avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
        ) : (
          <div className="grid h-7 w-7 place-items-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
            {initials(name)}
          </div>
        )
      ) : (
        <div className="grid h-7 w-7 place-items-center rounded-full bg-slate-200 text-[10px] text-slate-400">?</div>
      )}
      <span
        className={cx(
          "flex-1 truncate text-sm",
          isWinner ? "font-bold text-ink" : "text-slate-500",
          isMe && "text-amber-700"
        )}
      >
        {name ?? <span className="italic text-slate-400">a definir</span>}
        {isMe && name ? " (você)" : ""}
      </span>
      {sets != null && <span className={cx("text-sm font-bold", isWinner ? "text-amber-700" : "text-slate-400")}>{sets}</span>}
    </div>
  );
}
