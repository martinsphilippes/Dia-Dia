"use client";

import { useMemo, useState } from "react";
import { readSpreadsheet } from "@/lib/import/reader";
import {
  buildPreview,
  detectColumns,
  type PreviewResult,
  type RawRow,
} from "@/lib/import/engine";
import type { CanonicalField, ColumnMapping } from "@/types";

const FIELD_LABELS: Record<CanonicalField, string> = {
  date: "Data",
  description: "Descrição",
  amount: "Valor",
  type: "Tipo (receita/despesa)",
  account: "Conta",
  category: "Categoria",
  subcategory: "Subcategoria",
  costCenter: "Centro de custo",
  notes: "Observações",
  installment: "Parcela",
  tags: "Tags",
  transferAccount: "Conta destino (transferência)",
};

const ALL_FIELDS = Object.keys(FIELD_LABELS) as CanonicalField[];

export default function ImportPage() {
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<RawRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [error, setError] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { headers, rows } = await readSpreadsheet(file);
      if (headers.length === 0) {
        setError("Não foi possível ler cabeçalhos no arquivo.");
        return;
      }
      setFileName(file.name);
      setHeaders(headers);
      setRows(rows);
      setMapping(detectColumns(headers));
    } catch (err) {
      setError(`Falha ao ler o arquivo: ${(err as Error).message}`);
    }
  }

  function setColumn(header: string, field: CanonicalField | null) {
    setMapping((prev) => {
      const next: ColumnMapping = { ...prev };
      // A canonical field can only be assigned to one header.
      if (field) {
        for (const h of Object.keys(next)) {
          if (next[h] === field) next[h] = null;
        }
      }
      next[header] = field;
      return next;
    });
  }

  const preview: PreviewResult | null = useMemo(() => {
    if (rows.length === 0) return null;
    return buildPreview(rows, mapping);
  }, [rows, mapping]);

  return (
    <main className="container">
      <h1>Importar lançamentos</h1>
      <p className="muted">
        Etapa de leitura e pré-visualização. Nada é gravado até você revisar e
        confirmar (gravação, auditoria e desfazer entram na próxima etapa).
      </p>

      <div className="panel">
        <h2>1. Selecione o arquivo</h2>
        <input type="file" accept=".csv,.xls,.xlsx,.txt" onChange={onFile} />
        {fileName && (
          <p className="muted">
            {fileName} — {rows.length} linha(s), {headers.length} coluna(s).
          </p>
        )}
        {error && <p className="badge err">{error}</p>}
      </div>

      {headers.length > 0 && (
        <div className="panel">
          <h2>2. Mapeamento de colunas</h2>
          <p className="muted">
            Detectamos automaticamente. Ajuste o que estiver errado — “Data”,
            “Valor” e “Conta” são obrigatórios.
          </p>
          <table>
            <thead>
              <tr>
                <th>Coluna do arquivo</th>
                <th>Campo no WalletQuantso</th>
              </tr>
            </thead>
            <tbody>
              {headers.map((h) => (
                <tr key={h}>
                  <td>{h}</td>
                  <td>
                    <select
                      value={mapping[h] ?? ""}
                      onChange={(e) =>
                        setColumn(h, (e.target.value || null) as CanonicalField | null)
                      }
                    >
                      <option value="">— ignorar —</option>
                      {ALL_FIELDS.map((f) => (
                        <option key={f} value={f}>
                          {FIELD_LABELS[f]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {preview && (
        <div className="panel">
          <h2>3. Pré-visualização</h2>
          <div className="stat-row">
            <div className="stat">
              <div className="n">{preview.rows.length}</div>
              <div className="muted">Total</div>
            </div>
            <div className="stat">
              <div className="n" style={{ color: "var(--ok)" }}>
                {preview.importable.length}
              </div>
              <div className="muted">Importáveis</div>
            </div>
            <div className="stat">
              <div className="n" style={{ color: "var(--warn)" }}>
                {preview.duplicatesInFile.length}
              </div>
              <div className="muted">Duplicadas no arquivo</div>
            </div>
            <div className="stat">
              <div className="n" style={{ color: "var(--err)" }}>
                {preview.rejected.length}
              </div>
              <div className="muted">Rejeitadas</div>
            </div>
          </div>

          {preview.rejected.length > 0 && (
            <>
              <h3>Linhas com erro</h3>
              <table>
                <thead>
                  <tr>
                    <th>Linha</th>
                    <th>Erros</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rejected.slice(0, 50).map((r) => (
                    <tr key={r.rowNumber}>
                      <td>{r.rowNumber}</td>
                      <td>
                        {r.errors.map((e, i) => (
                          <div key={i} className="badge err" style={{ margin: "2px 0" }}>
                            {e}
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.rejected.length > 50 && (
                <p className="muted">… e mais {preview.rejected.length - 50} linha(s).</p>
              )}
            </>
          )}

          <h3>Amostra dos importáveis</h3>
          <table>
            <thead>
              <tr>
                <th>Linha</th>
                <th>Data</th>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Tipo</th>
                <th>Conta</th>
              </tr>
            </thead>
            <tbody>
              {preview.importable.slice(0, 20).map((r) => {
                const t = r.transaction!;
                return (
                  <tr key={r.rowNumber}>
                    <td>{r.rowNumber}</td>
                    <td>{t.date}</td>
                    <td>{t.description}</td>
                    <td>
                      {t.amount.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </td>
                    <td>{t.type}</td>
                    <td>{t.accountId}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p className="muted" style={{ marginTop: "1rem" }}>
            Próxima etapa: gravação em lote no Firestore com <code>importBatchId</code>,
            registro de auditoria e botão de desfazer.
          </p>
        </div>
      )}
    </main>
  );
}
