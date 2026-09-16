"use client";

import { useEffect, useRef, useState } from "react";
import { MarkerClick } from "./AddMarkerWidget";
import { calc_marker, getGameItems, getMapPoint } from "./mapCoords";
import Marker from "./marker";
import { GameInfo, GameMapInfo } from "./types";

const zoom_by = 0.2;
const min_zoom = 0.25;
const max_zoom = 12;

type MapStageProps = {
  gameInfo: GameInfo | null;
  selectedMap: GameMapInfo | undefined;
  mapSrc: string;
  mapNotice: string;
  onMarkerClick: (click: MarkerClick) => void;
};

export function MapStage({
  gameInfo,
  selectedMap,
  mapSrc,
  mapNotice,
  onMarkerClick,
}: MapStageProps) {
  const mapRef = useRef<HTMLImageElement>(null);
  const mapBoardRef = useRef<HTMLDivElement>(null);
  const coordXRef = useRef<HTMLSpanElement>(null);
  const coordYRef = useRef<HTMLSpanElement>(null);
  const currentImgzoom = useRef(1);
  const isTogglingMouse = useRef(false);
  const panRef = useRef({ x: 0, y: 0 });
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [selectedMarkerId, setSelectedMarkerId] = useState<number | null>(null);
  const [placedMarkers, setPlacedMarkers] = useState<
    { id: number; name: string; subcategoryName: string; x: number; y: number }[]
  >([]);

  useEffect(() => {
    const image = mapRef.current;
    const board = mapBoardRef.current;
    const setLabels = (point: { x: number; y: number } | null) => {
      if (coordXRef.current) coordXRef.current.textContent = point ? String(point.x) : "—";
      if (coordYRef.current) coordYRef.current.textContent = point ? String(point.y) : "—";
    };

    setLabels(null);
    if (!image || !board) return;

    const onMove = (event: MouseEvent) => {
      const point = getMapPoint(event, image, gameInfo);
      setLabels(point ? { x: point.x, y: point.y } : null);
    };
    const onLeave = () => setLabels(null);

    board.addEventListener("mousemove", onMove);
    board.addEventListener("mouseleave", onLeave);
    return () => {
      board.removeEventListener("mousemove", onMove);
      board.removeEventListener("mouseleave", onLeave);
    };
  }, [mapSrc, gameInfo]);

  useEffect(() => {
    const image = mapRef.current;
    if (!image) return;

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      const point = getMapPoint(event, image, gameInfo);
      if (!point) return;
      onMarkerClick({
        screenX: event.clientX,
        screenY: event.clientY,
        mapX: point.x,
        mapY: point.y,
      });
    };

    image.addEventListener("contextmenu", onContextMenu);
    return () => {
      image.removeEventListener("contextmenu", onContextMenu);
    };
  }, [mapSrc, gameInfo, onMarkerClick]);

  useEffect(() => {
    const board = mapBoardRef.current;
    if (!board) return;

    panRef.current = { x: 0, y: 0 };
    currentImgzoom.current = 1;
    isTogglingMouse.current = false;

    const applyTransform = () => {
      board.style.setProperty("--map-zoom", String(currentImgzoom.current));
      board.style.transform = `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${currentImgzoom.current})`;
    };
    applyTransform();

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      if ((event.target as HTMLElement | null)?.closest(".map-marker")) return;
      event.preventDefault();
      setSelectedMarkerId(null);
      isTogglingMouse.current = true;
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
      board.classList.add("is-panning");
      board.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!isTogglingMouse.current) return;
      panRef.current = {
        x: panRef.current.x + event.clientX - lastPointerRef.current.x,
        y: panRef.current.y + event.clientY - lastPointerRef.current.y,
      };
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
      applyTransform();
    };

    const onPointerUp = (event: PointerEvent) => {
      isTogglingMouse.current = false;
      board.classList.remove("is-panning");
      if (board.hasPointerCapture(event.pointerId)) {
        board.releasePointerCapture(event.pointerId);
      }
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const oldZoom = currentImgzoom.current;
      const nextZoom = event.deltaY < 0 ? oldZoom + zoom_by : oldZoom - zoom_by;
      const newZoom = Math.min(max_zoom, Math.max(min_zoom, nextZoom));
      if (newZoom === oldZoom) return;
      const rect = board.getBoundingClientRect();
      const ratio = newZoom / oldZoom;
      panRef.current = {
        x: panRef.current.x + (event.clientX - (rect.left + rect.width / 2)) * (1 - ratio),
        y: panRef.current.y + (event.clientY - (rect.top + rect.height / 2)) * (1 - ratio),
      };
      currentImgzoom.current = newZoom;
      applyTransform();
    };

    const onDragStart = (event: DragEvent) => {
      event.preventDefault();
    };

    board.addEventListener("pointerdown", onPointerDown);
    board.addEventListener("pointermove", onPointerMove);
    board.addEventListener("pointerup", onPointerUp);
    board.addEventListener("pointercancel", onPointerUp);
    board.addEventListener("wheel", onWheel, { passive: false });
    board.addEventListener("dragstart", onDragStart);
    return () => {
      board.classList.remove("is-panning");
      board.style.transform = "";
      board.removeEventListener("pointerdown", onPointerDown);
      board.removeEventListener("pointermove", onPointerMove);
      board.removeEventListener("pointerup", onPointerUp);
      board.removeEventListener("pointercancel", onPointerUp);
      board.removeEventListener("wheel", onWheel);
      board.removeEventListener("dragstart", onDragStart);
    };
  }, [mapSrc]);

  useEffect(() => {
    setImageLoaded(false);
    setPlacedMarkers([]);
    setSelectedMarkerId(null);
  }, [mapSrc]);

  useEffect(() => {
    const image = mapRef.current;
    const map = gameInfo?.maps[0];
    if (!imageLoaded || !image || !map) {
      setPlacedMarkers([]);
      return;
    }

    const placeMarkers = () => {
      const items = getGameItems(gameInfo);
      setPlacedMarkers(
        items.flatMap((item) => {
          const point = calc_marker(item.x, item.y, image, map);
          if (!point) return [];
          return [{
            id: item.id,
            name: item.name,
            subcategoryName: item.subcategoryName,
            x: point.x,
            y: point.y,
          }];
        }),
      );
    };

    placeMarkers();
    const observer = new ResizeObserver(placeMarkers);
    observer.observe(image);
    return () => observer.disconnect();
  }, [imageLoaded, gameInfo, mapSrc]);

  return (
    <div className="ide-map-stage">
      {mapSrc ? (
        <>
          <div id="map-bor" ref={mapBoardRef}>
            <img
              id="map"
              ref={mapRef}
              src={mapSrc}
              alt={selectedMap?.Map_name}
              width={selectedMap?.width}
              height={selectedMap?.height}
              draggable={false}
              onLoad={() => setImageLoaded(true)}
            />
            {placedMarkers.map((marker) => (
              <Marker
                key={marker.id}
                name={marker.name}
                subcategoryName={marker.subcategoryName}
                x={marker.x}
                y={marker.y}
                selected={selectedMarkerId === marker.id}
                onSelect={() =>
                  setSelectedMarkerId((current) =>
                    current === marker.id ? null : marker.id,
                  )
                }
              />
            ))}
          </div>
          <div className="map-coord-widget">
            <span>
              X <span ref={coordXRef}>—</span>
            </span>
            <span>
              Y <span ref={coordYRef}>—</span>
            </span>
          </div>
        </>
      ) : (
        <div className="map-notice">{mapNotice || "map not uploaded yet"}</div>
      )}
    </div>
  );
}
