"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  CLASS_DESCRIPTIONS,
  CLASS_LABELS,
  DominantHand,
  FORMAT_LABELS,
  HAND_LABELS,
  PlayFormat,
  Profile,
  RADIUS_OPTIONS,
  SKILL_CLASSES,
  SkillClass,
} from "@/lib/types";
import { cx, initials } from "@/lib/utils";

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
  const [birthdate, setBirthdate] = useState(profile.birthdate || "");
  const [gender, setGender] = useState(profile.gender || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [skillClass, setSkillClass] = useState<SkillClass>(profile.skill_class || 5);
  const [format, setFormat] = useState<PlayFormat>(profile.play_format || "ambos");
  const [hand, setHand] = useState<DominantHand | "">(profile.dominant_hand || "");
  const [availability, setAvailability] = useState<string[]>(profile.availability || []);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);
  const [radius, setRadius] = useState<number>(profile.search_radius_km || 20);

  // Localização
  const [lat, setLat] = useState<number | null>(profile.latitude);
  const [lng, setLng] = useState<number | null>(profile.longitude);
  const [cityLabel, setCityLabel] = useState<string | null>(profile.city);
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
    if (!hasLocation)
      return setError("Toque em “Usar minha localização” para encontrar tenistas perto de você.");

    setSaving(true);
    try {
      const { error: upErr } = await supabase
        .from("profiles")
        .update({
          name: name.trim(),
          birthdate: birthdate || null,
          gender: gender || null,
          bio: bio.trim() || null,
          skill_class: skillClass,
          play_format: format,
          dominant_hand: hand || null,
          availability: availability.length ? availability : null,
          avatar_url: avatarUrl,
          latitude: lat,
          longitude: lng,
          city: cityLabel,
          search_radius_km: radius,
          onboarded: true,
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
      </div>

      {/* Localização em tempo real */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <label className="label">📍 Sua localização</label>
        <p className="mb-3 text-xs text-slate-500">
          Nada de digitar endereço — usamos sua localização atual pra achar
          tenistas por perto. Viajou? É só atualizar aqui no destino.
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
              ? "Atualizar localização"
              : "Usar minha localização"}
        </button>
        {hasLocation && (
          <p className="mt-3 flex items-center gap-2 text-sm font-medium text-court-700">
            <span>✅ Localização definida</span>
            {cityLabel && <span className="text-slate-500">· {cityLabel}</span>}
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
