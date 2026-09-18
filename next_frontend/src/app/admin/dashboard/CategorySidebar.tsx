"use client";

import { useState } from "react";
import { AddCategoryWidget } from "./AddCategoryWidget";
import { AddItemWidget } from "./AddItemWidget";
import { AddSubcategoryWidget } from "./AddSubcategoryWidget";
import { EditMarkerWidget } from "./EditMarkerWidget";
import { EditNameWidget } from "./EditNameWidget";
import { GameCategory, GameItem } from "./types";
import { apiUrl } from "../api";
import "./add-game.css";

type CategorySidebarProps = {
  gameName: string;
  categories: GameCategory[];
  open?: boolean;
  readOnly?: boolean;
  hiddenCategoryNames?: Set<string>;
  hiddenSubcategoryKeys?: Set<string>;
  onToggle?: () => void;
  onChanged?: () => void;
  onHoverItem?: (id: number | null) => void;
  onToggleCategoryVisible?: (name: string, visible: boolean) => void;
  onToggleSubcategoryVisible?: (key: string, visible: boolean) => void;
};

const EMPTY_HIDDEN = new Set<string>();

function categoryItemCount(category: GameCategory) {
  return category.subcategories.reduce(
    (sum, subcategory) => sum + (subcategory.items?.length ?? 0),
    0,
  );
}

function FilterChip({
  name,
  count,
  iconSrc,
  on,
  expanded,
  onToggle,
  onExpand,
}: {
  name: string;
  count: number;
  iconSrc?: string;
  on: boolean;
  expanded?: boolean;
  onToggle: () => void;
  onExpand?: () => void;
}) {
  return (
    <div className={["map-filter-chip", on ? "is-on" : "is-off"].join(" ")}>
      {onExpand && (
        <button
          type="button"
          className="map-filter-chip-expand"
          aria-expanded={expanded}
          aria-label={`${expanded ? "Collapse" : "Expand"} ${name}`}
          onClick={onExpand}
        >
          <span className={expanded ? "ide-chevron open" : "ide-chevron"}>▸</span>
        </button>
      )}
      <button
        type="button"
        className="map-filter-chip-body"
        aria-pressed={on}
        onClick={onToggle}
      >
        {iconSrc ? (
          <img className="map-filter-chip-icon" src={iconSrc} alt="" />
        ) : null}
        <span className="map-filter-chip-name">{name}</span>
        <span className="map-filter-chip-count">{count}</span>
      </button>
    </div>
  );
}

type PendingDelete =
  | { kind: "category"; name: string }
  | { kind: "subcategory"; categoryName: string; name: string };

async function renameRequest(
  url: string,
  body: Record<string, string>,
  iconFile: File | null,
  clearIcon = false,
): Promise<string | null> {
  const formData = new FormData();

  iconFile && formData.append("icon", iconFile);
  if (clearIcon) formData.append("clearIcon", "true");
  formData.append("gameName", body.gameName);
  formData.append("categoryName", body.categoryName);
  formData.append("name", body.name);
  formData.append("newName", body.newName);

  const response = await fetch(url, {
    method: "PATCH",
    // headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: formData,
  });

  if (response.ok) return null;
  const data = await response.json().catch(() => null);
  return data?.message ?? "Could not rename";
}

async function deleteRequest(
  url: string,
  body: Record<string, string | number>,
): Promise<string | null> {
  const response = await fetch(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (response.ok) return null;
  const data = await response.json().catch(() => null);
  return data?.message ?? "Could not delete";
}

function DeleteButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="ide-game-delete"
      aria-label={label}
      onClick={onClick}
    >
      ×
    </button>
  );
}

export function CategorySidebar({
  gameName,
  categories,
  open = true,
  readOnly = false,
  hiddenCategoryNames = EMPTY_HIDDEN,
  hiddenSubcategoryKeys = EMPTY_HIDDEN,
  onToggle,
  onChanged,
  onHoverItem,
  onToggleCategoryVisible,
  onToggleSubcategoryVisible,
}: CategorySidebarProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<GameItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const toggleSubcategory = (key: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleCategory = (name: string) => {
    setCollapsedCategories((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const closeDelete = () => {
    if (deleteBusy) return;
    setPendingDelete(null);
    setDeleteError("");
  };

  const confirmDelete = async () => {
    if (!pendingDelete || deleteBusy) return;
    setDeleteError("");
    setDeleteBusy(true);

    let message: string | null = null;
    if (pendingDelete.kind === "category") {
      message = await deleteRequest(apiUrl("/blog/ManageCategories"), {
        gameName,
        name: pendingDelete.name,
      });
    } else {
      message = await deleteRequest(
        apiUrl("/blog/ManageSubCategories"),
        {
          gameName,
          categoryName: pendingDelete.categoryName,
          name: pendingDelete.name,
        },
      );
    }

    if (message) {
      setDeleteError(message);
      setDeleteBusy(false);
      return;
    }

    setPendingDelete(null);
    setDeleteBusy(false);
    onChanged?.();
  };

  const deleteItem = async (id: number) => {
    const message = await deleteRequest(apiUrl("/blog/ManageItems"), {
      gameName,
      id,
    });
    if (!message) onChanged?.();
  };

  const deleteTitle =
    pendingDelete?.kind === "category"
      ? `Delete ${pendingDelete.name}?`
      : pendingDelete
        ? `Delete ${pendingDelete.name}?`
        : "";

  const deleteWarning =
    pendingDelete?.kind === "category"
      ? `This will permanently delete ${pendingDelete.name} and all of its subcategories and items.`
      : pendingDelete
        ? `This will permanently delete ${pendingDelete.name} and all of its items.`
        : "";

  return (
    <aside className="ide-right-sidebar">
      <div className="ide-sidebar-body">
      <div className="ide-sidebar-header">
        <span className="ide-sidebar-title">CATEGORIES</span>
        {!readOnly && onChanged && (
          <AddCategoryWidget compact gameName={gameName} onAdded={onChanged} />
        )}
      </div>

      <div className="ide-category-list">
        {categories.length ? (
          categories.map((category) => {
            const categoryOpen = !collapsedCategories.has(category.name);

            return (
            <div className="ide-category-group" key={category.name}>
              <div className={["ide-category-row", readOnly ? "is-filter" : ""].filter(Boolean).join(" ")}>
                {readOnly && onToggleCategoryVisible ? (
                  <FilterChip
                    name={category.name}
                    count={categoryItemCount(category)}
                    on={!hiddenCategoryNames.has(category.name)}
                    expanded={categoryOpen}
                    onExpand={() => toggleCategory(category.name)}
                    onToggle={() =>
                      onToggleCategoryVisible(
                        category.name,
                        hiddenCategoryNames.has(category.name),
                      )
                    }
                  />
                ) : (
                  <>
                    <button
                      type="button"
                      className="ide-subcategory-toggle is-chevron-only"
                      aria-expanded={categoryOpen}
                      aria-label={`${categoryOpen ? "Collapse" : "Expand"} ${category.name}`}
                      onClick={() => toggleCategory(category.name)}
                    >
                      <span className={categoryOpen ? "ide-chevron open" : "ide-chevron"}>
                        ▸
                      </span>
                    </button>
                    <span className="ide-category-name">{category.name}</span>
                  </>
                )}
                <div className="ide-row-actions">
                  {!readOnly && onChanged && (
                    <>
                  <EditNameWidget
                    title="Rename category"
                    label="Category name"
                    currentName={category.name}
                    ariaLabel={`Rename ${category.name}`}
                    onSave={(newName) =>
                      renameRequest(
                        apiUrl("/blog/ManageCategories"),
                        {
                          gameName,
                          name: category.name,
                          newName,
                        },
                        null,
                      )
                    }
                    onRenamed={onChanged}
                  />
                  <AddSubcategoryWidget
                    gameName={gameName}
                    categoryName={category.name}
                    onAdded={onChanged}
                  />
                  <DeleteButton
                    label={`Delete ${category.name}`}
                    onClick={() =>
                      setPendingDelete({ kind: "category", name: category.name })
                    }
                  />
                    </>
                  )}
                </div>
              </div>

              {categoryOpen && category.subcategories.map((subcategory) => {
                const key = `${category.name}::${subcategory.name}`;
                const isOpen = expanded.has(key);
                const items = subcategory.items ?? [];
                const categoryVisible = !hiddenCategoryNames.has(category.name);
                const isVisible = categoryVisible && !hiddenSubcategoryKeys.has(key);
                const iconSrc = subcategory.default_icon
                  ? apiUrl(`/media/${gameName}/icons/${subcategory.default_icon}`)
                  : undefined;

                return (
                  <div key={subcategory.name}>
                    <div
                      className={[
                        "ide-subcategory-row",
                        readOnly ? "is-filter" : "",
                        isVisible ? "" : "is-filtered",
                      ].filter(Boolean).join(" ")}
                    >
                      {readOnly && onToggleSubcategoryVisible ? (
                        <FilterChip
                          name={subcategory.name}
                          count={items.length}
                          iconSrc={iconSrc}
                          on={categoryVisible && !hiddenSubcategoryKeys.has(key)}
                          expanded={isOpen}
                          onExpand={() => toggleSubcategory(key)}
                          onToggle={() =>
                            onToggleSubcategoryVisible(
                              key,
                              hiddenSubcategoryKeys.has(key),
                            )
                          }
                        />
                      ) : (
                        <button
                          type="button"
                          className="ide-subcategory-toggle"
                          aria-expanded={isOpen}
                          onClick={() => toggleSubcategory(key)}
                        >
                          <span className={isOpen ? "ide-chevron open" : "ide-chevron"}>
                            ▸
                          </span>
                          <span className="ide-subcategory-name">
                            {subcategory.default_icon && (
                              <img
                                className="ide-subcategory-icon"
                                src={apiUrl(`/media/${gameName}/icons/${subcategory.default_icon}`)}
                                alt=""
                              />
                            )}
                            <span className="ide-subcategory-label">{subcategory.name}</span>
                          </span>
                        </button>
                      )}
                      <div className="ide-row-actions">
                        {!readOnly && onChanged && (
                          <>
                        <EditNameWidget
                          title="Rename subcategory"
                          label="Subcategory name"
                          currentName={subcategory.name}
                          ariaLabel={`Rename ${subcategory.name}`}
                          showIconInput
                          onSave={(newName, iconFile, clearIcon) =>
                            renameRequest(
                              apiUrl("/blog/ManageSubCategories"),
                              {
                                gameName,
                                categoryName: category.name,
                                name: subcategory.name,
                                newName,
                              },
                              iconFile,
                              clearIcon,
                            )
                          }
                          onRenamed={onChanged}
                        />
                        <AddItemWidget
                          gameName={gameName}
                          categoryName={category.name}
                          subcategoryName={subcategory.name}
                          onAdded={onChanged}
                        />
                        <DeleteButton
                          label={`Delete ${subcategory.name}`}
                          onClick={() =>
                            setPendingDelete({
                              kind: "subcategory",
                              categoryName: category.name,
                              name: subcategory.name,
                            })
                          }
                        />
                          </>
                        )}
                      </div>
                    </div>

                    {isOpen &&
                      (items.length ? (
                        items.map((item) => (
                          <div
                            className="ide-item-row"
                            key={item.id}
                            onMouseEnter={() => onHoverItem?.(item.id)}
                            onMouseLeave={() => onHoverItem?.(null)}
                          >
                            <span className="ide-item-name">
                              {(item.icon || subcategory.default_icon) && (
                                <img
                                  className="ide-subcategory-icon"
                                  src={apiUrl(`/media/${gameName}/icons/${item.icon || subcategory.default_icon}`)}
                                  alt=""
                                />
                              )}
                              <span className="ide-item-label">{item.name}</span>
                            </span>
                            <div className="ide-row-actions">
                              {!readOnly && (
                                <>
                              <button
                                className="ide-row-edit"
                                type="button"
                                aria-label={`Edit ${item.name}`}
                                onClick={() => setEditingItem(item)}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                                  <path
                                    fill="currentColor"
                                    d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                                  />
                                </svg>
                              </button>
                              <DeleteButton
                                label={`Delete ${item.name}`}
                                onClick={() => deleteItem(item.id)}
                              />
                                </>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="ide-item-empty">No items</div>
                      ))}
                  </div>
                );
              })}
            </div>
            );
          })
        ) : (
          <div className="ide-category-empty">No categories yet</div>
        )}
      </div>

      {!readOnly && editingItem && (
        <EditMarkerWidget
          gameName={gameName}
          marker={{
            id: editingItem.id,
            name: editingItem.name,
            x: editingItem.x,
            y: editingItem.y,
          }}
          startAtDetails
          onClose={() => setEditingItem(null)}
          onSaved={() => {
            setEditingItem(null);
            onChanged?.();
          }}
        />
      )}
      {!readOnly && pendingDelete && (
        <div className="add-game-overlay" onClick={closeDelete}>
          <div
            className="add-game-window"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-labelledby="delete-sidebar-title"
          >
            <h2 id="delete-sidebar-title">{deleteTitle}</h2>
            <p className="delete-game-warning">{deleteWarning}</p>
            <div className="add-game-error">{deleteError}</div>
            <div className="add-game-actions">
              <button
                className="add-game-cancel"
                type="button"
                onClick={closeDelete}
                disabled={deleteBusy}
              >
                Cancel
              </button>
              <button
                className="add-game-submit danger"
                type="button"
                onClick={confirmDelete}
                disabled={deleteBusy}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
      {onToggle && (
        <button
          type="button"
          className="ide-panel-arrow"
          aria-label={open ? "Hide categories" : "Show categories"}
          aria-pressed={open}
          onClick={onToggle}
        >
          <span className={open ? "ide-panel-caret is-right" : "ide-panel-caret is-left"} />
        </button>
      )}
    </aside>
  );
}
