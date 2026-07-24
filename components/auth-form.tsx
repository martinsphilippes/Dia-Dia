"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cx } from "@/lib/utils";

type Mode = "login" | "signup";

export function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") || "/discover";

  const [mode, setMode] = useState<Mode>("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === "signup") {
        if (name.trim().length < 2) {
          setError("Digite seu nome.");
          setLoading(false);
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() } },
        });
        if (error) throw error;

        if (data.session) {
          router.push("/onboarding");
          router.refresh();
          return;
        }
        // Sem sessão => confirmação de email habilitada no projeto
        setInfo(
          "Enviamos um link de confirmação para o seu email. Confirme e faça login para continuar."
        );
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Algo deu errado.";
      setError(translateError(msg));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-1 rounded-full bg-slate-100 p-1">
        {(["signup", "login"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
              setInfo(null);
            }}
            className={cx(
              "rounded-full py-2 text-sm font-semibold transition",
              mode === m ? "bg-white text-ink shadow-sm" : "text-slate-500"
            )}
          >
            {m === "signup" ? "Criar conta" : "Entrar"}
          </button>
        ))}
      </div>

      <h1 className="text-2xl font-bold">
        {mode === "signup" ? "Bora jogar? 🎾" : "Bem-vindo de volta"}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {mode === "signup"
          ? "Crie sua conta e ache parceiros de tênis."
          : "Entre para ver seus matches."}
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {mode === "signup" && (
          <div>
            <label className="label" htmlFor="name">
              Nome
            </label>
            <input
              id="name"
              className="input"
              placeholder="Como te chamam na quadra"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            className="input"
            placeholder="voce@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Senha
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            className="input"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}
        {info && (
          <p className="rounded-xl bg-court-50 px-4 py-3 text-sm text-court-700">
            {info}
          </p>
        )}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading
            ? "Aguarde..."
            : mode === "signup"
              ? "Criar conta"
              : "Entrar"}
        </button>
      </form>
    </div>
  );
}

function translateError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Email ou senha incorretos.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Esse email já tem conta. Faça login.";
  if (m.includes("email not confirmed"))
    return "Confirme seu email antes de entrar.";
  if (m.includes("password")) return "Senha muito curta (mínimo 6 caracteres).";
  return msg;
}
