import { Suspense } from "react";
import Link from "next/link";
import { TennisBall } from "@/components/icons";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="court-bg flex min-h-screen flex-col items-center justify-center px-6 py-10 text-white">
      <Link href="/" className="mb-8 flex items-center gap-2 text-xl font-bold">
        <TennisBall className="h-9 w-9" />
        Match
      </Link>
      <div className="w-full max-w-md rounded-3xl bg-white p-7 text-ink shadow-card">
        <Suspense fallback={<div className="h-96" />}>
          <AuthForm />
        </Suspense>
      </div>
      <p className="mt-6 max-w-xs text-center text-xs text-court-100">
        Ao continuar você concorda em jogar limpo e respeitar a galera dentro e
        fora da quadra. 🎾
      </p>
    </main>
  );
}
