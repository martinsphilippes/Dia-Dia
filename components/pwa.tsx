"use client";

import { useEffect, useState } from "react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "mp-install-dismissed";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function PWA() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [showIOS, setShowIOS] = useState(false);

  // Registra o service worker e trata atualização automática.
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
        // Se já houver uma nova versão esperando, ativa na hora.
        if (reg.waiting) reg.waiting.postMessage("SKIP_WAITING");
        reg.addEventListener("updatefound", () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener("statechange", () => {
            if (nw.state === "installed" && navigator.serviceWorker.controller) {
              nw.postMessage("SKIP_WAITING");
            }
          });
        });
        // Checa por nova versão ao voltar para o app.
        const onVisible = () => {
          if (document.visibilityState === "visible") reg.update().catch(() => {});
        };
        document.addEventListener("visibilitychange", onVisible);
      } catch {
        /* ignora falha de registro */
      }
    };
    register();
  }, []);

  // Convite de instalação.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS não dispara beforeinstallprompt → mostra instruções.
    if (isIOS()) setShowIOS(true);

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDeferred(null);
    setShowIOS(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    localStorage.setItem(DISMISS_KEY, "1");
  }

  if (!deferred && !showIOS) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-white p-3 shadow-2xl ring-1 ring-slate-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="Match" className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-slate-800">Instalar o Match</div>
          {deferred ? (
            <div className="text-xs text-slate-500">Acesse pela tela inicial, em tela cheia.</div>
          ) : (
            <div className="text-xs text-slate-500">
              Toque em <span className="font-semibold">Compartilhar</span> ⬆️ e depois em{" "}
              <span className="font-semibold">Adicionar à Tela de Início</span>.
            </div>
          )}
        </div>
        {deferred && (
          <button
            onClick={install}
            className="shrink-0 rounded-full bg-court-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Instalar
          </button>
        )}
        <button onClick={dismiss} className="shrink-0 px-1 text-lg text-slate-400" aria-label="Fechar">
          ✕
        </button>
      </div>
    </div>
  );
}
