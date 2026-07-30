import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MatchPointSearch } from "@/components/matchpoint/search";
import { NotificationsBell } from "@/components/matchpoint/notifications-bell";
import { BackButton } from "@/components/back-button";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MatchPointPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!me) redirect("/onboarding");

  return (
    <div className="pt-safe mx-auto max-w-lg px-4 pb-24 md:pb-8">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton />
          <a href="/inicio" className="inline-block text-sm font-semibold text-slate-500">
            🏠 Início
          </a>
        </div>
        <NotificationsBell />
      </div>

      <header className="mb-4">
        <h1 className="text-2xl font-extrabold">🎾 MatchPoint</h1>
        <p className="text-sm text-slate-500">
          Ache parceiros de treino e jogadores disponíveis — perto de você ou onde estiver viajando.
        </p>
      </header>

      <MatchPointSearch me={me as Profile} />
    </div>
  );
}
