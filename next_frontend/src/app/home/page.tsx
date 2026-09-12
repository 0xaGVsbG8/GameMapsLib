import { InteractiveMap } from "@/components/map/InteractiveMap";
import mapsData from "@/data/maps.json";
import type { MapsData } from "@/types/map";

export default function HomeMapPage() {
  return <InteractiveMap data={mapsData as MapsData} />;
}
