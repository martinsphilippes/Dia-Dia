import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RankingHub } from "@/components/ranking/ranking-hub";

export const dynamic = "force-dynamic";

export default async function RankingHomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  return <RankingHub isOwner={!!profile?.is_admin} />;
}
