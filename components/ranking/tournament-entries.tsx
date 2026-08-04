"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TournamentCategory, TournamentEntryAdmin } from "@/lib/types";
import { cx, initials } from "@/lib/utils";
import { useIncremental } from "@/lib/use-incremental";
import { RowSkeletons } from "@/components/skeleton";

function brl(cents: number) {
  return `R$ ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export function TournamentEntries({
  tournamentId,
  cats,
  feeCents,
  onFeeChange,
}: {
  tournamentId: string;
  cats: TournamentCategory[];
  feeCents: number | null;
  onFeeChange: () => void;
}) {
  const supabase = createClient();
  const [rows, setRows] = useState<TournamentEntryAdmin[] | null>(null);
  const [filter, setFilter] = useState<"todos" | "pagos" | "nao">("todos");
  const [catFilter, setCatFilter] = useState<string>("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const [editFee, setEditFee] = useState(false);
  const [feeInput, setFeeInput] = useState(feeCents ? String(feeCents / 100) : "");

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("get_tournament_entries_admin", { p_tournament_id: tournamentId });
    setRows((data as unknown as TournamentEntryAdmin[]) ?? []);
  }, [supabase, tournamentId]);

  useEffect(() => {
    load();
  }, [load]);

  async function removeEntry(e: TournamentEntryAdmin) {
    if (!confirm(`Remover ${e.name} da categoria ${e.category_name}?`)) return;
    setBusy(e.entry_id);
    const { error } = await supabase.rpc("remove_tournament_entry", { p_entry_id: e.entry_id });
    setBusy(null);
    if (!error) setRows((cur) => (cur ?? []).filter((r) => r.entry_id !== e.entry_id));
  }

  async function togglePaid(e: TournamentEntryAdmin) {
    const next = !e.paid;
    // atualização otimista: reflete na hora (badge + resumo) e confirma no backend
    setRows((cur) =>
      (cur ?? []).map((r) => (r.entry_id === e.entry_id ? { ...r, paid: next } : r)),
    );
    setBusy(e.entry_id);
    const { error } = await supabase.rpc("set_entry_paid", { p_entry_id: e.entry_id, p_paid: next });
    setBusy(null);
    if (error) {
      // reverte em caso de falha
      setRows((cur) =>
        (cur ?? []).map((r) => (r.entry_id === e.entry_id ? { ...r, paid: !next } : r)),
      );
    }
  }

  async function saveFee() {
    const cents = feeInput ? Math.round(parseFloat(feeInput.replace(",", ".")) * 100) : null;
    await supabase.rpc("set_tournament_fee", { p_tournament_id: tournamentId, p_fee_cents: cents });
    setEditFee(false);
    onFeeChange();
  }

  const list = rows ?? [];
  const filtered = list.filter((r) => {
    if (filter === "pagos" && !r.paid) return false;
    if (filter === "nao" && r.paid) return false;
    if (catFilter && r.category_id !== catFilter) return false;
    if (q.trim() && !r.name.toLowerCase().includes(q.trim().toLowerCase())) return false;
    return true;
  });
  const { visible, hasMore, more } = useIncremental(filtered, 20);

  if (!rows)
    return (
      <div className="rounded-3xl bg-white p-5 shadow-card">
        <RowSkeletons count={4} />
      </div>
    );

  const total = rows.length;
  const pagos = rows.filter((r) => r.paid).length;
  const naoPagos = total - pagos;
  const recebido = feeCents ? pagos * feeCents : 0;
  const pendente = feeCents ? naoPagos * feeCents : 0;

  return (
    <div className="rounded-3xl bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Inscritos</h2>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
          {total}
        </span>
      </div>

      {/* Resumo */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Inscritos" value={String(total)} />
        <Stat label="Pagos" value={String(pagos)} tone="green" />
        <Stat label="Não pagos" value={String(naoPagos)} tone="red" />
      </div>

      {/* Valor de inscrição */}
      <div className="mt-3 rounded-2xl bg-amber-50 p-3">
        {editFee ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-amber-800">R$</span>
            <input
              className="input h-9 w-28 text-sm"
              inputMode="decimal"
              placeholder="150,00"
              value={feeInput}
              onChange={(e) => setFeeInput(e.target.value)}
            />
            <button onClick={saveFee} className="btn-primary text-xs">Salvar</button>
            <button onClick={() => setEditFee(false)} className="btn-ghost text-xs">✕</button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="text-sm text-amber-800">
              Inscrição: <strong>{feeCents ? brl(feeCents) : "não definida"}</strong>
            </div>
            <button onClick={() => setEditFee(true)} className="text-xs font-semibold text-amber-700">
              {feeCents ? "Alterar" : "Definir valor"}
            </button>
          </div>
        )}
        {feeCents ? (
          <div className="mt-2 flex gap-4 text-xs">
            <span className="text-green-700">Recebido: <strong>{brl(recebido)}</strong></span>
            <span className="text-red-600">Pendente: <strong>{brl(pendente)}</strong></span>
          </div>
        ) : null}
      </div>

      {/* Por categoria */}
      {cats.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          {cats.map((c) => (
            <span key={c.id} className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
              {c.name}: <strong>{rows.filter((r) => r.category_id === c.id).length}</strong>
            </span>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="mt-4 space-y-2">
        <div className="flex gap-1.5">
          {(
            [
              ["todos", "Todos"],
              ["pagos", "Pagos"],
              ["nao", "Não pagos"],
            ] as ["todos" | "pagos" | "nao", string][]
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={cx(
                "flex-1 rounded-full px-2 py-1.5 text-xs font-semibold",
                filter === k ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-600"
              )}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            className="input flex-1 appearance-none bg-[right_0.75rem_center] bg-no-repeat pr-9 text-sm"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")",
              backgroundSize: "1.1rem",
            }}
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
          >
            <option value="">Todas as categorias</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            className="input flex-1 py-2.5 text-sm"
            placeholder="🔍 Buscar nome"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">Nenhum inscrito com esses filtros.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {visible.map((e) => (
            <li key={e.entry_id} className="flex items-center gap-3 py-2.5">
              {e.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.avatar_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" loading="lazy" decoding="async" />
              ) : (
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                  {initials(e.name)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{e.name}</div>
                <div className="truncate text-xs text-slate-500">
                  {e.category_name} · {fmtDate(e.created_at)}
                </div>
              </div>
              <button
                onClick={() => togglePaid(e)}
                disabled={busy === e.entry_id}
                className={cx(
                  "shrink-0 rounded-full px-3 py-1 text-xs font-bold",
                  e.paid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"
                )}
                title="Tocar para alterar o pagamento"
              >
                {busy === e.entry_id ? "..." : e.paid ? "🟢 Pago" : "🔴 Não pago"}
              </button>
              <button
                onClick={() => removeEntry(e)}
                disabled={busy === e.entry_id}
                className="shrink-0 text-xs font-semibold text-slate-400 hover:text-red-500"
                title="Remover inscrição"
              >
                ✕
              </button>
            </li>
          ))}
          {hasMore && (
            <li className="py-2">
              <button onClick={more} className="btn-ghost w-full text-sm">
                Ver mais ({filtered.length - visible.length})
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" }) {
  const color = tone === "green" ? "text-green-700" : tone === "red" ? "text-red-600" : "text-slate-800";
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-2.5 text-center">
      <div className={`text-xl font-extrabold ${color}`}>{value}</div>
      <div className="text-[10px] font-medium text-slate-500">{label}</div>
    </div>
  );
}
