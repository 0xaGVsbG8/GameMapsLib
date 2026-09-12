"use client";

import { useEffect, useRef, useState } from "react";
import type { FilterItem, MapMarker } from "@/types/map";
import { FilterIcon } from "./FilterIcon";

type VisibleMarker = MapMarker & {
  itemId: string;
  icon: string;
};

const MIN_SCALE = 0.45;
const MAX_SCALE = 3.2;
const MAP_WIDTH = 1600;

function defaultEnabledMarkers(items: FilterItem[], enabledIds: Set<string>): VisibleMarker[] {
  return items.flatMap((item) =>
    enabledIds.has(item.id)
      ? item.markers.map((marker) => ({ ...marker, itemId: item.id, icon: item.icon }))
      : [],
  );
}

type MapCanvasProps = {
  image: string;
  items: FilterItem[];
  enabledIds: Set<string>;
};

export function MapCanvas({ image, items, enabledIds }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const cameraRef = useRef({ x: 40, y: 40, scale: 0.72 });
  const [camera, setCamera] = useState(cameraRef.current);
  const [activeMarker, setActiveMarker] = useState<VisibleMarker | null>(null);

  const markers = defaultEnabledMarkers(items, enabledIds);

  useEffect(() => {
    setActiveMarker(null);
  }, [image, enabledIds]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = node.getBoundingClientRect();
      const cursorX = event.clientX - rect.left;
      const cursorY = event.clientY - rect.top;
      const current = cameraRef.current;
      const factor = event.deltaY > 0 ? 0.9 : 1.1;
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, current.scale * factor));
      const ratio = nextScale / current.scale;
      const next = {
        scale: nextScale,
        x: cursorX - (cursorX - current.x) * ratio,
        y: cursorY - (cursorY - current.y) * ratio,
      };
      cameraRef.current = next;
      setCamera(next);
    };

    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, []);

  const zoomBy = (factor: number) => {
    const node = containerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const cursorX = rect.width / 2;
    const cursorY = rect.height / 2;
    const current = cameraRef.current;
    const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, current.scale * factor));
    const ratio = nextScale / current.scale;
    const next = {
      scale: nextScale,
      x: cursorX - (cursorX - current.x) * ratio,
      y: cursorY - (cursorY - current.y) * ratio,
    };
    cameraRef.current = next;
    setCamera(next);
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full cursor-grab overflow-hidden bg-[#071018] active:cursor-grabbing"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        dragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          originX: camera.x,
          originY: camera.y,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const next = {
          ...cameraRef.current,
          x: drag.originX + (event.clientX - drag.startX),
          y: drag.originY + (event.clientY - drag.startY),
        };
        cameraRef.current = next;
        setCamera(next);
      }}
      onPointerUp={(event) => {
        if (dragRef.current?.pointerId === event.pointerId) {
          dragRef.current = null;
        }
      }}
      onPointerCancel={() => {
        dragRef.current = null;
      }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left will-change-transform"
        style={{
          transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`,
        }}
      >
        <div className="relative" style={{ width: MAP_WIDTH }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt="Game map"
            draggable={false}
            className="block w-full select-none"
          />
          {markers.map((marker) => (
            <button
              key={`${marker.itemId}-${marker.id}`}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setActiveMarker((current) =>
                  current?.id === marker.id && current.itemId === marker.itemId ? null : marker,
                );
              }}
              onPointerDown={(event) => event.stopPropagation()}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${marker.x}%`,
                top: `${marker.y}%`,
                transform: `translate(-50%, -50%) scale(${1 / camera.scale})`,
              }}
              title={marker.name}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 shadow-lg ${
                  activeMarker?.id === marker.id && activeMarker.itemId === marker.itemId
                    ? "border-white bg-sky-400 text-slate-950"
                    : "border-sky-200/90 bg-[#163044] text-sky-100"
                }`}
              >
                <FilterIcon name={marker.icon} />
              </span>
            </button>
          ))}
        </div>
      </div>

      {activeMarker ? (
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-white/10 bg-[#0c1520]/95 px-4 py-2 text-sm text-white shadow-xl">
          {activeMarker.name}
        </div>
      ) : null}

      <div className="absolute bottom-5 left-5 z-20 flex flex-col overflow-hidden rounded-md border border-white/10 bg-[#0c1520]/90">
        <button
          type="button"
          onClick={() => zoomBy(1.15)}
          className="flex h-9 w-9 items-center justify-center text-lg text-zinc-200 hover:bg-white/10"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.15)}
          className="flex h-9 w-9 items-center justify-center border-t border-white/10 text-lg text-zinc-200 hover:bg-white/10"
          aria-label="Zoom out"
        >
          −
        </button>
      </div>
    </div>
  );
}
