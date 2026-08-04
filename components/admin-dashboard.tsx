"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BackButton } from "@/components/back-button";
import {
  CLASS_LABELS,
  FORMAT_LABELS,
  TOURNAMENT_STATUS_LABELS,
  type AdminMatchRow,
  type AdminProfileRow,
  type AdminTournamentRow,
  type ArchivedLeague,
  type TournamentStatus,
} from "@/lib/types";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminDashboard() {
  const supabase = createClient();
  const [profiles, setProfiles] = useState<AdminProfileRow[]>([]);
  const [matches, setMatches] = useState<AdminMatchRow[]>([]);
  const [archived, setArchived] = useState<ArchivedLeague[]>([]);
  const [tournaments, setTournaments] = useState<AdminTournamentRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    const [{ data: p }, { data: m }, { data: a }, { data: tr }] = await Promise.all([
      supabase.rpc("admin_all_profiles"),
      supabase.rpc("admin_all_matches"),
      supabase.rpc("admin_archived_leagues"),
      supabase.rpc("admin_all_tournaments"),
    ]);
    setProfiles((p as unknown as AdminProfileRow[]) ?? []);
    setMatches((m as unknown as AdminMatchRow[]) ?? []);
    setArchived((a as unknown as ArchivedLeague[]) ?? []);
    setTournaments((tr as unknown as AdminTournamentRow[]) ?? []);
  }, [supabase]);

  async function restore(id: string) {
    setBusy(id);
    await supabase.rpc("restore_league", { p_league_id: id });
    await load();
    setBusy(null);
  }

  async function removeLeague(id: string, name: string) {
    if (
      !confirm(
        `Excluir definitivamente a liga "${name}"? Esta ação não pode ser desfeita — apaga rodadas, jogos e membros arquivados.`,
      )
    )
      return;
    setBusy(id);
    const { error } = await supabase.rpc("admin_delete_league", { p_league_id: id });
    if (error) alert(error.message);
    await load();
    setBusy(null);
  }

  async function removeTournament(id: string, name: string, entries: number) {
    if (
      !confirm(
        `Excluir definitivamente o torneio "${name}"? Esta ação não pode ser desfeita — apaga categorias, ${entries} inscrito(s) e todo o chaveamento.`,
      )
    )
      return;
    setBusy(id);
    const { error } = await supabase.rpc("admin_delete_tournament", { p_tournament_id: id });
    if (error) alert(error.message);
    await load();
    setBusy(null);
  }

  useEffect(() => {
    load();
  }, [load]);

  async function toggleOrganizer(p: AdminProfileRow) {
    setBusy(p.id);
    await supabase.rpc("set_organizer_role", {
      p_player_id: p.id,
      p_value: !p.is_organizer,
    });
    await load();
    setBusy(null);
  }

  const onboardedCount = profiles.filter((p) => p.onboarded).length;
  const organizerCount = profiles.filter((p) => p.is_organizer).length;

  const q = query.trim().toLowerCase();
  const filtered = q
    ? profiles.filter((p) =>
        `${p.name ?? ""} ${p.email ?? ""} ${p.phone ?? ""} ${p.city ?? ""}`
          .toLowerCase()
          .includes(q),
      )
    : profiles;

  return (
    <div className="pt-safe mx-auto max-w-5xl px-4 pb-24 md:pb-10">
      <div className="mb-3 flex items-center gap-4">
        <BackButton />
        <a href="/inicio" className="inline-block text-sm font-semibold text-slate-500">
          🏠 Início
        </a>
      </div>
      <header className="mb-5">
        <h1 className="text-2xl font-extrabold">Gestão 🛡️</h1>
        <p className="text-sm text-slate-500">Painel do proprietário</p>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Cadastros" value={profiles.length} />
        <Stat label="Perfis completos" value={onboardedCount} />
        <Stat label="Organizadores" value={organizerCount} />
        <Stat label="Matches" value={matches.length} />
      </div>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-bold">Todos os cadastros</h2>
        <div className="mb-3 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2">
          <span className="text-slate-400">🔍</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar por nome, email, telefone ou cidade"
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-xs font-semibold text-slate-400"
            >
              limpar
            </button>
          )}
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <Th>Nome</Th>
                <Th>Email</Th>
                <Th>Telefone</Th>
                <Th>Cidade</Th>
                <Th>Classe</Th>
                <Th>Papel</Th>
                <Th>Ação</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <Td className="font-medium">{p.name}</Td>
                  <Td className="text-slate-500">{p.email}</Td>
                  <Td>{p.phone ?? "—"}</Td>
                  <Td>{p.city ?? "—"}</Td>
                  <Td>{CLASS_LABELS[p.skill_class]}</Td>
                  <Td>
                    {p.is_admin ? (
                      <Role className="bg-court-100 text-court-700">👑 dono</Role>
                    ) : p.is_organizer ? (
                      <Role className="bg-amber-100 text-amber-700">organizador</Role>
                    ) : (
                      <Role className="bg-slate-100 text-slate-500">operador</Role>
                    )}
                  </Td>
                  <Td>
                    {p.is_admin ? (
                      <span className="text-xs text-slate-300">—</span>
                    ) : (
                      <button
                        onClick={() => toggleOrganizer(p)}
                        disabled={busy === p.id}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          p.is_organizer
                            ? "bg-slate-100 text-slate-600"
                            : "bg-amber-600 text-white"
                        }`}
                      >
                        {busy === p.id
                          ? "..."
                          : p.is_organizer
                            ? "Remover organizador"
                            : "Tornar organizador"}
                      </button>
                    )}
                  </Td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <Td className="text-slate-400" colSpan={7}>
                    {profiles.length === 0
                      ? "Nenhum cadastro ainda."
                      : "Nenhum cadastro encontrado."}
                  </Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">Matches acontecendo</h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <Th>Jogador A</Th>
                <Th>Telefone A</Th>
                <Th>Jogador B</Th>
                <Th>Telefone B</Th>
                <Th>Mensagens</Th>
                <Th>Match em</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matches.map((m) => (
                <tr key={m.match_id} className="hover:bg-slate-50">
                  <Td className="font-medium">{m.a_name}</Td>
                  <Td>{m.a_phone ?? "—"}</Td>
                  <Td className="font-medium">{m.b_name}</Td>
                  <Td>{m.b_phone ?? "—"}</Td>
                  <Td>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold">
                      {m.message_count}
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap text-slate-500">{fmtDate(m.created_at)}</Td>
                </tr>
              ))}
              {matches.length === 0 && (
                <tr>
                  <Td className="text-slate-400" colSpan={6}>
                    Nenhum match ainda.
                  </Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-bold">Ligas arquivadas 🗄️</h2>
        {archived.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-400">
            Nenhuma liga arquivada.
          </p>
        ) : (
          <ul className="space-y-2">
            {archived.map((a) => (
              <li
                key={a.league_id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="font-semibold">{a.league_name}</div>
                  <div className="text-xs text-slate-500">
                    Clube: {a.club_name ?? "—"} · por {a.deleted_by_name ?? "—"} ·{" "}
                    {fmtDate(a.deleted_at)}
                  </div>
                  <div className="text-xs text-slate-400">
                    {a.reason ? `Motivo: ${a.reason} · ` : ""}
                    {a.affected_matches} jogo(s) cancelado(s) · {a.affected_bookings} reserva(s)
                    liberada(s)
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => restore(a.league_id)}
                    disabled={busy === a.league_id}
                    className="rounded-full bg-court-600 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    {busy === a.league_id ? "..." : "Restaurar"}
                  </button>
                  <button
                    onClick={() => removeLeague(a.league_id, a.league_name)}
                    disabled={busy === a.league_id}
                    className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 ring-1 ring-red-200"
                  >
                    Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-bold">Torneios 🏆</h2>
        {tournaments.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-400">
            Nenhum torneio criado.
          </p>
        ) : (
          <ul className="space-y-2">
            {tournaments.map((tr) => (
              <li
                key={tr.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{tr.name}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                      {TOURNAMENT_STATUS_LABELS[tr.status as TournamentStatus] ?? tr.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {tr.city ? `${tr.city} · ` : ""}organizador: {tr.organizer_name} · {fmtDate(tr.created_at)}
                  </div>
                  <div className="text-xs text-slate-400">
                    {tr.category_count} categoria(s) · {tr.entry_count} inscrito(s)
                  </div>
                </div>
                <button
                  onClick={() => removeTournament(tr.id, tr.name, tr.entry_count)}
                  disabled={busy === tr.id}
                  className="shrink-0 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 ring-1 ring-red-200"
                >
                  {busy === tr.id ? "..." : "Excluir"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-3xl font-extrabold text-court-700">{value}</div>
      <div className="mt-1 text-xs font-medium text-slate-500">{label}</div>
    </div>
  );
}

function Role({ children, className }: { children: React.ReactNode; className: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${className}`}>{children}</span>;
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-semibold">{children}</th>;
}

function Td({
  children,
  className = "",
  colSpan,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td className={`px-4 py-3 ${className}`} colSpan={colSpan}>
      {children}
    </td>
  );
}
