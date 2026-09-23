"use client";

import { AddGameWidget } from "./AddGameWidget";
import { EditNameWidget } from "./EditNameWidget";
import { apiUrl } from "../../api";
import "../css/GameSidebar.css";
import "../css/sidebar-shared.css";

type GameSidebarProps = {
  games: string[];
  browsingGame: string | null;
  open?: boolean;
  readOnly?: boolean;
  onToggle?: () => void;
  onSelect: (name: string) => void;
  onAdded?: () => void;
  onRenamed?: (oldName: string, newName: string) => void;
  onDelete?: (name: string) => void;
};

export function GameSidebar({
  games,
  browsingGame,
  open = true,
  readOnly = false,
  onToggle,
  onSelect,
  onAdded,
  onRenamed,
  onDelete,
}: GameSidebarProps) {
  return (
    <aside className="ide-sidebar">
      <div className="ide-sidebar-body">
      <div className="ide-sidebar-header">
        <span className="ide-sidebar-title">GAMES/MAPS</span>
        {!readOnly && onAdded && <AddGameWidget compact onAdded={onAdded} />}
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
              {!readOnly && onRenamed && (
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
              )}
              {!readOnly && onDelete && (
              <button
                type="button"
                className="ide-game-delete"
                aria-label={`Delete ${game}`}
                onClick={() => onDelete(game)}
              >
                ×
              </button>
              )}
            </div>
          </div>
        ))}
      </nav>
      </div>
      {onToggle && (
        <button
          type="button"
          className="ide-panel-arrow"
          aria-label={open ? "Hide games" : "Show games"}
          aria-pressed={open}
          onClick={onToggle}
        >
          <span className={open ? "ide-panel-caret is-left" : "ide-panel-caret is-right"} />
        </button>
      )}
    </aside>
  );
}
