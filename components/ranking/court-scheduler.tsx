"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CourtInfo,
  CourtRow,
  DayBooking,
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
function buildSlots(court: CourtInfo): string[] {
  const start = toMinutes(court.slot_start);
  const end = toMinutes(court.slot_end);
  const out: string[] = [];
  for (let t = start; t + court.slot_minutes <= end; t += court.slot_minutes) {
    out.push(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`);
  }
  return out;
}

/**
 * Fluxo de marcação de jogo com reserva de quadra.
 * Cada quadra tem a sua própria agenda (dias, horário, minutos por jogo).
 * Se o ranking não tiver quadras, cai no agendamento simples (data + local livre).
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
  const [courts, setCourts] = useState<CourtInfo[]>([]);

  const [date, setDate] = useState("");
  const [courtId, setCourtId] = useState<string | null>(null);
  const [slot, setSlot] = useState("");
  const [dayBookings, setDayBookings] = useState<DayBooking[]>([]);

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
    supabase.rpc("get_league_courts", { p_league_id: leagueId }).then(({ data }) => {
      const rows = (data as unknown as CourtRow[]) ?? [];
      setCourts(
        rows
          .filter((r) => r.court_id)
          .map((r) => ({
            court_id: r.court_id!,
            court_name: r.court_name!,
            match_days: r.match_days ?? [1, 2, 3, 4, 5, 6],
            slot_start: (r.slot_start ?? "07:00").slice(0, 5),
            slot_end: (r.slot_end ?? "22:00").slice(0, 5),
            slot_minutes: r.slot_minutes ?? 60,
          })),
      );
    });
  }, [supabase, leagueId]);

  // reservas do dia (para marcar horários ocupados da quadra escolhida)
  const loadDay = useCallback(async () => {
    if (!date) return setDayBookings([]);
    const { data } = await supabase.rpc("get_day_bookings", { p_league_id: leagueId, p_day: date });
    setDayBookings((data as unknown as DayBooking[]) ?? []);
  }, [supabase, leagueId, date]);

  useEffect(() => {
    loadDay();
  }, [loadDay]);

  const court = courts.find((c) => c.court_id === courtId) ?? null;

  function dayAllowed(d: string, c: CourtInfo): boolean {
    const wd = new Date(`${d}T00:00:00`).getDay();
    return c.match_days.includes(wd);
  }

  const slots = useMemo(() => (court ? buildSlots(court) : []), [court]);

  function slotOccupied(s: string): boolean {
    if (!court || !date) return false;
    const startMs = new Date(`${date}T${s}:00`).getTime();
    const endMs = startMs + court.slot_minutes * 60000;
    return dayBookings.some((b) => {
      if (b.court_id !== court.court_id) return false;
      const bs = new Date(b.starts_at).getTime();
      const be = new Date(b.ends_at).getTime();
      return startMs < be && bs < endMs;
    });
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
    if (!date || !slot || !courtId) return;
    const iso = new Date(`${date}T${slot}:00`).toISOString();
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
  if (!sched.has_courts || courts.length === 0) {
    return (
      <form onSubmit={scheduleSimple} className="w-full space-y-2">
        <input type="datetime-local" className="input" value={when} onChange={(e) => setWhen(e.target.value)} />
        <input className="input" placeholder="Local (quadra, clube...)" value={place} onChange={(e) => setPlace(e.target.value)} />
        {err && <p className="text-xs text-red-600">{err}</p>}
        <div className="flex gap-2">
          <button className="btn-primary text-xs" disabled={busy}>{busy ? "Salvando..." : "Salvar"}</button>
          <button type="button" className="btn-ghost text-xs" onClick={onCancel}>Cancelar</button>
        </div>
      </form>
    );
  }

  const invalidDay = !!(date && court && !dayAllowed(date, court));

  return (
    <div className="w-full space-y-3">
      {/* 1. Data */}
      <div>
        <label className="label">Data</label>
        <input
          type="date"
          className="input"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setSlot("");
          }}
        />
      </div>

      {/* 2. Quadra */}
      {date && (
        <div>
          <label className="label">Quadra</label>
          <ul className="space-y-1.5">
            {courts.map((c) => {
              const selected = courtId === c.court_id;
              const allowed = dayAllowed(date, c);
              return (
                <li key={c.court_id}>
                  <button
                    type="button"
                    onClick={() => {
                      setCourtId(c.court_id);
                      setSlot("");
                    }}
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm ring-1 transition ${
                      selected ? "bg-amber-600 text-white ring-amber-600" : "bg-white text-slate-700 ring-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold">{c.court_name}</span>
                      {!allowed && (
                        <span className={`shrink-0 text-[10px] font-bold uppercase ${selected ? "text-amber-100" : "text-red-500"}`}>
                          fechada nesse dia
                        </span>
                      )}
                    </div>
                    <div className={`text-[11px] ${selected ? "text-amber-100" : "text-slate-400"}`}>
                      {c.match_days.map((d) => WEEKDAY_LABELS[d]).join(", ")} · {c.slot_start}–{c.slot_end} · {c.slot_minutes} min
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* 3. Horário */}
      {date && court && (
        invalidDay ? (
          <p className="text-xs text-red-600">Esta quadra não abre nesse dia da semana. Escolha outra data ou quadra.</p>
        ) : (
          <div>
            <label className="label">Horário</label>
            <div className="flex flex-wrap gap-1.5">
              {slots.map((s) => {
                const busySlot = slotOccupied(s);
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={busySlot}
                    onClick={() => setSlot(s)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                      busySlot
                        ? "cursor-not-allowed bg-slate-100 text-slate-300 line-through"
                        : slot === s
                          ? "bg-amber-600 text-white"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
              {slots.length === 0 && <span className="text-xs text-slate-400">Sem horários configurados nesta quadra.</span>}
            </div>
          </div>
        )
      )}

      {note && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{note}</p>}
      {err && <p className="text-xs text-red-600">{err}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          className="btn-primary text-xs disabled:opacity-50"
          disabled={busy || !courtId || !slot || invalidDay}
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
