'use client'

import { apiUrl } from "../api";
export type MarkerEditClick = {
    screenX: number
    screenY: number
}

export type Marker_props = {
    name: string
    subcategoryName: string
    x: number
    y: number
    selected: boolean
    highlighted?: boolean
    icon_src?: string
    gameName:string
    markerId: number
    onSelect: () => void
    onHover?: (id: number | null) => void
    onEdit?: (click: MarkerEditClick) => void
}

const Marker = ({ x, y, selected, highlighted, icon_src, gameName, markerId, onSelect, onHover, onEdit }: Marker_props) => {
    const className = [
        "map-marker",
        selected ? "is-selected" : "",
        highlighted ? "is-highlighted" : "",
        icon_src ? "has-icon" : "",
    ].filter(Boolean).join(" ");

    return (
        <div
            className={className}
            data-marker-id={markerId}
            style={{ left: x, top: y }}
            onPointerEnter={() => onHover?.(markerId)}
            onPointerLeave={() => onHover?.(null)}
            onPointerDown={(event) => {
                if (event.button !== 0) return;
                event.stopPropagation();
                event.preventDefault();
                onSelect();
            }}
            onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onEdit?.({
                    screenX: event.clientX,
                    screenY: event.clientY,
                });
            }}
        >
            {icon_src ? (
                <img
                    className="map-marker-icon"
                    src={apiUrl(`/media/${gameName}/icons/${icon_src}`)}
                    alt=""
                />
            ) : null}
        </div>
    )
}

export default Marker
