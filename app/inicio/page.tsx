import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TennisBall } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function HubPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  const first = (profile?.name || "").split(" ")[0] || "tenista";

  return (
    <main className="court-bg pt-safe min-h-[100dvh] px-6 pb-10 text-white">
      <header className="mx-auto flex max-w-3xl items-center justify-between">
        <div className="flex items-center gap-2 text-lg font-bold">
          <TennisBall className="h-8 w-8" />
          Match
        </div>
        <form action="/auth/signout" method="post">
          <button className="rounded-full px-3 py-1.5 text-sm text-court-100 ring-1 ring-white/20">
            Sair
          </button>
        </form>
      </header>

      <div className="mx-auto mt-10 max-w-3xl">
        <h1 className="text-3xl font-extrabold">Oi, {first}! 👋</h1>
        <p className="mt-1 text-court-100">O que você quer fazer hoje?</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {/* Match */}
          <Link
            href="/matchpoint"
            className="group relative overflow-hidden rounded-3xl bg-white p-6 text-ink shadow-card transition hover:-translate-y-0.5"
          >
            <div className="text-5xl">🎾</div>
            <h2 className="mt-4 text-xl font-bold">Match</h2>
            <p className="mt-1 text-sm text-slate-600">
              Ache parceiros de treino e jogadores disponíveis por perto — em
              casa ou viajando. Busque, solicite e marque o jogo em minutos.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-court-700">
              Encontrar parceiros →
            </span>
          </Link>

          {/* Ranking */}
          <Link
            href="/ranking"
            className="group relative overflow-hidden rounded-3xl bg-white p-6 text-ink shadow-card transition hover:-translate-y-0.5"
          >
            <div className="text-5xl">🏆</div>
            <h2 className="mt-4 text-xl font-bold">Ranking</h2>
            <p className="mt-1 text-sm text-slate-600">
              Participe da liga do seu clube ou grupo. Jogue as rodadas, some
              pontos e suba na classificação.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-amber-600">
              Ver minhas ligas →
            </span>
          </Link>
        </div>

        <p className="mt-8 text-center text-xs text-court-100">
          Mesma conta nos dois. 🎾🏆
        </p>
      </div>
    </main>
  );
}
