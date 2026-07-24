import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SwipeDeck } from "@/components/swipe-deck";
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

  const { data: initial } = await supabase.rpc("get_discovery_profiles");

  return (
    <div className="mx-auto max-w-lg px-4 py-6 pb-24 md:pb-8">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Descobrir</h1>
          <p className="text-sm text-slate-500">
            Tenistas em <strong>{(me as Profile).city}</strong>
          </p>
        </div>
        <span className="rounded-full bg-court-50 px-3 py-1.5 text-xs font-semibold text-court-700">
          🎾 {(me as Profile).play_format === "duplas" ? "Duplas" : "Simples"}
        </span>
      </header>

      <SwipeDeck initial={(initial as unknown as Profile[]) ?? []} me={me as Profile} />
    </div>
  );
}
