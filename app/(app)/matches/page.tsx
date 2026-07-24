import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { MatchSummary } from "@/lib/types";
import { initials, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.rpc("get_my_matches");
  const matches = (data as unknown as MatchSummary[] | null) ?? [];

  return (
    <div className="mx-auto max-w-lg px-4 py-6 pb-24 md:pb-8">
      <h1 className="text-2xl font-extrabold">Matches</h1>
      <p className="text-sm text-slate-500">Seus parceiros de quadra</p>

      {matches.length === 0 ? (
        <div className="mt-16 text-center">
          <div className="text-5xl">🎾</div>
          <h2 className="mt-3 text-lg font-bold">Ainda sem matches</h2>
          <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">
            Deslize alguns cards em Descobrir. Quando alguém curtir de volta,
            vocês aparecem aqui.
          </p>
          <Link href="/discover" className="btn-primary mt-6">
            Descobrir tenistas
          </Link>
        </div>
      ) : (
        <ul className="mt-5 space-y-2">
          {matches.map((m) => (
            <li key={m.match_id}>
              <Link
                href={`/matches/${m.match_id}`}
                className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100 transition hover:ring-court-200"
              >
                {m.other_avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.other_avatar_url}
                    alt={m.other_name}
                    className="h-14 w-14 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-court-100 font-bold text-court-700">
                    {initials(m.other_name)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold">{m.other_name}</span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {timeAgo(m.last_message_at || m.matched_at)}
                    </span>
                  </div>
                  <p className="truncate text-sm text-slate-500">
                    {m.last_message ?? (
                      <span className="italic text-court-600">
                        Deu match! Diga um oi 👋
                      </span>
                    )}
                  </p>
                </div>
                {Number(m.unread_count) > 0 && (
                  <span className="grid h-6 min-w-6 place-items-center rounded-full bg-clay px-1.5 text-xs font-bold text-white">
                    {m.unread_count}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
