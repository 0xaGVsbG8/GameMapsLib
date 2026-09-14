
export type info_type = {
    'games': string[]
}

export type GameMapInfo = {
    Map_name: string
    image_path: string
    image_url?: string
    width: number
    height: number
    coordinates_feature?: boolean
    origin_x?: number | null
    origin_y?: number | null
    pixels_per_unit?: number | null
}

export type GameItem = {
    id: number
    name: string
    x: number
    y: number
}

export type GameSubCategory = {
    name: string
    items?: GameItem[]
}

export type GameCategory = {
    name: string
    subcategories: GameSubCategory[]
}

export type GameInfo = {
    game: string
    maps: GameMapInfo[]
    categories?: GameCategory[]
    map: "exists" | "not exists"
}
