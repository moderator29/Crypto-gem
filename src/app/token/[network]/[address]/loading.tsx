export default function TokenLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading token">
      <div className="skeleton h-28" />
      <div className="skeleton h-[380px]" />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-20" />)}
      </div>
    </div>
  );
}
