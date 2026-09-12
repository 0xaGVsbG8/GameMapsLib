"use client";

import { useEffect, useRef, useState } from "react";
import "./add-game.css";

export function AddGameWidget() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    nameRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    setError("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = nameRef.current?.value.trim();
    if (!name) return;

    setError("");

    const response = await fetch("http://localhost:8000/blog/addGame", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.message ?? "Could not add game");
      return;
    }

    if (nameRef.current) nameRef.current.value = "";
    close();
  };

  return (
    <>
      <button className="add-game-button" type="button" onClick={() => setOpen(true)}>
        Add game
      </button>

      {open && (
        <div className="add-game-overlay" onClick={close}>
          <form
            className="add-game-window"
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <h2>Add game</h2>

            <div className="add-game-field">
              <label htmlFor="game-name">Game name</label>
              <input
                ref={nameRef}
                id="game-name"
                name="name"
                type="text"
                maxLength={100}
                placeholder="Enter game name"
              />
            </div>

            <div className="add-game-error">{error}</div>

            <div className="add-game-actions">
              <button className="add-game-cancel" type="button" onClick={close}>
                Cancel
              </button>
              <button className="add-game-submit" type="submit">
                Add
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
