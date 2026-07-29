"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ResultType } from "@/lib/types";

/**
 * Formulário de lançamento de resultado seguindo o regulamento:
 * - Normal (melhor de 3 sets): games de cada set. Um set vai a 6 (7-5 ou 7-6 no tie-break).
 * - Pró-set: um set único, vence quem fizer mais games.
 * - WO: escolhe o vencedor.
 * "left" é sempre o desafiante (challenger), "right" o desafiado (challenged).
 */
export function ResultForm({
  matchId,
  leftName,
  rightName,
  onDone,
  onCancel,
}: {
  matchId: string;
  leftName: string;
  rightName: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const supabase = createClient();
  const [type, setType] = useState<ResultType>("normal");
  const [sets, setSets] = useState<{ c: string; d: string }[]>([
    { c: "", d: "" },
    { c: "", d: "" },
    { c: "", d: "" },
  ]);
  const [pro, setPro] = useState<{ c: string; d: string }>({ c: "", d: "" });
  const [woWinner, setWoWinner] = useState<"challenger" | "challenged">("challenger");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const L = leftName.split(" ")[0];
  const R = rightName.split(" ")[0];

  function setGame(i: number, side: "c" | "d", v: string) {
    setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, [side]: v } : s)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    let payload: {
      p_match_id: string;
      p_result_type: ResultType;
      p_games: { c: number; d: number }[] | null;
      p_wo_winner: string | null;
    };

    if (type === "wo") {
      payload = { p_match_id: matchId, p_result_type: "wo", p_games: null, p_wo_winner: woWinner };
    } else if (type === "proset") {
      const c = Number(pro.c);
      const d = Number(pro.d);
      if (!pro.c || !pro.d || Number.isNaN(c) || Number.isNaN(d)) {
        return setErr("Informe os games do pró-set.");
      }
      payload = { p_match_id: matchId, p_result_type: "proset", p_games: [{ c, d }], p_wo_winner: null };
    } else {
      const filled = sets
        .filter((s) => s.c !== "" || s.d !== "")
        .map((s) => ({ c: Number(s.c), d: Number(s.d) }));
      if (filled.length < 2) return setErr("Preencha ao menos 2 sets.");
      if (filled.some((s) => Number.isNaN(s.c) || Number.isNaN(s.d))) {
        return setErr("Games inválidos.");
      }
      payload = { p_match_id: matchId, p_result_type: "normal", p_games: filled, p_wo_winner: null };
    }

    setBusy(true);
    const { error } = await supabase.rpc("report_match_result", payload);
    setBusy(false);
    if (error) return setErr(error.message);
    onDone();
  }

  return (
    <form onSubmit={submit} className="w-full space-y-3">
      {/* seletor de tipo */}
      <div className="flex gap-1.5">
        {(
          [
            ["normal", "Melhor de 3"],
            ["proset", "Pró-set"],
            ["wo", "WO"],
          ] as [ResultType, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setType(k)}
            className={`flex-1 rounded-full px-2 py-1.5 text-xs font-semibold ${
              type === k ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {type === "normal" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
            <span className="flex-1 text-right">{L}</span>
            <span className="w-24 text-center">games por set</span>
            <span className="flex-1">{R}</span>
          </div>
          {sets.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex-1 text-right text-xs text-slate-500">Set {i + 1}</span>
              <input
                className="input w-12 text-center"
                inputMode="numeric"
                value={s.c}
                onChange={(e) => setGame(i, "c", e.target.value)}
                placeholder="6"
              />
              <span className="text-slate-400">x</span>
              <input
                className="input w-12 text-center"
                inputMode="numeric"
                value={s.d}
                onChange={(e) => setGame(i, "d", e.target.value)}
                placeholder="4"
              />
              <span className="flex-1" />
            </div>
          ))}
          <p className="text-[11px] text-slate-400">
            Deixe o 3º set em branco se acabou em 2 sets. Set vai a 6 (7-5 ou 7-6 no tie-break).
          </p>
        </div>
      )}

      {type === "proset" && (
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm text-slate-500">{L}</span>
          <input
            className="input w-14 text-center"
            inputMode="numeric"
            value={pro.c}
            onChange={(e) => setPro((p) => ({ ...p, c: e.target.value }))}
            placeholder="8"
          />
          <span className="text-slate-400">x</span>
          <input
            className="input w-14 text-center"
            inputMode="numeric"
            value={pro.d}
            onChange={(e) => setPro((p) => ({ ...p, d: e.target.value }))}
            placeholder="6"
          />
          <span className="text-sm text-slate-500">{R}</span>
        </div>
      )}

      {type === "wo" && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">Quem venceu por WO?</p>
          <div className="flex gap-2">
            {(
              [
                ["challenger", leftName],
                ["challenged", rightName],
              ] as ["challenger" | "challenged", string][]
            ).map(([k, name]) => (
              <button
                key={k}
                type="button"
                onClick={() => setWoWinner(k)}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${
                  woWinner === k ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {name.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      {err && <p className="text-xs text-red-600">{err}</p>}
      <div className="flex gap-2">
        <button className="btn-primary text-xs" disabled={busy}>
          {busy ? "Salvando..." : "Salvar resultado"}
        </button>
        <button type="button" className="btn-ghost text-xs" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

/** Formata o placar em games para exibição, ex.: "6-4, 3-6, 7-6". */
export function formatGames(games: { c: number; d: number }[] | null): string | null {
  if (!games || games.length === 0) return null;
  return games.map((s) => `${s.c}-${s.d}`).join(", ");
}
