"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CourtInfo,
  CourtRow,
  DayBooking,
  LeagueSchedule,
  MyClub,
  WEEKDAY_LABELS,
} from "@/lib/types";

/**
 * Aba "Quadras": mostra e configura o ÚNICO clube dono deste ranking.
 * O ranking herda quadras, horários e regras desse clube; não é possível
 * usar quadras de outro clube.
 */
export function CourtsConfig({ leagueId }: { leagueId: string }) {
  const supabase = createClient();
  const [sched, setSched] = useState<LeagueSchedule | null>(null);
  const [courts, setCourts] = useState<CourtInfo[]>([]);
  const [bookingRequired, setBookingRequired] = useState(true);

  const load = useCallback(async () => {
    const [{ data: s }, { data: c }] = await Promise.all([
      supabase.rpc("get_league_schedule", { p_league_id: leagueId }),
      supabase.rpc("get_league_courts", { p_league_id: leagueId }),
    ]);
    const schedule = (s as unknown as LeagueSchedule[])?.[0] ?? null;
    setSched(schedule);
    const rows = (c as unknown as CourtRow[]) ?? [];
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
    if (rows[0]) setBookingRequired(rows[0].booking_required);
  }, [supabase, leagueId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!sched) return <p className="py-6 text-center text-sm text-slate-400">Carregando...</p>;

  // Ranking ainda sem clube vinculado
  if (!sched.club_id) {
    return sched.is_manager === false ? (
      <p className="py-6 text-center text-sm text-slate-500">
        Este ranking ainda não está vinculado a um clube.
      </p>
    ) : (
      <BindClub leagueId={leagueId} onChange={load} />
    );
  }

  const manager = sched.is_manager;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 p-3">
        <div className="text-xs font-semibold uppercase text-amber-600">Clube dono do ranking</div>
        <div className="text-lg font-extrabold text-amber-800">🎾 {sched.club_name}</div>
        <div className="mt-1 text-xs text-amber-700">
          O ranking usa exclusivamente as quadras e a agenda deste clube.
        </div>
      </div>

      {manager ? (
        <CourtsManager
          clubId={sched.club_id}
          courts={courts}
          bookingRequired={bookingRequired}
          onChange={load}
        />
      ) : (
        <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
          <div className="mb-2 text-xs text-slate-500">
            {bookingRequired ? "Reserva de quadra obrigatória." : "Reserva de quadra opcional."}
          </div>
          <ul className="space-y-1.5">
            {courts.map((c) => (
              <li key={c.court_id} className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                <div className="text-sm font-semibold text-slate-700">{c.court_name}</div>
                <div className="text-[11px] text-slate-500">
                  {c.match_days.map((d) => WEEKDAY_LABELS[d]).join(", ")} · {c.slot_start}–{c.slot_end} · jogos de {c.slot_minutes} min
                </div>
              </li>
            ))}
            {courts.length === 0 && <span className="text-xs text-slate-400">Sem quadras cadastradas.</span>}
          </ul>
        </div>
      )}

      <DayAgenda leagueId={leagueId} />
    </div>
  );
}

/* ---------------- Vincular o ranking a um clube ---------------- */
function BindClub({ leagueId, onChange }: { leagueId: string; onChange: () => void }) {
  const supabase = createClient();
  const [clubs, setClubs] = useState<MyClub[]>([]);
  const [mode, setMode] = useState<"existing" | "new">("new");
  const [clubId, setClubId] = useState("");
  const [name, setName] = useState("");
  const [req, setReq] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.rpc("get_my_clubs").then(({ data }) => {
      const cs = (data as unknown as MyClub[]) ?? [];
      setClubs(cs);
      if (cs.length > 0) {
        setMode("existing");
        setClubId(cs[0].id);
      }
    });
  }, [supabase]);

  async function save() {
    const useExisting = mode === "existing" && clubId;
    if (!useExisting && name.trim().length < 2) return setErr("Escolha ou crie um clube.");
    setBusy(true);
    setErr(null);
    const { error } = await supabase.rpc("set_league_club", {
      p_league_id: leagueId,
      p_club_id: useExisting ? clubId : null,
      p_new_club_name: useExisting ? null : name.trim(),
      p_booking_required: req,
    });
    setBusy(false);
    if (error) return setErr(error.message);
    onChange();
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="text-sm font-bold text-amber-800">Vincular a um clube</div>
      <p className="mt-1 text-xs text-amber-700">
        Todo ranking pertence a um clube. Escolha um existente ou crie um novo.
      </p>
      {clubs.length > 0 && (
        <div className="mt-3 flex gap-1.5">
          <button
            type="button"
            onClick={() => setMode("existing")}
            className={`flex-1 rounded-full px-2 py-1.5 text-xs font-semibold ${mode === "existing" ? "bg-amber-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
          >
            Clube existente
          </button>
          <button
            type="button"
            onClick={() => setMode("new")}
            className={`flex-1 rounded-full px-2 py-1.5 text-xs font-semibold ${mode === "new" ? "bg-amber-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
          >
            Novo clube
          </button>
        </div>
      )}
      <div className="mt-2">
        {mode === "existing" && clubs.length > 0 ? (
          <select className="input" value={clubId} onChange={(e) => setClubId(e.target.value)}>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="space-y-2">
            <input className="input" placeholder="Nome do clube" value={name} onChange={(e) => setName(e.target.value)} />
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={req} onChange={(e) => setReq(e.target.checked)} />
              Reserva de quadra obrigatória
            </label>
          </div>
        )}
      </div>
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
      <button onClick={save} disabled={busy} className="btn-primary mt-3 text-xs">
        {busy ? "Salvando..." : "Vincular clube"}
      </button>
    </div>
  );
}

/* ---------------- Quadras do clube (agenda por quadra) ---------------- */
function CourtsManager({
  clubId,
  courts,
  bookingRequired,
  onChange,
}: {
  clubId: string;
  courts: CourtInfo[];
  bookingRequired: boolean;
  onChange: () => void;
}) {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function addCourt(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    await supabase.rpc("add_court", { p_club_id: clubId, p_name: name.trim() });
    setBusy(false);
    setName("");
    onChange();
  }
  async function delCourt(id: string) {
    if (!confirm("Remover esta quadra?")) return;
    await supabase.rpc("delete_court", { p_court_id: id });
    onChange();
  }
  async function toggleRequired() {
    await supabase.rpc("update_club", { p_club_id: clubId, p_booking_required: !bookingRequired });
    onChange();
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-bold text-slate-700">🎾 Quadras e horários</div>
        <button onClick={toggleRequired} className="text-[11px] font-semibold text-amber-700">
          {bookingRequired ? "Reserva obrigatória ✓" : "Sem reserva obrigatória"}
        </button>
      </div>
      <p className="mt-1 text-xs text-slate-500">Cada quadra tem sua própria agenda. Sem dois jogos no mesmo horário e quadra.</p>

      <div className="mt-3 space-y-2">
        {courts.map((ct) => (
          <CourtCard key={ct.court_id} court={ct} onDelete={() => delCourt(ct.court_id)} onChange={onChange} />
        ))}
        {courts.length === 0 && <p className="text-xs text-slate-400">Nenhuma quadra cadastrada ainda.</p>}
      </div>

      <form onSubmit={addCourt} className="mt-3 flex gap-2">
        <input
          className="input flex-1 text-sm"
          placeholder="Nome da quadra (ex.: Quadra 02)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn-ghost text-xs" disabled={busy}>
          Add
        </button>
      </form>
    </div>
  );
}

/* -------- Card de uma quadra com sua agenda -------- */
function CourtCard({ court, onDelete, onChange }: { court: CourtInfo; onDelete: () => void; onChange: () => void }) {
  const supabase = createClient();
  const [days, setDays] = useState<number[]>(court.match_days);
  const [start, setStart] = useState(court.slot_start);
  const [end, setEnd] = useState(court.slot_end);
  const [mins, setMins] = useState(String(court.slot_minutes));
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
    const { error } = await supabase.rpc("set_court_schedule", {
      p_court_id: court.court_id,
      p_days: days,
      p_start: start,
      p_end: end,
      p_slot_minutes: Number(mins) || 60,
    });
    setBusy(false);
    if (error) return setErr(error.message);
    setOk(true);
    setTimeout(() => setOk(false), 1500);
    onChange();
  }

  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-slate-700">{court.court_name}</div>
        <button onClick={onDelete} className="text-xs font-semibold text-red-500">Remover</button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
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

      <div className="mt-2 grid grid-cols-[1fr_1fr_4.5rem] gap-2">
        <div>
          <label className="label">Início</label>
          <input type="time" className="input w-full min-w-0" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <label className="label">Fim</label>
          <input type="time" className="input w-full min-w-0" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <div>
          <label className="label">Min</label>
          <input
            className="input w-full min-w-0 px-2 text-center"
            inputMode="numeric"
            maxLength={3}
            value={mins}
            onChange={(e) => setMins(e.target.value.replace(/\D/g, "").slice(0, 3))}
          />
        </div>
      </div>

      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
      <div className="mt-2 flex items-center gap-2">
        <button onClick={save} disabled={busy} className="btn-primary text-xs">
          {busy ? "Salvando..." : "Salvar agenda"}
        </button>
        {ok && <span className="text-xs font-semibold text-green-600">✓ salvo</span>}
      </div>
    </div>
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
        <input type="date" className="input w-auto text-sm" value={day} onChange={(e) => setDay(e.target.value)} />
      </div>
      {!rows ? (
        <p className="py-3 text-center text-xs text-slate-400">Carregando...</p>
      ) : rows.length === 0 ? (
        <p className="py-3 text-center text-xs text-slate-400">Nenhuma reserva nesse dia.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium text-slate-700">
                  {r.club_name} · {r.court_name}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {r.challenger_name ?? "?"} vs {r.challenged_name ?? "?"}
                </div>
              </div>
              <div className="shrink-0 text-xs font-semibold text-amber-700">
                {new Date(r.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
