"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useDebouncedValue } from "@/lib/use-debounce";

/**
 * Seletor validado de clube: só oferece clubes que existem na cidade
 * pesquisada (clubes cadastrados + clubes declarados por jogadores dali).
 * O texto digitado apenas filtra a lista — o valor aplicado vem sempre
 * de uma opção escolhida.
 */
export function ClubAutocomplete({
  value,
  onChange,
  city,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  city: string;
  placeholder?: string;
  className?: string;
}) {
  const supabase = createClient();
  const [options, setOptions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dCity = useDebouncedValue(city, 400);
  const reqId = useRef(0);

  // Carrega os clubes existentes da cidade
  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    supabase
      .rpc("list_clubs", { p_city: dCity.trim() || null })
      .then(({ data }) => {
        if (id !== reqId.current) return;
        const names = ((data as unknown as { name: string }[]) ?? []).map((r) => r.name);
        setOptions(names);
      })
      .then(undefined, () => {})
      .then(() => {
        if (id === reqId.current) setLoading(false);
      });
  }, [supabase, dCity]);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, value]);

  function choose(name: string) {
    onChange(name);
    setOpen(false);
  }

  const noneMsg =
    options.length === 0
      ? city.trim()
        ? "Nenhum clube cadastrado nessa cidade"
        : "Escolha uma cidade para ver os clubes"
      : "Nenhum clube corresponde";

  return (
    <div className="relative">
      <div className="relative">
        <input
          className={className ?? "input"}
          placeholder={placeholder ?? "Clube"}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          autoComplete="off"
        />
        {value && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onChange("");
              setOpen(true);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-1.5 text-slate-400 hover:text-slate-600"
            aria-label="Limpar clube"
          >
            ✕
          </button>
        )}
      </div>
      {open && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {loading && <li className="px-3 py-2 text-xs text-slate-400">Buscando clubes…</li>}
          {!loading && filtered.length === 0 && (
            <li className="px-3 py-2 text-xs text-slate-400">{noneMsg}</li>
          )}
          {filtered.map((o) => (
            <li key={o}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(o)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-court-50"
              >
                <span className="shrink-0 text-slate-400">🎾</span>
                <span className="truncate">{o}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
