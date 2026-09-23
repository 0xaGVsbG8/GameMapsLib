"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "../../api";
import "../css/add-game.css";

type DeleteGameWidgetProps = {
  gameName: string;
  onClose: () => void;
  onDeleted: () => void;
};

export function DeleteGameWidget({ gameName, onClose, onDeleted }: DeleteGameWidgetProps) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleDelete = async () => {
    if (busy) return;

    setError("");
    setBusy(true);

    const response = await fetch(apiUrl("/blog/ManageGames"), {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: gameName }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.message ?? "Could not delete game");
      setBusy(false);
      return;
    }

    onDeleted();
  };

  return (
    <div className="add-game-overlay" onClick={onClose}>
      <div
        className="add-game-window"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="delete-game-title"
      >
        <h2 id="delete-game-title">Delete {gameName}?</h2>

        <p className="delete-game-warning">
          This will permanently delete <strong>{gameName}</strong> and all of its
          maps, markers, categories, and subcategories. This cannot be undone.
        </p>

        <div className="add-game-error">{error}</div>

        <div className="add-game-actions">
          <button className="add-game-cancel" type="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            className="add-game-submit danger"
            type="button"
            onClick={handleDelete}
            disabled={busy}
          >
            Delete game
          </button>
        </div>
      </div>
    </div>
  );
}
