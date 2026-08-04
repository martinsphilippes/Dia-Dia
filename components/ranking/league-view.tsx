"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { calcAge, cx, initials } from "@/lib/utils";
import { ResultForm, formatGames } from "@/components/ranking/result-form";
import { CourtScheduler } from "@/components/ranking/court-scheduler";
import { CourtsConfig } from "@/components/ranking/courts-config";
import {
  DiscoverySettings,
  JoinRequestsPanel,
  PossibleAthletesPanel,
} from "@/components/ranking/discovery";
import {
  CLASS_LABELS,
  FORMAT_LABELS,
  HAND_LABELS,
  Head2HeadRow,
  LeagueDetail,
  LeagueMember,
  MATCH_STATUS_LABELS,
  MEMBER_STATUS_LABELS,
  MemberStatus,
  MyLeagueMatch,
  MyPointsRow,
  PlayerLeagueMatch,
  PlayerRoundPoints,
  PlayerTournament,
  RankingPlayerProfile,
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
  | "quadras"
  | "regras"
  | "sobre";

const TABS: { key: Tab; label: string }[] = [
  { key: "classificacao", label: "Classificação" },
  { key: "rodadas", label: "Rodadas" },
  { key: "jogos_marcados", label: "Jogos Marcados" },
  { key: "meus_jogos", label: "Meus Jogos" },
  { key: "minha_pontuacao", label: "Minha Pontuação" },
  { key: "quadras", label: "Quadras" },
  { key: "regras", label: "Regras" },
  { key: "sobre", label: "Sobre" },
];

export function LeagueView({ leagueId, meId }: { leagueId: string; meId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [league, setLeague] = useState<LeagueDetail | null>(null);
  const [tab, setTab] = useState<Tab>("classificacao");
  const [notMember, setNotMember] = useState(false);
  const [joinMsg, setJoinMsg] = useState<string | null>(null);

  const loadLeague = useCallback(async () => {
    const { data } = await supabase.rpc("get_league", { p_league_id: leagueId });
    const l = (data as unknown as LeagueDetail[] | null)?.[0] ?? null;
    setLeague(l);
    if (l && !l.am_member) setNotMember(true);
  }, [supabase, leagueId]);

  useEffect(() => {
    loadLeague();
  }, [loadLeague]);

  async function requestJoin() {
    setJoinMsg(null);
    const { error } = await supabase.rpc("request_league_join", {
      p_league_id: leagueId,
      p_message: null,
    });
    setJoinMsg(
      error
        ? error.message
        : "Solicitação enviada! O organizador vai analisar e você será avisado.",
    );
  }

  if (!league) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-amber-50/40 text-amber-700">
        <div className="animate-pulse text-4xl">🏆</div>
      </main>
    );
  }

  const isManager = league.is_organizer || league.is_owner;

  // Liga arquivada: jogador comum não acessa
  if (league.status === "arquivado" && !isManager) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-amber-50/40 px-6 text-center">
        <div>
          <div className="text-5xl">🏁</div>
          <h1 className="mt-3 text-xl font-extrabold text-slate-800">Competição encerrada</h1>
          <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">
            Esta liga foi encerrada pela organização e não está mais disponível.
          </p>
          <Link href="/ranking" className="btn-primary mt-6 inline-block">
            Voltar aos rankings
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-amber-50/40">
      <header className="pt-safe bg-gradient-to-br from-amber-500 to-amber-700 px-5 pb-14 text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="text-sm font-semibold text-amber-50">
              ← Voltar
            </button>
            <Link href="/inicio" className="text-sm font-semibold text-amber-50">
              🏠 Início
            </Link>
          </div>
          {(league.is_organizer || league.is_owner) && (
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/25">
              organizador
            </span>
          )}
        </div>
        <div className="mx-auto mt-5 max-w-3xl">
          {league.club_name && (
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-100">
              🎾 {league.club_name}
            </div>
          )}
          <h1 className="text-2xl font-extrabold">🏆 {league.name}</h1>
          {league.am_member && (
            <div className="mt-2">
              <StatusBadge leagueId={league.id} meId={meId} isManager={isManager} />
            </div>
          )}
          <p className="mt-2 text-sm text-amber-50">
            {league.city ? `${league.city} · ` : ""}
            {league.member_count} jogador{league.member_count === 1 ? "" : "es"}
            {league.current_round_number ? ` · rodada ${league.current_round_number}` : ""}
          </p>
        </div>
      </header>

      <div className="mx-auto -mt-8 max-w-3xl px-4 pb-24">
        {league.status === "arquivado" && (
          <div className="mb-4 rounded-2xl bg-red-100 px-4 py-3 text-sm text-red-800">
            🏁 Esta liga está <strong>arquivada</strong>. Ela não aparece para os jogadores e não
            aceita novos jogos ou agendamentos.
          </div>
        )}
        {notMember && (
          <div className="mb-4 rounded-2xl bg-amber-100 px-4 py-3 text-sm text-amber-800">
            {joinMsg ? (
              <span>{joinMsg}</span>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span>Você não participa deste ranking.</span>
                <button onClick={requestJoin} className="btn-primary shrink-0 text-sm">
                  Solicitar entrada
                </button>
              </div>
            )}
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
          {tab === "quadras" && <CourtsConfig leagueId={leagueId} />}
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
  const [sel, setSel] = useState<Standing | null>(null);
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
            <tr
              key={r.player_id}
              onClick={() => setSel(r)}
              className={cx(
                "cursor-pointer transition hover:bg-amber-50/60",
                r.player_id === meId && "bg-amber-50",
              )}
            >
              <td className="py-2.5 pr-2 font-bold text-slate-400">{r.pos}º</td>
              <td className="py-2.5">
                <div className="flex items-center gap-2">
                  {r.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                      {initials(r.name)}
                    </div>
                  )}
                  <span className="font-medium underline-offset-2 hover:underline">{r.name}</span>
                </div>
              </td>
              <td className="py-2.5 text-right text-slate-500">{Number(r.games)}</td>
              <td className="py-2.5 pl-2 text-right font-bold text-amber-700">{Number(r.points)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-center text-[11px] text-slate-400">
        Toque em um jogador para ver os jogos e a pontuação dele.
      </p>
      {sel && <PlayerProfile leagueId={leagueId} meId={meId} player={sel} onClose={() => setSel(null)} />}
    </div>
  );
}

/* ---------------- Página pública de um jogador (abas) ---------------- */
type PTab = "h2h" | "perfil" | "jogos" | "pontuacao" | "torneios";

function PlayerProfile({
  leagueId,
  meId,
  player,
  onClose,
}: {
  leagueId: string;
  meId: string;
  player: Standing;
  onClose: () => void;
}) {
  const supabase = createClient();
  const [tab, setTab] = useState<PTab>("h2h");
  const [matches, setMatches] = useState<PlayerLeagueMatch[] | null>(null);
  const [profile, setProfile] = useState<RankingPlayerProfile | null>(null);
  const [tours, setTours] = useState<PlayerTournament[] | null>(null);
  const [status, setStatus] = useState<MemberStatus | null>(null);

  useEffect(() => {
    supabase
      .rpc("get_player_league_matches", { p_league_id: leagueId, p_player_id: player.player_id })
      .then(({ data }) => setMatches((data as unknown as PlayerLeagueMatch[]) ?? []));
    supabase.rpc("get_league_members", { p_league_id: leagueId }).then(({ data }) => {
      const list = (data as unknown as LeagueMember[]) ?? [];
      setStatus(list.find((mm) => mm.player_id === player.player_id)?.status ?? null);
    });
  }, [supabase, leagueId, player.player_id]);

  useEffect(() => {
    if (tab === "perfil" && profile === null) {
      supabase
        .rpc("get_ranking_player_profile", { p_player_id: player.player_id })
        .then(({ data }) => setProfile(((data as unknown as RankingPlayerProfile[]) ?? [])[0] ?? null));
    }
    if (tab === "torneios" && tours === null) {
      supabase
        .rpc("get_player_tournaments", { p_player_id: player.player_id })
        .then(({ data }) => setTours((data as unknown as PlayerTournament[]) ?? []));
    }
  }, [tab, profile, tours, supabase, player.player_id]);

  const tabs: [PTab, string][] = [
    ["h2h", "Head2Head"],
    ["perfil", "Perfil"],
    ["jogos", "Jogos"],
    ["pontuacao", "Pontuação"],
    ["torneios", "Torneios"],
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-amber-50/40">
      <header className="pt-safe bg-gradient-to-br from-amber-500 to-amber-700 px-5 pb-5 text-white">
        <div className="mx-auto max-w-2xl">
          <button onClick={onClose} className="text-sm font-semibold text-amber-50">← Voltar à classificação</button>
          <div className="mt-4 flex items-center gap-3">
            {player.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={player.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-white/40" />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-full bg-white/20 text-xl font-bold">
                {initials(player.name)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-xl font-extrabold">#{player.pos} {player.name}</div>
              <div className="text-sm text-amber-50">
                Pontuação atual: <strong>{Number(player.points)} pts</strong>
              </div>
              <div className="text-sm text-amber-50">Categoria {CLASS_LABELS[player.skill_class]}</div>
              {status && (
                <div className="text-sm text-amber-50">Status: <strong>{MEMBER_STATUS_LABELS[status]}</strong></div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Abas */}
      <div className="sticky top-0 z-10 border-b border-amber-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl gap-1 overflow-x-auto px-3 py-2">
          {tabs.map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={cx(
                "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition",
                tab === k ? "bg-amber-600 text-white" : "text-slate-500 hover:bg-amber-50",
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-5 pb-24">
        {tab === "h2h" && <H2HView leagueId={leagueId} meId={meId} player={player} />}
        {tab === "perfil" && <PerfilView profile={profile} />}
        {tab === "jogos" && <JogosView matches={matches} playerName={player.name} />}
        {tab === "pontuacao" && <PontuacaoView leagueId={leagueId} playerId={player.player_id} />}
        {tab === "torneios" && <TorneiosView tours={tours} />}
      </div>
    </div>
  );
}

/* -------- Head2Head -------- */
function WinRing({ a, b, hideCenter }: { a: number; b: number; hideCenter?: boolean }) {
  const total = a + b;
  const frac = total ? a / total : 0;
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28 shrink-0">
      <circle cx="60" cy="60" r={r} fill="none" stroke="#e2e8f0" strokeWidth="14" />
      {total > 0 && (
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="14"
          strokeDasharray={`${frac * c} ${c}`}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
        />
      )}
      {!hideCenter && (
        <text x="60" y="61" textAnchor="middle" dominantBaseline="central" fontSize="30" fontWeight="800" className="fill-slate-800">
          {a}
        </text>
      )}
    </svg>
  );
}

function H2HView({ leagueId, meId, player }: { leagueId: string; meId: string; player: Standing }) {
  const supabase = createClient();
  const aId = player.player_id;
  const [members, setMembers] = useState<Standing[] | null>(null);
  const [opponentId, setOpponentId] = useState(meId === aId ? "" : meId);
  const [profileA, setProfileA] = useState<RankingPlayerProfile | null>(null);
  const [profileB, setProfileB] = useState<RankingPlayerProfile | null>(null);
  const [h2h, setH2h] = useState<Head2HeadRow[] | null>(null);

  useEffect(() => {
    supabase
      .rpc("get_league_standings", { p_league_id: leagueId })
      .then(({ data }) => setMembers((data as unknown as Standing[]) ?? []));
    supabase
      .rpc("get_ranking_player_profile", { p_player_id: aId })
      .then(({ data }) => setProfileA(((data as unknown as RankingPlayerProfile[]) ?? [])[0] ?? null));
  }, [supabase, leagueId, aId]);

  useEffect(() => {
    supabase
      .rpc("get_head2head", { p_league_id: leagueId, p_a: aId, p_b: opponentId || aId })
      .then(({ data }) => setH2h((data as unknown as Head2HeadRow[]) ?? []));
    setProfileB(null);
    if (opponentId) {
      supabase
        .rpc("get_ranking_player_profile", { p_player_id: opponentId })
        .then(({ data }) => setProfileB(((data as unknown as RankingPlayerProfile[]) ?? [])[0] ?? null));
    }
  }, [supabase, leagueId, aId, opponentId]);

  const a = h2h?.find((r) => r.player_id === aId);
  const b = opponentId ? h2h?.find((r) => r.player_id === opponentId) : undefined;
  const hasOpp = !!opponentId;

  const natural = (p: RankingPlayerProfile | null) => (p ? [p.city, p.state].filter(Boolean).join(" - ") || null : null);
  const height = (p: RankingPlayerProfile | null) => (p?.height_cm ? `${(p.height_cm / 100).toFixed(2).replace(".", ",")} m` : null);
  const start = (p: RankingPlayerProfile | null) => (p ? new Date(p.created_at).toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" }) : null);
  const age = (p: RankingPlayerProfile | null) => { const x = p ? calcAge(p.birthdate) : null; return x ? String(x) : null; };
  const hand = (p: RankingPlayerProfile | null) => (p?.dominant_hand ? HAND_LABELS[p.dominant_hand] : null);
  const best = (row?: Head2HeadRow) => (row?.best_pos ? `${row.best_pos}º / ${CLASS_LABELS[row.skill_class]}` : null);

  const rows: [string, string | number | null, string | number | null][] = [
    ["Nome", profileA?.name ?? player.name, profileB?.name ?? null],
    ["Idade", age(profileA), age(profileB)],
    ["Natural", natural(profileA), natural(profileB)],
    ["Lateral", hand(profileA), hand(profileB)],
    ["Altura", height(profileA), height(profileB)],
    ["Sets vencidos", a?.sets_won ?? 0, hasOpp ? b?.sets_won ?? 0 : null],
    ["Games vencidos", a?.games_won ?? 0, hasOpp ? b?.games_won ?? 0 : null],
    ["Início em", start(profileA), start(profileB)],
    ["Melhor posição", best(a), hasOpp ? best(b) : null],
  ];

  const oppSelectCls = "appearance-none rounded-full bg-amber-600 px-5 py-2.5 text-center text-xs font-bold uppercase tracking-wide text-white";

  return (
    <div className="space-y-4">
      {/* Vitórias (anel) + escolher oponente */}
      <div className="rounded-3xl bg-white p-5 shadow-card">
        <div className="flex items-center justify-center gap-5">
          <div className="text-center">
            <div className="text-4xl font-black text-amber-600">{a?.h2h_wins ?? 0}</div>
            <div className="text-xs font-semibold text-slate-400">Vitórias</div>
          </div>
          <WinRing a={a?.h2h_wins ?? 0} b={b?.h2h_wins ?? 0} />
        </div>
        {members !== null && (
          <div className="mt-4 flex justify-center">
            <select className={oppSelectCls} value={opponentId} onChange={(e) => setOpponentId(e.target.value)}>
              <option value="">Escolher oponente</option>
              {members
                .filter((m) => m.player_id !== aId)
                .map((m) => (
                  <option key={m.player_id} value={m.player_id}>
                    {m.player_id === meId ? `${m.name} (você)` : m.name}
                  </option>
                ))}
            </select>
          </div>
        )}
        <div className="mt-3 text-center text-xs text-slate-400">
          {!hasOpp
            ? "Escolha um oponente para ver o confronto direto."
            : a?.played
              ? `${a.played} jogo(s) entre os dois · ${b?.name?.split(" ")[0]} venceu ${b?.h2h_wins ?? 0}`
              : "Eles ainda não se enfrentaram nesta liga."}
        </div>
      </div>

      {/* Tabela comparativa (perfil + confronto) */}
      <div className="rounded-3xl bg-white p-2 shadow-card">
        {rows.map(([label, av, bv]) => (
          <div key={label} className="flex items-center gap-2 border-b border-slate-50 px-3 py-2.5 last:border-0">
            <div className="w-24 truncate text-right text-sm font-bold text-slate-700">{av ?? "—"}</div>
            <div className="flex-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
            <div className="w-24 truncate text-left text-sm font-bold text-slate-700">{hasOpp ? bv ?? "—" : ""}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------- Perfil -------- */
function PerfilView({ profile }: { profile: RankingPlayerProfile | null }) {
  if (!profile) return <Loading />;
  const age = calcAge(profile.birthdate);
  const fields: [string, string | null][] = [
    ["Cidade", [profile.city, profile.state].filter(Boolean).join(" · ") || null],
    ["Idade", age ? `${age} anos` : null],
    ["Gênero", profile.gender],
    ["Mão dominante", profile.dominant_hand ? HAND_LABELS[profile.dominant_hand] : null],
    ["Altura", profile.height_cm ? `${(profile.height_cm / 100).toFixed(2).replace(".", ",")} m` : null],
    ["Formato de jogo", FORMAT_LABELS[profile.play_format]],
    ["Classe", CLASS_LABELS[profile.skill_class]],
    ["Clubes", profile.clubs],
    ["Disponibilidade", profile.availability?.length ? profile.availability.join(", ") : null],
    ["Telefone", profile.phone],
    ["Membro desde", new Date(profile.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })],
  ];
  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-white p-2 shadow-card">
        {fields.map(([label, val]) => (
          <div key={label} className="flex items-center justify-between gap-3 border-b border-slate-50 px-3 py-3 last:border-0">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
            <span className="text-right text-sm font-medium text-slate-700">{val ?? "—"}</span>
          </div>
        ))}
      </div>
      {profile.bio && (
        <div className="rounded-3xl bg-white p-5 shadow-card">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Sobre</div>
          <p className="text-sm text-slate-600">{profile.bio}</p>
        </div>
      )}
    </div>
  );
}

/* -------- Jogos (placar por rodada, dois jogadores) -------- */
function JogosView({ matches, playerName }: { matches: PlayerLeagueMatch[] | null; playerName: string }) {
  if (!matches) return <Loading />;
  if (matches.length === 0) return <Empty text="Este jogador ainda não tem jogos." />;

  const byRound = new Map<number, PlayerLeagueMatch[]>();
  for (const m of matches) {
    if (!byRound.has(m.round_number)) byRound.set(m.round_number, []);
    byRound.get(m.round_number)!.push(m);
  }
  const rounds = [...byRound.keys()].sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      {rounds.map((rn) => (
        <div key={rn}>
          <div className="mb-1 text-sm font-extrabold uppercase tracking-wide text-amber-600">Rodada {rn}</div>
          <div>
            {byRound.get(rn)!.map((m) => (
              <div key={m.match_id} className="border-b border-dashed border-slate-200 py-1 last:border-0">
                <MatchScore m={m} playerName={playerName} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MatchScore({ m, playerName }: { m: PlayerLeagueMatch; playerName: string }) {
  const played = m.status === "jogado";
  const games = m.games ?? [];
  const challengerName = m.is_challenger ? playerName : m.opponent_name;
  const challengedName = m.is_challenger ? m.opponent_name : playerName;
  const challengerWon =
    played && (m.is_challenger ? (m.sets_player ?? 0) > (m.sets_opp ?? 0) : (m.sets_opp ?? 0) > (m.sets_player ?? 0));

  const side = (name: string, role: string, won: boolean, key: "c" | "d") => (
    <div className="flex items-center gap-3 py-2">
      <span
        className={cx(
          "grid h-6 w-6 shrink-0 place-items-center rounded-md text-xs font-black text-white",
          !played ? "bg-slate-300" : won ? "bg-court-600" : "bg-red-500",
        )}
      >
        {played ? (won ? "V" : "D") : "·"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-700">{name}</div>
        <div className="text-[11px] text-slate-400">({role})</div>
      </div>
      {played && games.length > 0 ? (
        <div className="flex shrink-0 gap-3 tabular-nums">
          {[0, 1, 2].map((i) => (
            <span key={i} className={cx("w-4 text-right text-sm font-bold", won ? "text-slate-800" : "text-slate-400")}>
              {games[i] ? games[i][key] : 0}
            </span>
          ))}
        </div>
      ) : (
        <span className="shrink-0 text-[10px] font-semibold uppercase text-slate-400">
          {played ? (won ? "Vitória" : "Derrota") : MATCH_STATUS_LABELS[m.status]}
        </span>
      )}
    </div>
  );

  return (
    <>
      {side(challengerName, "Desafiante", challengerWon, "c")}
      {side(challengedName, "Desafiado", played && !challengerWon, "d")}
    </>
  );
}

/* -------- Pontuação (tabela por rodada) -------- */
function PontuacaoView({ leagueId, playerId }: { leagueId: string; playerId: string }) {
  const supabase = createClient();
  const [rows, setRows] = useState<PlayerRoundPoints[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .rpc("get_player_round_points", { p_league_id: leagueId, p_player_id: playerId })
      .then(({ data }) => setRows((data as unknown as PlayerRoundPoints[]) ?? []));
  }, [supabase, leagueId, playerId]);

  if (!rows) return <Loading />;
  if (rows.length === 0) return <Empty text="Sem rodadas ainda." />;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-xs text-slate-500">
        <span>ℹ️</span>
        <span>A pontuação é a soma das últimas 10 rodadas.</span>
      </div>
      <div className="rounded-3xl bg-white p-2 shadow-card">
        <div className="flex items-center gap-3 px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          <span className="w-10">rodada</span>
          <span className="flex-1">data</span>
          <span className="w-16 text-right">pts na rodada</span>
          <span className="w-10 text-center">detalhar</span>
        </div>
        {rows.map((r) => {
          const isOpen = open === r.round_number;
          const out =
            r.status === "jogado" && r.sets_player != null && r.sets_opp != null
              ? r.sets_player > r.sets_opp
                ? "win"
                : "loss"
              : null;
          return (
            <div key={r.round_number} className="border-t border-slate-50">
              <div className="flex items-center gap-3 px-3 py-2">
                <span className="grid h-8 w-10 shrink-0 place-items-center rounded-lg bg-slate-500 text-xs font-black text-white">
                  {r.round_number}
                </span>
                <span className="flex-1 text-sm text-slate-600">{new Date(r.round_date).toLocaleDateString("pt-BR")}</span>
                <span className="w-16 text-right text-sm font-bold text-slate-700">{Number(r.points)}</span>
                <button onClick={() => setOpen(isOpen ? null : r.round_number)} className="grid w-10 place-items-center" aria-label="Detalhar">
                  <span className="grid h-7 w-7 place-items-center rounded-full text-slate-500 ring-1 ring-slate-300">{isOpen ? "−" : "+"}</span>
                </button>
              </div>
              {isOpen && (
                <div className="px-3 pb-3">
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                    <span className="truncate text-sm">
                      vs <span className="font-medium">{r.opponent_name}</span>
                      {out && (
                        <span className={cx("ml-2 text-xs font-bold", out === "win" ? "text-court-700" : "text-red-600")}>
                          {out === "win" ? "Vitória" : "Derrota"}
                        </span>
                      )}
                    </span>
                    {r.status === "jogado" ? (
                      <span className="text-base font-extrabold">
                        {r.sets_player}<span className="mx-0.5 text-slate-300">x</span>{r.sets_opp}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold uppercase text-slate-400">{MATCH_STATUS_LABELS[r.status]}</span>
                    )}
                  </div>
                  {formatGames(r.games) && <div className="mt-1 px-1 text-[11px] text-slate-400">{formatGames(r.games)}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------- Torneios -------- */
function tourIcon(placement: string) {
  if (placement === "Campeão") return "🏆";
  if (placement === "Vice-campeão") return "🥈";
  if (placement === "Semifinalista") return "🥉";
  return "🎾";
}

function TorneiosView({ tours }: { tours: PlayerTournament[] | null }) {
  if (!tours) return <Loading />;
  const wins = tours.reduce((s, t) => s + Number(t.wins), 0);
  const losses = tours.reduce((s, t) => s + Number(t.losses), 0);

  return (
    <div className="space-y-5">
      {/* Vitórias x derrotas */}
      <div className="rounded-3xl bg-white p-5 shadow-card">
        <div className="flex items-center justify-center gap-5">
          <div className="text-right">
            <div className="text-2xl font-black text-amber-600">{wins}</div>
            <div className="text-xs text-slate-400">vitórias</div>
          </div>
          <WinRing a={wins} b={losses} hideCenter />
          <div className="text-left">
            <div className="text-2xl font-black text-slate-400">{losses}</div>
            <div className="text-xs text-slate-400">derrotas</div>
          </div>
        </div>
      </div>

      {/* Conquistas */}
      {tours.length === 0 ? (
        <Empty text="Este jogador ainda não participou de torneios." />
      ) : (
        <div className="rounded-3xl bg-white p-2 shadow-card">
          {tours.map((t) => (
            <div
              key={`${t.tournament_id}-${t.category_id}`}
              className="flex items-start gap-3 border-b border-dashed border-slate-200 px-3 py-3 last:border-0"
            >
              <span className="text-xl leading-none">{tourIcon(t.placement)}</span>
              <div className="min-w-0 flex-1 text-sm text-slate-600">
                <span className="font-bold text-amber-700">{t.placement}</span> em{" "}
                <span className="font-semibold text-slate-700">{t.tournament_name}</span>
                {" — "}
                {t.category_name}
                <span className="ml-1 whitespace-nowrap text-xs text-slate-400">· {Number(t.wins)}V/{Number(t.losses)}D</span>
              </div>
            </div>
          ))}
        </div>
      )}
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
      {(league.is_organizer || league.is_owner) && (
        <button onClick={generate} disabled={busy} className="btn-primary mb-4 w-full text-sm">
          {busy ? "Sorteando..." : "🎲 Gerar nova rodada"}
        </button>
      )}

      {rounds.length === 0 ? (
        <Empty text={(league.is_organizer || league.is_owner) ? "Gere a primeira rodada acima." : "Nenhuma rodada ainda."} />
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
                  canReport={(league.is_organizer || league.is_owner) || m.challenger_id === meId || m.challenged_id === meId}
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
  const [open, setOpen] = useState(false);
  const played = m.status === "jogado";
  const canceled = m.status === "cancelado";
  const isCuringa = m.result_type === "curinga";
  const gamesLabel = formatGames(m.games);

  if (isCuringa) {
    return (
      <li className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
        <div className="flex items-center justify-between gap-2">
          <PlayerMini name={m.challenger_name} avatar={m.challenger_avatar} />
          <div className="shrink-0 text-center">
            <div className="text-sm font-extrabold text-amber-700">CURINGA</div>
            <div className="text-[10px] uppercase text-amber-500">+6 pts</div>
          </div>
          <div className="flex-1" />
        </div>
      </li>
    );
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
            {m.result_type === "wo" ? "WO" : MATCH_STATUS_LABELS[m.status]}
          </div>
        </div>
        <PlayerMini name={m.challenged_name} avatar={m.challenged_avatar} right />
      </div>

      {played && (
        <div className="mt-1 text-center text-[11px] text-amber-700">
          {gamesLabel && <span className="mr-2 text-slate-400">{gamesLabel}</span>}
          {Number(m.challenger_points)} × {Number(m.challenged_points)} pts
        </div>
      )}

      {canReport && !played && !canceled && (
        <div className="mt-2">
          {open ? (
            <ResultForm
              matchId={m.match_id}
              leftName={m.challenger_name}
              rightName={m.challenged_name}
              onDone={() => {
                setOpen(false);
                onReported();
              }}
              onCancel={() => setOpen(false)}
            />
          ) : (
            <div className="text-center">
              <button onClick={() => setOpen(true)} className="text-xs font-semibold text-amber-700">
                Lançar resultado
              </button>
            </div>
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
        <img src={avatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" loading="lazy" decoding="async" />
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
        <MyMatchCard key={m.match_id} m={m} leagueId={leagueId} onChange={load} />
      ))}
    </ul>
  );
}

function MyMatchCard({
  m,
  leagueId,
  onChange,
}: {
  m: MyLeagueMatch;
  leagueId: string;
  onChange: () => void;
}) {
  const [mode, setMode] = useState<null | "agendar" | "resultado">(null);
  const played = m.status === "jogado";
  const gamesLabel = formatGames(m.games);

  return (
    <li className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-center gap-3">
        {m.opponent_avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.opponent_avatar} alt="" className="h-11 w-11 rounded-full object-cover" loading="lazy" decoding="async" />
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
            {gamesLabel && <div className="text-[10px] text-slate-400">{gamesLabel}</div>}
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
            <div className="w-full">
              <CourtScheduler
                leagueId={leagueId}
                matchId={m.match_id}
                onDone={() => {
                  setMode(null);
                  onChange();
                }}
                onCancel={() => setMode(null)}
              />
            </div>
          )}

          {mode === "resultado" && (
            <div className="w-full">
              <ResultForm
                matchId={m.match_id}
                leftName={m.am_challenger ? "Você" : m.opponent_name}
                rightName={m.am_challenger ? m.opponent_name : "Você"}
                onDone={() => {
                  setMode(null);
                  onChange();
                }}
                onCancel={() => setMode(null)}
              />
            </div>
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
        Cada partida vale pontos — não é mata-mata. A cada rodada o sistema sorteia
        um confronto contra alguém próximo de você na classificação. O
        <strong> desafiante</strong> é sempre quem está mais abaixo no ranking.
      </Section>
      <Section title="Pontuação — soma das últimas 10 rodadas">
        Sua nota é a <strong>soma dos seus últimos 10 resultados</strong>. Ao entrar a
        11ª rodada, a mais antiga sai — igual ao circuito da ATP.
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-slate-50 p-2">
            <div className="font-bold text-slate-700">Desafiante vence</div>
            <div>2x0 → <strong>10</strong> · 2x1 → <strong>8</strong></div>
            <div className="mt-1 font-bold text-slate-700">Desafiante perde</div>
            <div>2x0 → <strong>2</strong> · 2x1 → <strong>4</strong></div>
          </div>
          <div className="rounded-xl bg-slate-50 p-2">
            <div className="font-bold text-slate-700">Desafiado vence</div>
            <div>2x0 → <strong>9</strong> · 2x1 → <strong>7</strong></div>
            <div className="mt-1 font-bold text-slate-700">Desafiado perde</div>
            <div>2x0 → <strong>1</strong> · 2x1 → <strong>3</strong></div>
          </div>
        </div>
      </Section>
      <Section title="Placar e sets">
        Ao lançar o resultado, informe os <strong>games de cada set</strong>. Um set
        vai até <strong>6 games</strong> (com 2 de vantagem); em <strong>5-5</strong>
        vai a 7; em <strong>6-6</strong> joga-se o <strong>tie-break</strong> (7-6). No
        <strong> pró-set</strong>, vence quem fizer mais games e pontua como um 2x1.
      </Section>
      <Section title="Bônus">
        Se o perdedor fizer no máximo <strong>2 games</strong> na partida, o vencedor
        ganha <strong>+3 pontos</strong> de bônus (válido só na rodada atual).
      </Section>
      <Section title="WO e Curinga">
        No WO, o vencedor recebe <strong>6 pontos</strong> e o perdedor não pontua.
        Se a classe tiver número ímpar de jogadores, o pior colocado enfrenta o
        <strong> CURINGA</strong> e recebe <strong>6 pontos</strong> na rodada.
      </Section>
      <Section title="Situação do jogador">
        <ul className="list-disc pl-5">
          <li><strong>Ativo:</strong> entra normalmente no sorteio.</li>
          <li><strong>Licenciado:</strong> fica de fora das rodadas até voltar a ativo.</li>
          <li><strong>Suspenso:</strong> retirado das rodadas e não pontua.</li>
          <li><strong>Desativado:</strong> saída do ranking.</li>
        </ul>
        O organizador altera a situação de cada jogador no painel da aba <em>Sobre</em>.
      </Section>
      <Section title="Marcação dos jogos">
        Combine o jogo com o adversário pelo WhatsApp na aba <em>Jogos Marcados</em>.
        Depois de jogar, qualquer um dos dois lança o placar. Jogo sem resultado
        informado não pontua para ninguém.
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
      {(league.is_organizer || league.is_owner) && (
        <button onClick={() => setEdit(true)} className="text-sm font-semibold text-amber-700">
          Editar informações
        </button>
      )}

      {(league.is_owner || league.is_organizer) && (
        <>
          <DiscoverySettings leagueId={league.id} />
          <JoinRequestsPanel leagueId={league.id} onChange={onChange} />
          <PossibleAthletesPanel leagueId={league.id} />
          <MembersPanel league={league} onChange={onChange} />
        </>
      )}

      {(league.is_owner || league.is_organizer) && league.status === "ativo" && (
        <DeleteLeague league={league} />
      )}
    </div>
  );
}

/* ---------------- Excluir (arquivar) liga ---------------- */
function DeleteLeague({ league }: { league: LeagueDetail }) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function doDelete() {
    setBusy(true);
    setErr(null);
    const { error } = await supabase.rpc("delete_league", {
      p_league_id: league.id,
      p_reason: reason || null,
      p_confirm_name: confirmName,
    });
    setBusy(false);
    if (error) return setErr(error.message);
    router.push("/ranking");
  }

  return (
    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
      <div className="text-sm font-bold text-red-700">Zona de risco</div>
      <p className="mt-1 text-xs text-red-600">
        Excluir arquiva a liga: some para os jogadores, cancela jogos futuros e libera as quadras.
        Resultados e histórico são preservados.
      </p>
      {!open ? (
        <button
          onClick={() => {
            setOpen(true);
            setConfirmName("");
            setReason("");
            setErr(null);
          }}
          className="mt-3 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white"
        >
          Excluir liga
        </button>
      ) : (
        <div className="mt-3 space-y-3 rounded-xl bg-white p-3">
          <div className="text-sm">
            <div className="font-bold text-slate-800">{league.name}</div>
            <div className="text-xs text-slate-500">
              Clube: {league.club_name ?? "—"}
            </div>
          </div>
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
            ⚠️ Todos os jogos futuros serão cancelados e as reservas de quadra liberadas. Esta ação
            encerra a competição.
          </div>
          <div>
            <label className="label">Motivo (opcional)</label>
            <input
              className="input"
              placeholder="Ex.: fim da temporada"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div>
            <label className="label">
              Digite <span className="font-bold">{league.name}</span> para confirmar
            </label>
            <input
              className="input"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={league.name}
            />
          </div>
          {err && <p className="text-xs text-red-600">{err}</p>}
          <div className="flex gap-2">
            <button
              onClick={doDelete}
              disabled={busy || confirmName.trim() !== league.name}
              className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
            >
              {busy ? "Excluindo..." : "Confirmar exclusão"}
            </button>
            <button onClick={() => setOpen(false)} className="btn-ghost text-xs">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Badge de status no cabeçalho ---------------- */
const STATUS_STYLE: Record<MemberStatus, { label: string; dot: string; pill: string }> = {
  ativo: { label: "Ativo", dot: "bg-green-500", pill: "bg-green-100 text-green-800" },
  licenciado: { label: "Licenciado", dot: "bg-amber-400", pill: "bg-amber-100 text-amber-800" },
  desativado: { label: "Desativado", dot: "bg-slate-400", pill: "bg-slate-100 text-slate-700" },
  suspenso: { label: "Suspenso", dot: "bg-red-500", pill: "bg-red-100 text-red-800" },
};

function StatusBadge({
  leagueId,
  meId,
  isManager,
}: {
  leagueId: string;
  meId: string;
  isManager: boolean;
}) {
  const supabase = createClient();
  const [status, setStatus] = useState<MemberStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("get_my_member_status", { p_league_id: leagueId });
    setStatus((data as unknown as MemberStatus | null) ?? null);
  }, [supabase, leagueId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!status) return null;

  // Jogador comum: ativo/licenciado/desativado. Gestor: também suspenso.
  const options: MemberStatus[] = isManager
    ? ["ativo", "licenciado", "suspenso", "desativado"]
    : ["ativo", "licenciado", "desativado"];
  // Suspensão só sai/entra pela organização.
  const canChange = isManager || status !== "suspenso";
  const st = STATUS_STYLE[status];

  async function change(s: MemberStatus) {
    if (s === status) return setOpen(false);
    const prev = status;
    // atualização otimista: reflete na hora e confirma no backend
    setStatus(s);
    setOpen(false);
    setBusy(true);
    const { error } = await supabase.rpc("set_member_status", {
      p_league_id: leagueId,
      p_player_id: meId,
      p_status: s,
    });
    setBusy(false);
    if (error) {
      setStatus(prev); // reverte se falhar
    }
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => canChange && setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-sm ${st.pill} ${
          canChange ? "" : "cursor-default"
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${st.dot}`} />
        {st.label}
        {canChange && <span className="opacity-60">▾</span>}
      </button>

      {open && (
        <>
          <button className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} aria-label="Fechar" />
          <div className="absolute left-0 top-9 z-50 w-56 rounded-2xl bg-white p-1.5 text-left text-slate-800 shadow-2xl ring-1 ring-slate-200">
            <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Meu status
            </div>
            {options.map((s) => {
              const o = STATUS_STYLE[s];
              return (
                <button
                  key={s}
                  disabled={busy}
                  onClick={() => change(s)}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                    status === s ? "bg-slate-50 font-semibold" : "hover:bg-slate-50"
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${o.dot}`} />
                  {o.label}
                  {status === s && <span className="ml-auto text-court-600">✓</span>}
                </button>
              );
            })}
            {!isManager && (
              <p className="px-3 py-1.5 text-[10px] text-slate-400">
                Suspensão é aplicada apenas pela organização.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- Painel de membros: status + organizador ---------------- */
const STATUS_OPTIONS: MemberStatus[] = ["ativo", "licenciado", "suspenso", "desativado"];

function MembersPanel({
  league,
  onChange,
}: {
  league: LeagueDetail;
  onChange: () => void;
}) {
  const supabase = createClient();
  const [members, setMembers] = useState<LeagueMember[] | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("get_league_members", { p_league_id: league.id });
    setMembers((data as unknown as LeagueMember[]) ?? []);
  }, [supabase, league.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function makeOrganizer(playerId: string) {
    setBusy(true);
    setMsg(null);
    await supabase.rpc("set_league_organizer", { p_league_id: league.id, p_player_id: playerId });
    setBusy(false);
    await load();
    onChange();
  }

  async function setStatus(playerId: string, status: MemberStatus) {
    setBusy(true);
    setMsg(null);
    await supabase.rpc("set_member_status", {
      p_league_id: league.id,
      p_player_id: playerId,
      p_status: status,
    });
    setBusy(false);
    await load();
  }

  async function removeMember(m: LeagueMember) {
    if (!confirm(`Remover ${m.name} deste ranking?`)) return;
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.rpc("remove_league_member", {
      p_league_id: league.id,
      p_player_id: m.player_id,
    });
    setBusy(false);
    if (error) return setMsg(error.message);
    await load();
    onChange();
  }

  async function addByEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setMsg(null);
    const { data } = await supabase.rpc("add_league_member", {
      p_league_id: league.id,
      p_email: email.trim(),
    });
    setBusy(false);
    if (data === "não encontrado") setMsg("Login não encontrado (precisa ter conta no app).");
    setEmail("");
    load();
  }

  return (
    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-center gap-2 text-sm font-bold text-amber-800">
        🛠️ Painel do organizador — jogadores e status
      </div>
      <p className="mt-1 text-xs text-amber-700">
        Só jogadores <strong>Ativos</strong> entram no sorteio. Licenciados, suspensos e
        desativados ficam fora das rodadas.
      </p>

      {league.is_owner && (
        <form onSubmit={addByEmail} className="mt-3 flex gap-2">
          <input
            className="input flex-1"
            placeholder="Adicionar login por email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="btn-ghost text-sm">Add</button>
        </form>
      )}
      {msg && <p className="mt-2 text-xs text-red-600">{msg}</p>}

      <ul className="mt-3 space-y-1.5">
        {(members ?? []).map((m) => (
          <li
            key={m.player_id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm"
          >
            <div className="flex min-w-0 items-center gap-2">
              {m.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" loading="lazy" decoding="async" />
              ) : (
                <div className="grid h-7 w-7 place-items-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
                  {initials(m.name)}
                </div>
              )}
              <span className="truncate">{m.name}</span>
              {m.is_organizer && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                  organizador
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={m.status}
                disabled={busy}
                onChange={(e) => setStatus(m.player_id, e.target.value as MemberStatus)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {MEMBER_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              {league.is_owner && !m.is_organizer && (
                <button
                  onClick={() => makeOrganizer(m.player_id)}
                  disabled={busy}
                  className="text-xs font-semibold text-amber-700"
                >
                  Organizador
                </button>
              )}
              {!m.is_organizer && (
                <button
                  onClick={() => removeMember(m)}
                  disabled={busy}
                  className="text-xs font-semibold text-red-500"
                >
                  Remover
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- helpers ---------------- */
function Loading() {
  return (
    <div className="space-y-2 py-2" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-200/70" />
      ))}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-slate-500">{text}</p>;
}
