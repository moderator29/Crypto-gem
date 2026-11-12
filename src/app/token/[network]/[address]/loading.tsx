/** Skeleton shaped like the token page, so the layout does not jump when data arrives. */
export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading token">
      <div className="card flex items-center gap-4 p-5">
        <div className="skeleton h-12 w-12 !rounded-full" />
        <div className="flex-1 space-y-2"><div className="skeleton h-5 w-40" /><div className="skeleton h-3 w-24" /></div>
        <div className="skeleton h-8 w-28" />
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton h-11" />)}</div>
      <div className="skeleton h-[380px]" />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="skeleton h-64" />
        <div className="skeleton h-80" />
      </div>
    </div>
  );
}
