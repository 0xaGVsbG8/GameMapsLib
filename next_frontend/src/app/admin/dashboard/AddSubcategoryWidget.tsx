"use client";

import { useEffect, useRef, useState } from "react";
import { apiUrl } from "../api";
import "./add-game.css";

type AddSubcategoryWidgetProps = {
  gameName: string;
  categoryName: string;
  onAdded: () => void;
};

export function AddSubcategoryWidget({
  gameName,
  categoryName,
  onAdded,
}: AddSubcategoryWidgetProps) {
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

    const response = await fetch(apiUrl("/blog/ManageSubCategories"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ gameName, categoryName, name }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.message ?? "Could not add subcategory");
      return;
    }

    if (nameRef.current) nameRef.current.value = "";
    close();
    onAdded();
  };

  return (
    <>
      <button
        className="add-game-button compact"
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Add subcategory to ${categoryName}`}
      >
        +
      </button>

      {open && (
        <div className="add-game-overlay" onClick={close}>
          <form
            className="add-game-window"
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <h2>Add subcategory</h2>
            <p className="delete-game-warning">
              Under <strong>{categoryName}</strong>
            </p>

            <div className="add-game-field">
              <label htmlFor={`subcategory-name-${categoryName}`}>Subcategory name</label>
              <input
                ref={nameRef}
                id={`subcategory-name-${categoryName}`}
                name="name"
                type="text"
                maxLength={100}
                placeholder="Enter subcategory name"
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
