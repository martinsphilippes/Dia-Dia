import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  CLASS_LABELS,
  FORMAT_LABELS,
  type AdminMatchRow,
  type AdminProfileRow,
} from "@/lib/types";

export const dynamic = "force-dynamic";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!me?.is_admin) redirect("/discover");

  const [{ data: profilesData }, { data: matchesData }] = await Promise.all([
    supabase.rpc("admin_all_profiles"),
    supabase.rpc("admin_all_matches"),
  ]);

  const profiles = (profilesData as unknown as AdminProfileRow[] | null) ?? [];
  const matches = (matchesData as unknown as AdminMatchRow[] | null) ?? [];

  const onboardedCount = profiles.filter((p) => p.onboarded).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 pb-24 md:pb-10">
      <header className="mb-5">
        <h1 className="text-2xl font-extrabold">Gestão 🛡️</h1>
        <p className="text-sm text-slate-500">Painel do administrador</p>
      </header>

      {/* Cards de resumo */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Cadastros" value={profiles.length} />
        <Stat label="Perfis completos" value={onboardedCount} />
        <Stat label="Matches" value={matches.length} />
      </div>

      {/* Cadastros */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-bold">Todos os cadastros</h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <Th>Nome</Th>
                <Th>Email</Th>
                <Th>Telefone</Th>
                <Th>Cidade</Th>
                <Th>Classe</Th>
                <Th>Formato</Th>
                <Th>Status</Th>
                <Th>Cadastro</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profiles.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <Td className="font-medium">
                    {p.name}
                    {p.is_admin && (
                      <span className="ml-2 rounded-full bg-court-100 px-2 py-0.5 text-[10px] font-bold text-court-700">
                        admin
                      </span>
                    )}
                  </Td>
                  <Td className="text-slate-500">{p.email}</Td>
                  <Td>{p.phone ?? "—"}</Td>
                  <Td>{p.city ?? "—"}</Td>
                  <Td>{CLASS_LABELS[p.skill_class]}</Td>
                  <Td>{FORMAT_LABELS[p.play_format]}</Td>
                  <Td>
                    {p.onboarded ? (
                      <span className="text-court-600">completo</span>
                    ) : (
                      <span className="text-amber-600">incompleto</span>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-slate-500">{fmtDate(p.created_at)}</Td>
                </tr>
              ))}
              {profiles.length === 0 && (
                <tr>
                  <Td className="text-slate-400" colSpan={8}>
                    Nenhum cadastro ainda.
                  </Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Matches */}
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
