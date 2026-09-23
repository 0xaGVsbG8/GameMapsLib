import { GameInfo, GameMapInfo } from "./types";

export function getImageContentBox(image: HTMLImageElement) {
  const naturalWidth = image.naturalWidth;
  const naturalHeight = image.naturalHeight;
  const contentWidth = image.clientWidth;
  const contentHeight = image.clientHeight;
  if (!naturalWidth || !naturalHeight || !contentWidth || !contentHeight) {
    return null;
  }

  const scale = Math.min(contentWidth / naturalWidth, contentHeight / naturalHeight);
  const renderedWidth = naturalWidth * scale;
  const renderedHeight = naturalHeight * scale;

  return {
    naturalWidth,
    naturalHeight,
    renderedWidth,
    renderedHeight,
    offsetX: (contentWidth - renderedWidth) / 2,
    offsetY: (contentHeight - renderedHeight) / 2,
    clientLeft: image.clientLeft,
    clientTop: image.clientTop,
    offsetLeft: image.offsetLeft,
    offsetTop: image.offsetTop,
  };
}

export function toWorldCoords(
  imageX: number,
  imageY: number,
  map: GameMapInfo | undefined,
) {
  const originX = map?.origin_x;
  const originY = map?.origin_y;
  const unitScale = map?.pixels_per_unit;
  if (originX == null || originY == null || unitScale == null || unitScale === 0) {
    return {
      x: Math.round(imageX),
      y: Math.round(imageY),
    };
  }
  return {
    x: Math.round(((imageX - originX) / unitScale) * 100) / 100,
    y: Math.round(((originY - imageY) / unitScale) * 100) / 100,
  };
}

export function toImagePixels(x: number, y: number, map: GameMapInfo) {
  const originX = map.origin_x;
  const originY = map.origin_y;
  const unitScale = map.pixels_per_unit;
  if (originX == null || originY == null || unitScale == null || unitScale === 0) {
    return { imageX: x, imageY: y };
  }
  return {
    imageX: originX + x * unitScale,
    imageY: originY - y * unitScale,
  };
}

export function getMapPoint(
  event: MouseEvent,
  image: HTMLImageElement,
  gameInfo: GameInfo | null,
) {
  const box = getImageContentBox(image);
  if (!box || !image.offsetWidth || !image.offsetHeight) {
    return null;
  }

  const rect = image.getBoundingClientRect();
  const scaleX = rect.width / image.offsetWidth;
  const scaleY = rect.height / image.offsetHeight;
  const contentLeft = rect.left + box.clientLeft * scaleX;
  const contentTop = rect.top + box.clientTop * scaleY;
  const contentWidth = image.clientWidth * scaleX;
  const contentHeight = image.clientHeight * scaleY;
  const scale = Math.min(
    contentWidth / box.naturalWidth,
    contentHeight / box.naturalHeight,
  );
  const renderedWidth = box.naturalWidth * scale;
  const renderedHeight = box.naturalHeight * scale;
  const offsetX = (contentWidth - renderedWidth) / 2;
  const offsetY = (contentHeight - renderedHeight) / 2;
  const displayX = event.clientX - contentLeft - offsetX;
  const displayY = event.clientY - contentTop - offsetY;

  if (
    displayX < 0 ||
    displayY < 0 ||
    displayX > renderedWidth ||
    displayY > renderedHeight
  ) {
    return null;
  }

  const imageX = displayX * (box.naturalWidth / renderedWidth);
  const imageY = displayY * (box.naturalHeight / renderedHeight);
  const world = toWorldCoords(imageX, imageY, gameInfo?.maps[0]);

  return { x: world.x, y: world.y, displayX, displayY };
}

export function getGameItems(gameInfo: GameInfo | null) {
  if (!gameInfo?.categories) return [];
  return gameInfo.categories.flatMap((category) =>
    category.subcategories.flatMap((subcategory) =>
      (subcategory.items ?? []).map((item) => ({
        ...item,
        categoryName: category.name,
        subcategoryName: subcategory.name,
        icon_src: item.icon || subcategory.default_icon,
      })),
    ),
  );
}

export function calc_marker(
  x: number,
  y: number,
  image: HTMLImageElement,
  map: GameMapInfo,
) {
  const box = getImageContentBox(image);
  if (!box) return null;

  const { imageX, imageY } = toImagePixels(x, y, map);
  const displayX = imageX * (box.renderedWidth / box.naturalWidth);
  const displayY = imageY * (box.renderedHeight / box.naturalHeight);

  return {
    x: box.offsetLeft + box.clientLeft + box.offsetX + displayX,
    y: box.offsetTop + box.clientTop + box.offsetY + displayY,
  };
}

export function sanitizeCoord(value: string) {
  const negative = value.trimStart().startsWith("-");
  const cleaned = value.replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  const next =
    dot === -1
      ? cleaned
      : cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, "");
  if (negative && next !== "") return `-${next}`;
  if (negative && next === "") return "-";
  return next;
}
