"use client";

import { useEffect, useRef, useState } from "react";
import "./add-game.css";

type AddCategoryWidgetProps = {
  gameName: string;
  onAdded: () => void;
  compact?: boolean;
};

export function AddCategoryWidget({
  gameName,
  onAdded,
  compact = false,
}: AddCategoryWidgetProps) {
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

    const response = await fetch("http://localhost:8000/blog/ManageCategories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ gameName, name }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.message ?? "Could not add category");
      return;
    }

    if (nameRef.current) nameRef.current.value = "";
    close();
    onAdded();
  };

  return (
    <>
      <button
        className={compact ? "add-game-button compact" : "add-game-button"}
        type="button"
        onClick={() => setOpen(true)}
      >
        {compact ? "+ Category" : "Add category"}
      </button>

      {open && (
        <div className="add-game-overlay" onClick={close}>
          <form
            className="add-game-window"
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <h2>Add category</h2>

            <div className="add-game-field">
              <label htmlFor="category-name">Category name</label>
              <input
                ref={nameRef}
                id="category-name"
                name="name"
                type="text"
                maxLength={100}
                placeholder="Enter category name"
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
