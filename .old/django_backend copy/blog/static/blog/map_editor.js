(() => {
  const root = document.getElementById("map-editor");
  if (!root) return;

  const dataNode = document.getElementById("map-data");
  const urlsNode = document.getElementById("editor-urls");
  const statusNode = document.getElementById("editor-status");
  const categoryList = document.getElementById("category-list");
  const markerLayer = document.getElementById("marker-layer");
  const mapImage = document.getElementById("map-image");
  const viewport = document.getElementById("map-viewport");
  const stage = document.getElementById("map-stage");
  const inspectorEmpty = document.getElementById("inspector-empty");
  const markerForm = document.getElementById("marker-form");
  const markerNameInput = document.getElementById("marker-name");
  const markerCoords = document.getElementById("marker-coords");

  let data = JSON.parse(dataNode.textContent);
  const urls = JSON.parse(urlsNode.textContent);
  const csrf = root.dataset.csrf;
  let selectedItemPk = data.categories[0]?.items[0]?.pk ?? null;
  let selectedMarkerPk = null;
  let camera = { x: 24, y: 24, scale: 0.62 };
  let draggingPin = null;
  let panning = null;

  const ICONS = {
    travel: "M12 3l1.2 5.2L18 10l-4.8 1.8L12 17l-1.2-5.2L6 10l4.8-1.8z",
    tower: "M12 2L8 6v3h8V6l-4-4zM7 10v10h3v-4h4v4h3V10H7z",
    alpha: "M12 3a9 9 0 100 18 9 9 0 000-18zm0 5a4 4 0 110 8 4 4 0 010-8z",
    dungeon: "M4 10v11h6v-5h4v5h6V10L12 4 4 10z",
    chest: "M3 8h18v3h-7v2h7v7H3v-7h7v-2H3V8zm8 0V5h2v3h-2z",
    element: "M12 2L4 12h5l-2 10 11-12h-6L12 2z",
    fruit: "M12 4c2 0 3-2 3-2s.2 2.4 2 3.4C19 6.8 21 9.2 21 13c0 4.4-3.6 8-9 8s-9-3.6-9-8c0-3.8 2-6.2 4-7.6C8.8 4.4 9 2 9 2s1 2 3 2z",
    note: "M6 3h9l5 5v13H6V3zm8 1.5V9h4.5L14 4.5z",
    "statue-alt": "M12 3a3 3 0 110 6 3 3 0 010-6zM7 21v-2l3-3V11h4v5l3 3v2H7z",
    grace: "M12 2l1.6 6H20l-5.2 3.8L16.5 18 12 14.4 7.5 18l1.7-6.2L4 8h6.4L12 2z",
    boss: "M7 4h10l3 5-8 12L4 9l3-5z",
    merchant: "M4 7h16l-1.5 11h-13L4 7zm4-3h8l1 3H7l1-3z",
    seed: "M12 3c4 3 6 7 6 10a6 6 0 11-12 0c0-3 2-7 6-10z",
    tear: "M12 3c3.5 5 6 8.2 6 11.2a6 6 0 11-12 0C6 11.2 8.5 8 12 3z",
  };

  function iconSvg(name) {
    const path = ICONS[name] || ICONS.travel;
    return `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="${path}"></path></svg>`;
  }

  function withPk(template, pk) {
    return template.replace("{pk}", pk);
  }

  function showStatus(message, isError = false) {
    statusNode.hidden = !message;
    statusNode.textContent = message;
    statusNode.classList.toggle("is-error", Boolean(isError));
  }

  async function request(url, options = {}) {
    const headers = { "X-CSRFToken": csrf, ...(options.headers || {}) };
    if (options.json) {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(options.json);
    }
    const response = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body,
      credentials: "same-origin",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Request failed.");
    }
    return payload;
  }

  function applyData(next) {
    data = next.map || next;
    if (selectedItemPk && !findItem(selectedItemPk)) {
      selectedItemPk = data.categories[0]?.items[0]?.pk ?? null;
    }
    if (selectedMarkerPk && !findMarker(selectedMarkerPk)) {
      selectedMarkerPk = null;
    }
    render();
  }

  function findItem(pk) {
    for (const category of data.categories) {
      const item = category.items.find((entry) => entry.pk === pk);
      if (item) return item;
    }
    return null;
  }

  function findMarker(pk) {
    for (const category of data.categories) {
      for (const item of category.items) {
        const marker = item.markers.find((entry) => entry.pk === pk);
        if (marker) return { marker, item };
      }
    }
    return null;
  }

  function applyCamera() {
    stage.style.transform = `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`;
  }

  function percentFromEvent(event) {
    const rect = mapImage.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100)),
    };
  }

  function render() {
    mapImage.src = data.image || "";
    viewport.classList.toggle("is-placing", Boolean(selectedItemPk));
    categoryList.innerHTML = data.categories
      .map((category) => {
        const items = category.items
          .map((item) => {
            const selected = item.pk === selectedItemPk ? " is-selected" : "";
            return `<button type="button" class="item-row${selected}" data-select-item="${item.pk}">
              ${iconSvg(item.icon)}
              <span>${item.name}</span>
              <small>${item.markers.length}</small>
              <span class="tiny-btn" data-delete-item="${item.pk}" title="Remove item">×</span>
            </button>`;
          })
          .join("");
        return `<section class="category-block" data-category="${category.pk}">
          <div class="category-head">
            <input value="${escapeHtml(category.name)}" data-rename-category="${category.pk}">
            <button type="button" class="tiny-btn" data-delete-category="${category.pk}">Remove</button>
          </div>
          ${items}
          <form class="item-form" data-item-form="${category.pk}">
            <input name="name" type="text" placeholder="New item" required>
            <select name="icon">${(data.icons || Object.keys(ICONS))
              .map((icon) => `<option value="${icon}">${icon}</option>`)
              .join("")}</select>
            <label><input type="checkbox" name="enabled"> Enabled by default</label>
            <button type="submit" class="button">Add item</button>
          </form>
        </section>`;
      })
      .join("");

    const pins = data.categories.flatMap((category) =>
      category.items.flatMap((item) =>
        item.markers.map((marker) => ({ ...marker, itemId: item.pk, icon: item.icon })),
      ),
    );
    markerLayer.innerHTML = pins
      .map((marker) => {
        const selected = marker.pk === selectedMarkerPk ? " is-selected" : "";
        return `<button type="button" class="pin${selected}" data-marker="${marker.pk}" style="left:${marker.x}%;top:${marker.y}%" title="${escapeHtml(marker.name)}">${iconSvg(marker.icon)}</button>`;
      })
      .join("");

    const selected = selectedMarkerPk ? findMarker(selectedMarkerPk) : null;
    markerForm.hidden = !selected;
    inspectorEmpty.hidden = Boolean(selected);
    if (selected) {
      markerNameInput.value = selected.marker.name;
      markerCoords.textContent = `${selected.marker.x.toFixed(1)}%, ${selected.marker.y.toFixed(1)}% · ${selected.item.name}`;
    }
    applyCamera();
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  document.getElementById("category-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = event.currentTarget.querySelector("input[name='name']");
    try {
      applyData(
        await request(urls.categories, {
          method: "POST",
          json: { map_id: root.dataset.mapId, name: input.value },
        }),
      );
      input.value = "";
      showStatus("Category added.");
    } catch (error) {
      showStatus(error.message, true);
    }
  });

  categoryList.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-item-form]");
    if (!form) return;
    event.preventDefault();
    try {
      const payload = await request(urls.items, {
        method: "POST",
        json: {
          category_id: Number(form.dataset.itemForm),
          name: form.querySelector('[name="name"]').value,
          icon: form.querySelector('[name="icon"]').value,
          enabledByDefault: form.querySelector('[name="enabled"]').checked,
        },
      });
      selectedItemPk = payload.pk;
      applyData(payload);
      showStatus("Item added. Click the map to place markers.");
    } catch (error) {
      showStatus(error.message, true);
    }
  });

  categoryList.addEventListener("click", async (event) => {
    const deleteCategory = event.target.closest("[data-delete-category]");
    const deleteItem = event.target.closest("[data-delete-item]");
    const selectItem = event.target.closest("[data-select-item]");
    try {
      if (deleteCategory) {
        event.preventDefault();
        if (!confirm("Remove this category and everything in it?")) return;
        applyData(await request(withPk(urls.category, deleteCategory.dataset.deleteCategory), { method: "DELETE" }));
        showStatus("Category removed.");
        return;
      }
      if (deleteItem) {
        event.preventDefault();
        event.stopPropagation();
        if (!confirm("Remove this item and its markers?")) return;
        applyData(await request(withPk(urls.item, deleteItem.dataset.deleteItem), { method: "DELETE" }));
        showStatus("Item removed.");
        return;
      }
      if (selectItem) {
        selectedItemPk = Number(selectItem.dataset.selectItem);
        selectedMarkerPk = null;
        render();
      }
    } catch (error) {
      showStatus(error.message, true);
    }
  });

  categoryList.addEventListener("change", async (event) => {
    const input = event.target.closest("[data-rename-category]");
    if (!input) return;
    try {
      applyData(
        await request(withPk(urls.category, input.dataset.renameCategory), {
          method: "PATCH",
          json: { name: input.value },
        }),
      );
      showStatus("Category renamed.");
    } catch (error) {
      showStatus(error.message, true);
    }
  });

  markerLayer.addEventListener("pointerdown", (event) => {
    const pin = event.target.closest("[data-marker]");
    if (!pin) return;
    event.preventDefault();
    event.stopPropagation();
    selectedMarkerPk = Number(pin.dataset.marker);
    const found = findMarker(selectedMarkerPk);
    if (found) selectedItemPk = found.item.pk;
    draggingPin = { pk: selectedMarkerPk, moved: false };
    pin.setPointerCapture(event.pointerId);
    render();
  });

  markerLayer.addEventListener("pointermove", (event) => {
    if (!draggingPin) return;
    const point = percentFromEvent(event);
    if (!point) return;
    draggingPin.moved = true;
    const pin = markerLayer.querySelector(`[data-marker="${draggingPin.pk}"]`);
    if (pin) {
      pin.style.left = `${point.x}%`;
      pin.style.top = `${point.y}%`;
    }
    if (markerCoords) markerCoords.textContent = `${point.x.toFixed(1)}%, ${point.y.toFixed(1)}%`;
  });

  markerLayer.addEventListener("pointerup", async (event) => {
    if (!draggingPin) return;
    const dragged = draggingPin;
    draggingPin = null;
    if (!dragged.moved) return;
    const point = percentFromEvent(event);
    if (!point) return;
    try {
      applyData(
        await request(withPk(urls.marker, dragged.pk), {
          method: "PATCH",
          json: point,
        }),
      );
    } catch (error) {
      showStatus(error.message, true);
    }
  });

  viewport.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest("[data-marker]")) return;
    panning = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: camera.x,
      originY: camera.y,
      moved: false,
    };
    viewport.setPointerCapture(event.pointerId);
  });

  viewport.addEventListener("pointermove", (event) => {
    if (!panning || panning.pointerId !== event.pointerId) return;
    const dx = event.clientX - panning.startX;
    const dy = event.clientY - panning.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) panning.moved = true;
    if (!panning.moved) return;
    viewport.classList.add("is-panning");
    camera = { ...camera, x: panning.originX + dx, y: panning.originY + dy };
    applyCamera();
  });

  viewport.addEventListener("pointerup", async (event) => {
    if (!panning || panning.pointerId !== event.pointerId) return;
    const wasPan = panning.moved;
    panning = null;
    viewport.classList.remove("is-panning");
    if (wasPan || !selectedItemPk) return;
    const point = percentFromEvent(event);
    if (!point) return;
    try {
      const payload = await request(urls.markers, {
        method: "POST",
        json: { item_id: selectedItemPk, ...point },
      });
      selectedMarkerPk = payload.pk;
      applyData(payload);
      showStatus("Marker added.");
    } catch (error) {
      showStatus(error.message, true);
    }
  });

  viewport.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const cursorX = event.clientX - rect.left;
      const cursorY = event.clientY - rect.top;
      const factor = event.deltaY > 0 ? 0.9 : 1.1;
      const nextScale = Math.min(3.2, Math.max(0.35, camera.scale * factor));
      const ratio = nextScale / camera.scale;
      camera = {
        scale: nextScale,
        x: cursorX - (cursorX - camera.x) * ratio,
        y: cursorY - (cursorY - camera.y) * ratio,
      };
      applyCamera();
    },
    { passive: false },
  );

  markerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!selectedMarkerPk) return;
    try {
      applyData(
        await request(withPk(urls.marker, selectedMarkerPk), {
          method: "PATCH",
          json: { name: markerNameInput.value },
        }),
      );
      showStatus("Marker saved.");
    } catch (error) {
      showStatus(error.message, true);
    }
  });

  document.getElementById("delete-marker").addEventListener("click", async () => {
    if (!selectedMarkerPk || !confirm("Remove this marker?")) return;
    try {
      applyData(await request(withPk(urls.marker, selectedMarkerPk), { method: "DELETE" }));
      selectedMarkerPk = null;
      showStatus("Marker removed.");
    } catch (error) {
      showStatus(error.message, true);
    }
  });

  document.addEventListener("keydown", async (event) => {
    if (event.key !== "Delete" && event.key !== "Backspace") return;
    if (!selectedMarkerPk) return;
    if (event.target.matches("input, textarea, select")) return;
    event.preventDefault();
    try {
      applyData(await request(withPk(urls.marker, selectedMarkerPk), { method: "DELETE" }));
      selectedMarkerPk = null;
      showStatus("Marker removed.");
    } catch (error) {
      showStatus(error.message, true);
    }
  });

  document.getElementById("image-input").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const body = new FormData();
    body.append("image", file);
    try {
      applyData(await request(urls.image, { method: "POST", body }));
      showStatus("Map image uploaded.");
    } catch (error) {
      showStatus(error.message, true);
    } finally {
      event.target.value = "";
    }
  });

  render();
})();
