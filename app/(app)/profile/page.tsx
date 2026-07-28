import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileEditor } from "@/components/profile-editor";
import { BackButton } from "@/components/back-button";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
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
  if (!profile) redirect("/onboarding");

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-24 md:pb-10">
      <div className="mb-3 flex items-center gap-4">
        <BackButton />
        <a href="/inicio" className="inline-block text-sm font-semibold text-slate-500">
          🏠 Início
        </a>
      </div>
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Meu perfil</h1>
          <p className="text-sm text-slate-500">{user.email}</p>
        </div>
        <form action="/auth/signout" method="post" className="md:hidden">
          <button className="rounded-full px-4 py-2 text-sm font-medium text-slate-400 ring-1 ring-slate-200">
            Sair
          </button>
        </form>
      </header>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 sm:p-8">
        <ProfileEditor profile={profile as Profile} mode="edit" />
      </div>
    </div>
  );
}
