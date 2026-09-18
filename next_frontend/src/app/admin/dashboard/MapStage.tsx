"use client";

import { useEffect, useRef, useState } from "react";
import { MarkerClick } from "./AddMarkerWidget";
import { MarkerEdit } from "./EditMarkerWidget";
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
  highlightedMarkerId?: number | null;
  hiddenCategoryNames?: Set<string>;
  hiddenSubcategoryKeys?: Set<string>;
  readOnly?: boolean;
  onMarkerClick?: (click: MarkerClick) => void;
  onMarkerEdit?: (marker: MarkerEdit) => void;
};

const EMPTY_HIDDEN = new Set<string>();

export function MapStage({
  gameInfo,
  selectedMap,
  mapSrc,
  mapNotice,
  highlightedMarkerId = null,
  hiddenCategoryNames = EMPTY_HIDDEN,
  hiddenSubcategoryKeys = EMPTY_HIDDEN,
  readOnly = false,
  onMarkerClick,
  onMarkerEdit,
}: MapStageProps) {
  const mapRef = useRef<HTMLImageElement>(null);
  const mapBoardRef = useRef<HTMLDivElement>(null);
  const mapStageRef = useRef<HTMLDivElement>(null);
  const infoBoxRef = useRef<HTMLDivElement>(null);
  const infoMarkerIdRef = useRef<number | null>(null);
  const syncInfoBoxRef = useRef<() => void>(() => {});
  const coordXRef = useRef<HTMLSpanElement>(null);
  const coordYRef = useRef<HTMLSpanElement>(null);
  const currentImgzoom = useRef(1);
  const isTogglingMouse = useRef(false);
  const panRef = useRef({ x: 0, y: 0 });
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [selectedMarkerId, setSelectedMarkerId] = useState<number | null>(null);
  const [hoveredMarkerId, setHoveredMarkerId] = useState<number | null>(null);
  const [placedMarkers, setPlacedMarkers] = useState<
    {
      id: number;
      name: string;
      categoryName: string;
      subcategoryName: string;
      icon_src?: string | null;
      x: number;
      y: number;
      mapX: number;
      mapY: number;
    }[]
  >([]);

  const visibleMarkers = placedMarkers.filter(
    (marker) =>
      !hiddenCategoryNames.has(marker.categoryName) &&
      !hiddenSubcategoryKeys.has(
        `${marker.categoryName}::${marker.subcategoryName}`,
      ),
  );
  const infoMarker =
    visibleMarkers.find((marker) => marker.id === selectedMarkerId) ??
    visibleMarkers.find((marker) => marker.id === highlightedMarkerId) ??
    visibleMarkers.find((marker) => marker.id === hoveredMarkerId) ??
    null;
  infoMarkerIdRef.current = infoMarker?.id ?? null;

  syncInfoBoxRef.current = () => {
    const box = infoBoxRef.current;
    const stage = mapStageRef.current;
    const id = infoMarkerIdRef.current;
    if (!box || !stage) return;
    if (id == null) {
      box.hidden = true;
      return;
    }
    const marker = stage.querySelector(`[data-marker-id="${id}"]`);
    if (!(marker instanceof HTMLElement)) {
      box.hidden = true;
      return;
    }
    const markerRect = marker.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    box.hidden = false;
    box.style.left = `${markerRect.left + markerRect.width / 2 - stageRect.left}px`;
    box.style.top = `${markerRect.top - stageRect.top}px`;
  };

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
      if (readOnly || !onMarkerClick) return;
      if ((event.target as HTMLElement | null)?.closest(".map-marker")) return;
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
  }, [mapSrc, gameInfo, onMarkerClick, readOnly]);

  useEffect(() => {
    const board = mapBoardRef.current;
    if (!board) return;

    panRef.current = { x: 0, y: 0 };
    currentImgzoom.current = 1;
    isTogglingMouse.current = false;

    const applyTransform = () => {
      const zoom = currentImgzoom.current;
      const iconNet = Math.min(Math.pow(Math.max(zoom, 0.25), 0.2), 1.3);
      board.style.setProperty("--map-zoom", String(zoom));
      board.style.setProperty("--map-icon-scale", String(iconNet / zoom));
      board.style.transform = `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${zoom})`;
      syncInfoBoxRef.current();
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
    setPlacedMarkers([]);
    setSelectedMarkerId(null);
    const image = mapRef.current;
    setImageLoaded(Boolean(image?.complete && image.naturalWidth));
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
            categoryName: item.categoryName,
            subcategoryName: item.subcategoryName,
            icon_src: item.icon_src,
            x: point.x,
            y: point.y,
            mapX: item.x,
            mapY: item.y,
          }];
        }),
      );
    };

    placeMarkers();
    const observer = new ResizeObserver(placeMarkers);
    observer.observe(image);
    return () => observer.disconnect();
  }, [imageLoaded, gameInfo, mapSrc]);

  useEffect(() => {
    syncInfoBoxRef.current();
  });

  return (
    <div className="ide-map-stage" ref={mapStageRef}>
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
            {visibleMarkers.map((marker) => (
              <Marker
                key={marker.id}
                markerId={marker.id}
                name={marker.name}
                subcategoryName={marker.subcategoryName}
                x={marker.x}
                y={marker.y}
                selected={selectedMarkerId === marker.id}
                highlighted={highlightedMarkerId === marker.id}
                icon_src={marker.icon_src || undefined}
                gameName={gameInfo?.game ?? ""}
                onHover={setHoveredMarkerId}
                onSelect={() =>
                  setSelectedMarkerId((current) =>
                    current === marker.id ? null : marker.id,
                  )
                }
                onEdit={
                  readOnly || !onMarkerEdit
                    ? undefined
                    : (click) =>
                        onMarkerEdit({
                          id: marker.id,
                          name: marker.name,
                          x: marker.mapX,
                          y: marker.mapY,
                          screenX: click.screenX,
                          screenY: click.screenY,
                        })
                }
              />
            ))}
          </div>
          <div
            ref={infoBoxRef}
            className="map-marker-label is-floating"
            hidden={!infoMarker}
          >
            <span className="map-marker-subcategory">
              {infoMarker?.subcategoryName}
            </span>
            <span className="map-marker-name">{infoMarker?.name}</span>
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
