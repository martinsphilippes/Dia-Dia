import { useEffect, useState } from "react";

/**
 * Retorna o valor após `delay` ms sem mudanças. Usado para não disparar
 * uma chamada ao backend a cada tecla em campos de busca.
 */
export function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
