"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function TournamentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Registro detalhado para diagnóstico
    console.error("Erro na tela do torneio:", error);
  }, [error]);

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-amber-50/40 px-6 text-center">
      <div>
        <div className="text-5xl">🎾</div>
        <h1 className="mt-3 text-xl font-extrabold text-slate-800">Algo deu errado</h1>
        <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">
          Não foi possível carregar esta parte do torneio. Seus dados não foram perdidos.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={reset} className="btn-primary text-sm">
            Tentar novamente
          </button>
          <Link href="/ranking" className="btn-ghost text-sm">
            Voltar aos rankings
          </Link>
        </div>
      </div>
    </main>
  );
}
