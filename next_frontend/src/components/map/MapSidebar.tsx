import type { GameMap } from "@/types/map";
import { FilterButton } from "./FilterButton";

type Option = { id: string; name: string };

type MapSidebarProps = {
  title: string;
  games: Option[];
  activeGameId: string;
  onSelectGame: (id: string) => void;
  maps: Option[];
  activeMapId: string;
  onSelectMap: (id: string) => void;
  currentMap: GameMap;
  enabledIds: Set<string>;
  onToggleItem: (id: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

function OptionBar({
  options,
  activeId,
  onSelect,
}: {
  options: Option[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-0.5">
      {options.map((option) => {
        const active = option.id === activeId;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              active
                ? "bg-sky-500 text-slate-950"
                : "bg-white/6 text-zinc-300 hover:bg-white/10"
            }`}
          >
            {option.name}
          </button>
        );
      })}
    </div>
  );
}

export function MapSidebar({
  title,
  games,
  activeGameId,
  onSelectGame,
  maps,
  activeMapId,
  onSelectMap,
  currentMap,
  enabledIds,
  onToggleItem,
  collapsed,
  onToggleCollapsed,
}: MapSidebarProps) {
  return (
    <div className="relative z-20 flex h-full shrink-0">
      <aside
        className={`h-full overflow-hidden border-r border-white/8 bg-[#0c1520] transition-[width] duration-200 ${
          collapsed ? "w-0 border-r-0" : "w-[320px]"
        }`}
      >
        <div className="h-full min-w-[320px] overflow-y-auto px-4 pb-6 pt-5">
          <h1 className="mb-4 text-lg font-semibold tracking-tight text-white">{title}</h1>

          <div className="mb-5">
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Game
            </h2>
            <OptionBar options={games} activeId={activeGameId} onSelect={onSelectGame} />
          </div>

          {maps.length > 1 ? (
            <div className="mb-5">
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Map
              </h2>
              <OptionBar options={maps} activeId={activeMapId} onSelect={onSelectMap} />
            </div>
          ) : null}

          {currentMap.categories.map((category) => (
            <section key={category.id} className="mb-5">
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                {category.name}
              </h2>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {category.items.map((item) => (
                  <FilterButton
                    key={item.id}
                    item={item}
                    checked={enabledIds.has(item.id)}
                    onToggle={() => onToggleItem(item.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </aside>

      <button
        type="button"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? "Show map filters" : "Hide map filters"}
        className="absolute top-1/2 right-0 z-30 flex h-12 w-5 -translate-y-1/2 translate-x-full items-center justify-center rounded-r-md border border-l-0 border-white/10 bg-[#0c1520] text-zinc-400 hover:text-white"
      >
        <svg
          viewBox="0 0 16 16"
          className={`h-3.5 w-3.5 transition-transform ${collapsed ? "rotate-180" : ""}`}
          fill="currentColor"
        >
          <path d="M10.5 2.5 4.5 8l6 5.5V2.5Z" />
        </svg>
      </button>
    </div>
  );
}
