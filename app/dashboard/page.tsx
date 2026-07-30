"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { LoginGate } from "@/components/LoginGate";
import { useAuth } from "@/services/auth-context";
import { listAccounts, listCategories, listTransactions } from "@/services/firestore";
import {
  filterTransactions,
  summarize,
  type DashboardFilters,
} from "@/lib/dashboard/filter";
import type { Account, Category, Transaction, TransactionType } from "@/types";

const TYPE_LABELS: Record<TransactionType, string> = {
  income: "Receita",
  expense: "Despesa",
  transfer: "Transferência",
};

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function DashboardPage() {
  return (
    <main className="container">
      <AppHeader />
      <h1>Lançamentos</h1>
      <LoginGate>
        <Dashboard />
      </LoginGate>
    </main>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const [txs, setTxs] = useState<Transaction[] | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [, setCategories] = useState<Category[]>([]);
  const [accountName, setAccountName] = useState<Map<string, string>>(new Map());
  const [categoryName, setCategoryName] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<DashboardFilters>({});

  const load = useCallback(async () => {
    if (!user) return;
    setError("");
    try {
      const [t, a, c] = await Promise.all([
        listTransactions(user.uid),
        listAccounts(user.uid),
        listCategories(user.uid),
      ]);
      setTxs(t);
      setAccounts(a);
      setCategories(c);
      setAccountName(new Map(a.map((x) => [x.id!, x.name])));
      setCategoryName(new Map(c.map((x) => [x.id!, x.name])));
    } catch (err) {
      setError(`Falha ao carregar: ${(err as Error).message}`);
      setTxs([]);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => (txs ? filterTransactions(txs, filters) : []),
    [txs, filters],
  );
  const summary = useMemo(() => summarize(filtered), [filtered]);

  const set = (patch: Partial<DashboardFilters>) =>
    setFilters((prev) => ({ ...prev, ...patch }));

  const nameOfAccount = (id?: string | null) =>
    id ? (accountName.get(id) ?? id) : "—";

  if (txs === null) {
    return (
      <div className="panel">
        <p className="muted">Carregando…</p>
      </div>
    );
  }

  return (
    <>
      {error && <p className="badge err">{error}</p>}

      <div className="stat-row">
        <Stat label="Receitas" value={brl(summary.income)} color="var(--ok)" />
        <Stat label="Despesas" value={brl(summary.expense)} color="var(--err)" />
        <Stat
          label="Saldo"
          value={brl(summary.balance)}
          color={summary.balance >= 0 ? "var(--ok)" : "var(--err)"}
        />
        <Stat label="Lançamentos" value={String(summary.count)} />
      </div>

      <div className="panel">
        <h2>Filtros</h2>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <input
            placeholder="Buscar descrição…"
            value={filters.text ?? ""}
            onChange={(e) => set({ text: e.target.value })}
            style={fieldStyle}
          />
          <select
            value={filters.accountId ?? ""}
            onChange={(e) => set({ accountId: e.target.value || undefined })}
          >
            <option value="">Todas as contas</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select
            value={filters.type ?? ""}
            onChange={(e) => set({ type: (e.target.value || "") as TransactionType | "" })}
          >
            <option value="">Todos os tipos</option>
            <option value="income">Receita</option>
            <option value="expense">Despesa</option>
            <option value="transfer">Transferência</option>
          </select>
          <input
            type="date"
            value={filters.from ?? ""}
            onChange={(e) => set({ from: e.target.value || undefined })}
            style={fieldStyle}
          />
          <input
            type="date"
            value={filters.to ?? ""}
            onChange={(e) => set({ to: e.target.value || undefined })}
            style={fieldStyle}
          />
          {Object.keys(filters).length > 0 && (
            <button style={{ background: "var(--border)" }} onClick={() => setFilters({})}>
              Limpar
            </button>
          )}
        </div>
      </div>

      <div className="panel">
        {filtered.length === 0 ? (
          <p className="muted">Nenhum lançamento encontrado.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Tipo</th>
                <th>Categoria</th>
                <th>Conta</th>
                <th style={{ textAlign: "right" }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td>{t.date.split("-").reverse().join("/")}</td>
                  <td>{t.description}</td>
                  <td>{TYPE_LABELS[t.type]}</td>
                  <td>{t.categoryId ? (categoryName.get(t.categoryId) ?? t.categoryId) : "—"}</td>
                  <td>
                    {t.type === "transfer"
                      ? `${nameOfAccount(t.accountId)} → ${nameOfAccount(t.transferAccountId)}`
                      : nameOfAccount(t.accountId)}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      color:
                        t.type === "income"
                          ? "var(--ok)"
                          : t.type === "expense"
                            ? "var(--err)"
                            : "var(--text)",
                    }}
                  >
                    {t.type === "expense" ? "-" : t.type === "income" ? "+" : ""}
                    {brl(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="stat">
      <div className="n" style={{ fontSize: "1.2rem", ...(color ? { color } : {}) }}>
        {value}
      </div>
      <div className="muted">{label}</div>
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  padding: "0.35rem 0.5rem",
  borderRadius: 6,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  font: "inherit",
};
