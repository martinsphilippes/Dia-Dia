"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cx, initials } from "@/lib/utils";
import { TournamentEntries } from "@/components/ranking/tournament-entries";
import {
  BracketMatch,
  bracketRoundLabel,
  CategoryEntry,
  CLASS_LABELS,
  GroupMatch,
  GroupStanding,
  SKILL_CLASSES,
  SkillClass,
  TOURNAMENT_STATUS_LABELS,
  TournamentCategory,
  TournamentDetail,
  TournamentFormat,
} from "@/lib/types";

export function TournamentView({
  tournamentId,
  meId,
}: {
  tournamentId: string;
  meId: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [t, setT] = useState<TournamentDetail | null>(null);
  const [cats, setCats] = useState<TournamentCategory[]>([]);
  const [selCat, setSelCat] = useState<string | null>(null);
  const [catBusy, setCatBusy] = useState(false);
  const [catMsg, setCatMsg] = useState<string | null>(null);
  const [orgEmail, setOrgEmail] = useState("");
  const [orgMsg, setOrgMsg] = useState<string | null>(null);

  async function setOrganizer(e: React.FormEvent) {
    e.preventDefault();
    if (!orgEmail.trim()) return;
    setOrgMsg(null);
    const { data } = await supabase.rpc("set_tournament_organizer", {
      p_tournament_id: tournamentId,
      p_email: orgEmail.trim(),
    });
    if (data === "não encontrado") setOrgMsg("Login não encontrado (precisa ter conta no app).");
    else {
      setOrgMsg("Organizador definido! ✅");
      setOrgEmail("");
      loadTournament();
    }
  }

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

  // Alterna uma classe: adiciona a categoria se não existir; remove se existir (e estiver vazia).
  async function toggleClass(cls: SkillClass) {
    const label = CLASS_LABELS[cls];
    const existing = cats.find((c) => c.name === label);
    setCatMsg(null);
    setCatBusy(true);
    try {
      if (existing) {
        if (Number(existing.entry_count) > 0) {
          setCatMsg(`${label}: há inscritos, não é possível remover.`);
          return;
        }
        const { error } = await supabase.rpc("delete_tournament_category", { p_category_id: existing.id });
        if (error) throw error;
        if (selCat === existing.id) setSelCat(null);
        await loadTournament();
      } else {
        const { data, error } = await supabase.rpc("add_tournament_category", {
          p_tournament_id: tournamentId,
          p_name: label,
        });
        if (error) throw error;
        await loadTournament();
        if (typeof data === "string") setSelCat(data);
      }
    } catch (err) {
      console.error("toggleClass falhou:", err);
      setCatMsg("Não foi possível atualizar as categorias do torneio. Tente novamente.");
    } finally {
      setCatBusy(false);
    }
  }

  if (!t) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-amber-50/40 text-amber-700">
        <div className="animate-pulse text-4xl">🏆</div>
      </main>
    );
  }

  // Categoria selecionada, se ainda existir na lista atual (evita render com undefined)
  const selCategory = cats.find((c) => c.id === selCat) ?? null;

  return (
    <main className="min-h-[100dvh] bg-amber-50/40">
      <header className="pt-safe bg-gradient-to-br from-amber-500 to-amber-700 px-5 pb-12 text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="text-sm font-semibold text-amber-50">
              ← Voltar
            </button>
            <Link href="/inicio" className="text-sm font-semibold text-amber-50">
              🏠 Início
            </Link>
          </div>
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
        {(t.is_organizer || t.is_owner) && (
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

        {/* Painel do dono: definir organizador do torneio */}
        {t.is_owner && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-amber-800">
              👑 Painel do dono — organizador do torneio
            </div>
            <p className="mt-1 text-xs text-amber-700">
              Organizador atual: <strong>{t.organizer_name}</strong>. Informe o email
              de outro login para passar a organização a ele.
            </p>
            <form onSubmit={setOrganizer} className="mt-3 flex gap-2">
              <input
                className="input flex-1"
                placeholder="email do novo organizador"
                value={orgEmail}
                onChange={(e) => setOrgEmail(e.target.value)}
              />
              <button className="btn-ghost text-sm">Definir</button>
            </form>
            {orgMsg && <p className="mt-2 text-xs text-amber-700">{orgMsg}</p>}
          </div>
        )}

        {/* Categorias */}
        <div className="rounded-3xl bg-white p-5 shadow-card">
          <h2 className="text-lg font-bold">Categorias</h2>

          {(t.is_organizer || t.is_owner) ? (
            <>
              <p className="mt-1 text-sm text-slate-500">Selecione as classes do torneio:</p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SKILL_CLASSES.map((cls) => {
                  const label = CLASS_LABELS[cls];
                  const existing = cats.find((c) => c.name === label);
                  const on = !!existing;
                  return (
                    <button
                      key={cls}
                      onClick={() => toggleClass(cls)}
                      disabled={catBusy}
                      className={cx(
                        "flex items-center justify-between rounded-2xl border-2 px-4 py-4 text-left text-base font-semibold transition",
                        on
                          ? "border-amber-600 bg-amber-600 text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-700 hover:border-amber-300"
                      )}
                    >
                      <span>{label}</span>
                      <span className={cx("text-sm", on ? "text-amber-100" : "text-slate-300")}>
                        {on ? (
                          Number(existing!.entry_count) > 0
                            ? `${Number(existing!.entry_count)} inscrito(s)`
                            : "✓ selecionada"
                        ) : (
                          "tocar para adicionar"
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
              {catMsg && <p className="mt-2 text-xs text-red-600">{catMsg}</p>}
              {cats.length === 0 ? (
                <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Selecione ao menos uma classe para abrir inscrições.
                </p>
              ) : (
                <p className="mt-3 text-xs text-slate-500">
                  {cats.length} categoria(s): {cats.map((c) => c.name).join(", ")}. Toque numa classe
                  selecionada para removê-la (se não houver inscritos).
                </p>
              )}
            </>
          ) : cats.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Sem categorias ainda.</p>
          ) : null}
        </div>

        {/* Inscritos + pagamento (gestores) */}
        {t.is_manager && (
          <TournamentEntries
            tournamentId={tournamentId}
            cats={cats}
            feeCents={t.entry_fee_cents}
            onFeeChange={loadTournament}
          />
        )}

        {/* Categoria selecionada — só renderiza se a categoria realmente existir */}
        {selCategory && (
          <CategoryPanel
            key={selCategory.id}
            categoryId={selCategory.id}
            tournament={t}
            category={selCategory}
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
  const [standings, setStandings] = useState<GroupStanding[] | null>(null);
  const [groupMatches, setGroupMatches] = useState<GroupMatch[] | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Configuração da geração (organizador)
  const [fmt, setFmt] = useState<TournamentFormat>("eliminatoria");
  const [advance, setAdvance] = useState<1 | 2>(2);
  const [seedIds, setSeedIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    const [{ data: e }, { data: b }, { data: g }, { data: gm }] = await Promise.all([
      supabase.rpc("get_category_entries", { p_category_id: categoryId }),
      supabase.rpc("get_bracket", { p_category_id: categoryId }),
      supabase.rpc("get_group_standings", { p_category_id: categoryId }),
      supabase.rpc("get_group_matches", { p_category_id: categoryId }),
    ]);
    const es = (e as unknown as CategoryEntry[]) ?? [];
    setEntries(es);
    setBracket((b as unknown as BracketMatch[]) ?? []);
    setStandings((g as unknown as GroupStanding[]) ?? []);
    setGroupMatches((gm as unknown as GroupMatch[]) ?? []);
    // pré-carrega os cabeças de chave já salvos, na ordem
    setSeedIds(
      es.filter((x) => x.seed != null).sort((a, b) => (a.seed! - b.seed!)).map((x) => x.player_id),
    );
  }, [supabase, categoryId]);

  useEffect(() => {
    load();
  }, [load]);

  const isMgr = tournament.is_organizer || tournament.is_owner;
  const registered = (entries ?? []).some((e) => e.player_id === meId);
  const hasKnockout = (bracket ?? []).length > 0;
  const hasGroups = (groupMatches ?? []).length > 0;
  const fromGroups = category.format === "grupos";

  function toggleSeed(id: string) {
    setSeedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function suggestSeeds() {
    const top = [...(entries ?? [])]
      .sort((a, b) => a.skill_class - b.skill_class || a.name.localeCompare(b.name))
      .slice(0, Math.min(8, entries?.length ?? 0))
      .map((e) => e.player_id);
    setSeedIds(top);
  }

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
    await supabase.rpc("set_category_seeds", { p_category_id: categoryId, p_player_ids: seedIds });
    const { error } =
      fmt === "grupos"
        ? await supabase.rpc("generate_groups", { p_category_id: categoryId, p_advance: advance })
        : await supabase.rpc("generate_bracket", { p_category_id: categoryId });
    setBusy(false);
    if (error) return setMsg(error.message);
    load();
    onChange();
  }

  async function advanceToKnockout() {
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.rpc("advance_groups_to_knockout", { p_category_id: categoryId });
    setBusy(false);
    if (error) return setMsg(error.message);
    load();
    onChange();
  }

  const reload = () => {
    load();
    onChange();
  };
  const canReportMatch = (aId: string | null, bId: string | null) => isMgr || aId === meId || bId === meId;

  return (
    <div className="rounded-3xl bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">{category.name}</h3>
        {(hasGroups || hasKnockout) && (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
            {fromGroups ? "Fase de grupos + mata-mata" : "Mata-mata"}
          </span>
        )}
      </div>

      {!hasKnockout && !hasGroups ? (
        /* ---------- Pré-geração: inscritos, cabeças de chave, formato ---------- */
        <>
          <div className="mt-3">
            {entries === null ? (
              <p className="text-sm text-slate-400">Carregando...</p>
            ) : entries.length === 0 ? (
              <p className="text-sm text-slate-500">Ninguém inscrito ainda.</p>
            ) : (
              <ul className="space-y-1.5">
                {entries.map((e) => {
                  const seedNo = seedIds.indexOf(e.player_id) + 1;
                  return (
                    <li key={e.player_id} className="flex items-center gap-2 text-sm">
                      {e.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" loading="lazy" decoding="async" />
                      ) : (
                        <div className="grid h-7 w-7 place-items-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
                          {initials(e.name)}
                        </div>
                      )}
                      <span className="flex-1 truncate">{e.name}</span>
                      {isMgr ? (
                        <button
                          onClick={() => toggleSeed(e.player_id)}
                          className={cx(
                            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold transition",
                            seedNo > 0 ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-500",
                          )}
                        >
                          {seedNo > 0 ? `Cabeça ${seedNo}` : "Cabeça?"}
                        </button>
                      ) : (
                        e.seed != null && (
                          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                            Cabeça {e.seed}
                          </span>
                        )
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {msg && <p className="mt-3 text-sm text-red-600">{msg}</p>}

          <div className="mt-4 space-y-3">
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

            {isMgr && (
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

                {/* Cabeças de chave */}
                <div className="rounded-2xl bg-amber-50/60 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wide text-amber-700">Cabeças de chave</span>
                    <div className="flex gap-2">
                      <button onClick={suggestSeeds} className="text-xs font-semibold text-amber-700">Sugerir pela classe</button>
                      {seedIds.length > 0 && (
                        <button onClick={() => setSeedIds([])} className="text-xs font-semibold text-slate-400">Limpar</button>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Toque em “Cabeça?” na lista para marcar os favoritos na ordem (1º, 2º…). Eles ficam separados no sorteio.
                  </p>
                </div>

                {/* Formato */}
                <div className="rounded-2xl bg-slate-50 p-3">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Formato</span>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(
                      [
                        ["eliminatoria", "Mata-mata"],
                        ["grupos", "Grupos"],
                      ] as [TournamentFormat, string][]
                    ).map(([k, l]) => (
                      <button
                        key={k}
                        onClick={() => setFmt(k)}
                        className={cx(
                          "rounded-xl px-3 py-2 text-sm font-semibold transition",
                          fmt === k ? "bg-amber-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200",
                        )}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                  {fmt === "grupos" && (
                    <div className="mt-3">
                      <span className="text-xs text-slate-500">Quantos avançam de cada grupo?</span>
                      <div className="mt-1.5 flex gap-2">
                        {([1, 2] as (1 | 2)[]).map((a) => (
                          <button
                            key={a}
                            onClick={() => setAdvance(a)}
                            className={cx(
                              "flex-1 rounded-xl px-3 py-1.5 text-sm font-semibold transition",
                              advance === a ? "bg-court-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200",
                            )}
                          >
                            {a === 1 ? "1º de cada" : "1º e 2º"}
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-[11px] text-slate-500">
                        Grupos de 3 a 4 jogadores, montados automaticamente (funciona com qualquer número).
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={generate}
                  disabled={busy || (entries?.length ?? 0) < (fmt === "grupos" ? 3 : 2)}
                  className="btn-ball w-full text-sm"
                >
                  🎾 {fmt === "grupos" ? "Gerar grupos" : "Gerar chaveamento"} ({entries?.length ?? 0} inscritos)
                </button>
              </>
            )}
          </div>
        </>
      ) : (
        /* ---------- Já gerado ---------- */
        <div className="mt-3 space-y-5">
          {hasGroups && (
            <GroupsView
              standings={standings ?? []}
              matches={groupMatches ?? []}
              meId={meId}
              advancePerGroup={category.advance_per_group ?? 2}
              canReport={canReportMatch}
              onReported={reload}
              collapsed={hasKnockout}
            />
          )}

          {fromGroups && !hasKnockout && isMgr && (
            <div>
              {msg && <p className="mb-2 text-sm text-red-600">{msg}</p>}
              <button
                onClick={advanceToKnockout}
                disabled={busy || !(groupMatches ?? []).every((m) => m.status === "jogado")}
                className="btn-primary w-full text-sm"
              >
                {busy ? "..." : "Avançar para o mata-mata"}
              </button>
              {!(groupMatches ?? []).every((m) => m.status === "jogado") && (
                <p className="mt-1.5 text-center text-[11px] text-slate-400">
                  Lance o resultado de todos os jogos dos grupos para liberar.
                </p>
              )}
            </div>
          )}

          {hasKnockout && (
            <Bracket
              matches={bracket!}
              meId={meId}
              canReport={(m) => canReportMatch(m.player_a_id, m.player_b_id)}
              onReported={reload}
              canRegenerate={isMgr && !fromGroups}
              onRegenerate={generate}
              busy={busy}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* -------- Fase de grupos -------- */
function GroupsView({
  standings,
  matches,
  meId,
  advancePerGroup,
  canReport,
  onReported,
  collapsed,
}: {
  standings: GroupStanding[];
  matches: GroupMatch[];
  meId: string;
  advancePerGroup: number;
  canReport: (aId: string | null, bId: string | null) => boolean;
  onReported: () => void;
  collapsed: boolean;
}) {
  const groups = Array.from(new Set(standings.map((s) => s.group_no))).sort((a, b) => a - b);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold uppercase tracking-wide text-court-700">Fase de grupos</div>
        <span className="text-[11px] text-slate-400">
          Avançam {advancePerGroup === 1 ? "o 1º" : "os 2 primeiros"} de cada grupo
        </span>
      </div>
      {groups.map((g) => {
        const rows = standings.filter((s) => s.group_no === g).sort((a, b) => a.rank - b.rank);
        const gms = matches.filter((m) => m.group_no === g);
        return (
          <div key={g} className="rounded-2xl border border-slate-100 p-3">
            <div className="mb-2 text-sm font-bold text-slate-700">Grupo {g}</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase text-slate-400">
                  <th className="w-6 text-left font-semibold">#</th>
                  <th className="text-left font-semibold">Jogador</th>
                  <th className="w-8 text-center font-semibold">J</th>
                  <th className="w-8 text-center font-semibold">V</th>
                  <th className="w-12 text-center font-semibold">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const saldo = r.sets_won - r.sets_lost;
                  return (
                    <tr key={r.player_id} className={cx("border-t border-slate-50", r.qualifies && "bg-court-50/60")}>
                      <td className="py-1 text-slate-400">{r.rank}</td>
                      <td className="py-1">
                        <span className={cx("truncate", r.player_id === meId && "font-semibold text-amber-700")}>
                          {r.name}
                          {r.qualifies ? " ✅" : ""}
                        </span>
                      </td>
                      <td className="py-1 text-center text-slate-500">{r.played}</td>
                      <td className="py-1 text-center font-semibold">{r.wins}</td>
                      <td className="py-1 text-center text-slate-500">
                        {saldo > 0 ? "+" : ""}
                        {saldo}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!collapsed && gms.length > 0 && (
              <ul className="mt-3 space-y-2">
                {gms.map((m) => (
                  <GroupMatchCard
                    key={m.match_id}
                    m={m}
                    meId={meId}
                    canReport={canReport(m.player_a_id, m.player_b_id)}
                    onReported={onReported}
                  />
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

function GroupMatchCard({
  m,
  meId,
  canReport,
  onReported,
}: {
  m: GroupMatch;
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
      {canReport && !played && (
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
          <img src={avatar} alt="" className="h-7 w-7 rounded-full object-cover" loading="lazy" decoding="async" />
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
