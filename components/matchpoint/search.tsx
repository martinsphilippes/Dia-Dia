"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CLASS_LABELS, MpSearchRow, Profile, SKILL_CLASSES } from "@/lib/types";
import { cx, initials } from "@/lib/utils";
import { useDebouncedValue } from "@/lib/use-debounce";
import { useIncremental } from "@/lib/use-incremental";
import { RowSkeletons } from "@/components/skeleton";

function brl(cents: number | null) {
  if (!cents) return null;
  return `R$ ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
}
function stars(n: number) {
  const full = Math.round(n);
  return "★★★★★".slice(0, full) + "☆☆☆☆☆".slice(0, 5 - full);
}

export function MatchPointSearch({ me }: { me: Profile }) {
  const supabase = createClient();

  const [type, setType] = useState<"" | "sparring" | "available">("");
  const [city, setCity] = useState(me.city ?? "");
  const [club, setClub] = useState("");
  const [levelMax, setLevelMax] = useState<number | "">("");
  const [modality, setModality] = useState<"" | "simples" | "duplas">("");
  const [maxKm, setMaxKm] = useState<number | "">("");
  const [priceMax, setPriceMax] = useState("");

  const [rows, setRows] = useState<MpSearchRow[] | null>(null);
  const [showReq, setShowReq] = useState(false);

  // Campos de texto entram na busca só após parar de digitar (evita 1 chamada/tecla)
  const dCity = useDebouncedValue(city, 400);
  const dClub = useDebouncedValue(club, 400);
  const dPrice = useDebouncedValue(priceMax, 400);
  const reqId = useRef(0);

  const search = useCallback(async () => {
    const myId = ++reqId.current;
    setRows(null);
    const { data } = await supabase.rpc("mp_search", {
      p_type: type || null,
      p_city: dCity.trim() || null,
      p_club: dClub.trim() || null,
      p_level_min: null,
      p_level_max: levelMax === "" ? null : levelMax,
      p_modality: modality || null,
      p_price_max_cents: dPrice ? Math.round(parseFloat(dPrice.replace(",", ".")) * 100) : null,
      p_max_km: maxKm === "" ? null : maxKm,
      p_lat: me.latitude,
      p_lng: me.longitude,
    });
    // ignora respostas antigas que chegarem depois de uma busca mais nova
    if (myId !== reqId.current) return;
    setRows((data as unknown as MpSearchRow[]) ?? []);
  }, [supabase, type, dCity, dClub, levelMax, modality, dPrice, maxKm, me.latitude, me.longitude]);

  useEffect(() => {
    search();
  }, [search]);

  const { visible, hasMore, more } = useIncremental(rows ?? [], 20);

  return (
    <div className="space-y-4">
      {/* Ações principais */}
      <div className="flex gap-2">
        <button onClick={() => setShowReq(true)} className="btn-primary flex-1 text-sm">
          📣 Procuro parceiro agora
        </button>
        <Link href="/discover" className="btn-ghost grid place-items-center text-sm">
          Match (swipe)
        </Link>
      </div>

      {showReq && <RequestForm me={me} onClose={() => setShowReq(false)} />}

      {/* Filtros */}
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <div className="mb-2 flex gap-1.5">
          {(
            [
              ["", "Todos"],
              ["sparring", "Parceiros de treino"],
              ["available", "Disponíveis"],
            ] as ["" | "sparring" | "available", string][]
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setType(k)}
              className={cx("flex-1 rounded-full px-2 py-1.5 text-xs font-semibold", type === k ? "bg-court-600 text-white" : "bg-slate-100 text-slate-600")}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input className="input text-sm" placeholder="Cidade" value={city} onChange={(e) => setCity(e.target.value)} />
          <input className="input text-sm" placeholder="Clube" value={club} onChange={(e) => setClub(e.target.value)} />
          <select className="input text-sm" value={levelMax} onChange={(e) => setLevelMax(e.target.value === "" ? "" : Number(e.target.value))}>
            <option value="">Qualquer classe</option>
            {SKILL_CLASSES.map((c) => (
              <option key={c} value={c}>
                Até {CLASS_LABELS[c]}
              </option>
            ))}
          </select>
          <select className="input text-sm" value={modality} onChange={(e) => setModality(e.target.value as "" | "simples" | "duplas")}>
            <option value="">Simples ou duplas</option>
            <option value="simples">Simples</option>
            <option value="duplas">Duplas</option>
          </select>
          <select className="input text-sm" value={maxKm} onChange={(e) => setMaxKm(e.target.value === "" ? "" : Number(e.target.value))}>
            <option value="">Qualquer distância</option>
            {[5, 10, 20, 50, 100].map((k) => (
              <option key={k} value={k}>
                Até {k} km
              </option>
            ))}
          </select>
          <input className="input text-sm" inputMode="decimal" placeholder="Preço máx. (R$)" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
        </div>
      </div>

      {/* Resultados */}
      {!rows ? (
        <RowSkeletons count={5} />
      ) : rows.length === 0 ? (
        <div className="py-10 text-center">
          <div className="text-4xl">🎾</div>
          <p className="mt-2 text-sm text-slate-500">Ninguém encontrado com esses filtros.</p>
          <p className="text-xs text-slate-400">Tente ampliar a distância ou a classe.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((r) => (
            <li key={r.id}>
              <Link
                href={`/matchpoint/perfil/${r.id}`}
                className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100 transition hover:ring-court-200"
              >
                {r.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.avatar_url} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-court-100 font-bold text-court-700">
                    {initials(r.name)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{r.name}</span>
                    <span
                      className={cx(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                        r.mp_mode === "sparring" ? "bg-amber-100 text-amber-700" : "bg-court-100 text-court-700"
                      )}
                    >
                      {r.mp_mode === "sparring" ? "Parceiro de Treino" : "Disponível"}
                    </span>
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {CLASS_LABELS[r.skill_class]}
                    {r.city ? ` · ${r.city}` : ""}
                    {r.distance_km != null ? ` · ${r.distance_km.toFixed(0)} km` : ""}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs">
                    {r.review_count > 0 ? (
                      <span className="text-amber-500">
                        {stars(r.rating)} <span className="text-slate-400">({r.review_count})</span>
                      </span>
                    ) : (
                      <span className="text-slate-300">Sem avaliações</span>
                    )}
                    {r.matches_count > 0 && <span className="text-slate-400">· {r.matches_count} jogos</span>}
                  </div>
                </div>
                {r.mp_mode === "sparring" && r.price_cents ? (
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-extrabold text-amber-700">{brl(r.price_cents)}</div>
                    <div className="text-[10px] text-slate-400">/{r.price_unit}</div>
                  </div>
                ) : null}
              </Link>
            </li>
          ))}
          {hasMore && (
            <li>
              <button onClick={more} className="btn-ghost w-full text-sm">
                Ver mais
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

/* ---------------- Solicitação de partida ---------------- */
function RequestForm({ me, onClose }: { me: Profile; onClose: () => void }) {
  const supabase = createClient();
  const [city, setCity] = useState(me.city ?? "");
  const [club, setClub] = useState("");
  const [when, setWhen] = useState("");
  const [modality, setModality] = useState<"" | "simples" | "duplas">("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data } = await supabase.rpc("mp_create_request", {
      p_city: city.trim() || null,
      p_club: club.trim() || null,
      p_desired_at: when ? new Date(when).toISOString() : null,
      p_level: me.skill_class,
      p_modality: modality || null,
      p_note: note.trim() || null,
    });
    setBusy(false);
    const notified = (data as unknown as { notified?: number } | null)?.notified ?? 0;
    setDone(notified);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 sm:place-items-center" onClick={onClose}>
      <div className="pb-safe-sheet w-full max-w-md rounded-t-3xl bg-white p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        {done === null ? (
          <form onSubmit={submit} className="space-y-3">
            <h2 className="text-lg font-extrabold">📣 Procuro parceiro</h2>
            <p className="text-xs text-slate-500">
              Avisamos automaticamente os jogadores compatíveis perto de você.
            </p>
            <input className="input" placeholder="Cidade" value={city} onChange={(e) => setCity(e.target.value)} />
            <input className="input" placeholder="Clube (opcional)" value={club} onChange={(e) => setClub(e.target.value)} />
            <input type="datetime-local" className="input" value={when} onChange={(e) => setWhen(e.target.value)} />
            <select className="input" value={modality} onChange={(e) => setModality(e.target.value as "" | "simples" | "duplas")}>
              <option value="">Simples ou duplas</option>
              <option value="simples">Simples</option>
              <option value="duplas">Duplas</option>
            </select>
            <textarea className="input min-h-[70px]" placeholder="Observações (opcional)" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex gap-2">
              <button className="btn-primary flex-1" disabled={busy}>
                {busy ? "Enviando..." : "Enviar solicitação"}
              </button>
              <button type="button" className="btn-ghost" onClick={onClose}>
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <div className="py-4 text-center">
            <div className="text-4xl">📣</div>
            <h2 className="mt-2 text-lg font-extrabold">Solicitação enviada!</h2>
            <p className="mt-1 text-sm text-slate-500">
              {done > 0
                ? `Avisamos ${done} jogador${done === 1 ? "" : "es"} compatíve${done === 1 ? "l" : "is"}. Fique de olho nas notificações.`
                : "Ainda não há jogadores compatíveis por perto — tente novamente mais tarde ou amplie sua área."}
            </p>
            <button onClick={onClose} className="btn-primary mt-4">
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
