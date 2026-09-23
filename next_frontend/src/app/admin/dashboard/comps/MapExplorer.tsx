'use client'
import { useCallback, useEffect, useState } from "react";
import { AddMapWidget } from "./AddMapWidget";
import { AddMarkerWidget, MarkerClick } from "./AddMarkerWidget";
import { CategorySidebar } from "./CategorySidebar";
import { DeleteGameWidget } from "./DeleteGameWidget";
import { EditMarkerWidget, MarkerEdit } from "./EditMarkerWidget";
import { GameSidebar } from "./GameSidebar";
import { MapStage } from "./MapStage";
import { GameInfo, OverviewStats, info_type } from "../types";
import { apiUrl } from "../../api";
import "../css/add-game.css";
import "../css/dashboard.css";
import "../css/MapExplorer.css";

type MapExplorerProps = {
  readOnly?: boolean;
};

const STAT_LABELS: { key: keyof OverviewStats; label: string; hideWhenReadOnly?: boolean }[] = [
  { key: "games", label: "Games" },
  { key: "public_games", label: "Public games", hideWhenReadOnly: true },
  { key: "maps", label: "Maps" },
  { key: "categories", label: "Categories" },
  { key: "subcategories", label: "Subcategories" },
  { key: "items", label: "Items" },
];

function mapFiltersStorageKey(gameName: string) {
  return `interact-maps:map-filters:${gameName}`
}

function hiddenSubcategoriesStorageKey(gameName: string) {
  return `interact-maps:hidden-subcategories:${gameName}`
}

function lastPublicGameStorageKey() {
  return "interact-maps:last-public-game"
}

type MapFilters = {
  categories: Set<string>
  subcategories: Set<string>
}

function stringSet(value: unknown) {
  if (!Array.isArray(value)) return new Set<string>()
  return new Set(value.filter((key): key is string => typeof key === "string"))
}

function loadMapFilters(gameName: string): MapFilters {
  try {
    const raw = localStorage.getItem(mapFiltersStorageKey(gameName))
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        categories: stringSet(parsed?.categories),
        subcategories: stringSet(parsed?.subcategories),
      }
    }
    const legacy = localStorage.getItem(hiddenSubcategoriesStorageKey(gameName))
    if (!legacy) return { categories: new Set(), subcategories: new Set() }
    const parsed = JSON.parse(legacy)
    return {
      categories: new Set(),
      subcategories: stringSet(parsed),
    }
  } catch {
    return { categories: new Set(), subcategories: new Set() }
  }
}

function saveMapFilters(gameName: string, filters: MapFilters) {
  localStorage.setItem(
    mapFiltersStorageKey(gameName),
    JSON.stringify({
      categories: [...filters.categories],
      subcategories: [...filters.subcategories],
    }),
  )
}

export function MapExplorer({ readOnly = false }: MapExplorerProps) {
  const [data, setData] = useState<info_type>()
  const [browsingGame, setBrowsingGame] = useState<string | null>(null)
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null)
  const [mapNotice, setMapNotice] = useState("")
  const [gameToDelete, setGameToDelete] = useState<string | null>(null)
  const [publishConfirm, setPublishConfirm] = useState(false)
  const [publishBusy, setPublishBusy] = useState(false)
  const [markerClick, setMarkerClick] = useState<MarkerClick | null>(null)
  const [markerEdit, setMarkerEdit] = useState<MarkerEdit | null>(null)
  const [hoveredMarkerId, setHoveredMarkerId] = useState<number | null>(null)
  const [hiddenCategoryNames, setHiddenCategoryNames] = useState<Set<string>>(new Set())
  const [hiddenSubcategoryKeys, setHiddenSubcategoryKeys] = useState<Set<string>>(new Set())
  const [gamesOpen, setGamesOpen] = useState(true)
  const [categoriesOpen, setCategoriesOpen] = useState(true)

  const credentials = readOnly ? "omit" : "include"
  const gamesUrl = readOnly ? "/blog/getPublicGames" : "/blog/getGlobalInfo"
  const gameInfoUrl = readOnly ? "/blog/getPublicGameInfo" : "/blog/getGameInfo"

  const isNarrow = () =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches

  const toggleGames = () => {
    setGamesOpen((open) => {
      const next = !open
      if (next && isNarrow()) setCategoriesOpen(false)
      return next
    })
  }

  const toggleCategories = () => {
    setCategoriesOpen((open) => {
      const next = !open
      if (next && isNarrow()) setGamesOpen(false)
      return next
    })
  }

  const gather_info = async() => {
    const response = await fetch(apiUrl(gamesUrl),{
      method:'GET',
      credentials,
    })
    const data = await response.json() as info_type
    setData(data)
  }

  const handleGetGameInfo = async(name: string) => {
    setBrowsingGame(name)
    if (readOnly) {
      const filters = loadMapFilters(name)
      setHiddenCategoryNames(filters.categories)
      setHiddenSubcategoryKeys(filters.subcategories)
      localStorage.setItem(lastPublicGameStorageKey(), name)
    }
    const response = await fetch(apiUrl(`${gameInfoUrl}?GameName=${encodeURIComponent(name)}`),{
      method:'GET',
      credentials,
    })
    if (!response.ok) {
      setGameInfo(null)
      setMapNotice("map not available")
      return
    }
    const info = await response.json() as GameInfo
    if(info.map=='not exists'){
      setMapNotice("map not uploaded yet")
    } else {
      setMapNotice("")
    }
    setGameInfo(info)
  }

  const handleDeleteGame = () => {
    if (!gameToDelete) return

    if (browsingGame === gameToDelete) {
      setBrowsingGame(null)
      setGameInfo(null)
      setMapNotice("")
    }

    setGameToDelete(null)
    gather_info()
  }

  const setGamePublic = async (nextPublic: boolean) => {
    if (readOnly || !browsingGame || !gameInfo) return
    setPublishBusy(true)
    const response = await fetch(apiUrl("/blog/ManageGames"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: browsingGame, public: nextPublic }),
    })
    setPublishBusy(false)
    if (!response.ok) return
    setGameInfo({ ...gameInfo, public: nextPublic })
    setPublishConfirm(false)
  }

  const handleTogglePublic = () => {
    if (readOnly || !browsingGame || !gameInfo) return
    if (gameInfo.public) {
      setGamePublic(false)
      return
    }
    setPublishConfirm(true)
  }

  const handleMarkerClick = useCallback((click: MarkerClick) => {
    setMarkerEdit(null)
    setMarkerClick(click)
  }, [])

  const handleMarkerEdit = useCallback((marker: MarkerEdit) => {
    setMarkerClick(null)
    setMarkerEdit(marker)
  }, [])

  const persistFilters = (filters: MapFilters) => {
    if (!browsingGame) return
    saveMapFilters(browsingGame, filters)
  }

  const subcategoryKeysFor = (categoryName: string) =>
    (gameInfo?.categories?.find((category) => category.name === categoryName)?.subcategories ?? [])
      .map((subcategory) => `${categoryName}::${subcategory.name}`)

  const toggleCategoryVisible = (name: string, visible: boolean) => {
    const categories = new Set(hiddenCategoryNames)
    const subcategories = new Set(hiddenSubcategoryKeys)
    if (visible) {
      categories.delete(name)
      subcategoryKeysFor(name).forEach((key) => subcategories.delete(key))
    } else {
      categories.add(name)
      subcategoryKeysFor(name).forEach((key) => subcategories.add(key))
    }
    setHiddenCategoryNames(categories)
    setHiddenSubcategoryKeys(subcategories)
    persistFilters({ categories, subcategories })
  }

  const toggleSubcategoryVisible = (key: string, visible: boolean) => {
    const separator = key.indexOf("::")
    const categoryName = separator === -1 ? key : key.slice(0, separator)
    const subcategories = new Set(hiddenSubcategoryKeys)
    if (visible) subcategories.delete(key)
    else subcategories.add(key)

    const categories = new Set(hiddenCategoryNames)
    const siblingKeys = subcategoryKeysFor(categoryName)
    const allHidden =
      siblingKeys.length > 0 &&
      siblingKeys.every((sibling) => subcategories.has(sibling))
    if (allHidden) categories.add(categoryName)
    else categories.delete(categoryName)

    setHiddenCategoryNames(categories)
    setHiddenSubcategoryKeys(subcategories)
    persistFilters({ categories, subcategories })
  }

  const selectedMap =
    gameInfo?.maps.find((map) => map.image_path) ?? gameInfo?.maps[0]
  const mapSrc = selectedMap?.image_path
    ? apiUrl(`/media/${selectedMap.image_path}`)
    : ""

  const stats = data?.stats
  const overviewCards = STAT_LABELS.filter(
    (stat) => !readOnly || !stat.hideWhenReadOnly,
  )

  useEffect(()=>{gather_info()},[])

  useEffect(() => {
    if (!readOnly || browsingGame || !data?.games?.length) return
    const stored = localStorage.getItem(lastPublicGameStorageKey())
    if (stored && data.games.includes(stored)) {
      void handleGetGameInfo(stored)
    }
  }, [readOnly, browsingGame, data])

  useEffect(() => {
    if (!readOnly || !browsingGame) return
    const filters = loadMapFilters(browsingGame)
    setHiddenCategoryNames(filters.categories)
    setHiddenSubcategoryKeys(filters.subcategories)
  }, [readOnly, browsingGame])

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)")
    const sync = () => {
      if (media.matches) {
        setGamesOpen(false)
        setCategoriesOpen(false)
      } else {
        setGamesOpen(true)
        setCategoriesOpen(true)
      }
    }
    sync()
    media.addEventListener("change", sync)
    return () => media.removeEventListener("change", sync)
  }, [])

  return (
    <div
      className={[
        "ide-shell",
        gamesOpen ? "is-games-open" : "",
        categoriesOpen ? "is-categories-open" : "",
      ].filter(Boolean).join(" ")}
    >
      {gamesOpen && (
        <button
          type="button"
          className="ide-panel-backdrop"
          aria-label="Close games panel"
          onClick={() => setGamesOpen(false)}
        />
      )}
      <GameSidebar
        games={data?.games ?? []}
        browsingGame={browsingGame}
        open={gamesOpen}
        readOnly={readOnly}
        onToggle={toggleGames}
        onSelect={(name) => {
          handleGetGameInfo(name)
          if (isNarrow()) setGamesOpen(false)
        }}
        onAdded={readOnly ? undefined : gather_info}
        onRenamed={
          readOnly
            ? undefined
            : (oldName, newName) => {
                gather_info()
                if (browsingGame === oldName) handleGetGameInfo(newName)
              }
        }
        onDelete={readOnly ? undefined : setGameToDelete}
      />

      <main className="ide-workspace">
        <div className="ide-tabbar">
          {browsingGame ? (
            <>
              <div className="ide-tab">Browsing: {browsingGame}</div>
              {!readOnly && (
                <div className="ide-tabbar-actions">
                  <AddMapWidget
                    compact
                    gameName={browsingGame}
                    existingMap={gameInfo?.maps[0] ?? null}
                    onAdded={() => handleGetGameInfo(browsingGame)}
                  />
                  <button
                    className="add-game-button compact"
                    type="button"
                    onClick={handleTogglePublic}
                    disabled={publishBusy}
                  >
                    {gameInfo?.public ? "Private map" : "Publish"}
                  </button>
                  <a className="add-game-button compact" href="/home" target="blank" rel="noopener noreferrer">
                    Client view
                  </a>
                </div>
              )}
            </>
          ) : (
            <div className="ide-tab">{readOnly ? "Public maps" : "Overview"}</div>
          )}
        </div>

        {browsingGame ? (
          <div className="ide-workspace-body">
              <MapStage
                gameInfo={gameInfo}
                selectedMap={selectedMap}
                mapSrc={mapSrc}
                mapNotice={mapNotice}
                highlightedMarkerId={hoveredMarkerId}
                hiddenCategoryNames={hiddenCategoryNames}
                hiddenSubcategoryKeys={hiddenSubcategoryKeys}
                readOnly={readOnly}
                onMarkerClick={readOnly ? undefined : handleMarkerClick}
                onMarkerEdit={readOnly ? undefined : handleMarkerEdit}
              />
              {categoriesOpen && (
                <button
                  type="button"
                  className="ide-panel-backdrop is-categories"
                  aria-label="Close categories panel"
                  onClick={() => setCategoriesOpen(false)}
                />
              )}
              <CategorySidebar
                gameName={browsingGame}
                categories={gameInfo?.categories ?? []}
                open={categoriesOpen}
                readOnly={readOnly}
                hiddenCategoryNames={hiddenCategoryNames}
                hiddenSubcategoryKeys={hiddenSubcategoryKeys}
                onToggle={toggleCategories}
                onChanged={readOnly ? undefined : () => handleGetGameInfo(browsingGame)}
                onHoverItem={setHoveredMarkerId}
                onToggleCategoryVisible={
                  readOnly ? toggleCategoryVisible : undefined
                }
                onToggleSubcategoryVisible={
                  readOnly ? toggleSubcategoryVisible : undefined
                }
              />
          </div>
        ) : (
          <div className="ide-empty">
            <strong>{readOnly ? "Public maps" : "Workspace overview"}</strong>
            <span>
              {readOnly
                ? "Select a public game from the sidebar to browse it"
                : "Select a game from the sidebar to browse it"}
            </span>
            <div className="ide-overview-grid">
              {overviewCards.map((stat) => (
                <div className="ide-overview-card" key={stat.key}>
                  <span className="ide-overview-value">{stats?.[stat.key] ?? 0}</span>
                  <span className="ide-overview-label">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {!readOnly && publishConfirm && browsingGame && (
        <div className="add-game-overlay" onClick={() => !publishBusy && setPublishConfirm(false)}>
          <div
            className="add-game-window"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-labelledby="publish-map-title"
          >
            <h2 id="publish-map-title">Publish {browsingGame}?</h2>
            <p className="delete-game-warning">
              Everybody will be able to see this map.
            </p>
            <div className="add-game-actions">
              <button
                className="add-game-cancel"
                type="button"
                onClick={() => setPublishConfirm(false)}
                disabled={publishBusy}
              >
                Cancel
              </button>
              <button
                className="add-game-submit"
                type="button"
                onClick={() => setGamePublic(true)}
                disabled={publishBusy}
              >
                Publish
              </button>
            </div>
          </div>
        </div>
      )}
      {!readOnly && gameToDelete && (
        <DeleteGameWidget
          gameName={gameToDelete}
          onClose={() => setGameToDelete(null)}
          onDeleted={handleDeleteGame}
        />
      )}
      {!readOnly && markerClick && browsingGame && (
        <AddMarkerWidget
          gameName={browsingGame}
          categories={gameInfo?.categories ?? []}
          click={markerClick}
          onClose={() => setMarkerClick(null)}
          onAdded={() => handleGetGameInfo(browsingGame)}
        />
      )}
      {!readOnly && markerEdit && browsingGame && (
        <EditMarkerWidget
          key={`${markerEdit.id}-${markerEdit.screenX}-${markerEdit.screenY}`}
          gameName={browsingGame}
          marker={markerEdit}
          onClose={() => setMarkerEdit(null)}
          onSaved={() => handleGetGameInfo(browsingGame)}
        />
      )}
    </div>
  );
}
