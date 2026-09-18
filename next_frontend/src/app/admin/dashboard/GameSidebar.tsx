"use client";

import { AddGameWidget } from "./AddGameWidget";
import { EditNameWidget } from "./EditNameWidget";
import { apiUrl } from "../api";

type GameSidebarProps = {
  games: string[];
  browsingGame: string | null;
  onSelect: (name: string) => void;
  onAdded: () => void;
  onRenamed: (oldName: string, newName: string) => void;
  onDelete: (name: string) => void;
};

export function GameSidebar({
  games,
  browsingGame,
  onSelect,
  onAdded,
  onRenamed,
  onDelete,
}: GameSidebarProps) {
  return (
    <aside className="ide-sidebar">
      <div className="ide-sidebar-header">
        <span className="ide-sidebar-title">GAMES/MAPS</span>
        <AddGameWidget compact onAdded={onAdded} />
      </div>

      <nav className="ide-game-list">
        {games.map((game) => (
          <div
            id={game + "xd"}
            key={game}
            className={browsingGame === game ? "ide-game-row active" : "ide-game-row"}
          >
            <button
              type="button"
              className="ide-game-item"
              onClick={() => onSelect(game)}
            >
              {game}
            </button>
            <div className="ide-row-actions">
              <EditNameWidget
                title="Rename game"
                label="Game name"
                currentName={game}
                ariaLabel={`Rename ${game}`}
                onSave={async (newName) => {
                  const response = await fetch(apiUrl("/blog/ManageGames"), {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ name: game, newName }),
                  });
                  if (response.ok) return null;
                  const data = await response.json().catch(() => null);
                  return data?.message ?? "Could not rename game";
                }}
                onRenamed={(newName) => onRenamed(game, newName)}
              />
              <button
                type="button"
                className="ide-game-delete"
                aria-label={`Delete ${game}`}
                onClick={() => onDelete(game)}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
