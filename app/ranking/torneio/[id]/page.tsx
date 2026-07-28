import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TournamentView } from "@/components/ranking/tournament-view";

export const dynamic = "force-dynamic";

export default async function TournamentPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <TournamentView tournamentId={params.id} meId={user.id} />;
}
