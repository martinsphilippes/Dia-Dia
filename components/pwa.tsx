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

function isAndroid() {
  return /android/i.test(window.navigator.userAgent);
}

export function PWA() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [platform, setPlatform] = useState<"none" | "ios" | "android">("none");

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
    if (isIOS()) setPlatform("ios");
    else if (isAndroid()) setPlatform("android");

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDeferred(null);
    setPlatform("none");
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    localStorage.setItem(DISMISS_KEY, "1");
  }

  if (!deferred && platform === "none") return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] animate-fade-up px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
      <div className="relative mx-auto max-w-md overflow-hidden rounded-3xl bg-gradient-to-br from-court-600 to-court-800 p-4 text-white shadow-2xl ring-1 ring-court-400/40">
        <button
          onClick={dismiss}
          className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/15 text-sm"
          aria-label="Fechar"
        >
          ✕
        </button>

        <div className="flex items-center gap-3 pr-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="Match" className="h-14 w-14 shrink-0 rounded-2xl ring-2 ring-white/30" />
          <div className="min-w-0 flex-1">
            <div className="text-base font-extrabold">📲 Tenha o Match na tela inicial</div>
            <div className="text-xs text-court-100">Abra em 1 toque, em tela cheia — como um app de verdade.</div>
          </div>
        </div>

        {deferred ? (
          <button
            onClick={install}
            className="btn-ball mt-3 w-full animate-pop justify-center text-base font-extrabold shadow-lg"
          >
            Adicionar à tela de início ✨
          </button>
        ) : platform === "ios" ? (
          <div className="mt-3 rounded-2xl bg-white/10 p-3">
            <div className="mb-1 text-sm font-bold">Como adicionar no iPhone:</div>
            <ol className="space-y-1 text-sm text-court-50">
              <li>1. Toque em <span className="font-bold">Compartilhar</span> <span className="align-middle">⬆️</span> na barra do Safari.</li>
              <li>2. Role e toque em <span className="font-bold">Adicionar à Tela de Início</span>.</li>
              <li>3. Confirme em <span className="font-bold">Adicionar</span>. Pronto! 🎾</li>
            </ol>
          </div>
        ) : (
          <div className="mt-3 rounded-2xl bg-white/10 p-3">
            <div className="mb-1 text-sm font-bold">Como adicionar no Android:</div>
            <ol className="space-y-1 text-sm text-court-50">
              <li>1. Toque no menu <span className="font-bold">⋮</span> do navegador.</li>
              <li>2. Toque em <span className="font-bold">Instalar app</span> (ou <span className="font-bold">Adicionar à tela inicial</span>).</li>
              <li>3. Confirme. Pronto! 🎾</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
