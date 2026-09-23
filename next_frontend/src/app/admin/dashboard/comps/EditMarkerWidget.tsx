"use client";

import { useEffect, useRef, useState } from "react";
import { sanitizeCoord } from "../mapCoords";
import { apiUrl } from "../../api";
import "../css/add-game.css";

export type MarkerEdit = {
  id: number;
  name: string;
  x: number;
  y: number;
  screenX?: number;
  screenY?: number;
};

type EditMarkerWidgetProps = {
  gameName: string;
  marker: MarkerEdit;
  startAtDetails?: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

export function EditMarkerWidget({
  gameName,
  marker,
  startAtDetails = false,
  onClose,
  onSaved,
}: EditMarkerWidgetProps) {
  const [step, setStep] = useState<"menu" | "details">(
    startAtDetails ? "details" : "menu",
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [xValue, setXValue] = useState(String(marker.x));
  const [yValue, setYValue] = useState(String(marker.y));
  const [clearIcon, setClearIcon] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const iconFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (step !== "menu") return;

    const close = (event: PointerEvent) => {
      if (event.button !== 0) return;
      onClose();
    };
    const id = window.setTimeout(() => {
      window.addEventListener("pointerdown", close);
    }, 0);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("pointerdown", close);
    };
  }, [step, onClose]);

  useEffect(() => {
    if (step !== "details") return;
    if (nameRef.current) nameRef.current.value = marker.name;
    setXValue(String(marker.x));
    setYValue(String(marker.y));
    setClearIcon(false);
    nameRef.current?.focus();
    nameRef.current?.select();
  }, [step, marker.name, marker.x, marker.y]);

  const menuStyle = {
    left: Math.min(marker.screenX ?? 0, window.innerWidth - 168),
    top: Math.min(marker.screenY ?? 0, window.innerHeight - 48),
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const newName = nameRef.current?.value.trim();
    const iconFile = iconFileRef.current?.files?.[0] ?? null;
    const x = Number(xValue);
    const y = Number(yValue);
    if (!newName) {
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
    if (newName === marker.name && x === marker.x && y === marker.y && !iconFile && !clearIcon) {
      onClose();
      return;
    }

    setError("");
    setBusy(true);

    const formData = new FormData();
    formData.append("gameName", gameName);
    formData.append("id", String(marker.id));
    formData.append("newName", newName);
    formData.append("x", String(x));
    formData.append("y", String(y));
    if (iconFile && !clearIcon) formData.append("icon", iconFile);
    if (clearIcon) formData.append("clearIcon", "true");

    const response = await fetch(apiUrl("/blog/ManageItems"), {
      method: "PATCH",
      credentials: "include",
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.message ?? "Could not save marker");
      setBusy(false);
      return;
    }

    onSaved?.();
    onClose();
  };

  const handleDelete = async () => {
    if (busy) return;
    setBusy(true);
    const response = await fetch(apiUrl("/blog/ManageItems"), {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        gameName,
        id: marker.id,
      }),
    });
    if (!response.ok) {
      setBusy(false);
      return;
    }
    onSaved?.();
    onClose();
  };

  if (step === "menu") {
    return (
      <div
        className="marker-context-menu"
        style={menuStyle}
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" onClick={() => setStep("details")}>
          Edit marker
        </button>
        <button
          type="button"
          className="danger"
          onClick={handleDelete}
          disabled={busy}
        >
          Delete
        </button>
      </div>
    );
  }

  return (
    <div className="add-game-overlay" onClick={onClose}>
      <form
        className="add-game-window"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2>Edit marker</h2>

        <div className="add-game-field">
          <label htmlFor="edit-marker-name">Name</label>
          <input
            ref={nameRef}
            id="edit-marker-name"
            name="name"
            type="text"
            maxLength={100}
            placeholder="Enter marker name"
          />
        </div>

        <div className="add-game-field">
          <label htmlFor="edit-marker-icon">Icon</label>
          <input
            ref={iconFileRef}
            id="edit-marker-icon"
            name="icon"
            type="file"
            accept="image/*"
            disabled={clearIcon}
          />
          <label className="add-game-check">
            <input
              type="checkbox"
              checked={clearIcon}
              onChange={(event) => setClearIcon(event.target.checked)}
            />
            Clear icon
          </label>
          <p className="add-game-hint">Optional. Uses the subcategory icon if empty.</p>
        </div>

        <div className="add-map-size-row">
          <div className="add-game-field">
            <label htmlFor="edit-marker-x">X</label>
            <input
              id="edit-marker-x"
              name="x"
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={xValue}
              onChange={(event) => setXValue(sanitizeCoord(event.target.value))}
            />
          </div>
          <div className="add-game-field">
            <label htmlFor="edit-marker-y">Y</label>
            <input
              id="edit-marker-y"
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
          <button className="add-game-cancel" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="add-game-submit" type="submit" disabled={busy}>
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
