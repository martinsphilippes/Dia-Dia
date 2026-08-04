import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav, SideNav } from "@/components/bottom-nav";
import { TennisBall } from "@/components/icons";
import type { MatchSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded, is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.onboarded) redirect("/onboarding");
  const isAdmin = !!profile?.is_admin;

  const { data: matches } = await supabase.rpc("get_my_matches");
  const unread = (matches as unknown as MatchSummary[] | null)?.reduce(
    (sum, m) => sum + Number(m.unread_count || 0),
    0
  ) ?? 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-6xl">
        {/* Sidebar desktop */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-5 md:flex">
          <Link href="/inicio" className="flex items-center gap-2 px-2 text-lg font-bold">
            <TennisBall className="h-8 w-8" />
            Match
          </Link>
          <nav className="mt-8 flex-1">
            <SideNav unread={unread} isAdmin={isAdmin} />
          </nav>
          <form action="/auth/signout" method="post">
            <button className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
              Sair
            </button>
          </form>
        </aside>

        <main className="min-h-screen w-full">{children}</main>
      </div>

      <BottomNav unread={unread} isAdmin={isAdmin} />
    </div>
  );
}
