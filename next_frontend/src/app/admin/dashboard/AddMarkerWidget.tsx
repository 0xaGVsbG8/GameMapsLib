"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "./add-game.css";
import type { GameCategory } from "./types";

export type MarkerClick = {
  screenX: number;
  screenY: number;
  mapX: number;
  mapY: number;
};

type AddMarkerWidgetProps = {
  gameName: string;
  categories: GameCategory[];
  click: MarkerClick;
  onClose: () => void;
  onAdded?: () => void;
};

export function AddMarkerWidget({
  gameName,
  categories,
  click,
  onClose,
  onAdded,
}: AddMarkerWidgetProps) {
  const [step, setStep] = useState<"menu" | "details">("menu");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [categoryName, setCategoryName] = useState(categories[0]?.name ?? "");
  const [subcategoryName, setSubcategoryName] = useState(
    categories[0]?.subcategories[0]?.name ?? "",
  );
  const nameRef = useRef<HTMLInputElement>(null);
  const iconFileRef = useRef<HTMLInputElement>(null);

  const subcategories = useMemo(
    () =>
      categories.find((category) => category.name === categoryName)
        ?.subcategories ?? [],
    [categories, categoryName],
  );

  useEffect(() => {
    setSubcategoryName(subcategories[0]?.name ?? "");
  }, [subcategories]);

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
    if (step === "details") nameRef.current?.focus();
  }, [step]);

  const menuStyle = {
    left: Math.min(click.screenX, window.innerWidth - 168),
    top: Math.min(click.screenY, window.innerHeight - 48),
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = nameRef.current?.value.trim();

    if (!name) {
      setError("Marker name is required");
      return;
    }
    if (!categoryName) {
      setError("Add a category first");
      return;
    }
    if (!subcategoryName) {
      setError("Add a subcategory first");
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
    formData.append("x", String(click.mapX));
    formData.append("y", String(click.mapY));
    if (iconFile) formData.append("icon", iconFile);

    const response = await fetch("http://localhost:8000/blog/ManageItems", {
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

    onAdded?.();
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
          Add marker
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
        <h2>Marker details</h2>

        <div className="add-game-field">
          <label htmlFor="marker-name">Name</label>
          <input
            ref={nameRef}
            id="marker-name"
            name="name"
            type="text"
            maxLength={100}
            placeholder="Enter marker name"
          />
        </div>

        <div className="add-game-field">
          <label htmlFor="marker-icon">Icon</label>
          <input ref={iconFileRef} id="marker-icon" name="icon" type="file" accept="image/*" />
          <p className="add-game-hint">Optional. Uses the subcategory icon if empty.</p>
        </div>

        <div className="add-game-field">
          <label htmlFor="marker-category">Category</label>
          <select
            id="marker-category"
            name="categoryName"
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
          >
            {categories.length === 0 && <option value="">No categories</option>}
            {categories.map((category) => (
              <option key={category.name} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="add-game-field">
          <label htmlFor="marker-subcategory">Subcategory</label>
          <select
            id="marker-subcategory"
            name="subcategoryName"
            value={subcategoryName}
            onChange={(event) => setSubcategoryName(event.target.value)}
          >
            {subcategories.length === 0 && (
              <option value="">No subcategories</option>
            )}
            {subcategories.map((subcategory) => (
              <option key={subcategory.name} value={subcategory.name}>
                {subcategory.name}
              </option>
            ))}
          </select>
        </div>

        <div className="add-map-size-row">
          <div className="add-game-field">
            <label htmlFor="marker-x">X</label>
            <input id="marker-x" type="text" value={click.mapX} readOnly />
          </div>
          <div className="add-game-field">
            <label htmlFor="marker-y">Y</label>
            <input id="marker-y" type="text" value={click.mapY} readOnly />
          </div>
        </div>

        <div className="add-game-error">{error}</div>

        <div className="add-game-actions">
          <button className="add-game-cancel" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="add-game-submit" type="submit" disabled={busy}>
            Add
          </button>
        </div>
      </form>
    </div>
  );
}
