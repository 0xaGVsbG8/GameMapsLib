"use client";

import { useMemo, useState } from "react";
import type { GameMap, MapsData } from "@/types/map";
import { MapCanvas } from "./MapCanvas";
import { MapSidebar } from "./MapSidebar";

function findMap(data: MapsData, gameId: string, mapId: string): GameMap | undefined {
  const game = data.games.find((entry) => entry.id === gameId) ?? data.games[0];
  return game?.maps.find((entry) => entry.id === mapId) ?? game?.maps[0];
}

function enabledDefaults(map: GameMap | undefined) {
  if (!map) return new Set<string>();
  return new Set(
    map.categories.flatMap((category) =>
      category.items.filter((item) => item.enabledByDefault).map((item) => item.id),
    ),
  );
}

export function InteractiveMap({ data }: { data: MapsData }) {
  const [gameId, setGameId] = useState(data.games[0]?.id ?? "");
  const currentGame = useMemo(
    () => data.games.find((entry) => entry.id === gameId) ?? data.games[0],
    [data.games, gameId],
  );
  const [mapId, setMapId] = useState(currentGame?.maps[0]?.id ?? "");
  const [enabledIds, setEnabledIds] = useState(() =>
    enabledDefaults(findMap(data, gameId, mapId)),
  );
  const [collapsed, setCollapsed] = useState(false);

  const currentMap = useMemo(
    () => findMap(data, currentGame?.id ?? "", mapId),
    [currentGame?.id, data, mapId],
  );

  const items = currentMap?.categories.flatMap((category) => category.items) ?? [];

  const selectGame = (id: string) => {
    const game = data.games.find((entry) => entry.id === id) ?? data.games[0];
    const nextMap = game?.maps[0];
    setGameId(id);
    setMapId(nextMap?.id ?? "");
    setEnabledIds(enabledDefaults(nextMap));
  };

  const selectMap = (id: string) => {
    setMapId(id);
    setEnabledIds(enabledDefaults(findMap(data, currentGame?.id ?? "", id)));
  };

  const toggleItem = (id: string) => {
    setEnabledIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!currentGame || !currentMap) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#071018] text-zinc-400">
        No games found in JSON.
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-[#071018] text-zinc-100">
      <MapSidebar
        title={data.title}
        games={data.games.map((game) => ({ id: game.id, name: game.name }))}
        activeGameId={currentGame.id}
        onSelectGame={selectGame}
        maps={currentGame.maps.map((map) => ({ id: map.id, name: map.name }))}
        activeMapId={currentMap.id}
        onSelectMap={selectMap}
        currentMap={currentMap}
        enabledIds={enabledIds}
        onToggleItem={toggleItem}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
      />
      <main className="relative min-w-0 flex-1">
        <MapCanvas image={currentMap.image} items={items} enabledIds={enabledIds} />
      </main>
    </div>
  );
}
