"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { AppNotification } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

export function NotificationsBell() {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    const [{ data: n }, { data: u }] = await Promise.all([
      supabase.rpc("mp_notifications"),
      supabase.rpc("mp_unread_count"),
    ]);
    setItems((n as unknown as AppNotification[]) ?? []);
    setUnread((u as unknown as number) ?? 0);
  }, [supabase]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000); // poll leve
    return () => clearInterval(t);
  }, [load]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      await supabase.rpc("mp_mark_read");
      setUnread(0);
    }
  }

  return (
    <div className="relative">
      <button onClick={toggle} className="relative text-2xl leading-none" aria-label="Notificações">
        🔔
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-clay px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <button className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} aria-label="Fechar" />
          <div className="absolute right-0 top-9 z-50 max-h-[70vh] w-80 overflow-y-auto rounded-2xl bg-white p-2 text-slate-800 shadow-2xl ring-1 ring-slate-200">
            <div className="px-2 py-1.5 text-sm font-bold">Notificações</div>
            {items.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-slate-400">Nada por aqui ainda.</p>
            ) : (
              <ul className="space-y-1">
                {items.map((n) => {
                  const inner = (
                    <div className={`rounded-xl px-3 py-2 ${n.read ? "" : "bg-court-50"}`}>
                      <div className="text-sm font-semibold">{n.title}</div>
                      {n.body && <div className="text-xs text-slate-500">{n.body}</div>}
                      <div className="mt-0.5 text-[10px] text-slate-400">{timeAgo(n.created_at)}</div>
                    </div>
                  );
                  return (
                    <li key={n.id}>
                      {n.link ? (
                        <Link href={n.link} onClick={() => setOpen(false)}>
                          {inner}
                        </Link>
                      ) : (
                        inner
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
