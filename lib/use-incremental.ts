import { useEffect, useState } from "react";

/**
 * Renderiza listas grandes em blocos: mostra `step` itens e vai ampliando
 * sob demanda. Evita renderizar centenas de itens de uma vez.
 */
export function useIncremental<T>(items: T[], step = 20) {
  const [count, setCount] = useState(step);
  // ao trocar de conjunto (filtro/busca), volta ao início
  useEffect(() => {
    setCount(step);
  }, [items, step]);
  const visible = items.slice(0, count);
  const hasMore = items.length > count;
  const more = () => setCount((c) => c + step);
  return { visible, hasMore, more, total: items.length };
}
