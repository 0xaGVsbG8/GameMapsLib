"use client";

import { useState } from "react";
import { AddCategoryWidget } from "./AddCategoryWidget";
import { AddSubcategoryWidget } from "./AddSubcategoryWidget";
import { EditNameWidget } from "./EditNameWidget";
import { GameCategory } from "./types";

type CategorySidebarProps = {
  gameName: string;
  categories: GameCategory[];
  onChanged: () => void;
};

async function renameRequest(
  url: string,
  body: Record<string, string>,
): Promise<string | null> {
  const response = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (response.ok) return null;
  const data = await response.json().catch(() => null);
  return data?.message ?? "Could not rename";
}

export function CategorySidebar({
  gameName,
  categories,
  onChanged,
}: CategorySidebarProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleSubcategory = (key: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <aside className="ide-right-sidebar">
      <div className="ide-sidebar-header">
        <span className="ide-sidebar-title">CATEGORIES</span>
        <AddCategoryWidget compact gameName={gameName} onAdded={onChanged} />
      </div>

      <div className="ide-category-list">
        {categories.length ? (
          categories.map((category) => (
            <div className="ide-category-group" key={category.name}>
              <div className="ide-category-row">
                <span className="ide-category-name">{category.name}</span>
                <div className="ide-row-actions">
                  <EditNameWidget
                    title="Rename category"
                    label="Category name"
                    currentName={category.name}
                    ariaLabel={`Rename ${category.name}`}
                    onSave={(newName) =>
                      renameRequest("http://localhost:8000/blog/ManageCategories", {
                        gameName,
                        name: category.name,
                        newName,
                      })
                    }
                    onRenamed={onChanged}
                  />
                  <AddSubcategoryWidget
                    gameName={gameName}
                    categoryName={category.name}
                    onAdded={onChanged}
                  />
                </div>
              </div>

              {category.subcategories.map((subcategory) => {
                const key = `${category.name}::${subcategory.name}`;
                const isOpen = expanded.has(key);
                const items = subcategory.items ?? [];

                return (
                  <div key={subcategory.name}>
                    <div className="ide-subcategory-row">
                      <button
                        type="button"
                        className="ide-subcategory-toggle"
                        aria-expanded={isOpen}
                        onClick={() => toggleSubcategory(key)}
                      >
                        <span className={isOpen ? "ide-chevron open" : "ide-chevron"}>
                          ▸
                        </span>
                        <span className="ide-subcategory-name">{subcategory.name}</span>
                      </button>
                      <div className="ide-row-actions">
                        <EditNameWidget
                          title="Rename subcategory"
                          label="Subcategory name"
                          currentName={subcategory.name}
                          ariaLabel={`Rename ${subcategory.name}`}
                          onSave={(newName) =>
                            renameRequest(
                              "http://localhost:8000/blog/ManageSubCategories",
                              {
                                gameName,
                                categoryName: category.name,
                                name: subcategory.name,
                                newName,
                              },
                            )
                          }
                          onRenamed={onChanged}
                        />
                      </div>
                    </div>

                    {isOpen &&
                      (items.length ? (
                        items.map((item) => (
                          <div className="ide-item-row" key={item.id}>
                            {item.name}
                          </div>
                        ))
                      ) : (
                        <div className="ide-item-empty">No items</div>
                      ))}
                  </div>
                );
              })}
            </div>
          ))
        ) : (
          <div className="ide-category-empty">No categories yet</div>
        )}
      </div>
    </aside>
  );
}
