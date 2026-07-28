"use client";

import { useRouter } from "next/navigation";

export function BackButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className={`inline-block text-sm font-semibold text-slate-500 ${className}`}
    >
      ← Voltar
    </button>
  );
}
