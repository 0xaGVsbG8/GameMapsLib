export type MapMarker = {
  id: string;
  name: string;
  x: number;
  y: number;
};

export type FilterItem = {
  id: string;
  name: string;
  icon: string;
  enabledByDefault: boolean;
  markers: MapMarker[];
};

export type FilterCategory = {
  id: string;
  name: string;
  items: FilterItem[];
};

export type GameMap = {
  id: string;
  name: string;
  image: string;
  categories: FilterCategory[];
};

export type Game = {
  id: string;
  name: string;
  maps: GameMap[];
};

export type MapsData = {
  title: string;
  games: Game[];
};
