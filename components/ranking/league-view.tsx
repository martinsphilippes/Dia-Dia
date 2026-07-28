"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { IconBack } from "@/components/icons";
import { cx, initials } from "@/lib/utils";
import {
  LeagueDetail,
  MATCH_STATUS_LABELS,
  MyLeagueMatch,
  MyPointsRow,
  RoundInfo,
  RoundMatch,
  Standing,
} from "@/lib/types";

type Tab =
  | "classificacao"
  | "rodadas"
  | "jogos_marcados"
  | "meus_jogos"
  | "minha_pontuacao"
  | "regras"
  | "sobre";

const TABS: { key: Tab; label: string }[] = [
  { key: "classificacao", label: "Classificação" },
  { key: "rodadas", label: "Rodadas" },
  { key: "jogos_marcados", label: "Jogos Marcados" },
  { key: "meus_jogos", label: "Meus Jogos" },
  { key: "minha_pontuacao", label: "Minha Pontuação" },
  { key: "regras", label: "Regras" },
  { key: "sobre", label: "Sobre" },
];

export function LeagueView({ leagueId, meId }: { leagueId: string; meId: string }) {
  const supabase = createClient();
  const [league, setLeague] = useState<LeagueDetail | null>(null);
  const [tab, setTab] = useState<Tab>("classificacao");
  const [notMember, setNotMember] = useState(false);

  const loadLeague = useCallback(async () => {
    const { data } = await supabase.rpc("get_league", { p_league_id: leagueId });
    const l = (data as unknown as LeagueDetail[] | null)?.[0] ?? null;
    setLeague(l);
    if (l && !l.am_member) setNotMember(true);
  }, [supabase, leagueId]);

  useEffect(() => {
    loadLeague();
  }, [loadLeague]);

  async function join() {
    await supabase.rpc("join_league", { p_league_id: leagueId });
    setNotMember(false);
    loadLeague();
  }

  if (!league) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-amber-50/40 text-amber-700">
        <div className="animate-pulse text-4xl">🏆</div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-amber-50/40">
      <header className="bg-gradient-to-br from-amber-500 to-amber-700 px-5 pb-14 pt-6 text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/ranking" className="flex items-center gap-1 text-sm text-amber-50">
            <IconBack className="h-5 w-5" /> Ligas
          </Link>
          {league.is_organizer && (
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/25">
              organizador
            </span>
          )}
        </div>
        <div className="mx-auto mt-5 max-w-3xl">
          <h1 className="text-2xl font-extrabold">🏆 {league.name}</h1>
          <p className="mt-1 text-sm text-amber-50">
            {league.city ? `${league.city} · ` : ""}
            {league.member_count} jogador{league.member_count === 1 ? "" : "es"}
            {league.current_round_number ? ` · rodada ${league.current_round_number}` : ""}
          </p>
        </div>
      </header>

      <div className="mx-auto -mt-8 max-w-3xl px-4 pb-24">
        {notMember && (
          <div className="mb-4 flex items-center justify-between rounded-2xl bg-amber-100 px-4 py-3 text-sm text-amber-800">
            <span>Você não é membro desta liga.</span>
            <button onClick={join} className="btn-primary text-sm">
              Entrar
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="sticky top-0 z-10 -mx-4 mb-4 overflow-x-auto bg-amber-50/40 px-4 py-2 backdrop-blur">
          <div className="flex gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cx(
                  "whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition",
                  tab === t.key
                    ? "bg-amber-600 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-card">
          {tab === "classificacao" && <Standings leagueId={leagueId} meId={meId} />}
          {tab === "rodadas" && <Rounds league={league} meId={meId} onChange={loadLeague} />}
          {tab === "jogos_marcados" && (
            <MyMatches leagueId={leagueId} meId={meId} onlyPending />
          )}
          {tab === "meus_jogos" && <MyMatches leagueId={leagueId} meId={meId} />}
          {tab === "minha_pontuacao" && <MyPoints leagueId={leagueId} />}
          {tab === "regras" && <Rules />}
          {tab === "sobre" && <About league={league} onChange={loadLeague} />}
        </div>
      </div>
    </main>
  );
}

/* ---------------- Classificação ---------------- */
function Standings({ leagueId, meId }: { leagueId: string; meId: string }) {
  const supabase = createClient();
  const [rows, setRows] = useState<Standing[] | null>(null);
  useEffect(() => {
    supabase
      .rpc("get_league_standings", { p_league_id: leagueId })
      .then(({ data }) => setRows((data as unknown as Standing[]) ?? []));
  }, [supabase, leagueId]);

  if (!rows) return <Loading />;
  if (rows.length === 0) return <Empty text="Sem jogadores ainda." />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase text-slate-400">
          <tr>
            <th className="py-2 pr-2">#</th>
            <th className="py-2">Jogador</th>
            <th className="py-2 text-right">Jogos</th>
            <th className="py-2 pl-2 text-right">Pontos</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.player_id} className={cx(r.player_id === meId && "bg-amber-50")}>
              <td className="py-2.5 pr-2 font-bold text-slate-400">{r.pos}º</td>
              <td className="py-2.5">
                <div className="flex items-center gap-2">
                  {r.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                      {initials(r.name)}
                    </div>
                  )}
                  <span className="font-medium">{r.name}</span>
                </div>
              </td>
              <td className="py-2.5 text-right text-slate-500">{Number(r.games)}</td>
              <td className="py-2.5 pl-2 text-right font-bold text-amber-700">{Number(r.points)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Rodadas ---------------- */
function Rounds({
  league,
  meId,
  onChange,
}: {
  league: LeagueDetail;
  meId: string;
  onChange: () => void;
}) {
  const supabase = createClient();
  const [rounds, setRounds] = useState<RoundInfo[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [matches, setMatches] = useState<RoundMatch[] | null>(null);
  const [busy, setBusy] = useState(false);

  const loadRounds = useCallback(async () => {
    const { data } = await supabase.rpc("get_league_rounds", { p_league_id: league.id });
    const rs = (data as unknown as RoundInfo[]) ?? [];
    setRounds(rs);
    setSelected((cur) => cur ?? rs[0]?.id ?? null);
  }, [supabase, league.id]);

  useEffect(() => {
    loadRounds();
  }, [loadRounds]);

  const loadMatches = useCallback(
    async (roundId: string) => {
      const { data } = await supabase.rpc("get_round_matches", { p_round_id: roundId });
      setMatches((data as unknown as RoundMatch[]) ?? []);
    },
    [supabase]
  );

  useEffect(() => {
    if (selected) loadMatches(selected);
  }, [selected, loadMatches]);

  async function generate() {
    setBusy(true);
    const { data } = await supabase.rpc("generate_round", { p_league_id: league.id });
    setBusy(false);
    setSelected((data as string) ?? null);
    await loadRounds();
    onChange();
  }

  if (!rounds) return <Loading />;

  return (
    <div>
      {league.is_organizer && (
        <button onClick={generate} disabled={busy} className="btn-primary mb-4 w-full text-sm">
          {busy ? "Sorteando..." : "🎲 Gerar nova rodada"}
        </button>
      )}

      {rounds.length === 0 ? (
        <Empty text={league.is_organizer ? "Gere a primeira rodada acima." : "Nenhuma rodada ainda."} />
      ) : (
        <>
          <div className="mb-4 flex gap-2 overflow-x-auto">
            {rounds.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r.id)}
                className={cx(
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold",
                  selected === r.id ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-600"
                )}
              >
                Rodada {r.number} · {Number(r.played_count)}/{Number(r.match_count)}
              </button>
            ))}
          </div>

          {!matches ? (
            <Loading />
          ) : matches.length === 0 ? (
            <Empty text="Sem confrontos nesta rodada." />
          ) : (
            <ul className="space-y-3">
              {matches.map((m) => (
                <RoundMatchCard
                  key={m.match_id}
                  m={m}
                  canReport={league.is_organizer || m.challenger_id === meId || m.challenged_id === meId}
                  onReported={() => {
                    if (selected) loadMatches(selected);
                    loadRounds();
                  }}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function RoundMatchCard({
  m,
  canReport,
  onReported,
}: {
  m: RoundMatch;
  canReport: boolean;
  onReported: () => void;
}) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [sc, setSc] = useState("");
  const [sd, setSd] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const played = m.status === "jogado";

  async function report(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const { error } = await supabase.rpc("report_match_result", {
      p_match_id: m.match_id,
      p_sets_challenger: Number(sc),
      p_sets_challenged: Number(sd),
    });
    setBusy(false);
    if (error) return setErr(error.message);
    setOpen(false);
    onReported();
  }

  return (
    <li className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <PlayerMini name={m.challenger_name} avatar={m.challenger_avatar} />
        <div className="shrink-0 text-center">
          {played ? (
            <div className="text-lg font-extrabold">
              {m.sets_challenger}<span className="mx-1 text-slate-300">x</span>{m.sets_challenged}
            </div>
          ) : (
            <div className="text-xs font-semibold text-slate-400">vs</div>
          )}
          <div className="text-[10px] uppercase text-slate-400">
            {MATCH_STATUS_LABELS[m.status]}
          </div>
        </div>
        <PlayerMini name={m.challenged_name} avatar={m.challenged_avatar} right />
      </div>

      {played && (
        <div className="mt-1 text-center text-[11px] text-amber-700">
          {Number(m.challenger_points)} × {Number(m.challenged_points)} pts
        </div>
      )}

      {canReport && !played && (
        <div className="mt-2 text-center">
          {open ? (
            <form onSubmit={report} className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">{m.challenger_name.split(" ")[0]}</span>
                <input
                  className="input w-14 text-center"
                  inputMode="numeric"
                  value={sc}
                  onChange={(e) => setSc(e.target.value)}
                  placeholder="2"
                />
                <span className="text-slate-400">x</span>
                <input
                  className="input w-14 text-center"
                  inputMode="numeric"
                  value={sd}
                  onChange={(e) => setSd(e.target.value)}
                  placeholder="1"
                />
                <span className="text-slate-500">{m.challenged_name.split(" ")[0]}</span>
              </div>
              {err && <p className="text-xs text-red-600">{err}</p>}
              <div className="flex gap-2">
                <button className="btn-primary text-xs" disabled={busy}>
                  {busy ? "Salvando..." : "Salvar placar"}
                </button>
                <button type="button" className="btn-ghost text-xs" onClick={() => setOpen(false)}>
                  Cancelar
                </button>
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

function PlayerMini({
  name,
  avatar,
  right,
}: {
  name: string;
  avatar: string | null;
  right?: boolean;
}) {
  return (
    <div className={cx("flex min-w-0 flex-1 items-center gap-2", right && "flex-row-reverse text-right")}>
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
      ) : (
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
          {initials(name)}
        </div>
      )}
      <span className="truncate text-sm font-medium">{name}</span>
    </div>
  );
}

/* ---------------- Meus Jogos / Jogos Marcados ---------------- */
function MyMatches({
  leagueId,
  meId,
  onlyPending,
}: {
  leagueId: string;
  meId: string;
  onlyPending?: boolean;
}) {
  const supabase = createClient();
  const [rows, setRows] = useState<MyLeagueMatch[] | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("get_my_league_matches", { p_league_id: leagueId });
    setRows((data as unknown as MyLeagueMatch[]) ?? []);
  }, [supabase, leagueId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!rows) return <Loading />;
  const list = onlyPending ? rows.filter((r) => r.status === "marcar" || r.status === "agendado") : rows;
  if (list.length === 0)
    return <Empty text={onlyPending ? "Nenhum jogo pendente." : "Você ainda não tem jogos."} />;

  return (
    <ul className="space-y-3">
      {list.map((m) => (
        <MyMatchCard key={m.match_id} m={m} onChange={load} />
      ))}
    </ul>
  );
}

function MyMatchCard({ m, onChange }: { m: MyLeagueMatch; onChange: () => void }) {
  const supabase = createClient();
  const [mode, setMode] = useState<null | "agendar" | "resultado">(null);
  const [when, setWhen] = useState("");
  const [place, setPlace] = useState(m.location || "");
  const [mySets, setMySets] = useState("");
  const [oppSets, setOppSets] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const played = m.status === "jogado";

  async function schedule(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await supabase.rpc("schedule_match", {
      p_match_id: m.match_id,
      p_when: when ? new Date(when).toISOString() : null,
      p_location: place || null,
    });
    setBusy(false);
    if (error) return setErr(error.message);
    setMode(null);
    onChange();
  }

  async function report(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const mine = Number(mySets);
    const opp = Number(oppSets);
    const { error } = await supabase.rpc("report_match_result", {
      p_match_id: m.match_id,
      p_sets_challenger: m.am_challenger ? mine : opp,
      p_sets_challenged: m.am_challenger ? opp : mine,
    });
    setBusy(false);
    if (error) return setErr(error.message);
    setMode(null);
    onChange();
  }

  return (
    <li className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-center gap-3">
        {m.opponent_avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.opponent_avatar} alt="" className="h-11 w-11 rounded-full object-cover" />
        ) : (
          <div className="grid h-11 w-11 place-items-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
            {initials(m.opponent_name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{m.opponent_name}</div>
          <div className="text-xs text-slate-500">
            Rodada {m.round_number} · {MATCH_STATUS_LABELS[m.status]}
            {m.am_challenger ? " · você é o desafiante" : ""}
          </div>
          {m.scheduled_at && !played && (
            <div className="text-xs text-slate-500">
              📅 {new Date(m.scheduled_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              {m.location ? ` · ${m.location}` : ""}
            </div>
          )}
        </div>
        {played ? (
          <div className="text-right">
            <div className="text-lg font-extrabold">{m.sets_me}<span className="mx-0.5 text-slate-300">x</span>{m.sets_opp}</div>
            <div className="text-[11px] font-semibold text-amber-700">+{Number(m.my_points)} pts</div>
          </div>
        ) : (
          m.opponent_phone && (
            <a
              href={`https://wa.me/55${m.opponent_phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 rounded-full bg-court-50 px-3 py-1.5 text-xs font-semibold text-court-700"
            >
              WhatsApp
            </a>
          )
        )}
      </div>

      {!played && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {mode === null && (
            <>
              <button onClick={() => setMode("agendar")} className="text-xs font-semibold text-slate-600">
                📅 {m.status === "agendado" ? "Reagendar" : "Marcar jogo"}
              </button>
              <button onClick={() => setMode("resultado")} className="text-xs font-semibold text-amber-700">
                Lançar resultado
              </button>
            </>
          )}

          {mode === "agendar" && (
            <form onSubmit={schedule} className="w-full space-y-2">
              <input
                type="datetime-local"
                className="input"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
              />
              <input
                className="input"
                placeholder="Local (quadra, clube...)"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
              />
              {err && <p className="text-xs text-red-600">{err}</p>}
              <div className="flex gap-2">
                <button className="btn-primary text-xs" disabled={busy}>Salvar</button>
                <button type="button" className="btn-ghost text-xs" onClick={() => setMode(null)}>Cancelar</button>
              </div>
            </form>
          )}

          {mode === "resultado" && (
            <form onSubmit={report} className="w-full">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">Você</span>
                <input className="input w-14 text-center" inputMode="numeric" value={mySets} onChange={(e) => setMySets(e.target.value)} placeholder="2" />
                <span className="text-slate-400">x</span>
                <input className="input w-14 text-center" inputMode="numeric" value={oppSets} onChange={(e) => setOppSets(e.target.value)} placeholder="1" />
                <span className="truncate text-slate-500">{m.opponent_name.split(" ")[0]}</span>
              </div>
              {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
              <div className="mt-2 flex gap-2">
                <button className="btn-primary text-xs" disabled={busy}>Salvar placar</button>
                <button type="button" className="btn-ghost text-xs" onClick={() => setMode(null)}>Cancelar</button>
              </div>
            </form>
          )}
        </div>
      )}
    </li>
  );
}

/* ---------------- Minha Pontuação ---------------- */
function MyPoints({ leagueId }: { leagueId: string }) {
  const supabase = createClient();
  const [rows, setRows] = useState<MyPointsRow[] | null>(null);
  useEffect(() => {
    supabase
      .rpc("get_my_ranking_points", { p_league_id: leagueId })
      .then(({ data }) => setRows((data as unknown as MyPointsRow[]) ?? []));
  }, [supabase, leagueId]);

  if (!rows) return <Loading />;
  const played = rows.filter((r) => r.status === "jogado");
  const total = played.slice(0, 10).reduce((s, r) => s + Number(r.points), 0);

  return (
    <div>
      <div className="mb-4 rounded-2xl bg-amber-50 p-4 text-center">
        <div className="text-4xl font-extrabold text-amber-700">{total}</div>
        <div className="text-xs font-medium text-amber-600">pontos (últimas 10 rodadas)</div>
      </div>
      {rows.length === 0 ? (
        <Empty text="Você ainda não jogou nenhuma partida." />
      ) : (
        <ul className="space-y-2">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm">
              <div>
                <span className="font-semibold">Rodada {r.round_number}</span>
                <span className="text-slate-500"> · vs {r.opponent_name}</span>
              </div>
              <div className="flex items-center gap-3">
                {r.status === "jogado" ? (
                  <span className="text-slate-500">{r.sets_me}x{r.sets_opp}</span>
                ) : (
                  <span className="text-xs text-slate-400">{MATCH_STATUS_LABELS[r.status]}</span>
                )}
                <span className="w-10 text-right font-bold text-amber-700">
                  {r.status === "jogado" ? `+${Number(r.points)}` : "—"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------- Regras ---------------- */
function Rules() {
  return (
    <div className="prose-sm space-y-4 text-sm text-slate-700">
      <Section title="Como funciona">
        Todo mundo joga com regularidade e <strong>cada partida vale pontos</strong> —
        não é mata-mata. A cada rodada você tem um confronto sorteado contra alguém
        de nível parecido no ranking.
      </Section>
      <Section title="Pontuação (soma das últimas 10 rodadas)">
        Sua nota no ranking é a <strong>soma dos seus resultados nas últimas 10
        rodadas</strong>. Ao entrar a 11ª, a mais antiga sai — igual ao modelo do
        circuito profissional. Pontos por partida (melhor de 3 sets):
        <ul className="mt-2 list-disc pl-5">
          <li>Desafiante vence por 2x0: <strong>10</strong> pontos</li>
          <li>Desafiante vence por 2x1: <strong>8</strong> pontos</li>
          <li>Desafiado vence por 2x0: <strong>9</strong> pontos</li>
          <li>Desafiado vence por 2x1: <strong>7</strong> pontos</li>
          <li>Quem perde levando 2x1 (ganhou 1 set): <strong>4</strong> pontos</li>
          <li>Quem perde por 2x0: <strong>1</strong> ponto</li>
        </ul>
      </Section>
      <Section title="Marcação dos jogos">
        Quem está melhor colocado (o desafiante) combina o jogo com o adversário —
        use o botão de WhatsApp na aba <em>Jogos Marcados</em>. Definam data, hora e
        local. Depois de jogar, qualquer um dos dois lança o placar no app.
      </Section>
      <Section title="Sorteio das rodadas">
        O organizador gera cada rodada, e o sistema <strong>sorteia os confrontos
        priorizando jogadores próximos na classificação</strong>. Havendo número
        ímpar, um jogador folga na rodada.
      </Section>
      <Section title="Boa convivência">
        Jogue com regularidade, respeite os horários combinados e o adversário
        dentro e fora da quadra. É competição, mas é diversão. 🎾
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-bold text-ink">{title}</h3>
      <div className="mt-1 leading-relaxed">{children}</div>
    </div>
  );
}

/* ---------------- Sobre ---------------- */
function About({ league, onChange }: { league: LeagueDetail; onChange: () => void }) {
  const supabase = createClient();
  const [edit, setEdit] = useState(false);
  const [desc, setDesc] = useState(league.description || "");
  const [about, setAbout] = useState(league.about_text || "");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await supabase.rpc("update_league", {
      p_league_id: league.id,
      p_description: desc,
      p_about_text: about,
    });
    setBusy(false);
    setEdit(false);
    onChange();
  }

  if (edit) {
    return (
      <form onSubmit={save} className="space-y-3">
        <div>
          <label className="label">Descrição curta</label>
          <input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div>
          <label className="label">Sobre a liga</label>
          <textarea className="input min-h-[120px]" value={about} onChange={(e) => setAbout(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button className="btn-primary text-sm" disabled={busy}>{busy ? "Salvando..." : "Salvar"}</button>
          <button type="button" className="btn-ghost text-sm" onClick={() => setEdit(false)}>Cancelar</button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-3 text-sm text-slate-700">
      <div>
        <span className="font-semibold">Organizador:</span> {league.organizer_name}
      </div>
      {league.city && (
        <div>
          <span className="font-semibold">Cidade:</span> {league.city}
        </div>
      )}
      {league.description && <p>{league.description}</p>}
      {league.about_text ? (
        <p className="whitespace-pre-wrap">{league.about_text}</p>
      ) : (
        <p className="text-slate-400">Sem descrição adicional.</p>
      )}
      {league.is_organizer && (
        <button onClick={() => setEdit(true)} className="text-sm font-semibold text-amber-700">
          Editar informações
        </button>
      )}
    </div>
  );
}

/* ---------------- helpers ---------------- */
function Loading() {
  return <p className="py-6 text-center text-sm text-slate-400">Carregando...</p>;
}
function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-slate-500">{text}</p>;
}
