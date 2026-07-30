"use client";

// Top navigation shared across pages: links plus the signed-in user's email
// and a sign-out button (both shown only when authenticated).

import Link from "next/link";
import { useAuth } from "@/services/auth-context";
import { signOut } from "@/services/auth";

export function AppHeader() {
  const { user } = useAuth();
  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        paddingBottom: "1rem",
        borderBottom: "1px solid var(--border)",
        marginBottom: "1.5rem",
        flexWrap: "wrap",
      }}
    >
      <Link href="/" style={{ fontWeight: 700, color: "var(--text)" }}>
        WalletQuantso
      </Link>
      <Link href="/dashboard">Lançamentos</Link>
      <Link href="/accounts">Contas</Link>
      <Link href="/categories">Categorias</Link>
      <Link href="/reports">Relatórios</Link>
      <Link href="/import">Importar</Link>
      <Link href="/history">Histórico</Link>
      <span style={{ flex: 1 }} />
      {user && (
        <>
          <span className="muted">{user.email}</span>
          <button style={{ background: "var(--border)" }} onClick={() => signOut()}>
            Sair
          </button>
        </>
      )}
    </nav>
  );
}
