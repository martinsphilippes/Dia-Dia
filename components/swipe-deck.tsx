"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  AnimatePresence,
} from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import {
  FORMAT_LABELS,
  HAND_LABELS,
  Profile,
  SKILL_LABELS,
  SwipeDirection,
} from "@/lib/types";
import { calcAge, initials } from "@/lib/utils";
import { IconHeart, IconX } from "@/components/icons";

interface Props {
  initial: Profile[];
  me: Profile;
}

export function SwipeDeck({ initial, me }: Props) {
  const supabase = createClient();
  const [deck, setDeck] = useState<Profile[]>(initial);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(initial.length === 0);
  const [matched, setMatched] = useState<Profile | null>(null);
  const [buttonDir, setButtonDir] = useState<SwipeDirection | null>(null);

  const top = deck[0];

  const fetchMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const { data } = await supabase.rpc("get_discovery_profiles");
    const rows = (data as unknown as Profile[] | null) ?? [];
    setDeck((prev) => {
      const seen = new Set(prev.map((p) => p.id));
      const fresh = rows.filter((r) => !seen.has(r.id));
      if (prev.length === 0 && fresh.length === 0) setExhausted(true);
      return [...prev, ...fresh];
    });
    setLoadingMore(false);
  }, [loadingMore, supabase]);

  useEffect(() => {
    if (deck.length > 0) setExhausted(false);
    if (deck.length <= 2) fetchMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck.length]);

  const handleVote = useCallback(
    async (profile: Profile, dir: SwipeDirection) => {
      setDeck((prev) => prev.filter((p) => p.id !== profile.id));
      setButtonDir(null);

      const { error } = await supabase.from("swipes").insert({
        swiper_id: me.id,
        swiped_id: profile.id,
        direction: dir,
      });
      if (error) return;

      if (dir === "like") {
        // O trigger cria o match se for recíproco — verificamos.
        const { data: match } = await supabase
          .from("matches")
          .select("id")
          .or(
            `and(player_a_id.eq.${me.id},player_b_id.eq.${profile.id}),and(player_a_id.eq.${profile.id},player_b_id.eq.${me.id})`
          )
          .maybeSingle();
        if (match) setMatched(profile);
      }
    },
    [me.id, supabase]
  );

  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="relative h-[520px]">
        <AnimatePresence>
          {!exhausted && deck.length === 0 && (
            <div className="absolute inset-0 grid place-items-center rounded-3xl border border-dashed border-slate-200 bg-white">
              <div className="text-center text-slate-400">
                <div className="text-4xl">🎾</div>
                <p className="mt-2 text-sm">Procurando tenistas...</p>
              </div>
            </div>
          )}
        </AnimatePresence>

        {exhausted && deck.length === 0 && <EmptyState onRefresh={fetchMore} />}

        {deck
          .slice(0, 3)
          .reverse()
          .map((profile, idxRev, arr) => {
            const isTop = idxRev === arr.length - 1;
            const depth = arr.length - 1 - idxRev; // 0 = topo
            return (
              <TinderCard
                key={profile.id}
                profile={profile}
                depth={depth}
                isTop={isTop}
                triggerDir={isTop ? buttonDir : null}
                onVote={(dir) => handleVote(profile, dir)}
              />
            );
          })}
      </div>

      {/* Botões */}
      {deck.length > 0 && (
        <div className="mt-6 flex items-center justify-center gap-6">
          <button
            aria-label="Passar"
            onClick={() => setButtonDir("pass")}
            className="grid h-16 w-16 place-items-center rounded-full bg-white text-red-500 shadow-card ring-1 ring-slate-100 transition active:scale-95"
          >
            <IconX className="h-7 w-7" />
          </button>
          <button
            aria-label="Curtir"
            onClick={() => setButtonDir("like")}
            className="grid h-20 w-20 place-items-center rounded-full bg-court-600 text-white shadow-card transition active:scale-95"
          >
            <IconHeart className="h-9 w-9" />
          </button>
        </div>
      )}

      <p className="mt-4 text-center text-xs text-slate-400">
        {top ? `Em ${top.city}` : ""}
      </p>

      <AnimatePresence>
        {matched && (
          <MatchModal me={me} other={matched} onClose={() => setMatched(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function TinderCard({
  profile,
  depth,
  isTop,
  triggerDir,
  onVote,
}: {
  profile: Profile;
  depth: number;
  isTop: boolean;
  triggerDir: SwipeDirection | null;
  onVote: (dir: SwipeDirection) => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-250, 250], [-16, 16]);
  const likeOpacity = useTransform(x, [20, 130], [0, 1]);
  const nopeOpacity = useTransform(x, [-130, -20], [1, 0]);

  const fling = useCallback(
    (dir: SwipeDirection) => {
      const target = dir === "like" ? 1000 : -1000;
      animate(x, target, {
        duration: 0.35,
        ease: "easeIn",
        onComplete: () => onVote(dir),
      });
    },
    [onVote, x]
  );

  useEffect(() => {
    if (isTop && triggerDir) fling(triggerDir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerDir, isTop]);

  const age = calcAge(profile.birthdate);

  return (
    <motion.div
      className="absolute inset-0 touch-none"
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        zIndex: 10 - depth,
      }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={(_, info) => {
        if (info.offset.x > 120) fling("like");
        else if (info.offset.x < -120) fling("pass");
        else animate(x, 0, { type: "spring", stiffness: 300, damping: 25 });
      }}
      initial={{ scale: 0.94, y: depth * 12, opacity: depth > 1 ? 0 : 1 }}
      animate={{
        scale: 1 - depth * 0.04,
        y: depth * 12,
        opacity: 1,
      }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
    >
      <div className="relative h-full overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-slate-100">
        {/* Foto / avatar */}
        <div className="relative h-72 w-full">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={profile.name}
              className="h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-court-500 to-court-700 text-6xl font-bold text-white/90">
              {initials(profile.name)}
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-3 left-4 text-white drop-shadow">
            <h3 className="text-2xl font-bold">
              {profile.name}
              {age ? `, ${age}` : ""}
            </h3>
            <p className="text-sm opacity-90">
              📍 {profile.city}
              {profile.state ? `, ${profile.state}` : ""}
            </p>
          </div>

          {isTop && (
            <>
              <motion.div
                style={{ opacity: likeOpacity }}
                className="absolute left-4 top-4 rotate-[-12deg] rounded-lg border-4 border-court-400 px-3 py-1 text-xl font-extrabold uppercase text-court-400"
              >
                Bora
              </motion.div>
              <motion.div
                style={{ opacity: nopeOpacity }}
                className="absolute right-4 top-4 rotate-[12deg] rounded-lg border-4 border-red-400 px-3 py-1 text-xl font-extrabold uppercase text-red-400"
              >
                Passo
              </motion.div>
            </>
          )}
        </div>

        {/* Infos */}
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap gap-2">
            <Tag>🎾 {SKILL_LABELS[profile.skill_level]}</Tag>
            <Tag>{FORMAT_LABELS[profile.play_format]}</Tag>
            {profile.dominant_hand && <Tag>{HAND_LABELS[profile.dominant_hand]}</Tag>}
          </div>
          {profile.availability && profile.availability.length > 0 && (
            <p className="text-xs text-slate-500">
              🕑 Joga: {profile.availability.join(" · ")}
            </p>
          )}
          {profile.bio && (
            <p className="line-clamp-3 text-sm text-slate-600">{profile.bio}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-court-50 px-3 py-1 text-xs font-semibold text-court-700">
      {children}
    </span>
  );
}

function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="absolute inset-0 grid place-items-center rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center">
      <div>
        <div className="text-5xl">🎾</div>
        <h3 className="mt-3 text-lg font-bold">Por enquanto é só!</h3>
        <p className="mt-1 text-sm text-slate-500">
          Você já viu todo mundo da sua cidade. Volte mais tarde — novos
          tenistas entram toda hora.
        </p>
        <button onClick={onRefresh} className="btn-ghost mt-5 text-sm">
          Procurar de novo
        </button>
      </div>
    </div>
  );
}

function MatchModal({
  me,
  other,
  onClose,
}: {
  me: Profile;
  other: Profile;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-court-900/80 p-6 backdrop-blur"
    >
      <motion.div
        initial={{ scale: 0.85, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-card"
      >
        <p className="text-sm font-bold uppercase tracking-widest text-court-600">
          É um match!
        </p>
        <h2 className="mt-1 text-3xl font-extrabold">Bora jogar 🎾</h2>
        <div className="mt-6 flex items-center justify-center -space-x-4">
          <Avatar profile={me} />
          <div className="z-10 grid h-12 w-12 place-items-center rounded-full bg-ball text-2xl ring-4 ring-white">
            🎾
          </div>
          <Avatar profile={other} />
        </div>
        <p className="mt-5 text-slate-600">
          Você e <strong>{other.name}</strong> se curtiram. Combine a quadra e o
          horário!
        </p>
        <div className="mt-6 space-y-2">
          <Link href="/matches" className="btn-primary w-full">
            Enviar mensagem
          </Link>
          <button onClick={onClose} className="btn-ghost w-full">
            Continuar deslizando
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Avatar({ profile }: { profile: Profile }) {
  return profile.avatar_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={profile.avatar_url}
      alt={profile.name}
      className="h-16 w-16 rounded-full object-cover ring-4 ring-white"
    />
  ) : (
    <div className="grid h-16 w-16 place-items-center rounded-full bg-court-100 font-bold text-court-700 ring-4 ring-white">
      {initials(profile.name)}
    </div>
  );
}
