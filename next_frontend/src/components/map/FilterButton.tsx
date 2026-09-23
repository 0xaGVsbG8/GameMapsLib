import type { FilterItem } from "@/types/map";
import { FilterIcon } from "./FilterIcon";

type FilterButtonProps = {
  item: FilterItem;
  checked: boolean;
  onToggle: () => void;
};

export function FilterButton({ item, checked, onToggle }: FilterButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors ${
        checked
          ? "border-sky-400/80 bg-sky-400/10 text-white"
          : "border-white/5 bg-white/4 text-zinc-300 hover:border-white/15 hover:bg-white/8"
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border ${
          checked ? "border-sky-300 bg-sky-400 text-slate-950" : "border-zinc-500 bg-transparent"
        }`}
      >
        {checked ? (
          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
          </svg>
        ) : null}
      </span>
      <span className={checked ? "text-sky-200" : "text-zinc-400"}>
        <FilterIcon name={item.icon} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{item.name}</span>
      <span className="rounded-md bg-black/30 px-1.5 py-0.5 text-[11px] tabular-nums text-zinc-400">
        {item.markers.length}
      </span>
    </button>
  );
}
