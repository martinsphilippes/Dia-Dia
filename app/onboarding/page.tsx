import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileEditor } from "@/components/profile-editor";
import { TennisBall } from "@/components/icons";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile?.onboarded) redirect("/discover");

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="court-bg pt-safe px-6 pb-16 text-white">
        <div className="mx-auto flex max-w-2xl items-center gap-2 text-lg font-bold">
          <TennisBall className="h-8 w-8" />
          MatchPoint
        </div>
        <div className="mx-auto mt-6 max-w-2xl">
          <h1 className="text-3xl font-extrabold">Monte seu perfil de tenista</h1>
          <p className="mt-2 text-court-100">
            Quanto mais completo, melhores os matches. Leva menos de 2 minutos.
          </p>
        </div>
      </div>

      <div className="mx-auto -mt-8 max-w-2xl px-6 pb-16">
        <div className="rounded-3xl bg-white p-6 shadow-card sm:p-8">
          <ProfileEditor profile={(profile as Profile) ?? emptyProfile(user.id, user.email)} mode="onboarding" />
        </div>
      </div>
    </main>
  );
}

function emptyProfile(id: string, email?: string): Profile {
  return {
    id,
    name: email ? email.split("@")[0] : "",
    birthdate: null,
    gender: null,
    city: null,
    phone: null,
    bio: null,
    skill_class: 5,
    dominant_hand: null,
    play_format: "ambos",
    availability: null,
    avatar_url: null,
    latitude: null,
    longitude: null,
    search_radius_km: 20,
    is_admin: false,
    onboarded: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
