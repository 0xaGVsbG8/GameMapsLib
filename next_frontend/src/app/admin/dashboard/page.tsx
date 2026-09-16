'use client'
import { useCallback, useEffect, useState } from "react";
import { AddMapWidget } from "./AddMapWidget";
import { AddMarkerWidget, MarkerClick } from "./AddMarkerWidget";
import { CategorySidebar } from "./CategorySidebar";
import { DeleteGameWidget } from "./DeleteGameWidget";
import { GameSidebar } from "./GameSidebar";
import { MapStage } from "./MapStage";
import { GameInfo, info_type } from "./types";
import "./add-game.css";
import "./dashboard.css";

export default function AdminDashboardPage() {
  const [data, setData] = useState<info_type>()
  const [browsingGame, setBrowsingGame] = useState<string | null>(null)
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null)
  const [mapNotice, setMapNotice] = useState("")
  const [gameToDelete, setGameToDelete] = useState<string | null>(null)
  const [markerClick, setMarkerClick] = useState<MarkerClick | null>(null)

  const gather_info = async() => {
    const response = await fetch("http://localhost:8000/blog/getGlobalInfo",{
      method:'GET',
      credentials: 'include'
    })
    const data = await response.json() as info_type
    setData(data)
  }

  const handleGetGameInfo = async(name: string) => {
    setBrowsingGame(name)
    const response = await fetch(`http://localhost:8000/blog/getGameInfo?GameName=${encodeURIComponent(name)}`,{
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

  const handleTogglePublic = async () => {
    if (!browsingGame || !gameInfo) return
    const nextPublic = !gameInfo.public
    const response = await fetch("http://localhost:8000/blog/ManageGames", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: browsingGame, public: nextPublic }),
    })
    if (!response.ok) return
    setGameInfo({ ...gameInfo, public: nextPublic })
  }

  const handleMarkerClick = useCallback((click: MarkerClick) => {
    setMarkerClick(click)
  }, [])

  const selectedMap =
    gameInfo?.maps.find((map) => map.image_path) ?? gameInfo?.maps[0]
  const mapSrc = selectedMap?.image_path
    ? selectedMap.image_url || `http://localhost:8000/media/${selectedMap.image_path}`
    : ""

  useEffect(()=>{gather_info()},[])

  return (
    <div className="ide-shell">
      <GameSidebar
        games={data?.games ?? []}
        browsingGame={browsingGame}
        onSelect={handleGetGameInfo}
        onAdded={gather_info}
        onRenamed={(oldName, newName) => {
          gather_info()
          if (browsingGame === oldName) handleGetGameInfo(newName)
        }}
        onDelete={setGameToDelete}
      />

      <main className="ide-workspace">
        {browsingGame ? (
          <>
            <div className="ide-tabbar">
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
                >
                  {gameInfo?.public ? "Private map" : "Publish"}
                </button>
                <a className="add-game-button compact" href="/home">
                  Client view
                </a>
              </div>
            </div>

            <div className="ide-workspace-body">
              <MapStage
                gameInfo={gameInfo}
                selectedMap={selectedMap}
                mapSrc={mapSrc}
                mapNotice={mapNotice}
                onMarkerClick={handleMarkerClick}
              />
              <CategorySidebar
                gameName={browsingGame}
                categories={gameInfo?.categories ?? []}
                onChanged={() => handleGetGameInfo(browsingGame)}
              />
            </div>
          </>
        ) : (
          <div className="ide-empty">
            <strong>No game selected</strong>
            <span>Select a game from the sidebar to browse it</span>
          </div>
        )}
      </main>

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
    </div>
  );
}
