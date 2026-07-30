import Link from "next/link";

export default function Home() {
  return (
    <main className="container">
      <h1>WalletQuantso</h1>
      <p className="muted">Sistema de controle financeiro pessoal.</p>

      <div className="panel">
        <h2>Migração do Meu Dinheiro Web</h2>
        <p>
          Importe seus lançamentos exportados em <strong>CSV</strong>,{" "}
          <strong>XLS</strong> ou <strong>XLSX</strong>. A importação é feita em
          etapas seguras: leitura, mapeamento de colunas, pré-visualização e só
          então a gravação — com detecção de duplicidades e possibilidade de
          desfazer.
        </p>
        <p style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link href="/import">
            <button>Importar lançamentos →</button>
          </Link>
          <Link href="/dashboard">
            <button style={{ background: "var(--border)" }}>Ver lançamentos</button>
          </Link>
          <Link href="/history">
            <button style={{ background: "var(--border)" }}>Histórico</button>
          </Link>
        </p>
      </div>
    </main>
  );
}
