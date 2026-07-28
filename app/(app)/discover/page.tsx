import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SwipeDeck } from "@/components/swipe-deck";
import { BackButton } from "@/components/back-button";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!me) redirect("/onboarding");

  const profile = me as Profile;

  return (
    <div className="mx-auto max-w-lg px-4 py-6 pb-24 md:pb-8">
      <div className="mb-3 flex items-center gap-4">
        <BackButton />
        <a href="/inicio" className="inline-block text-sm font-semibold text-slate-500">
          🏠 Início
        </a>
      </div>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Descobrir</h1>
          <p className="text-sm text-slate-500">
            Tenistas num raio de <strong>{profile.search_radius_km} km</strong>
          </p>
        </div>
        <span className="rounded-full bg-court-50 px-3 py-1.5 text-xs font-semibold text-court-700">
          🎾 {profile.play_format === "duplas" ? "Duplas" : "Simples"}
        </span>
      </header>

      <SwipeDeck me={profile} />
    </div>
  );
}
