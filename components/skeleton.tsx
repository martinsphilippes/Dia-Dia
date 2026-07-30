/** Placeholders leves para reduzir a sensação de espera e o layout shift. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/70 ${className}`} />;
}

/** Linhas de lista com avatar + texto (para listas de jogadores/inscritos). */
export function RowSkeletons({ count = 4 }: { count?: number }) {
  return (
    <ul className="space-y-2" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-100">
          <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </li>
      ))}
    </ul>
  );
}
