import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MpProfileDetail } from "@/components/matchpoint/profile-detail";
import { BackButton } from "@/components/back-button";

export const dynamic = "force-dynamic";

export default async function MpProfilePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-lg px-4 py-6 pb-24 md:pb-8">
      <div className="mb-3 flex items-center gap-4">
        <BackButton />
        <a href="/matchpoint" className="inline-block text-sm font-semibold text-slate-500">
          🎾 MatchPoint
        </a>
      </div>
      <MpProfileDetail id={params.id} />
    </div>
  );
}
