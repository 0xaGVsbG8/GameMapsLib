"use client";

import { useEffect, useRef, useState } from "react";
import { apiUrl } from "../../api";
import "../css/add-game.css";

type AddItemWidgetProps = {
  gameName: string;
  categoryName: string;
  subcategoryName: string;
  onAdded: () => void;
};

function sanitizeCoord(value: string) {
  const negative = value.trimStart().startsWith("-");
  const cleaned = value.replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  const next =
    dot === -1
      ? cleaned
      : cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, "");
  if (negative && next !== "") return `-${next}`;
  if (negative && next === "") return "-";
  return next;
}

export function AddItemWidget({
  gameName,
  categoryName,
  subcategoryName,
  onAdded,
}: AddItemWidgetProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [xValue, setXValue] = useState("");
  const [yValue, setYValue] = useState("");
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
    if (busy) return;
    setOpen(false);
    setError("");
    setXValue("");
    setYValue("");
    if (iconFileRef.current) iconFileRef.current.value = "";
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = nameRef.current?.value.trim();
    const x = Number(xValue);
    const y = Number(yValue);

    if (!name) {
      setError("Marker name is required");
      return;
    }
    if (
      xValue === "" ||
      yValue === "" ||
      xValue === "-" ||
      yValue === "-" ||
      !Number.isFinite(x) ||
      !Number.isFinite(y)
    ) {
      setError("X and Y are required");
      return;
    }

    setError("");
    setBusy(true);

    const iconFile = iconFileRef.current?.files?.[0] ?? null;
    const formData = new FormData();
    formData.append("gameName", gameName);
    formData.append("name", name);
    formData.append("categoryName", categoryName);
    formData.append("subcategoryName", subcategoryName);
    formData.append("x", String(x));
    formData.append("y", String(y));
    if (iconFile) formData.append("icon", iconFile);

    const response = await fetch(apiUrl("/blog/ManageItems"), {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.message ?? "Could not add marker");
      setBusy(false);
      return;
    }

    if (nameRef.current) nameRef.current.value = "";
    if (iconFileRef.current) iconFileRef.current.value = "";
    setXValue("");
    setYValue("");
    setBusy(false);
    close();
    onAdded();
  };

  const fieldId = `${categoryName}-${subcategoryName}`;

  return (
    <>
      <button
        className="add-game-button compact"
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Add marker to ${subcategoryName}`}
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
            <h2>Add marker</h2>
            <p className="delete-game-warning">
              Under <strong>{categoryName}</strong> / <strong>{subcategoryName}</strong>
            </p>

            <div className="add-game-field">
              <label htmlFor={`item-name-${fieldId}`}>Name</label>
              <input
                ref={nameRef}
                id={`item-name-${fieldId}`}
                name="name"
                type="text"
                maxLength={100}
                placeholder="Enter marker name"
              />
            </div>

            <div className="add-game-field">
              <label htmlFor={`item-icon-${fieldId}`}>Icon</label>
              <input
                ref={iconFileRef}
                id={`item-icon-${fieldId}`}
                name="icon"
                type="file"
                accept="image/*"
              />
              <p className="add-game-hint">Optional. Uses the subcategory icon if empty.</p>
            </div>

            <div className="add-map-size-row">
              <div className="add-game-field">
                <label htmlFor={`item-x-${fieldId}`}>X</label>
                <input
                  id={`item-x-${fieldId}`}
                  name="x"
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={xValue}
                  onChange={(event) => setXValue(sanitizeCoord(event.target.value))}
                />
              </div>
              <div className="add-game-field">
                <label htmlFor={`item-y-${fieldId}`}>Y</label>
                <input
                  id={`item-y-${fieldId}`}
                  name="y"
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={yValue}
                  onChange={(event) => setYValue(sanitizeCoord(event.target.value))}
                />
              </div>
            </div>

            <div className="add-game-error">{error}</div>

            <div className="add-game-actions">
              <button
                className="add-game-cancel"
                type="button"
                onClick={close}
                disabled={busy}
              >
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
