import { Skeleton } from "./ui/states";

/** Same footprint as the editor's first lines, so the swap to Monaco doesn't flash a text label. */
export function EditorPlaceholder() {
  return (
    <div className="space-y-2.5 py-3 pl-12 pr-4" aria-busy="true">
      <span className="sr-only">Loading editor…</span>
      <Skeleton className="h-3.5 w-1/2" />
      <Skeleton className="h-3.5 w-2/3" />
      <Skeleton className="h-3.5 w-1/4" />
    </div>
  );
}
