"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconCards, IconChat, IconShield, IconUser, TennisBall } from "@/components/icons";
import { cx } from "@/lib/utils";

const baseItems = [
  { href: "/matchpoint", label: "Descobrir", Icon: TennisBall },
  { href: "/discover", label: "Match", Icon: IconCards },
  { href: "/matches", label: "Conversas", Icon: IconChat },
  { href: "/profile", label: "Perfil", Icon: IconUser },
];

const adminItem = { href: "/admin", label: "Gestão", Icon: IconShield };

export function BottomNav({ unread, isAdmin }: { unread: number; isAdmin?: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? [...baseItems, adminItem] : baseItems;

  // Esconde a navegação dentro de uma conversa (tela cheia)
  const inChat = /^\/matches\/[^/]+$/.test(pathname);
  if (inChat) return null;

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/90 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cx(
                "relative flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition",
                active ? "text-court-600" : "text-slate-400"
              )}
            >
              <Icon className="h-6 w-6" />
              {label}
              {href === "/matches" && unread > 0 && (
                <span className="absolute right-1/2 top-1.5 translate-x-4 rounded-full bg-clay px-1.5 text-[10px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function SideNav({ unread, isAdmin }: { unread: number; isAdmin?: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? [...baseItems, adminItem] : baseItems;
  return (
    <div className="hidden md:flex md:flex-col md:gap-1">
      {items.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={cx(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition",
              active ? "bg-court-50 text-court-700" : "text-slate-500 hover:bg-slate-100"
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
            {href === "/matches" && unread > 0 && (
              <span className="ml-auto rounded-full bg-clay px-2 text-xs font-bold text-white">
                {unread}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
