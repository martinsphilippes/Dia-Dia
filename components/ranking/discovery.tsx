"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ACCEPT_INVITES_LABELS,
  AcceptInvites,
  CLASS_LABELS,
  JoinRequest,
  LeagueDiscovery,
  MyRankingInvite,
  NearbyLeague,
  PossibleAthlete,
  SKILL_CLASSES,
  VISIBILITY_LABELS,
  LeagueVisibility,
} from "@/lib/types";
import { initials } from "@/lib/utils";

/* ============ Jogador: rankings próximos ============ */
export function NearbyLeagues() {
  const supabase = createClient();
  const [rows, setRows] = useState<NearbyLeague[] | null>(null);
  const [maxKm, setMaxKm] = useState<number | "">("");
  const [city, setCity] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRows(null);
    const { data } = await supabase.rpc("discover_leagues", {
      p_lat: coords?.lat ?? null,
      p_lng: coords?.lng ?? null,
      p_city: city.trim() || null,
      p_max_km: maxKm === "" ? null : maxKm,
    });
    setRows((data as unknown as NearbyLeague[]) ?? []);
  }, [supabase, coords, city, maxKm]);

  useEffect(() => {
    load();
  }, [load]);

  function useLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((p) =>
      setCoords({ lat: p.coords.latitude, lng: p.coords.longitude })
    );
  }

  async function request(id: string) {
    setBusy(id);
    await supabase.rpc("request_league_join", { p_league_id: id, p_message: null });
    await load();
    setBusy(null);
  }
  async function cancel(id: string) {
    setBusy(id);
    await supabase.rpc("cancel_join_request", { p_league_id: id });
    await load();
    setBusy(null);
  }

  return (
    <section className="rounded-3xl bg-white p-5 shadow-card">
      <h2 className="text-lg font-bold">Rankings próximos de você</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          className="input h-9 flex-1 text-sm"
          placeholder="Cidade"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <select
          className="input h-9 w-32 text-sm"
          value={maxKm}
          onChange={(e) => setMaxKm(e.target.value === "" ? "" : Number(e.target.value))}
        >
          <option value="">Distância</option>
          {[25, 50, 100, 200].map((k) => (
            <option key={k} value={k}>
              Até {k} km
            </option>
          ))}
        </select>
        <button onClick={useLocation} className="btn-ghost h-9 text-xs">
          📍 {coords ? "Localização ✓" : "Usar localização"}
        </button>
      </div>

      {!rows ? (
        <p className="mt-4 text-sm text-slate-400">Buscando...</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Nenhum ranking aberto por perto no momento.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((l) => (
            <li key={l.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/ranking/${l.id}`} className="font-semibold hover:underline">
                    {l.name}
                  </Link>
                  <div className="text-xs text-slate-500">
                    {l.club_name ? `${l.club_name} · ` : ""}
                    {l.city ?? ""}
                    {l.state ? `/${l.state}` : ""}
                    {l.distance_km != null ? ` · ${l.distance_km.toFixed(0)} km` : ""}
                  </div>
                  <div className="text-xs text-slate-400">
                    {l.member_count} participante{l.member_count === 1 ? "" : "s"}
                  </div>
                </div>
                {l.has_invite ? (
                  <span className="shrink-0 rounded-full bg-court-100 px-3 py-1.5 text-xs font-bold text-court-700">
                    Convite recebido
                  </span>
                ) : l.my_request_status === "pending" ? (
                  <button
                    onClick={() => cancel(l.id)}
                    disabled={busy === l.id}
                    className="shrink-0 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700"
                  >
                    Solicitação pendente ✕
                  </button>
                ) : (
                  <button
                    onClick={() => request(l.id)}
                    disabled={busy === l.id}
                    className="btn-primary shrink-0 text-xs"
                  >
                    {busy === l.id ? "..." : "Solicitar entrada"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ============ Jogador: meus convites ============ */
export function MyInvites() {
  const supabase = createClient();
  const [rows, setRows] = useState<MyRankingInvite[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("get_my_ranking_invites");
    setRows((data as unknown as MyRankingInvite[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function respond(id: string, accept: boolean) {
    setBusy(id);
    await supabase.rpc("respond_league_invite", { p_invite_id: id, p_accept: accept });
    await load();
    setBusy(null);
  }

  if (rows.length === 0) return null;

  return (
    <section className="rounded-3xl bg-white p-5 shadow-card">
      <h2 className="text-lg font-bold">Convites para rankings</h2>
      <ul className="mt-3 space-y-2">
        {rows.map((i) => (
          <li key={i.invite_id} className="rounded-2xl border border-court-100 bg-court-50/50 p-3">
            <div className="font-semibold">{i.league_name}</div>
            <div className="text-xs text-slate-500">
              {i.club_name ? `${i.club_name} · ` : ""}
              convite de {i.organizer_name ?? "organizador"}
              {i.deadline ? ` · até ${new Date(i.deadline).toLocaleDateString("pt-BR")}` : ""}
            </div>
            {i.message && <p className="mt-1 text-sm text-slate-600">{i.message}</p>}
            <div className="mt-2 flex gap-2">
              <button onClick={() => respond(i.invite_id, true)} disabled={busy === i.invite_id} className="btn-primary text-xs">
                Aceitar
              </button>
              <button onClick={() => respond(i.invite_id, false)} disabled={busy === i.invite_id} className="btn-ghost text-xs">
                Recusar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ============ Organizador: solicitações de entrada ============ */
export function JoinRequestsPanel({ leagueId, onChange }: { leagueId: string; onChange: () => void }) {
  const supabase = createClient();
  const [rows, setRows] = useState<JoinRequest[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("get_join_requests", { p_league_id: leagueId });
    setRows((data as unknown as JoinRequest[]) ?? []);
  }, [supabase, leagueId]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(id: string, approve: boolean) {
    setBusy(id);
    let reason: string | null = null;
    if (!approve) reason = prompt("Motivo (opcional):") || null;
    await supabase.rpc("decide_join_request", { p_request_id: id, p_approve: approve, p_reason: reason });
    await load();
    onChange();
    setBusy(null);
  }

  return (
    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="text-sm font-bold text-amber-800">📥 Solicitações de entrada</div>
      {rows.length === 0 ? (
        <p className="mt-2 text-xs text-amber-700">Nenhuma solicitação pendente.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.request_id} className="rounded-xl bg-white p-3">
              <div className="flex items-center gap-2">
                {r.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                    {initials(r.name)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{r.name}</div>
                  <div className="truncate text-xs text-slate-500">
                    {CLASS_LABELS[r.skill_class]}
                    {r.city ? ` · ${r.city}` : ""}
                    {r.distance_km != null ? ` · ${r.distance_km.toFixed(0)} km` : ""}
                    {r.other_rankings > 0 ? ` · ${r.other_rankings} ranking(s)` : ""}
                  </div>
                </div>
              </div>
              {r.message && <p className="mt-1 text-xs text-slate-600">{r.message}</p>}
              <div className="mt-2 flex gap-2">
                <button onClick={() => decide(r.request_id, true)} disabled={busy === r.request_id} className="btn-primary text-xs">
                  Aprovar
                </button>
                <button onClick={() => decide(r.request_id, false)} disabled={busy === r.request_id} className="btn-ghost text-xs">
                  Recusar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ============ Organizador: possíveis atletas + convites ============ */
export function PossibleAthletesPanel({ leagueId }: { leagueId: string }) {
  const supabase = createClient();
  const [rows, setRows] = useState<PossibleAthlete[] | null>(null);
  const [maxKm, setMaxKm] = useState<number | "">("");
  const [city, setCity] = useState("");
  const [levelMax, setLevelMax] = useState<number | "">("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // convite por e-mail
  const [email, setEmail] = useState("");
  const [emailMsg, setEmailMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRows(null);
    const { data } = await supabase.rpc("search_possible_athletes", {
      p_league_id: leagueId,
      p_max_km: maxKm === "" ? null : maxKm,
      p_city: city.trim() || null,
      p_state: null,
      p_level_min: null,
      p_level_max: levelMax === "" ? null : levelMax,
      p_club: null,
    });
    setRows((data as unknown as PossibleAthlete[]) ?? []);
  }, [supabase, leagueId, maxKm, city, levelMax]);

  useEffect(() => {
    load();
  }, [load]);

  async function invite(a: PossibleAthlete) {
    setBusy(a.player_id);
    setMsg(null);
    const { error } = await supabase.rpc("invite_athlete", {
      p_league_id: leagueId,
      p_player_id: a.player_id,
      p_class: CLASS_LABELS[a.skill_class],
      p_message: null,
      p_deadline: null,
    });
    setBusy(null);
    if (error) setMsg(error.message);
    else {
      setMsg(`Convite enviado para ${a.name}.`);
      load();
    }
  }

  async function inviteEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setEmailMsg(null);
    const { data, error } = await supabase.rpc("invite_by_email", {
      p_league_id: leagueId,
      p_email: email.trim(),
      p_name: null,
      p_class: null,
      p_message: null,
      p_deadline: null,
    });
    if (error) return setEmailMsg(error.message);
    const linked = (data as unknown as { linked?: boolean } | null)?.linked;
    setEmailMsg(
      linked
        ? "Convite enviado ao usuário no app. ✅"
        : "Convite registrado. O envio por e-mail para quem ainda não tem conta será ativado em breve."
    );
    setEmail("");
  }

  return (
    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="text-sm font-bold text-amber-800">🔎 Possíveis atletas</div>
      <p className="mt-1 text-xs text-amber-700">Convide jogadores próximos e disponíveis.</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <input className="input h-9 flex-1 text-sm" placeholder="Cidade" value={city} onChange={(e) => setCity(e.target.value)} />
        <select className="input h-9 w-28 text-sm" value={maxKm} onChange={(e) => setMaxKm(e.target.value === "" ? "" : Number(e.target.value))}>
          <option value="">Distância</option>
          {[25, 50, 100].map((k) => (
            <option key={k} value={k}>Até {k} km</option>
          ))}
        </select>
        <select className="input h-9 w-28 text-sm" value={levelMax} onChange={(e) => setLevelMax(e.target.value === "" ? "" : Number(e.target.value))}>
          <option value="">Classe</option>
          {SKILL_CLASSES.map((c) => (
            <option key={c} value={c}>Até {CLASS_LABELS[c]}</option>
          ))}
        </select>
      </div>

      {msg && <p className="mt-2 text-xs text-court-700">{msg}</p>}

      {!rows ? (
        <p className="mt-3 text-xs text-slate-500">Buscando...</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">Nenhum atleta disponível com esses filtros.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((a) => (
            <li key={a.player_id} className="flex items-center gap-2 rounded-xl bg-white p-2.5">
              {a.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <div className="grid h-9 w-9 place-items-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                  {initials(a.name)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{a.name}</div>
                <div className="truncate text-xs text-slate-500">
                  {CLASS_LABELS[a.skill_class]}
                  {a.city ? ` · ${a.city}` : ""}
                  {a.distance_km != null ? ` · ${a.distance_km.toFixed(0)} km` : ""}
                  {a.other_rankings > 0 ? ` · ${a.other_rankings} ranking(s)` : ""}
                </div>
              </div>
              <button onClick={() => invite(a)} disabled={busy === a.player_id} className="btn-primary shrink-0 text-xs">
                {busy === a.player_id ? "..." : "Convidar"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={inviteEmail} className="mt-4 border-t border-amber-200 pt-3">
        <div className="text-xs font-bold text-amber-800">Convidar atleta por e-mail</div>
        <div className="mt-2 flex gap-2">
          <input className="input h-9 flex-1 text-sm" type="email" placeholder="email@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn-ghost text-xs">Convidar</button>
        </div>
        {emailMsg && <p className="mt-2 text-xs text-slate-600">{emailMsg}</p>}
      </form>
    </div>
  );
}

/* ============ Organizador: configuração de descoberta ============ */
export function DiscoverySettings({ leagueId }: { leagueId: string }) {
  const supabase = createClient();
  const [d, setD] = useState<LeagueDiscovery | null>(null);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("get_league_discovery", { p_league_id: leagueId });
    setD((data as unknown as LeagueDiscovery[])?.[0] ?? null);
  }, [supabase, leagueId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!d) return null;

  function set<K extends keyof LeagueDiscovery>(k: K, v: LeagueDiscovery[K]) {
    setD((cur) => (cur ? { ...cur, [k]: v } : cur));
  }

  function useLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((p) => {
      set("latitude", p.coords.latitude);
      set("longitude", p.coords.longitude);
    });
  }

  async function save() {
    if (!d) return;
    setBusy(true);
    setOk(false);
    await supabase.rpc("set_league_discovery", {
      p_league_id: leagueId,
      p_visibility: d.visibility,
      p_radius: d.discovery_radius_km,
      p_lat: d.latitude,
      p_lng: d.longitude,
      p_city: d.city,
      p_state: d.state,
      p_max: d.max_participants,
      p_deadline: d.entry_deadline,
    });
    setBusy(false);
    setOk(true);
    load();
  }

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-sm font-bold text-slate-700">🌐 Descoberta e acesso</div>
      <div className="mt-3 space-y-3">
        <div>
          <label className="label">Visibilidade</label>
          <select className="input" value={d.visibility} onChange={(e) => set("visibility", e.target.value as LeagueVisibility)}>
            {(Object.keys(VISIBILITY_LABELS) as LeagueVisibility[]).map((k) => (
              <option key={k} value={k}>{VISIBILITY_LABELS[k]}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Cidade</label>
            <input className="input" value={d.city ?? ""} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div>
            <label className="label">UF</label>
            <input className="input" maxLength={2} value={d.state ?? ""} onChange={(e) => set("state", e.target.value.toUpperCase())} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Raio de descoberta (km)</label>
            <input className="input" inputMode="numeric" value={d.discovery_radius_km} onChange={(e) => set("discovery_radius_km", Number(e.target.value) || 0)} />
          </div>
          <div>
            <label className="label">Máx. participantes</label>
            <input className="input" inputMode="numeric" value={d.max_participants ?? ""} onChange={(e) => set("max_participants", e.target.value ? Number(e.target.value) : null)} />
          </div>
        </div>
        <div>
          <label className="label">Prazo para entradas</label>
          <input type="date" className="input" value={d.entry_deadline ?? ""} onChange={(e) => set("entry_deadline", e.target.value || null)} />
        </div>
        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs">
          <span className="text-slate-500">
            {d.latitude != null ? "📍 Local definido" : "Local não definido (usa a cidade)"}
          </span>
          <button type="button" onClick={useLocation} className="font-semibold text-court-700">
            Usar minha localização
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={save} disabled={busy} className="btn-primary text-sm">
            {busy ? "Salvando..." : "Salvar"}
          </button>
          {ok && <span className="text-xs font-semibold text-green-600">✓ salvo</span>}
        </div>
      </div>
    </div>
  );
}
