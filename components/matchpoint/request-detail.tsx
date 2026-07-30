"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CLASS_LABELS, MpRequestDetail, SkillClass } from "@/lib/types";
import { initials } from "@/lib/utils";

export function RequestDetail({ id }: { id: string }) {
  const supabase = createClient();
  const [r, setR] = useState<MpRequestDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("mp_get_request", { p_id: id });
    setR((data as unknown as MpRequestDetail[])?.[0] ?? null);
  }, [supabase, id]);

  useEffect(() => {
    load();
  }, [load]);

  async function respond(accept: boolean) {
    setBusy(true);
    await supabase.rpc("mp_respond_request", { p_request_id: id, p_accept: accept });
    setBusy(false);
    if (accept) setAccepted(true);
  }

  if (!r) return <p className="py-10 text-center text-sm text-slate-400">Carregando...</p>;

  const wa = r.requester_phone ? `https://wa.me/55${r.requester_phone.replace(/\D/g, "")}` : null;

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center gap-3">
        {r.requester_avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.requester_avatar} alt="" className="h-14 w-14 rounded-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <div className="grid h-14 w-14 place-items-center rounded-full bg-court-100 font-bold text-court-700">
            {initials(r.requester_name)}
          </div>
        )}
        <div>
          <div className="font-bold">{r.requester_name}</div>
          <div className="text-xs text-slate-500">procura parceiro</div>
        </div>
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        {r.city && <Row label="Cidade">{r.city}</Row>}
        {r.club && <Row label="Clube">{r.club}</Row>}
        {r.desired_at && (
          <Row label="Quando">
            {new Date(r.desired_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
          </Row>
        )}
        {r.level != null && <Row label="Nível">{CLASS_LABELS[r.level as SkillClass]}</Row>}
        {r.modality && <Row label="Modalidade">{r.modality}</Row>}
        {r.note && <Row label="Observações">{r.note}</Row>}
      </dl>

      {r.is_mine ? (
        <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Esta é a sua solicitação. Você será avisado quando alguém aceitar.
        </p>
      ) : accepted ? (
        <div className="mt-4 rounded-2xl bg-court-50 p-3 text-center">
          <p className="text-sm font-semibold text-court-700">Você aceitou! 🎾</p>
          <p className="text-xs text-slate-500">Avisamos {r.requester_name}. Combine o jogo:</p>
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer" className="btn-primary mt-2 inline-block text-sm">
              Falar no WhatsApp
            </a>
          )}
        </div>
      ) : (
        <div className="mt-4 flex gap-2">
          <button onClick={() => respond(true)} disabled={busy} className="btn-primary flex-1 text-sm">
            {busy ? "..." : "Aceitar"}
          </button>
          <button onClick={() => respond(false)} disabled={busy} className="btn-ghost text-sm">
            Recusar
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-28 shrink-0 font-semibold text-slate-500">{label}</dt>
      <dd className="text-slate-700">{children}</dd>
    </div>
  );
}
