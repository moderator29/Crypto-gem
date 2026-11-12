/** Skeleton for market lists: summary tiles then table rows. */
export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading markets">
      <div className="skeleton h-24" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton h-24" />)}</div>
      <div className="card divide-y divide-[var(--line-1)] overflow-hidden">{Array.from({ length: 10 }, (_, i) => <div key={i} className="flex items-center gap-3 px-3 py-3"><div className="skeleton h-9 w-9 !rounded-full" /><div className="skeleton h-4 flex-1" /><div className="skeleton h-4 w-20" /></div>)}</div>
    </div>
  );
}
