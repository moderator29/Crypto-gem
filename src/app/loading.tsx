import { GemMark } from "@/components/ui/Logo";

/** Branded loading state: a floating gem over skeleton blocks, so waiting feels intentional. */
export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="flex items-center gap-3">
        <span className="fx-float"><GemMark size={30} /></span>
        <div className="skeleton h-8 flex-1" />
      </div>
      <div className="skeleton h-56" />
      <div className="grid gap-3 md:grid-cols-3">
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
      </div>
    </div>
  );
}
