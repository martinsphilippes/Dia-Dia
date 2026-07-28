"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CLASS_LABELS,
  FORMAT_LABELS,
  type AdminMatchRow,
  type AdminProfileRow,
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
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: p }, { data: m }] = await Promise.all([
      supabase.rpc("admin_all_profiles"),
      supabase.rpc("admin_all_matches"),
    ]);
    setProfiles((p as unknown as AdminProfileRow[]) ?? []);
    setMatches((m as unknown as AdminMatchRow[]) ?? []);
  }, [supabase]);

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

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 pb-24 md:pb-10">
      <a href="/inicio" className="mb-3 inline-block text-sm font-semibold text-slate-500">
        🏠 Início
      </a>
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
              {profiles.map((p) => (
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
              {profiles.length === 0 && (
                <tr>
                  <Td className="text-slate-400" colSpan={7}>
                    Nenhum cadastro ainda.
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
