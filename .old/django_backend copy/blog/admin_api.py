import json
from pathlib import Path

from django.db.models import Max
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.urls import reverse
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from .models import ALLOWED_MAP_EXTENSIONS, ICON_CHOICES, Category, GameMap, Item, Marker


def _json_body(request):
    try:
        return json.loads(request.body.decode() or "{}")
    except json.JSONDecodeError:
        return None


def _error(message, status=400):
    return JsonResponse({"error": message}, status=status)


def _next_sort_order(queryset):
    return (queryset.aggregate(value=Max("sort_order"))["value"] or 0) + 1


def _map_response(game_map):
    return JsonResponse(game_map.as_editor_json())


def map_editor(request, map_id):
    game_map = get_object_or_404(GameMap.objects.select_related("game"), pk=map_id)
    return render(
        request,
        "admin/blog/map_editor.html",
        {
            "title": f"Edit {game_map.name}",
            "game_map": game_map,
            "map_data": game_map.as_editor_json(),
            "editor_urls": {
                "map": reverse("admin:blog_map_detail", args=[game_map.id]),
                "image": reverse("admin:blog_map_image", args=[game_map.id]),
                "categories": reverse("admin:blog_category_create"),
                "items": reverse("admin:blog_item_create"),
                "markers": reverse("admin:blog_marker_create"),
                "category": reverse("admin:blog_category_detail", args=[0]).replace("/0/", "/{pk}/"),
                "item": reverse("admin:blog_item_detail", args=[0]).replace("/0/", "/{pk}/"),
                "marker": reverse("admin:blog_marker_detail", args=[0]).replace("/0/", "/{pk}/"),
            },
        },
    )


@require_GET
def map_detail(request, map_id):
    game_map = get_object_or_404(GameMap.objects.select_related("game"), pk=map_id)
    return _map_response(game_map)


@require_POST
def upload_map_image(request, map_id):
    game_map = get_object_or_404(GameMap, pk=map_id)
    uploaded = request.FILES.get("image")
    if not uploaded:
        return _error("Choose an image file to upload.")
    extension = Path(uploaded.name).suffix.lower()
    if extension not in ALLOWED_MAP_EXTENSIONS:
        return _error("Use an SVG, PNG, JPG, WebP, or GIF file.")
    if uploaded.size > 20 * 1024 * 1024:
        return _error("Image must be 20 MB or smaller.")
    game_map.image_file.save(f"{game_map.id}{extension}", uploaded, save=True)
    game_map.sync_uploaded_image()
    game_map.refresh_from_db()
    return _map_response(game_map)


@require_POST
def category_create(request):
    payload = _json_body(request)
    if payload is None:
        return _error("Invalid JSON.")
    game_map = get_object_or_404(GameMap, pk=payload.get("map_id"))
    name = (payload.get("name") or "").strip()
    if not name:
        return _error("Category name is required.")
    category = Category.objects.create(
        map=game_map,
        name=name,
        sort_order=_next_sort_order(game_map.categories),
    )
    return JsonResponse({"ok": True, "map": game_map.as_editor_json(), "pk": category.pk})


@require_http_methods(["PATCH", "DELETE"])
def category_detail(request, pk):
    category = get_object_or_404(Category.objects.select_related("map"), pk=pk)
    game_map = category.map
    if request.method == "DELETE":
        category.delete()
        return _map_response(game_map)
    payload = _json_body(request)
    if payload is None:
        return _error("Invalid JSON.")
    name = (payload.get("name") or "").strip()
    if not name:
        return _error("Category name is required.")
    category.name = name
    category.save(update_fields=["name"])
    return _map_response(game_map)


@require_POST
def item_create(request):
    payload = _json_body(request)
    if payload is None:
        return _error("Invalid JSON.")
    category = get_object_or_404(Category.objects.select_related("map"), pk=payload.get("category_id"))
    name = (payload.get("name") or "").strip()
    if not name:
        return _error("Item name is required.")
    icon = payload.get("icon") or "travel"
    valid_icons = {choice[0] for choice in ICON_CHOICES}
    if icon not in valid_icons:
        icon = "travel"
    item = Item.objects.create(
        category=category,
        name=name,
        icon=icon,
        enabled_by_default=bool(payload.get("enabledByDefault")),
        sort_order=_next_sort_order(category.items),
    )
    return JsonResponse({"ok": True, "map": category.map.as_editor_json(), "pk": item.pk})


@require_http_methods(["PATCH", "DELETE"])
def item_detail(request, pk):
    item = get_object_or_404(Item.objects.select_related("category__map"), pk=pk)
    game_map = item.category.map
    if request.method == "DELETE":
        item.delete()
        return _map_response(game_map)
    payload = _json_body(request)
    if payload is None:
        return _error("Invalid JSON.")
    fields = []
    if "name" in payload:
        name = (payload.get("name") or "").strip()
        if not name:
            return _error("Item name is required.")
        item.name = name
        fields.append("name")
    if "icon" in payload and payload["icon"]:
        item.icon = payload["icon"]
        fields.append("icon")
    if "enabledByDefault" in payload:
        item.enabled_by_default = bool(payload["enabledByDefault"])
        fields.append("enabled_by_default")
    if fields:
        item.save(update_fields=fields)
    return _map_response(game_map)


@require_POST
def marker_create(request):
    payload = _json_body(request)
    if payload is None:
        return _error("Invalid JSON.")
    item = get_object_or_404(Item.objects.select_related("category__map"), pk=payload.get("item_id"))
    try:
        x = float(payload.get("x"))
        y = float(payload.get("y"))
    except (TypeError, ValueError):
        return _error("Marker position is required.")
    name = (payload.get("name") or "").strip() or f"{item.name} {item.markers.count() + 1}"
    marker = Marker.objects.create(
        item=item,
        name=name,
        x=max(0, min(100, x)),
        y=max(0, min(100, y)),
        sort_order=_next_sort_order(item.markers),
    )
    return JsonResponse({"ok": True, "map": item.category.map.as_editor_json(), "pk": marker.pk})


@require_http_methods(["PATCH", "DELETE"])
def marker_detail(request, pk):
    marker = get_object_or_404(Marker.objects.select_related("item__category__map"), pk=pk)
    game_map = marker.item.category.map
    if request.method == "DELETE":
        marker.delete()
        return _map_response(game_map)
    payload = _json_body(request)
    if payload is None:
        return _error("Invalid JSON.")
    fields = []
    if "name" in payload:
        name = (payload.get("name") or "").strip()
        if not name:
            return _error("Marker name is required.")
        marker.name = name
        fields.append("name")
    for coord in ("x", "y"):
        if coord in payload:
            try:
                value = max(0, min(100, float(payload[coord])))
            except (TypeError, ValueError):
                return _error(f"Invalid {coord} coordinate.")
            setattr(marker, coord, value)
            fields.append(coord)
    if fields:
        marker.save(update_fields=fields)
    return _map_response(game_map)
