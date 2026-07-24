"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  DominantHand,
  FORMAT_LABELS,
  HAND_LABELS,
  PlayFormat,
  Profile,
  SKILL_DESCRIPTIONS,
  SKILL_LABELS,
  SkillLevel,
} from "@/lib/types";
import { cx, initials } from "@/lib/utils";

const SKILLS: SkillLevel[] = ["iniciante", "intermediario", "avancado", "competitivo"];
const FORMATS: PlayFormat[] = ["simples", "duplas", "ambos"];
const HANDS: DominantHand[] = ["destro", "canhoto"];
const AVAILABILITY = ["Manhã", "Tarde", "Noite", "Dias de semana", "Fim de semana"];
const GENDERS = ["Masculino", "Feminino", "Outro"];

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
  const [city, setCity] = useState(profile.city || "");
  const [state, setState] = useState(profile.state || "");
  const [country, setCountry] = useState(profile.country || "Brasil");
  const [bio, setBio] = useState(profile.bio || "");
  const [skill, setSkill] = useState<SkillLevel>(profile.skill_level || "iniciante");
  const [format, setFormat] = useState<PlayFormat>(profile.play_format || "ambos");
  const [hand, setHand] = useState<DominantHand | "">(profile.dominant_hand || "");
  const [availability, setAvailability] = useState<string[]>(profile.availability || []);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function toggleAvail(a: string) {
    setAvailability((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Imagem muito grande (máx. 5MB).");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${profile.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha no upload.");
    } finally {
      setUploading(false);
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (name.trim().length < 2) return setError("Digite seu nome.");
    if (city.trim().length < 2) return setError("Informe sua cidade — é o que conecta você aos parceiros.");

    setSaving(true);
    try {
      const { error: upErr } = await supabase
        .from("profiles")
        .update({
          name: name.trim(),
          birthdate: birthdate || null,
          gender: gender || null,
          city: city.trim(),
          state: state.trim() || null,
          country: country.trim() || null,
          bio: bio.trim() || null,
          skill_level: skill,
          play_format: format,
          dominant_hand: hand || null,
          availability: availability.length ? availability : null,
          avatar_url: avatarUrl,
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
        <div className="relative">
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
        </div>
        <div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="btn-ghost text-sm"
            disabled={uploading}
          >
            {uploading ? "Enviando..." : avatarUrl ? "Trocar foto" : "Adicionar foto"}
          </button>
          <p className="mt-1 text-xs text-slate-400">JPG ou PNG, até 5MB.</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
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

      {/* Localização */}
      <div>
        <label className="label">📍 Cidade onde quer jogar</label>
        <input
          className="input"
          placeholder="Ex.: São Paulo"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <p className="mt-1 text-xs text-slate-400">
          Viajando? Coloque a cidade do destino para achar gente por lá.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <input
            className="input"
            placeholder="Estado (ex.: SP)"
            value={state}
            onChange={(e) => setState(e.target.value)}
          />
          <input
            className="input"
            placeholder="País"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />
        </div>
      </div>

      {/* Nível */}
      <div>
        <label className="label">🎾 Seu nível</label>
        <div className="grid gap-2 sm:grid-cols-2">
          {SKILLS.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => setSkill(s)}
              className={cx(
                "rounded-2xl border p-4 text-left transition",
                skill === s
                  ? "border-court-500 bg-court-50 ring-1 ring-court-300"
                  : "border-slate-200 bg-white hover:border-slate-300"
              )}
            >
              <div className="font-semibold">{SKILL_LABELS[s]}</div>
              <div className="mt-0.5 text-xs text-slate-500">{SKILL_DESCRIPTIONS[s]}</div>
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
