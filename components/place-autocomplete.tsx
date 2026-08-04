"use client";

import { useEffect, useRef, useState } from "react";
import { useDebouncedValue } from "@/lib/use-debounce";

export type Place = {
  label: string;
  city: string | null;
  state: string | null; // UF (ex.: BA)
  lat: number;
  lon: number;
};

type NomResult = {
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  address?: Record<string, string>;
};

function ufFromAddr(a: Record<string, string>): string | null {
  const iso = a["ISO3166-2-lvl4"]; // ex.: "BR-BA"
  if (iso && iso.includes("-")) return iso.split("-").pop() ?? null;
  return null;
}
function cityFromAddr(a: Record<string, string>): string | null {
  return a.city || a.town || a.village || a.municipality || a.county || null;
}
function labelFor(r: NomResult): string {
  const a = r.address ?? {};
  const uf = ufFromAddr(a);
  const city = cityFromAddr(a);
  const road = a.road || a.pedestrian;
  const suburb = a.suburb || a.neighbourhood;
  const parts: string[] = [];
  if (road) parts.push(road);
  if (suburb && suburb !== road) parts.push(suburb);
  if (city) parts.push(city);
  let s = parts.join(", ");
  if (!s) s = r.name || r.display_name.split(",")[0];
  return uf ? `${s} - ${uf}` : s;
}

/**
 * Campo de texto com sugestões reais de lugares (OpenStreetMap / Nominatim),
 * restrito ao Brasil. Ex.: digitar "Salvador" sugere "Salvador - BA".
 * - cityOnly: prioriza cidades e, ao escolher, preenche só o nome da cidade.
 */
export function PlaceAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  className,
  cityOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect?: (p: Place) => void;
  placeholder?: string;
  className?: string;
  cityOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<NomResult[]>([]);
  const [loading, setLoading] = useState(false);
  const q = useDebouncedValue(value, 450);
  const reqId = useRef(0);
  const skip = useRef(false);

  useEffect(() => {
    if (skip.current) {
      skip.current = false;
      return;
    }
    const term = q.trim();
    if (term.length < 3) {
      setResults([]);
      return;
    }
    const id = ++reqId.current;
    setLoading(true);
    const params = new URLSearchParams({
      q: term,
      format: "jsonv2",
      addressdetails: "1",
      countrycodes: "br",
      limit: "6",
      "accept-language": "pt-BR",
    });
    if (cityOnly) params.set("featuretype", "city");
    fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`)
      .then((r) => r.json())
      .then((d: NomResult[]) => {
        if (id !== reqId.current) return;
        setResults(Array.isArray(d) ? d : []);
        setOpen(true);
      })
      .catch(() => {})
      .finally(() => {
        if (id === reqId.current) setLoading(false);
      });
  }, [q, cityOnly]);

  function choose(r: NomResult) {
    const a = r.address ?? {};
    const p: Place = {
      label: labelFor(r),
      city: cityFromAddr(a),
      state: ufFromAddr(a),
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
    };
    skip.current = true;
    onChange(cityOnly ? p.city ?? p.label : p.label);
    onSelect?.(p);
    setOpen(false);
    setResults([]);
  }

  return (
    <div className="relative">
      <input
        className={className ?? "input"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
      />
      {open && (results.length > 0 || loading) && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {loading && <li className="px-3 py-2 text-xs text-slate-400">Buscando…</li>}
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(r)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-amber-50"
              >
                <span className="shrink-0 text-slate-400">📍</span>
                <span className="truncate">{labelFor(r)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
