import { describe, it, expect } from "vitest";
import {
  detectColumns,
  classify,
  dedupHash,
  parseInstallment,
  normalizeRow,
  buildPreview,
  type RawRow,
} from "./engine";
import type { ColumnMapping } from "@/types";

describe("detectColumns", () => {
  it("maps common Brazilian headers", () => {
    const m = detectColumns(["Data", "Descrição", "Valor", "Conta", "Categoria"]);
    expect(m["Data"]).toBe("date");
    expect(m["Descrição"]).toBe("description");
    expect(m["Valor"]).toBe("amount");
    expect(m["Conta"]).toBe("account");
    expect(m["Categoria"]).toBe("category");
  });

  it("leaves unknown headers unmapped", () => {
    const m = detectColumns(["Data", "Coluna Estranha"]);
    expect(m["Coluna Estranha"]).toBeNull();
  });

  it("does not assign the same field twice", () => {
    const m = detectColumns(["Categoria", "Subcategoria"]);
    expect(m["Categoria"]).toBe("category");
    expect(m["Subcategoria"]).toBe("subcategory");
  });
});

describe("classify", () => {
  it("uses explicit type text", () => {
    expect(classify("Receita", -10, false)).toBe("income");
    expect(classify("Despesa", 10, false)).toBe("expense");
    expect(classify("Transferência", 10, false)).toBe("transfer");
  });

  it("detects transfers by destination account", () => {
    expect(classify(undefined, 10, true)).toBe("transfer");
  });

  it("falls back to sign of amount", () => {
    expect(classify(undefined, -10, false)).toBe("expense");
    expect(classify(undefined, 10, false)).toBe("income");
  });
});

describe("dedupHash", () => {
  it("is stable and ignores sign/description formatting", () => {
    const a = dedupHash({ date: "2025-01-01", amount: -10, description: "Café", account: "Nubank" });
    const b = dedupHash({ date: "2025-01-01", amount: 10, description: "café", account: "nubank" });
    expect(a).toBe(b);
  });

  it("differs for different entries", () => {
    const a = dedupHash({ date: "2025-01-01", amount: 10, description: "A", account: "X" });
    const b = dedupHash({ date: "2025-01-02", amount: 10, description: "A", account: "X" });
    expect(a).not.toBe(b);
  });
});

describe("parseInstallment", () => {
  it("parses n/total", () => {
    expect(parseInstallment("3/12")).toEqual({ number: 3, total: 12 });
    expect(parseInstallment("Parcela 1 / 6")).toEqual({ number: 1, total: 6 });
  });
  it("rejects invalid", () => {
    expect(parseInstallment("13/12")).toBeNull();
    expect(parseInstallment("abc")).toBeNull();
    expect(parseInstallment(undefined)).toBeNull();
  });
});

const MAPPING: ColumnMapping = {
  Data: "date",
  Descrição: "description",
  Valor: "amount",
  Conta: "account",
  Categoria: "category",
};

describe("normalizeRow", () => {
  it("normalizes a valid expense row", () => {
    const row: RawRow = {
      Data: "15/03/2025",
      Descrição: "Mercado",
      Valor: "-123,45",
      Conta: "Nubank",
      Categoria: "Alimentação",
    };
    const r = normalizeRow(row, MAPPING, 1);
    expect(r.errors).toEqual([]);
    expect(r.transaction).toMatchObject({
      date: "2025-03-15",
      amount: 123.45,
      type: "expense",
      description: "Mercado",
      accountId: "Nubank",
      categoryId: "Alimentação",
    });
  });

  it("flags invalid date and value", () => {
    const row: RawRow = { Data: "99/99/9999", Descrição: "x", Valor: "abc", Conta: "C" };
    const r = normalizeRow(row, MAPPING, 2);
    expect(r.transaction).toBeNull();
    expect(r.errors.length).toBeGreaterThanOrEqual(2);
  });

  it("requires an account", () => {
    const row: RawRow = { Data: "01/01/2025", Descrição: "x", Valor: "10,00", Conta: "" };
    const r = normalizeRow(row, MAPPING, 3);
    expect(r.errors).toContain("Conta não informada.");
  });
});

describe("buildPreview", () => {
  it("separates importable, rejected and duplicates", () => {
    const rows: RawRow[] = [
      { Data: "01/01/2025", Descrição: "A", Valor: "10,00", Conta: "X" },
      { Data: "01/01/2025", Descrição: "A", Valor: "10,00", Conta: "X" }, // dup
      { Data: "bad", Descrição: "B", Valor: "10,00", Conta: "X" }, // rejected
    ];
    const p = buildPreview(rows, MAPPING);
    expect(p.importable.length).toBe(2);
    expect(p.rejected.length).toBe(1);
    expect(p.duplicatesInFile.length).toBe(1);
  });
});
