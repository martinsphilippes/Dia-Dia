"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CourtRow,
  DayBooking,
  LeagueSchedule,
  WEEKDAY_LABELS,
} from "@/lib/types";

type Club = {
  club_id: string;
  club_name: string;
  booking_required: boolean;
  courts: { court_id: string; court_name: string }[];
};

function groupClubs(rows: CourtRow[]): Club[] {
  const map = new Map<string, Club>();
  for (const r of rows) {
    if (!map.has(r.club_id)) {
      map.set(r.club_id, {
        club_id: r.club_id,
        club_name: r.club_name,
        booking_required: r.booking_required,
        courts: [],
      });
    }
    if (r.court_id && r.court_name) {
      map.get(r.club_id)!.courts.push({ court_id: r.court_id, court_name: r.court_name });
    }
  }
  return [...map.values()];
}

export function CourtsConfig({ leagueId }: { leagueId: string }) {
  const supabase = createClient();
  const [sched, setSched] = useState<LeagueSchedule | null>(null);
  const [clubs, setClubs] = useState<Club[] | null>(null);

  const load = useCallback(async () => {
    const [{ data: s }, { data: c }] = await Promise.all([
      supabase.rpc("get_league_schedule", { p_league_id: leagueId }),
      supabase.rpc("get_league_courts", { p_league_id: leagueId }),
    ]);
    setSched((s as unknown as LeagueSchedule[])?.[0] ?? null);
    setClubs(groupClubs((c as unknown as CourtRow[]) ?? []));
  }, [supabase, leagueId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!sched || !clubs)
    return <p className="py-6 text-center text-sm text-slate-400">Carregando...</p>;

  const manager = sched.is_manager;

  return (
    <div className="space-y-5">
      {manager && <ScheduleEditor leagueId={leagueId} sched={sched} onChange={load} />}
      {!manager && (
        <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
          <div className="font-semibold text-slate-700">Agenda do ranking</div>
          <div className="mt-1 text-xs">
            Dias: {sched.match_days.map((d) => WEEKDAY_LABELS[d]).join(", ")} · Horário{" "}
            {sched.slot_start.slice(0, 5)}–{sched.slot_end.slice(0, 5)} · jogos de{" "}
            {sched.slot_minutes} min
          </div>
        </div>
      )}

      <ClubsManager leagueId={leagueId} clubs={clubs} manager={manager} onChange={load} />

      <DayAgenda leagueId={leagueId} />
    </div>
  );
}

/* ---------------- Editor de agenda (dias/horários) ---------------- */
function ScheduleEditor({
  leagueId,
  sched,
  onChange,
}: {
  leagueId: string;
  sched: LeagueSchedule;
  onChange: () => void;
}) {
  const supabase = createClient();
  const [days, setDays] = useState<number[]>(sched.match_days);
  const [start, setStart] = useState(sched.slot_start.slice(0, 5));
  const [end, setEnd] = useState(sched.slot_end.slice(0, 5));
  const [mins, setMins] = useState(String(sched.slot_minutes));
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function toggleDay(d: number) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  }

  async function save() {
    setBusy(true);
    setErr(null);
    setOk(false);
    const { error } = await supabase.rpc("set_league_schedule", {
      p_league_id: leagueId,
      p_days: days,
      p_start: start,
      p_end: end,
      p_slot_minutes: Number(mins),
    });
    setBusy(false);
    if (error) return setErr(error.message);
    setOk(true);
    onChange();
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="text-sm font-bold text-amber-800">🗓️ Agenda do ranking</div>
      <p className="mt-1 text-xs text-amber-700">Dias e horários em que os jogos podem acontecer.</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {WEEKDAY_LABELS.map((lbl, d) => (
          <button
            key={d}
            type="button"
            onClick={() => toggleDay(d)}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
              days.includes(d) ? "bg-amber-600 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div>
          <label className="label">Início</label>
          <input type="time" className="input" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <label className="label">Fim</label>
          <input type="time" className="input" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <div>
          <label className="label">Min/jogo</label>
          <input
            className="input"
            inputMode="numeric"
            value={mins}
            onChange={(e) => setMins(e.target.value)}
          />
        </div>
      </div>

      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
      <div className="mt-3 flex items-center gap-2">
        <button onClick={save} disabled={busy} className="btn-primary text-xs">
          {busy ? "Salvando..." : "Salvar agenda"}
        </button>
        {ok && <span className="text-xs font-semibold text-green-600">✓ salvo</span>}
      </div>
    </div>
  );
}

/* ---------------- Clubes e quadras ---------------- */
function ClubsManager({
  leagueId,
  clubs,
  manager,
  onChange,
}: {
  leagueId: string;
  clubs: Club[];
  manager: boolean;
  onChange: () => void;
}) {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [required, setRequired] = useState(true);
  const [busy, setBusy] = useState(false);

  async function addClub(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    await supabase.rpc("create_club", {
      p_league_id: leagueId,
      p_name: name.trim(),
      p_booking_required: required,
    });
    setBusy(false);
    setName("");
    setRequired(true);
    onChange();
  }

  return (
    <div>
      <div className="mb-2 text-sm font-bold text-slate-700">🎾 Clubes e quadras</div>

      {manager && (
        <form onSubmit={addClub} className="mb-3 space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-3">
          <input
            className="input"
            placeholder="Nome do clube"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
            Reserva obrigatória (bloqueia o horário da quadra)
          </label>
          <button className="btn-primary text-xs" disabled={busy}>
            {busy ? "..." : "Adicionar clube"}
          </button>
        </form>
      )}

      {clubs.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-400">
          Nenhum clube cadastrado{manager ? " — adicione acima." : "."}
        </p>
      ) : (
        <ul className="space-y-3">
          {clubs.map((c) => (
            <ClubCard key={c.club_id} club={c} manager={manager} onChange={onChange} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ClubCard({ club, manager, onChange }: { club: Club; manager: boolean; onChange: () => void }) {
  const supabase = createClient();
  const [courtName, setCourtName] = useState("");
  const [busy, setBusy] = useState(false);

  async function addCourt(e: React.FormEvent) {
    e.preventDefault();
    if (!courtName.trim()) return;
    setBusy(true);
    await supabase.rpc("add_court", { p_club_id: club.club_id, p_name: courtName.trim() });
    setBusy(false);
    setCourtName("");
    onChange();
  }
  async function delCourt(id: string) {
    await supabase.rpc("delete_court", { p_court_id: id });
    onChange();
  }
  async function toggleRequired() {
    await supabase.rpc("update_club", {
      p_club_id: club.club_id,
      p_booking_required: !club.booking_required,
    });
    onChange();
  }
  async function delClub() {
    if (!confirm(`Excluir o clube "${club.club_name}" e suas quadras?`)) return;
    await supabase.rpc("delete_club", { p_club_id: club.club_id });
    onChange();
  }

  return (
    <li className="rounded-2xl border border-slate-100 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-semibold text-slate-800">{club.club_name}</div>
          <div className="text-[11px] font-semibold uppercase text-slate-400">
            {club.booking_required ? "reserva obrigatória" : "sem reserva"}
          </div>
        </div>
        {manager && (
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={toggleRequired} className="text-[11px] font-semibold text-amber-700">
              {club.booking_required ? "Tornar opcional" : "Exigir reserva"}
            </button>
            <button onClick={delClub} className="text-[11px] font-semibold text-red-500">
              Excluir
            </button>
          </div>
        )}
      </div>

      <ul className="mt-2 flex flex-wrap gap-1.5">
        {club.courts.map((ct) => (
          <li
            key={ct.court_id}
            className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
          >
            {ct.court_name}
            {manager && (
              <button onClick={() => delCourt(ct.court_id)} className="text-slate-400 hover:text-red-500">
                ✕
              </button>
            )}
          </li>
        ))}
        {club.courts.length === 0 && (
          <span className="text-xs text-slate-400">Sem quadras</span>
        )}
      </ul>

      {manager && (
        <form onSubmit={addCourt} className="mt-2 flex gap-2">
          <input
            className="input flex-1 text-sm"
            placeholder="Nome da quadra (ex.: Quadra 02)"
            value={courtName}
            onChange={(e) => setCourtName(e.target.value)}
          />
          <button className="btn-ghost text-xs" disabled={busy}>
            Add
          </button>
        </form>
      )}
    </li>
  );
}

/* ---------------- Agenda visual do dia ---------------- */
function DayAgenda({ leagueId }: { leagueId: string }) {
  const supabase = createClient();
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<DayBooking[] | null>(null);

  const load = useCallback(async () => {
    setRows(null);
    const { data } = await supabase.rpc("get_day_bookings", { p_league_id: leagueId, p_day: day });
    setRows((data as unknown as DayBooking[]) ?? []);
  }, [supabase, leagueId, day]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-bold text-slate-700">📅 Reservas do dia</div>
        <input
          type="date"
          className="input w-auto text-sm"
          value={day}
          onChange={(e) => setDay(e.target.value)}
        />
      </div>
      {!rows ? (
        <p className="py-3 text-center text-xs text-slate-400">Carregando...</p>
      ) : rows.length === 0 ? (
        <p className="py-3 text-center text-xs text-slate-400">Nenhuma reserva nesse dia.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {rows.map((r, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <div className="truncate font-medium text-slate-700">
                  {r.club_name} · {r.court_name}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {r.challenger_name ?? "?"} vs {r.challenged_name ?? "?"}
                </div>
              </div>
              <div className="shrink-0 text-xs font-semibold text-amber-700">
                {new Date(r.starts_at).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
