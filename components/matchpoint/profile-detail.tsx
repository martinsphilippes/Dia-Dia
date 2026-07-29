"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CLASS_LABELS, MpProfile, MpReview, SkillClass, WEEKDAY_LABELS } from "@/lib/types";
import { initials, timeAgo } from "@/lib/utils";

function brl(cents: number | null) {
  if (!cents) return null;
  return `R$ ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
}
function starRow(n: number) {
  return "★★★★★".slice(0, Math.round(n)) + "☆☆☆☆☆".slice(0, 5 - Math.round(n));
}

export function MpProfileDetail({ id }: { id: string }) {
  const supabase = createClient();
  const [p, setP] = useState<MpProfile | null>(null);
  const [reviews, setReviews] = useState<MpReview[]>([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [showRate, setShowRate] = useState(false);

  const load = useCallback(async () => {
    const [{ data: prof }, { data: rv }] = await Promise.all([
      supabase.rpc("mp_get_profile", { p_id: id }),
      supabase.rpc("mp_get_reviews", { p_id: id }),
    ]);
    setP((prof as unknown as MpProfile[])?.[0] ?? null);
    setReviews((rv as unknown as MpReview[]) ?? []);
  }, [supabase, id]);

  useEffect(() => {
    load();
  }, [load]);

  async function submitReview() {
    if (rating < 1) return;
    setBusy(true);
    await supabase.rpc("mp_add_review", { p_ratee: id, p_stars: rating, p_comment: comment.trim() || null });
    setBusy(false);
    setShowRate(false);
    setComment("");
    setRating(0);
    load();
  }

  if (!p) return <p className="py-10 text-center text-sm text-slate-400">Carregando...</p>;

  const wa = p.phone ? `https://wa.me/55${p.phone.replace(/\D/g, "")}` : null;

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center gap-4">
          {p.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.avatar_url} alt="" className="h-20 w-20 rounded-2xl object-cover" />
          ) : (
            <div className="grid h-20 w-20 place-items-center rounded-2xl bg-court-100 text-2xl font-bold text-court-700">
              {initials(p.name)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-xl font-extrabold">{p.name}</h1>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  p.mp_mode === "sparring" ? "bg-amber-100 text-amber-700" : "bg-court-100 text-court-700"
                }`}
              >
                {p.mp_mode === "sparring" ? "Parceiro de Treino" : "Disponível"}
              </span>
            </div>
            <div className="text-sm text-slate-500">
              {CLASS_LABELS[p.skill_class as SkillClass]}
              {p.city ? ` · ${p.city}` : ""}
            </div>
            <div className="mt-1 text-sm">
              {p.review_count > 0 ? (
                <span className="text-amber-500">
                  {starRow(p.rating)} <span className="text-slate-500">{p.rating} ({p.review_count})</span>
                </span>
              ) : (
                <span className="text-slate-300">Sem avaliações</span>
              )}
              {p.matches_count > 0 && <span className="text-slate-400"> · {p.matches_count} jogos</span>}
            </div>
          </div>
        </div>

        {p.mp_mode === "sparring" && p.price_cents && (
          <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-center">
            <span className="text-2xl font-extrabold text-amber-700">{brl(p.price_cents)}</span>
            <span className="text-sm text-amber-600"> / {p.price_unit}</span>
          </div>
        )}

        <dl className="mt-4 space-y-2 text-sm">
          {p.clubs && <Row label="Clubes">{p.clubs}</Row>}
          {(p.time_start || (p.mp_days && p.mp_days.length > 0)) && (
            <Row label="Disponibilidade">
              {p.mp_days && p.mp_days.length > 0 ? p.mp_days.map((d) => WEEKDAY_LABELS[d]).join(", ") : ""}
              {p.time_start ? ` · ${p.time_start.slice(0, 5)}–${(p.time_end ?? "").slice(0, 5)}` : ""}
            </Row>
          )}
          {p.prefs && p.prefs.length > 0 && <Row label="Preferências">{p.prefs.join(", ")}</Row>}
          {p.notes && <Row label="Observações">{p.notes}</Row>}
          {p.bio && <Row label="Sobre">{p.bio}</Row>}
        </dl>

        <div className="mt-4 flex gap-2">
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer" className="btn-primary flex-1 text-center text-sm">
              Falar no WhatsApp
            </a>
          )}
          <button onClick={() => setShowRate((v) => !v)} className="btn-ghost text-sm">
            Avaliar
          </button>
        </div>

        {showRate && (
          <div className="mt-3 rounded-2xl bg-slate-50 p-3">
            <div className="flex justify-center gap-1 text-3xl">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => setRating(s)} className={s <= rating ? "text-amber-500" : "text-slate-300"}>
                  ★
                </button>
              ))}
            </div>
            <textarea
              className="input mt-2 min-h-[60px]"
              placeholder="Comentário (opcional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button onClick={submitReview} disabled={busy || rating < 1} className="btn-primary mt-2 w-full text-sm">
              {busy ? "Enviando..." : "Enviar avaliação"}
            </button>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-bold text-slate-700">Avaliações</h2>
        {reviews.length === 0 ? (
          <p className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-slate-400 ring-1 ring-slate-100">
            Ainda sem avaliações.
          </p>
        ) : (
          <ul className="space-y-2">
            {reviews.map((r, i) => (
              <li key={i} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{r.rater_name}</span>
                  <span className="text-amber-500">{starRow(r.stars)}</span>
                  <span className="ml-auto text-[11px] text-slate-400">{timeAgo(r.created_at)}</span>
                </div>
                {r.comment && <p className="mt-1 text-sm text-slate-600">{r.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-32 shrink-0 font-semibold text-slate-500">{label}</dt>
      <dd className="text-slate-700">{children}</dd>
    </div>
  );
}
