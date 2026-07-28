import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LeagueView } from "@/components/ranking/league-view";

export const dynamic = "force-dynamic";

export default async function LeaguePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <LeagueView leagueId={params.id} meId={user.id} />;
}
