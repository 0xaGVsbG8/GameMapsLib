'use client'

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
    onSelect: () => void
    onEdit: (click: MarkerEditClick) => void
}

const Marker = ({ name, subcategoryName, x, y, selected, highlighted, icon_src, gameName, onSelect, onEdit }: Marker_props) => {
    const className = [
        "map-marker",
        selected ? "is-selected" : "",
        highlighted ? "is-highlighted" : "",
        icon_src ? "has-icon" : "",
    ].filter(Boolean).join(" ");

    return (
        <div
            className={className}
            style={{ left: x, top: y }}
            onPointerDown={(event) => {
                if (event.button !== 0) return;
                event.stopPropagation();
                event.preventDefault();
                onSelect();
            }}
            onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onEdit({
                    screenX: event.clientX,
                    screenY: event.clientY,
                });
            }}
        >
            {icon_src ? (
                <img
                    className="map-marker-icon"
                    src={`http://localhost:8000/media/${gameName}/icons/${icon_src}`}
                    alt=""
                />
            ) : null}
            <div className="map-marker-label">
                <span className="map-marker-subcategory">{subcategoryName}</span>
                <span className="map-marker-name">{name}</span>
            </div>
        </div>
    )
}

export default Marker
