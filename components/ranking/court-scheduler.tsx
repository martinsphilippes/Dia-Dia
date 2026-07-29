"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CourtAvailability,
  LeagueSchedule,
  WEEKDAY_LABELS,
} from "@/lib/types";

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function pad(n: number) {
  return n.toString().padStart(2, "0");
}
function buildSlots(sched: LeagueSchedule): string[] {
  const start = toMinutes(sched.slot_start);
  const end = toMinutes(sched.slot_end);
  const out: string[] = [];
  for (let t = start; t + sched.slot_minutes <= end; t += sched.slot_minutes) {
    out.push(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`);
  }
  return out;
}

/**
 * Fluxo de marcação de jogo com reserva de quadra.
 * Se o ranking não tiver quadras cadastradas, cai no agendamento simples (data + local livre).
 */
export function CourtScheduler({
  leagueId,
  matchId,
  onDone,
  onCancel,
}: {
  leagueId: string;
  matchId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const supabase = createClient();
  const [sched, setSched] = useState<LeagueSchedule | null>(null);

  // reserva com quadra
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [avail, setAvail] = useState<CourtAvailability[] | null>(null);
  const [courtId, setCourtId] = useState<string | null>(null);

  // fallback simples
  const [when, setWhen] = useState("");
  const [place, setPlace] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .rpc("get_league_schedule", { p_league_id: leagueId })
      .then(({ data }) => setSched((data as unknown as LeagueSchedule[])?.[0] ?? null));
  }, [supabase, leagueId]);

  const startsAtISO = useCallback(() => {
    if (!date || !slot) return null;
    return new Date(`${date}T${slot}:00`).toISOString();
  }, [date, slot]);

  const loadAvailability = useCallback(async () => {
    const iso = startsAtISO();
    if (!iso) return;
    setAvail(null);
    setCourtId(null);
    const { data } = await supabase.rpc("get_court_availability", {
      p_league_id: leagueId,
      p_starts_at: iso,
    });
    setAvail((data as unknown as CourtAvailability[]) ?? []);
  }, [supabase, leagueId, startsAtISO]);

  useEffect(() => {
    if (date && slot) loadAvailability();
  }, [date, slot, loadAvailability]);

  function dayAllowed(d: string): boolean {
    if (!sched) return true;
    const wd = new Date(`${d}T00:00:00`).getDay();
    return sched.match_days.includes(wd);
  }

  async function scheduleSimple(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await supabase.rpc("schedule_match", {
      p_match_id: matchId,
      p_when: when ? new Date(when).toISOString() : null,
      p_location: place || null,
    });
    setBusy(false);
    if (error) return setErr(error.message);
    onDone();
  }

  async function reserve() {
    const iso = startsAtISO();
    if (!iso || !courtId) return;
    setBusy(true);
    setErr(null);
    const { data, error } = await supabase.rpc("book_match_court", {
      p_match_id: matchId,
      p_court_id: courtId,
      p_starts_at: iso,
    });
    setBusy(false);
    if (error) return setErr(error.message);
    if (data === "opcional") {
      setNote(
        "Jogo registrado. Este clube não exige reserva — se a quadra estiver ocupada na chegada, usem outra disponível no clube.",
      );
      setTimeout(onDone, 2200);
    } else {
      onDone();
    }
  }

  if (!sched) return <p className="py-3 text-center text-xs text-slate-400">Carregando agenda...</p>;

  // Sem quadras cadastradas → agendamento simples
  if (!sched.has_courts) {
    return (
      <form onSubmit={scheduleSimple} className="w-full space-y-2">
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
          <button className="btn-primary text-xs" disabled={busy}>
            {busy ? "Salvando..." : "Salvar"}
          </button>
          <button type="button" className="btn-ghost text-xs" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  const slots = buildSlots(sched);
  const invalidDay = date !== "" && !dayAllowed(date);

  return (
    <div className="w-full space-y-3">
      <div>
        <label className="label">Data</label>
        <input
          type="date"
          className="input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <p className="mt-1 text-[11px] text-slate-400">
          Dias liberados: {sched.match_days.map((d) => WEEKDAY_LABELS[d]).join(", ")}
        </p>
        {invalidDay && (
          <p className="mt-1 text-xs text-red-600">Esse dia da semana não é permitido neste ranking.</p>
        )}
      </div>

      {date && !invalidDay && (
        <div>
          <label className="label">Horário</label>
          <div className="flex flex-wrap gap-1.5">
            {slots.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSlot(s)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                  slot === s ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {date && slot && !invalidDay && (
        <div>
          <label className="label">Quadras — {slot}</label>
          {!avail ? (
            <p className="py-2 text-xs text-slate-400">Verificando disponibilidade...</p>
          ) : avail.length === 0 ? (
            <p className="py-2 text-xs text-slate-400">Nenhuma quadra cadastrada.</p>
          ) : (
            <ul className="space-y-1.5">
              {avail.map((c) => {
                const blocked = c.booking_required && !c.is_free;
                const selected = courtId === c.court_id;
                return (
                  <li key={c.court_id}>
                    <button
                      type="button"
                      disabled={blocked}
                      onClick={() => setCourtId(c.court_id)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm ring-1 transition ${
                        blocked
                          ? "cursor-not-allowed bg-slate-50 text-slate-300 ring-slate-100"
                          : selected
                            ? "bg-amber-600 text-white ring-amber-600"
                            : "bg-white text-slate-700 ring-slate-200"
                      }`}
                    >
                      <span className="truncate">
                        {c.club_name} · {c.court_name}
                      </span>
                      <span className="ml-2 shrink-0 text-[10px] font-bold uppercase">
                        {!c.booking_required
                          ? "sem reserva"
                          : c.is_free
                            ? "livre"
                            : "ocupada"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {note && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{note}</p>}
      {err && <p className="text-xs text-red-600">{err}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          className="btn-primary text-xs disabled:opacity-50"
          disabled={busy || !courtId || invalidDay}
          onClick={reserve}
        >
          {busy ? "Reservando..." : "Confirmar horário"}
        </button>
        <button type="button" className="btn-ghost text-xs" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
