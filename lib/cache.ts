/**
 * Cache leve em sessionStorage com TTL, para dados que mudam pouco durante
 * a sessão (ex.: lista de clubes). Revalida quando expira; some ao fechar a aba.
 */
type Entry<T> = { at: number; data: T };

export async function cachedRpc<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  if (typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const e = JSON.parse(raw) as Entry<T>;
        if (Date.now() - e.at < ttlMs) return e.data;
      }
    } catch {
      /* ignora cache corrompido */
    }
  }
  const data = await fetcher();
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data }));
    } catch {
      /* storage cheio/indisponível — segue sem cache */
    }
  }
  return data;
}

/** Invalida uma chave (chamar após criar/editar o recurso). */
export function invalidateCache(key: string) {
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* noop */
    }
  }
}
