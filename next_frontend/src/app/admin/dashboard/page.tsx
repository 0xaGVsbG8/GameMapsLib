'use client'
import { useCallback, useEffect, useState } from "react";
import { AddMapWidget } from "./AddMapWidget";
import { AddMarkerWidget, MarkerClick } from "./AddMarkerWidget";
import { CategorySidebar } from "./CategorySidebar";
import { DeleteGameWidget } from "./DeleteGameWidget";
import { EditMarkerWidget, MarkerEdit } from "./EditMarkerWidget";
import { GameSidebar } from "./GameSidebar";
import { MapStage } from "./MapStage";
import { GameInfo, info_type } from "./types";
import { apiUrl } from "../api";
import "./add-game.css";
import "./dashboard.css";

export default function AdminDashboardPage() {
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
  const [gamesOpen, setGamesOpen] = useState(true)
  const [categoriesOpen, setCategoriesOpen] = useState(true)

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
    const response = await fetch(apiUrl("/blog/getGlobalInfo"),{
      method:'GET',
      credentials: 'include'
    })
    const data = await response.json() as info_type
    setData(data)
  }

  const handleGetGameInfo = async(name: string) => {
    setBrowsingGame(name)
    const response = await fetch(apiUrl(`/blog/getGameInfo?GameName=${encodeURIComponent(name)}`),{
      method:'GET',
      credentials: 'include'
    })
    const info = await response.json() as GameInfo
    if(info.map=='not exists'){
      setMapNotice("map not uploaded yet")
    } else {
      setMapNotice("")
    }
    setGameInfo(info)
    console.log(info)
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
    if (!browsingGame || !gameInfo) return
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
    if (!browsingGame || !gameInfo) return
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

  const selectedMap =
    gameInfo?.maps.find((map) => map.image_path) ?? gameInfo?.maps[0]
  const mapSrc = selectedMap?.image_path
    ? selectedMap.image_url || apiUrl(`/media/${selectedMap.image_path}`)
    : ""

  useEffect(()=>{gather_info()},[])

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
        onSelect={(name) => {
          handleGetGameInfo(name)
          if (isNarrow()) setGamesOpen(false)
        }}
        onAdded={gather_info}
        onRenamed={(oldName, newName) => {
          gather_info()
          if (browsingGame === oldName) handleGetGameInfo(newName)
        }}
        onDelete={setGameToDelete}
      />

      <main className="ide-workspace">
        <div className="ide-tabbar">
          <div className="ide-panel-toggles">
            <button
              type="button"
              className={gamesOpen ? "ide-panel-toggle is-active" : "ide-panel-toggle"}
              aria-pressed={gamesOpen}
              onClick={toggleGames}
            >
              Games
            </button>
            {browsingGame && (
              <button
                type="button"
                className={categoriesOpen ? "ide-panel-toggle is-active" : "ide-panel-toggle"}
                aria-pressed={categoriesOpen}
                onClick={toggleCategories}
              >
                Categories
              </button>
            )}
          </div>
          {browsingGame ? (
            <>
              <div className="ide-tab">Browsing: {browsingGame}</div>
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
                <a className="add-game-button compact" href="/home">
                  Client view
                </a>
              </div>
            </>
          ) : (
            <div className="ide-tab">No game selected</div>
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
                onMarkerClick={handleMarkerClick}
                onMarkerEdit={handleMarkerEdit}
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
                onChanged={() => handleGetGameInfo(browsingGame)}
                onHoverItem={setHoveredMarkerId}
              />
          </div>
        ) : (
          <div className="ide-empty">
            <strong>No game selected</strong>
            <span>Select a game from the sidebar to browse it</span>
          </div>
        )}
      </main>

      {publishConfirm && browsingGame && (
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
      {gameToDelete && (
        <DeleteGameWidget
          gameName={gameToDelete}
          onClose={() => setGameToDelete(null)}
          onDeleted={handleDeleteGame}
        />
      )}
      {markerClick && browsingGame && (
        <AddMarkerWidget
          gameName={browsingGame}
          categories={gameInfo?.categories ?? []}
          click={markerClick}
          onClose={() => setMarkerClick(null)}
          onAdded={() => handleGetGameInfo(browsingGame)}
        />
      )}
      {markerEdit && browsingGame && (
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
