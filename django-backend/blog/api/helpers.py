import os
import shutil
import uuid
from io import BytesIO
from pathlib import Path

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.utils.text import get_valid_filename
from PIL import Image

from ..models import GameMaps, Games, Items, ItemsCategories, ItemsSubCategories


def save_game_icon(game_name, icon):
    if not icon:
        return None
    filename = str(uuid.uuid4()) + ".png"
    ensure_game_media(game_name)
    default_storage.save(f"{game_folder(game_name)}/icons/{filename}", icon)
    return filename


def parse_bool(value):
    if isinstance(value, bool):
        return value
    return str(value or "").strip().lower() in ("true", "1", "on", "yes")


def first_error(errors):
    if isinstance(errors, dict):
        for value in errors.values():
            message = first_error(value)
            if message:
                return message
        return ""
    if isinstance(errors, list):
        return first_error(errors[0]) if errors else ""
    return str(errors)


def request_fields(request):
    payload = {}
    for source in (request.query_params, request.data):
        for key in source:
            payload[key] = source.get(key)
    return payload


def game_folder(game_name):
    folder = (game_name or "").strip()
    if (not folder) or folder in (".", "..") or "/" in folder or "\\" in folder:
        return "game"
    return folder


def _legacy_game_folder(game_name):
    folder = get_valid_filename((game_name or "").strip())
    return folder or "game"


def game_maps_prefix(game_name):
    return f"{game_folder(game_name)}/maps"


def _merge_dir(src, dest):
    if not src.is_dir() or src.resolve() == dest.resolve():
        return
    dest.mkdir(parents=True, exist_ok=True)
    for item in src.iterdir():
        target = dest / item.name
        if item.is_dir():
            _merge_dir(item, target)
            continue
        if not target.exists():
            shutil.move(str(item), str(target))
    shutil.rmtree(src, ignore_errors=True)


def coalesce_game_media(game_name):
    root = Path(settings.MEDIA_ROOT)
    canonical = game_folder(game_name)
    dest = root / canonical
    (dest / "maps").mkdir(parents=True, exist_ok=True)
    (dest / "icons").mkdir(parents=True, exist_ok=True)

    legacy = _legacy_game_folder(game_name)
    if legacy != canonical:
        _merge_dir(root / legacy, dest)

    maps_prefix = f"{canonical}/maps/"
    for game_map in GameMaps.objects.filter(GameName__name=game_name):
        path = (game_map.image_path or "").strip().replace("\\", "/")
        if not path:
            continue
        if path.startswith(f"{canonical}/"):
            new_path = path
        elif path.startswith(f"{legacy}/"):
            new_path = canonical + path[len(legacy):]
        elif path.startswith("maps/"):
            new_path = f"{canonical}/{path}"
        else:
            new_path = f"{maps_prefix}{os.path.basename(path)}"

        old_file = root / path
        new_file = root / new_path
        new_file.parent.mkdir(parents=True, exist_ok=True)
        if old_file.exists() and old_file.resolve() != new_file.resolve():
            if not new_file.exists():
                shutil.move(str(old_file), str(new_file))
        if new_path != path:
            game_map.image_path = new_path
            game_map.save(update_fields=["image_path"])


def coalesce_all_game_media():
    for game in Games.objects.all():
        coalesce_game_media(game.name)


def ensure_game_media(game_name):
    coalesce_game_media(game_name)
    return game_maps_prefix(game_name)


def delete_game_media(game_name):
    root = Path(settings.MEDIA_ROOT)
    for folder_name in {game_folder(game_name), _legacy_game_folder(game_name)}:
        folder = root / folder_name
        if folder.is_dir():
            shutil.rmtree(folder)


def rename_game_media(old_name, new_name):
    coalesce_game_media(old_name)
    old_folder = Path(settings.MEDIA_ROOT) / game_folder(old_name)
    new_folder = Path(settings.MEDIA_ROOT) / game_folder(new_name)
    if old_folder.is_dir() and old_folder.resolve() != new_folder.resolve():
        if new_folder.exists():
            _merge_dir(old_folder, new_folder)
        else:
            new_folder.parent.mkdir(parents=True, exist_ok=True)
            old_folder.rename(new_folder)

    old_prefix = f"{game_folder(old_name)}/"
    new_prefix = f"{game_folder(new_name)}/"
    maps_prefix = f"{game_maps_prefix(new_name)}/"
    ensure_game_media(new_name)

    for game_map in GameMaps.objects.filter(GameName__name=new_name):
        path = (game_map.image_path or "").strip().replace("\\", "/")
        if not path:
            continue
        if path.startswith(old_prefix):
            game_map.image_path = new_prefix + path[len(old_prefix):]
            game_map.save(update_fields=["image_path"])
            continue
        if path.startswith("maps/") and not path.startswith(maps_prefix):
            filename = os.path.basename(path)
            new_path = f"{game_maps_prefix(new_name)}/{filename}"
            old_file = Path(settings.MEDIA_ROOT) / path
            new_file = Path(settings.MEDIA_ROOT) / new_path
            new_file.parent.mkdir(parents=True, exist_ok=True)
            if old_file.exists() and old_file.resolve() != new_file.resolve():
                shutil.move(str(old_file), str(new_file))
            game_map.image_path = new_path
            game_map.save(update_fields=["image_path"])


def parse_coordinate_fields(data):
    use_coords = parse_bool(data.get("coordinatesFeature"))
    if not use_coords:
        return False, None, None, None, None

    try:
        origin_x = float(data.get("originX"))
        origin_y = float(data.get("originY"))
        pixels_per_unit = float(data.get("pixelsPerUnit"))
    except (TypeError, ValueError):
        return True, None, None, None, "Origin X, origin Y, and pixels per unit are required"

    if pixels_per_unit <= 0:
        return True, None, None, None, "Pixels per unit must be positive"

    return True, origin_x, origin_y, pixels_per_unit, None


def image_format_and_name(image, filename):
    fmt = (image.format or "").upper()
    if fmt == "JPG":
        fmt = "JPEG"
    ext = os.path.splitext(filename)[1].lower()
    if fmt not in ("PNG", "JPEG", "WEBP", "GIF"):
        fmt = {
            ".jpg": "JPEG",
            ".jpeg": "JPEG",
            ".png": "PNG",
            ".webp": "WEBP",
            ".gif": "GIF",
        }.get(ext, "PNG")
    ext_map = {"PNG": ".png", "JPEG": ".jpg", "WEBP": ".webp", "GIF": ".gif"}
    root = os.path.splitext(get_valid_filename(filename))[0]
    return fmt, f"{root}{ext_map.get(fmt, ext or '.png')}"


def save_image_to_size(source, filename, width, height, game_name):
    source.seek(0)
    image = Image.open(source)
    image.load()
    fmt, name = image_format_and_name(image, filename)
    if image.size != (width, height):
        image = image.resize((width, height), Image.Resampling.LANCZOS)
    if fmt == "JPEG" and image.mode in ("RGBA", "P", "LA"):
        image = image.convert("RGB")
    buffer = BytesIO()
    save_kwargs = {"format": fmt}
    if fmt == "JPEG":
        save_kwargs["quality"] = 90
        save_kwargs["optimize"] = True
    image.save(buffer, **save_kwargs)
    buffer.seek(0)
    dest = f"{game_maps_prefix(game_name)}/{name}"
    return default_storage.save(dest, ContentFile(buffer.read(), name=name))


def store_uploaded_image(uploaded, width, height, game_name):
    ensure_game_media(game_name)
    uploaded.seek(0)
    image = Image.open(uploaded)
    image.load()
    filename = uploaded.name
    if image.size == (width, height):
        uploaded.seek(0)
        dest = f"{game_maps_prefix(game_name)}/{get_valid_filename(filename)}"
        return default_storage.save(dest, uploaded)
    return save_image_to_size(uploaded, filename, width, height, game_name)


def scale_stored_image(image_path, width, height, game_name):
    if not image_path or not default_storage.exists(image_path):
        return image_path
    with default_storage.open(image_path, "rb") as fh:
        original = BytesIO(fh.read())
    original.seek(0)
    with Image.open(original) as image:
        current_size = image.size
        filename = os.path.basename(image_path)
    if current_size == (width, height):
        return image_path
    original.seek(0)
    new_path = save_image_to_size(original, filename, width, height, game_name)
    if new_path != image_path and default_storage.exists(image_path):
        default_storage.delete(image_path)
    return new_path


def overview_stats(public_only=False):
    games = Games.objects.all()
    maps = GameMaps.objects.all()
    categories = ItemsCategories.objects.all()
    subcategories = ItemsSubCategories.objects.all()
    items = Items.objects.all()

    if public_only:
        games = games.filter(public=True)
        maps = maps.filter(GameName__public=True)
        categories = categories.filter(GameName__public=True)
        subcategories = subcategories.filter(GameName__public=True)
        items = items.filter(GameName__public=True)

    return {
        "games": games.count(),
        "maps": maps.count(),
        "categories": categories.count(),
        "subcategories": subcategories.count(),
        "items": items.count(),
        "public_games": Games.objects.filter(public=True).count(),
    }
