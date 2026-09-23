"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { apiUrl } from "../../api";
import "../css/add-game.css";
import type { GameMapInfo } from "../types";

type AddMapWidgetProps = {
  gameName: string;
  existingMap?: GameMapInfo | null;
  onAdded: () => void;
  compact?: boolean;
};

export function AddMapWidget({
  gameName,
  existingMap = null,
  onAdded,
  compact = false,
}: AddMapWidgetProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [useCoordinates, setUseCoordinates] = useState(false);
  const [originX, setOriginX] = useState("");
  const [originY, setOriginY] = useState("");
  const [pixelsPerUnit, setPixelsPerUnit] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const widthRef = useRef<HTMLInputElement>(null);
  const heightRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const replacing = Boolean(existingMap);

  useEffect(() => {
    if (!open) return;

    if (existingMap) {
      if (nameRef.current) nameRef.current.value = existingMap.Map_name;
      if (widthRef.current) widthRef.current.value = String(existingMap.width);
      if (heightRef.current) heightRef.current.value = String(existingMap.height);
    }
    applyExistingMap(existingMap);

    nameRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, existingMap]);

  const applyExistingMap = (map: GameMapInfo | null) => {
    setUseCoordinates(Boolean(map?.coordinates_feature));
    setOriginX(map?.origin_x != null ? String(map.origin_x) : "");
    setOriginY(map?.origin_y != null ? String(map.origin_y) : "");
    setPixelsPerUnit(
      map?.pixels_per_unit != null ? String(map.pixels_per_unit) : "",
    );
  };

  const close = () => {
    setOpen(false);
    setError("");
    applyExistingMap(null);
  };

  const fillSizeFromImage = (file: File) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      if (widthRef.current) widthRef.current.value = String(image.naturalWidth);
      if (heightRef.current) {
        heightRef.current.value = String(image.naturalHeight);
      }
      URL.revokeObjectURL(url);
    };
    image.onerror = () => URL.revokeObjectURL(url);
    image.src = url;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = nameRef.current?.value.trim();
    const width = widthRef.current?.value.trim();
    const height = heightRef.current?.value.trim();
    const image = imageRef.current?.files?.[0];

    if (!name || !width || !height) {
      setError("Map name, width, and height are required");
      return;
    }

    if (useCoordinates) {
      const originXValue = originX.trim();
      const originYValue = originY.trim();
      const pixelsPerUnitValue = pixelsPerUnit.trim();
      if (!originXValue || !originYValue || !pixelsPerUnitValue) {
        setError("Origin X, origin Y, and pixels per unit are required");
        return;
      }
    }

    setError("");

    const body = new FormData();
    body.append("gameName", gameName);
    body.append("name", name);
    body.append("width", width);
    body.append("height", height);
    body.append("coordinatesFeature", useCoordinates ? "true" : "false");
    if (useCoordinates) {
      body.append("originX", originX.trim());
      body.append("originY", originY.trim());
      body.append("pixelsPerUnit", pixelsPerUnit.trim());
    }
    if (image) body.append("image", image);

    const response = await fetch(apiUrl("/blog/addMap"), {
      method: "POST",
      credentials: "include",
      body,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(
        data?.message ??
          (replacing ? "Could not replace map" : "Could not add map"),
      );
      return;
    }

    if (nameRef.current) nameRef.current.value = "";
    if (widthRef.current) widthRef.current.value = "";
    if (heightRef.current) heightRef.current.value = "";
    if (imageRef.current) imageRef.current.value = "";
    close();
    onAdded();
  };

  return (
    <>
      <button
        className={compact ? "add-game-button compact" : "add-game-button"}
        type="button"
        onClick={() => {
          applyExistingMap(existingMap);
          setOpen(true);
        }}
      >
        {replacing ? "Replace map" : compact ? "+ Add map" : "Add map"}
      </button>

      {open && (
        <div className="add-game-overlay" onClick={close}>
          <form
            className="add-game-window"
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <h2>{replacing ? "Replace map" : "Add map"}</h2>

            {replacing && (
              <p className="delete-game-warning">
                This will replace the current map for this game. Upload a new
                image to swap the picture, or leave it empty to keep the existing
                one.
              </p>
            )}

            <div className="add-game-field">
              <label htmlFor="map-name">Map name</label>
              <input
                ref={nameRef}
                id="map-name"
                name="name"
                type="text"
                maxLength={100}
                placeholder="Enter map name"
              />
            </div>

            <div className="add-game-field">
              <label htmlFor="map-image">Map image</label>
              <input
                ref={imageRef}
                id="map-image"
                name="image"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) fillSizeFromImage(file);
                }}
              />
            </div>

            <div className="add-map-size-row">
              <div className="add-game-field">
                <label htmlFor="map-width">Width</label>
                <input
                  ref={widthRef}
                  id="map-width"
                  name="width"
                  type="number"
                  min={1}
                  placeholder="1920"
                />
              </div>

              <div className="add-game-field">
                <label htmlFor="map-height">Height</label>
                <input
                  ref={heightRef}
                  id="map-height"
                  name="height"
                  type="number"
                  min={1}
                  placeholder="1080"
                />
              </div>
            </div>
            <p className="add-game-hint">
              Filled from the image. Change these values to scale the saved
              file.
            </p>

            <label className="add-game-check" htmlFor="map-coordinates">
              <input
                id="map-coordinates"
                name="coordinatesFeature"
                type="checkbox"
                checked={useCoordinates}
                onChange={(event) => setUseCoordinates(event.target.checked)}
              />
              Coordinates feature
            </label>

            {useCoordinates && (
              <>
                <p className="add-game-hint">
                  Origin X and Y are where in-game (0, 0) sits on the image.{" "}
                  <Link className="add-game-hint-link" href="/admin/guide">
                    How to calculate origin and scale
                  </Link>
                </p>
                <div className="add-map-size-row">
                  <div className="add-game-field">
                    <label htmlFor="map-origin-x">Origin X</label>
                    <input
                      id="map-origin-x"
                      name="originX"
                      type="number"
                      step="any"
                      value={originX}
                      onChange={(event) => setOriginX(event.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="add-game-field">
                    <label htmlFor="map-origin-y">Origin Y</label>
                    <input
                      id="map-origin-y"
                      name="originY"
                      type="number"
                      step="any"
                      value={originY}
                      onChange={(event) => setOriginY(event.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="add-game-field">
                  <label htmlFor="map-pixels-per-unit">Pixels per unit</label>
                  <input
                    id="map-pixels-per-unit"
                    name="pixelsPerUnit"
                    type="number"
                    min={0}
                    step="any"
                    value={pixelsPerUnit}
                    onChange={(event) => setPixelsPerUnit(event.target.value)}
                    placeholder="1"
                  />
                </div>
              </>
            )}

            <div className="add-game-error">{error}</div>

            <div className="add-game-actions">
              <button className="add-game-cancel" type="button" onClick={close}>
                Cancel
              </button>
              <button className="add-game-submit" type="submit">
                {replacing ? "Replace" : "Add"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
