"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message, Profile } from "@/lib/types";
import { IconSend } from "@/components/icons";

export function Chat({
  matchId,
  meId,
  other,
  initialMessages,
}: {
  matchId: string;
  meId: string;
  other: Profile;
  initialMessages: Message[];
}) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const scrollBox = useRef<HTMLDivElement>(null);

  function scrollToEnd(smooth = true) {
    endRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }

  useEffect(() => {
    scrollToEnd(false);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`match:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) =>
            prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
          );
          if (msg.sender_id !== meId) {
            supabase
              .from("messages")
              .update({ read: true })
              .eq("id", msg.id)
              .then(() => {});
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, meId]);

  useEffect(() => {
    scrollToEnd();
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setText("");

    const { data, error } = await supabase
      .from("messages")
      .insert({ match_id: matchId, sender_id: meId, content })
      .select()
      .single();

    if (error) {
      setText(content); // devolve o texto em caso de erro
    } else if (data) {
      const msg = data as Message;
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
      );
    }
    setSending(false);
  }

  return (
    <div className="flex h-full flex-col">
      {/* messages */}
      <div ref={scrollBox} className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        <div className="mx-auto mb-4 max-w-xs rounded-2xl bg-court-50 px-4 py-3 text-center text-xs text-court-700">
          Vocês deram match! 🎾 Combine a quadra, o horário e bora jogar.
        </div>
        {messages.map((m) => {
          const mine = m.sender_id === meId;
          return (
            <div
              key={m.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm ${
                  mine
                    ? "rounded-br-md bg-court-600 text-white"
                    : "rounded-bl-md bg-white text-ink ring-1 ring-slate-100"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                <span
                  className={`mt-1 block text-right text-[10px] ${
                    mine ? "text-court-100" : "text-slate-400"
                  }`}
                >
                  {new Date(m.created_at).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* input */}
      <form
        onSubmit={send}
        className="flex items-center gap-2 border-t border-slate-200 bg-white px-3 py-3"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Mensagem para ${other.name.split(" ")[0]}...`}
          className="input flex-1 rounded-full"
          maxLength={1000}
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-court-600 text-white transition active:scale-95 disabled:opacity-40"
          aria-label="Enviar"
        >
          <IconSend className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
