'use client'

export type Marker_props = {
    name: string
    subcategoryName: string
    x: number
    y: number
    selected: boolean
    onSelect: () => void
}

const Marker = ({ name, subcategoryName, x, y, selected, onSelect }: Marker_props) => {
    return (
        <div
            className={selected ? "map-marker is-selected" : "map-marker"}
            style={{ left: x, top: y }}
            onPointerDown={(event) => {
                event.stopPropagation();
                event.preventDefault();
                onSelect();
            }}
        >
            {selected && (
                <div className="map-marker-label">
                    <span className="map-marker-subcategory">{subcategoryName}</span>
                    <span className="map-marker-name">{name}</span>
                </div>
            )}
        </div>
    )
}

export default Marker
