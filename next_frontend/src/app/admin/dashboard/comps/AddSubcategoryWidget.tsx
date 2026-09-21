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
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const iconFileRef = useRef<HTMLInputElement>(null);

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
    setBusy(false);
    if (nameRef.current) nameRef.current.value = "";
    if (iconFileRef.current) iconFileRef.current.value = "";
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = nameRef.current?.value.trim();
    if (!name || busy) return;

    setError("");
    setBusy(true);

    const formData = new FormData();
    formData.append("gameName", gameName);
    formData.append("categoryName", categoryName);
    formData.append("name", name);
    const iconFile = iconFileRef.current?.files?.[0] ?? null;
    if (iconFile) formData.append("icon", iconFile);

    const response = await fetch(apiUrl("/blog/ManageSubCategories"), {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.message ?? "Could not add subcategory");
      setBusy(false);
      return;
    }

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

            <div className="add-game-field">
              <label htmlFor={`subcategory-icon-${categoryName}`}>Icon</label>
              <input
                ref={iconFileRef}
                id={`subcategory-icon-${categoryName}`}
                name="icon"
                type="file"
                accept="image/*"
              />
              <p className="add-game-hint">Optional. Used as the default icon for markers in this subcategory.</p>
            </div>

            <div className="add-game-error">{error}</div>

            <div className="add-game-actions">
              <button className="add-game-cancel" type="button" onClick={close}>
                Cancel
              </button>
              <button className="add-game-submit" type="submit" disabled={busy}>
                Add
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
