"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ACCEPT_INVITES_LABELS,
  AcceptInvites,
  CLASS_DESCRIPTIONS,
  CLASS_LABELS,
  DominantHand,
  FORMAT_LABELS,
  HAND_LABELS,
  MP_MODE_LABELS,
  MP_PREFS,
  MpMode,
  PlayFormat,
  Profile,
  RADIUS_OPTIONS,
  SKILL_CLASSES,
  SkillClass,
  WEEKDAY_LABELS,
} from "@/lib/types";
import { cx, initials } from "@/lib/utils";
import { PlaceAutocomplete } from "@/components/place-autocomplete";

const FORMATS: PlayFormat[] = ["simples", "duplas", "ambos"];
const HANDS: DominantHand[] = ["destro", "canhoto"];
const AVAILABILITY = ["Manhã", "Tarde", "Noite", "Dias de semana", "Fim de semana"];
const GENDERS = ["Masculino", "Feminino", "Outro"];

// Reverse geocode leve (sem chave) só para exibir o nome do bairro/cidade.
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const r = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=pt`
    );
    if (!r.ok) return null;
    const j = await r.json();
    return j.city || j.locality || j.principalSubdivision || null;
  } catch {
    return null;
  }
}

export function ProfileEditor({
  profile,
  mode,
}: {
  profile: Profile;
  mode: "onboarding" | "edit";
}) {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(profile.name || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [birthdate, setBirthdate] = useState(profile.birthdate || "");
  const [gender, setGender] = useState(profile.gender || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [skillClass, setSkillClass] = useState<SkillClass>(profile.skill_class || 5);
  const [format, setFormat] = useState<PlayFormat>(profile.play_format || "ambos");
  const [hand, setHand] = useState<DominantHand | "">(profile.dominant_hand || "");
  const [heightCm, setHeightCm] = useState<string>(profile.height_cm != null ? String(profile.height_cm) : "");
  const [availability, setAvailability] = useState<string[]>(profile.availability || []);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);
  const [radius, setRadius] = useState<number>(profile.search_radius_km || 20);

  // Participação no Match
  const [mpMode, setMpMode] = useState<MpMode>(profile.mp_mode ?? "available");
  const [mpActive, setMpActive] = useState<boolean>(profile.mp_active ?? true);
  const [mpPrice, setMpPrice] = useState<string>(
    profile.mp_price_cents ? String(profile.mp_price_cents / 100) : ""
  );
  const [mpPriceUnit, setMpPriceUnit] = useState<string>(profile.mp_price_unit ?? "hora");
  const [mpClubs, setMpClubs] = useState<string>(profile.mp_clubs ?? "");
  const [mpDays, setMpDays] = useState<number[]>(profile.mp_days ?? []);
  const [mpTimeStart, setMpTimeStart] = useState<string>((profile.mp_time_start ?? "").slice(0, 5));
  const [mpTimeEnd, setMpTimeEnd] = useState<string>((profile.mp_time_end ?? "").slice(0, 5));
  const [mpNotes, setMpNotes] = useState<string>(profile.mp_notes ?? "");
  const [mpPrefs, setMpPrefs] = useState<string[]>(profile.mp_prefs ?? []);
  const [uf, setUf] = useState<string>(profile.state ?? "");
  const [acceptInv, setAcceptInv] = useState<AcceptInvites>(
    (profile.accept_ranking_invites as AcceptInvites) ?? "any"
  );

  function toggleMpDay(d: number) {
    setMpDays((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d].sort()));
  }
  function toggleMpPref(p: string) {
    setMpPrefs((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  // Localização
  const [lat, setLat] = useState<number | null>(profile.latitude);
  const [lng, setLng] = useState<number | null>(profile.longitude);
  const [cityLabel, setCityLabel] = useState<string | null>(profile.city);
  const [placeQuery, setPlaceQuery] = useState<string>(profile.city ?? "");
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const hasLocation = lat != null && lng != null;

  function toggleAvail(a: string) {
    setAvailability((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  }

  function getLocation() {
    setLocError(null);
    if (!("geolocation" in navigator)) {
      setLocError("Seu dispositivo não suporta localização.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const la = pos.coords.latitude;
        const ln = pos.coords.longitude;
        setLat(la);
        setLng(ln);
        const c = await reverseGeocode(la, ln);
        if (c) setCityLabel(c);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setLocError(
          err.code === err.PERMISSION_DENIED
            ? "Permissão de localização negada. Habilite nos ajustes do navegador para achar tenistas perto de você."
            : "Não consegui pegar sua localização. Tente de novo."
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      setError("Imagem muito grande (máx. 25MB).");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${profile.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, {
          upsert: true,
          cacheControl: "3600",
          contentType: file.type || undefined,
        });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(`${data.publicUrl}?v=${Date.now()}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha no upload da foto.");
    } finally {
      setUploading(false);
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (name.trim().length < 2) return setError("Digite seu nome.");
    if (phone.replace(/\D/g, "").length < 8)
      return setError("Informe um telefone válido (com DDD).");
    if (!hasLocation)
      return setError("Toque em “Usar minha localização” para encontrar tenistas perto de você.");

    setSaving(true);
    try {
      const { error: upErr } = await supabase
        .from("profiles")
        .update({
          name: name.trim(),
          phone: phone.trim() || null,
          birthdate: birthdate || null,
          gender: gender || null,
          bio: bio.trim() || null,
          skill_class: skillClass,
          play_format: format,
          dominant_hand: hand || null,
          height_cm: heightCm ? parseInt(heightCm, 10) : null,
          availability: availability.length ? availability : null,
          avatar_url: avatarUrl,
          latitude: lat,
          longitude: lng,
          city: cityLabel,
          search_radius_km: radius,
          onboarded: true,
          mp_mode: mpMode,
          mp_active: mpActive,
          mp_price_cents:
            mpMode === "sparring" && mpPrice ? Math.round(parseFloat(mpPrice.replace(",", ".")) * 100) : null,
          mp_price_unit: mpPriceUnit,
          mp_clubs: mpClubs.trim() || null,
          mp_days: mpDays,
          mp_time_start: mpTimeStart || null,
          mp_time_end: mpTimeEnd || null,
          mp_notes: mpNotes.trim() || null,
          mp_prefs: mpPrefs,
          state: uf.trim() || null,
          accept_ranking_invites: acceptInv,
        })
        .eq("id", profile.id);
      if (upErr) throw upErr;

      if (mode === "onboarding") {
        router.push("/discover");
        router.refresh();
      } else {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 2500);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSave} className="space-y-7">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt="Sua foto"
            className="h-20 w-20 rounded-2xl object-cover ring-2 ring-court-200"
          />
        ) : (
          <div className="grid h-20 w-20 place-items-center rounded-2xl bg-court-100 text-2xl font-bold text-court-700">
            {initials(name || "🎾")}
          </div>
        )}
        <div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="btn-ghost text-sm"
            disabled={uploading}
          >
            {uploading ? "Enviando..." : avatarUrl ? "Trocar foto" : "Adicionar foto"}
          </button>
          <p className="mt-1 text-xs text-slate-400">Qualquer foto da galeria, até 25MB.</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.heic,.heif"
            className="hidden"
            onChange={onPickFile}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Nome</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">📱 Telefone / WhatsApp</label>
          <input
            type="tel"
            className="input"
            placeholder="(11) 99999-9999"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
          <p className="mt-1 text-xs text-slate-400">
            Fica visível só pra você e pra gestão — usado pra combinar os jogos.
          </p>
        </div>
        <div>
          <label className="label">Data de nascimento</label>
          <input
            type="date"
            className="input"
            value={birthdate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setBirthdate(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Gênero</label>
          <select className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">Prefiro não dizer</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Altura (cm)</label>
          <input
            type="number"
            inputMode="numeric"
            className="input"
            placeholder="Ex: 185"
            min={100}
            max={230}
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
          />
        </div>
      </div>

      {/* Localização */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <label className="label">📍 Sua localização</label>
        <p className="mb-3 text-xs text-slate-500">
          Usamos sua localização pra achar tenistas por perto. Use o GPS ou
          busque por cidade/endereço.
        </p>
        <button
          type="button"
          onClick={getLocation}
          className={cx("text-sm", hasLocation ? "btn-ghost" : "btn-primary")}
          disabled={locating}
        >
          {locating
            ? "Localizando..."
            : hasLocation
              ? "Atualizar pela localização atual"
              : "Usar minha localização"}
        </button>

        <div className="mt-3">
          <div className="mb-1 text-xs font-semibold text-slate-500">Ou busque uma cidade/endereço</div>
          <PlaceAutocomplete
            value={placeQuery}
            onChange={setPlaceQuery}
            placeholder="Ex.: Salvador — comece a digitar"
            onSelect={(p) => {
              setLat(p.lat);
              setLng(p.lon);
              if (p.city) setCityLabel(p.city);
              if (p.state) setUf(p.state);
            }}
          />
        </div>

        {hasLocation && (
          <p className="mt-3 flex items-center gap-2 text-sm font-medium text-court-700">
            <span>✅ Localização definida</span>
            {cityLabel && <span className="text-slate-500">· {cityLabel}{uf ? ` - ${uf}` : ""}</span>}
          </p>
        )}
        {locError && <p className="mt-3 text-sm text-red-600">{locError}</p>}
      </div>

      {/* Raio de busca */}
      <div>
        <label className="label">Buscar tenistas num raio de</label>
        <div className="flex flex-wrap gap-2">
          {RADIUS_OPTIONS.map((r) => (
            <button
              type="button"
              key={r}
              onClick={() => setRadius(r)}
              className={cx("chip", radius === r ? "chip-on" : "chip-off")}
            >
              {r} km
            </button>
          ))}
        </div>
      </div>

      {/* Classe */}
      <div>
        <label className="label">🎾 Sua classe</label>
        <div className="grid gap-2 sm:grid-cols-2">
          {SKILL_CLASSES.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setSkillClass(c)}
              className={cx(
                "rounded-2xl border p-4 text-left transition",
                skillClass === c
                  ? "border-court-500 bg-court-50 ring-1 ring-court-300"
                  : "border-slate-200 bg-white hover:border-slate-300"
              )}
            >
              <div className="font-semibold">{CLASS_LABELS[c]}</div>
              <div className="mt-0.5 text-xs text-slate-500">{CLASS_DESCRIPTIONS[c]}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Formato */}
      <div>
        <label className="label">Como você curte jogar</label>
        <div className="flex flex-wrap gap-2">
          {FORMATS.map((f) => (
            <button
              type="button"
              key={f}
              onClick={() => setFormat(f)}
              className={cx("chip", format === f ? "chip-on" : "chip-off")}
            >
              {FORMAT_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Mão dominante */}
      <div>
        <label className="label">Mão dominante</label>
        <div className="flex flex-wrap gap-2">
          {HANDS.map((h) => (
            <button
              type="button"
              key={h}
              onClick={() => setHand(hand === h ? "" : h)}
              className={cx("chip", hand === h ? "chip-on" : "chip-off")}
            >
              {HAND_LABELS[h]}
            </button>
          ))}
        </div>
      </div>

      {/* Disponibilidade */}
      <div>
        <label className="label">Quando costuma jogar</label>
        <div className="flex flex-wrap gap-2">
          {AVAILABILITY.map((a) => (
            <button
              type="button"
              key={a}
              onClick={() => toggleAvail(a)}
              className={cx("chip", availability.includes(a) ? "chip-on" : "chip-off")}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Participação no Match */}
      <div className="rounded-2xl border border-court-200 bg-court-50/50 p-4">
        <label className="label">🎾 Participação no Match</label>
        <p className="mb-3 text-xs text-slate-500">
          Escolha como quer aparecer para quem procura parceiro de tênis.
        </p>
        <div className="space-y-2">
          {(["available", "sparring", "none"] as MpMode[]).map((m) => (
            <button
              type="button"
              key={m}
              onClick={() => setMpMode(m)}
              className={cx(
                "flex w-full items-center justify-between rounded-xl border p-3 text-left transition",
                mpMode === m
                  ? "border-court-500 bg-white ring-1 ring-court-300"
                  : "border-slate-200 bg-white hover:border-slate-300"
              )}
            >
              <div>
                <div className="text-sm font-semibold">{MP_MODE_LABELS[m]}</div>
                <div className="text-xs text-slate-500">
                  {m === "available" && "Encontre parceiros para jogos casuais e treinos."}
                  {m === "sparring" && "Ofereça treinos/partidas cobrando pelo seu tempo."}
                  {m === "none" && "Não aparecer nas buscas do Match."}
                </div>
              </div>
              <span className={cx("text-lg", mpMode === m ? "text-court-600" : "text-slate-300")}>
                {mpMode === m ? "●" : "○"}
              </span>
            </button>
          ))}
        </div>

        {mpMode !== "none" && (
          <div className="mt-4 space-y-4">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={mpActive} onChange={(e) => setMpActive(e.target.checked)} />
              Disponível agora (desmarque para pausar temporariamente)
            </label>

            {mpMode === "sparring" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">Valor (R$)</label>
                  <input
                    className="input"
                    inputMode="decimal"
                    placeholder="120"
                    value={mpPrice}
                    onChange={(e) => setMpPrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Por</label>
                  <select className="input" value={mpPriceUnit} onChange={(e) => setMpPriceUnit(e.target.value)}>
                    <option value="hora">Hora</option>
                    <option value="partida">Partida</option>
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="label">Clube(s) onde costuma jogar</label>
              <input
                className="input"
                placeholder="Ex.: Clube Beira Rio, Praia Clube"
                value={mpClubs}
                onChange={(e) => setMpClubs(e.target.value)}
              />
            </div>

            <div>
              <label className="label">Dias disponíveis</label>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAY_LABELS.map((lbl, d) => (
                  <button
                    type="button"
                    key={d}
                    onClick={() => toggleMpDay(d)}
                    className={cx("chip", mpDays.includes(d) ? "chip-on" : "chip-off")}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Das</label>
                <input type="time" className="input" value={mpTimeStart} onChange={(e) => setMpTimeStart(e.target.value)} />
              </div>
              <div>
                <label className="label">Até</label>
                <input type="time" className="input" value={mpTimeEnd} onChange={(e) => setMpTimeEnd(e.target.value)} />
              </div>
            </div>

            {mpMode === "available" && (
              <div>
                <label className="label">Preferências de jogo</label>
                <div className="flex flex-wrap gap-1.5">
                  {MP_PREFS.map((p) => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => toggleMpPref(p)}
                      className={cx("chip capitalize", mpPrefs.includes(p) ? "chip-on" : "chip-off")}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="label">Observações</label>
              <textarea
                className="input min-h-[70px] resize-y"
                maxLength={280}
                placeholder={mpMode === "sparring" ? "Condições, experiência, o que inclui..." : "Algo que ajude a combinar o jogo..."}
                value={mpNotes}
                onChange={(e) => setMpNotes(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Disponibilidade para rankings próximos */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
        <label className="label">🏆 Convites para rankings próximos</label>
        <p className="mb-3 text-xs text-slate-500">
          Defina se organizadores de rankings por perto podem te convidar. Você sempre pode
          solicitar entrada por conta própria.
        </p>
        <select
          className="input"
          value={acceptInv}
          onChange={(e) => setAcceptInv(e.target.value as AcceptInvites)}
        >
          {(Object.keys(ACCEPT_INVITES_LABELS) as AcceptInvites[]).map((k) => (
            <option key={k} value={k}>
              {ACCEPT_INVITES_LABELS[k]}
            </option>
          ))}
        </select>
        <div className="mt-3">
          <label className="label">Estado (UF)</label>
          <input
            className="input"
            maxLength={2}
            placeholder="Ex.: MG"
            value={uf}
            onChange={(e) => setUf(e.target.value.toUpperCase())}
          />
        </div>
      </div>

      {/* Bio */}
      <div>
        <label className="label">Sobre você</label>
        <textarea
          className="input min-h-[96px] resize-y"
          maxLength={280}
          placeholder="Conte seu estilo, o que procura num parceiro, quadras favoritas..."
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
        <p className="mt-1 text-right text-xs text-slate-400">{bio.length}/280</p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}
      {saved && (
        <p className="rounded-xl bg-court-50 px-4 py-3 text-sm text-court-700">
          Perfil salvo! ✅
        </p>
      )}

      <button type="submit" className="btn-primary w-full text-base" disabled={saving || uploading}>
        {saving ? "Salvando..." : mode === "onboarding" ? "Começar a jogar 🎾" : "Salvar alterações"}
      </button>
    </form>
  );
}
