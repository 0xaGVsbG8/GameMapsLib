'use client'
import { useEffect, useRef, useState } from "react";
import { AddGameWidget } from "./AddGameWidget";
import { AddMapWidget } from "./AddMapWidget";
import { AddMarkerWidget, MarkerClick } from "./AddMarkerWidget";
import { CategorySidebar } from "./CategorySidebar";
import { DeleteGameWidget } from "./DeleteGameWidget";
import { EditNameWidget } from "./EditNameWidget";
import { GameInfo, info_type } from "./types";
import "./add-game.css";
import "./dashboard.css";

const zoom_by = 0.2
const min_zoom = 0.25
const max_zoom = 4

function getMapPoint(
  event: MouseEvent,
  image: HTMLImageElement,
  gameInfo: GameInfo | null,
) {
  const rect = image.getBoundingClientRect()
  const naturalWidth = image.naturalWidth
  const naturalHeight = image.naturalHeight
  if (!naturalWidth || !naturalHeight || !rect.width || !rect.height) {
    return null
  }

  const scale = Math.min(rect.width / naturalWidth, rect.height / naturalHeight)
  const renderedWidth = naturalWidth * scale
  const renderedHeight = naturalHeight * scale
  const offsetX = (rect.width - renderedWidth) / 2
  const offsetY = (rect.height - renderedHeight) / 2
  const displayX = event.clientX - rect.left - offsetX
  const displayY = event.clientY - rect.top - offsetY

  if (
    displayX < 0 ||
    displayY < 0 ||
    displayX > renderedWidth ||
    displayY > renderedHeight
  ) {
    return null
  }

  let finalX = Math.round(displayX * (naturalWidth / renderedWidth))
  let finalY = Math.round(displayY * (naturalHeight / renderedHeight))

  const ORIGIN_X = gameInfo?.maps[0].origin_x
  const ORIGIN_Y = gameInfo?.maps[0].origin_y
  const UNITSCALE = gameInfo?.maps[0].pixels_per_unit

  if (ORIGIN_X && ORIGIN_Y && UNITSCALE) {
    const imagex = Math.round(displayX * (naturalWidth / renderedWidth))
    const imagey = Math.round(displayY * (naturalHeight / renderedHeight))
    const diffx = imagex - ORIGIN_X
    const diffy = ORIGIN_Y - imagey
    finalX = Math.round((diffx / UNITSCALE) * 100) / 100
    finalY = Math.round((diffy / UNITSCALE) * 100) / 100
  }

  return { x: finalX, y: finalY, displayX, displayY }
}

export default function AdminDashboardPage() {

  const [data, setData] = useState<info_type>()
  const [browsingGame, setBrowsingGame] = useState<string | null>(null)
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null)
  const [mapNotice, setMapNotice] = useState("")
  const [gameToDelete, setGameToDelete] = useState<string | null>(null)
  const [markerClick, setMarkerClick] = useState<MarkerClick | null>(null)
  const mapRef = useRef<HTMLImageElement>(null)
  const coordXRef = useRef<HTMLSpanElement>(null)
  const coordYRef = useRef<HTMLSpanElement>(null)
  const currentImgzoom = useRef<number>(1)
  const proccessedCORDS = useRef<{x: number,y:number}>({x:0,y:0}) //migth delete

  const isTogglingMouse = useRef<boolean>(false)
  const panRef = useRef({ x: 0, y: 0 })
  const lastPointerRef = useRef({ x: 0, y: 0 })



  const gather_info = async() => {
    const response = await fetch("http://localhost:8000/blog/getGlobalInfo",{
      method:'GET',
      credentials: 'include'
    })
    const data = await response.json() as info_type
    console.log(data)
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

  const selectedMap =
    gameInfo?.maps.find((map) => map.image_path) ?? gameInfo?.maps[0]
  const mapSrc = selectedMap?.image_path
    ? selectedMap.image_url || `http://localhost:8000/media/${selectedMap.image_path}`
    : ""

  useEffect(()=>{gather_info()},[])

  useEffect(() => {
    const image = mapRef.current
    const setLabels = (point: { x: number; y: number } | null) => {
      if (coordXRef.current) coordXRef.current.textContent = point ? String(point.x) : "—"
      if (coordYRef.current) coordYRef.current.textContent = point ? String(point.y) : "—"
    }

    setLabels(null)
    if (!image) return

    const toPixels = (event: MouseEvent) => {
      const point = getMapPoint(event, image, gameInfo)
      if (!point) return null
      proccessedCORDS.current = { x: point.displayX, y: point.y }
      return { x: point.x, y: point.y }
    }

    const onMove = (event: MouseEvent) => {
      setLabels(toPixels(event))
    }
    const onLeave = () => setLabels(null)

    image.addEventListener("mousemove", onMove)
    image.addEventListener("mouseleave", onLeave)
    return () => {
      image.removeEventListener("mousemove", onMove)
      image.removeEventListener("mouseleave", onLeave)
    }
  }, [mapSrc])


  useEffect(() => {
    const image = mapRef.current
    if (!image) return

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault()
      const point = getMapPoint(event, image, gameInfo)
      if (!point) {
        setMarkerClick(null)
        return
      }
      setMarkerClick({
        screenX: event.clientX,
        screenY: event.clientY,
        mapX: point.x,
        mapY: point.y,
      })
    }

    image.addEventListener("contextmenu", onContextMenu)
    return () => {
      image.removeEventListener("contextmenu", onContextMenu)
    }
  }, [mapSrc, gameInfo])



  useEffect(() => {
    const image = mapRef.current
    if (!image) return

    panRef.current = { x: 0, y: 0 }
    currentImgzoom.current = 1
    isTogglingMouse.current = false

    const applyTransform = () => {
      image.style.transform = `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${currentImgzoom.current})`
    }
    applyTransform()

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      event.preventDefault()
      isTogglingMouse.current = true
      lastPointerRef.current = { x: event.clientX, y: event.clientY }
      image.classList.add("is-panning")
      image.setPointerCapture(event.pointerId)
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!isTogglingMouse.current) return
      panRef.current = {
        x: panRef.current.x + event.clientX - lastPointerRef.current.x,
        y: panRef.current.y + event.clientY - lastPointerRef.current.y,
      }
      lastPointerRef.current = { x: event.clientX, y: event.clientY }
      applyTransform()
    }

    const onPointerUp = (event: PointerEvent) => {
      isTogglingMouse.current = false
      image.classList.remove("is-panning")
      if (image.hasPointerCapture(event.pointerId)) {
        image.releasePointerCapture(event.pointerId)
      }
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const oldZoom = currentImgzoom.current
      const nextZoom = event.deltaY < 0 ? oldZoom + zoom_by : oldZoom - zoom_by
      const newZoom = Math.min(max_zoom, Math.max(min_zoom, nextZoom))
      if (newZoom === oldZoom) return

      // const rect = image.getBoundingClientRect()
      // const ratio = newZoom / oldZoom
      // panRef.current = {
      //   x: panRef.current.x + (event.clientX - (rect.left + rect.width / 2)) * (1 - ratio),
      //   y: panRef.current.y + (event.clientY - (rect.top + rect.height / 2)) * (1 - ratio),
      // }
      currentImgzoom.current = newZoom
      applyTransform()
    }

    const onDragStart = (event: DragEvent) => {
      event.preventDefault()
    }

    image.addEventListener("pointerdown", onPointerDown)
    image.addEventListener("pointermove", onPointerMove)
    image.addEventListener("pointerup", onPointerUp)
    image.addEventListener("pointercancel", onPointerUp)
    image.addEventListener("wheel", onWheel, { passive: false })
    image.addEventListener("dragstart", onDragStart)
    return () => {
      image.classList.remove("is-panning")
      image.removeEventListener("pointerdown", onPointerDown)
      image.removeEventListener("pointermove", onPointerMove)
      image.removeEventListener("pointerup", onPointerUp)
      image.removeEventListener("pointercancel", onPointerUp)
      image.removeEventListener("wheel", onWheel)
      image.removeEventListener("dragstart", onDragStart)
    }
  }, [mapSrc])

    return (
      <div className="ide-shell">
        <aside className="ide-sidebar">
          <div className="ide-sidebar-header">
            <span className="ide-sidebar-title">GAMES</span>
            <AddGameWidget compact onAdded={gather_info} />
          </div>

          <nav className="ide-game-list">
            {data?.games.map((game) => (
              <div
                id={game+'xd'}
                key={game}
                className={browsingGame === game ? "ide-game-row active" : "ide-game-row"}
              >
                <button
                  type="button"
                  className="ide-game-item"
                  onClick={()=>handleGetGameInfo(game)}
                >
                  {game}
                </button>
                <div className="ide-row-actions">
                  <EditNameWidget
                    title="Rename game"
                    label="Game name"
                    currentName={game}
                    ariaLabel={`Rename ${game}`}
                    onSave={async (newName) => {
                      const response = await fetch("http://localhost:8000/blog/ManageGames", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ name: game, newName }),
                      })
                      if (response.ok) return null
                      const data = await response.json().catch(() => null)
                      return data?.message ?? "Could not rename game"
                    }}
                    onRenamed={(newName) => {
                      gather_info()
                      if (browsingGame === game) handleGetGameInfo(newName)
                    }}
                  />
                  <button
                    type="button"
                    className="ide-game-delete"
                    aria-label={`Delete ${game}`}
                    onClick={() => setGameToDelete(game)}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </nav>
        </aside>

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
                  <a className="add-game-button compact" href="/home">
                    Client view
                  </a>
                </div>
              </div>

              <div className="ide-workspace-body">
                <div className="ide-map-stage">
                  {mapSrc ? (
                    <>
                      <img
                        id="map"
                        ref={mapRef}
                        src={mapSrc}
                        alt={selectedMap?.Map_name}
                        width={selectedMap?.width}
                        height={selectedMap?.height}
                        draggable={false}
                      />
                      <div className="map-coord-widget">
                        <span>X <span ref={coordXRef}>—</span></span>
                        <span>Y <span ref={coordYRef}>—</span></span>
                      </div>
                    </>
                  ) : (
                    <div className="map-notice">
                      {mapNotice || "map not uploaded yet"}
                    </div>
                  )}
                </div>

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
