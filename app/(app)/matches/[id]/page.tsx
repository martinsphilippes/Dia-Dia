import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Chat } from "@/components/chat";
import { IconBack } from "@/components/icons";
import { CLASS_LABELS, type Message, type Profile } from "@/lib/types";
import { calcAge, initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: match } = await supabase
    .from("matches")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!match) notFound();

  const otherId =
    match.player_a_id === user.id ? match.player_b_id : match.player_a_id;

  const { data: other } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", otherId)
    .single();
  if (!other) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("match_id", params.id)
    .order("created_at", { ascending: true });

  // Marca como lidas as mensagens recebidas
  await supabase
    .from("messages")
    .update({ read: true })
    .eq("match_id", params.id)
    .neq("sender_id", user.id)
    .eq("read", false);

  const otherProfile = other as Profile;
  const age = calcAge(otherProfile.birthdate);

  return (
    <div className="flex h-[100dvh] flex-col md:h-screen">
      {/* header */}
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-3 py-3">
        <Link
          href="/matches"
          className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100"
          aria-label="Voltar"
        >
          <IconBack className="h-5 w-5" />
        </Link>
        {otherProfile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={otherProfile.avatar_url}
            alt={otherProfile.name}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="grid h-10 w-10 place-items-center rounded-full bg-court-100 text-sm font-bold text-court-700">
            {initials(otherProfile.name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold leading-tight">
            {otherProfile.name}
            {age ? `, ${age}` : ""}
          </h1>
          <p className="truncate text-xs text-slate-500">
            📍 {otherProfile.city ?? "por perto"} · 🎾 {CLASS_LABELS[otherProfile.skill_class]}
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-hidden bg-slate-50">
        <Chat
          matchId={params.id}
          meId={user.id}
          other={otherProfile}
          initialMessages={(messages as Message[]) ?? []}
        />
      </div>
    </div>
  );
}
