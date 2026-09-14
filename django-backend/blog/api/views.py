import os
from io import BytesIO

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import IntegrityError, transaction
from django.db.models import Prefetch
from django.http import HttpResponse
from django.utils.text import get_valid_filename
from PIL import Image
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated
from ..authentication import CookieJWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from ..models import Games, GameMaps, Items, ItemsCategories, ItemsSubCategories
from .serializers import GameInfoSerializer

@api_view(["GET"])
def test_api(request):
    return Response({
        "message": "Hello from Django API"
    })




class AuthUserView(APIView):

    authentication_classes = []
    permission_classes = []

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        
        user = authenticate(
            username=username,
            password=password,
        )
        
        if user is None:
            return Response(
                {"message": "Invalid username or password"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_staff:
            return Response(
                {"message": "You are not an admin"},
                status=status.HTTP_403_FORBIDDEN,
            )
            
            
        refresh = RefreshToken.for_user(user)
        
        response = Response({
            "message": "Login successful",
            "username": user.username,
        })
        
        response.set_cookie(
            key="access_token",
            value=str(refresh.access_token),
            httponly=True,
            secure=False,  # True when https
            samesite="Lax",
        )

        response.set_cookie(
            key="refresh_token", 
            value=str(refresh),
            httponly=True,
            secure=False,
            samesite="Lax",
        )
        
        
        return response

        
    


class isUserAuthed(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        print('ure authed')
        return Response({})
    
    
    


class getGlobalInfo(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        games = Games.objects.values_list("name", flat=True)
        data = {
            'games': games
        }
        return Response(data)


class getGameInfo(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = GameInfoSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        GAMENAME = serializer.validated_data["GameName"]
        game = (
            Games.objects.filter(name=GAMENAME)
            .prefetch_related(
                "maps",
                Prefetch(
                    "item_categories",
                    queryset=ItemsCategories.objects.prefetch_related(
                        Prefetch(
                            "item_subcategories",
                            queryset=ItemsSubCategories.objects.prefetch_related("Items"),
                        )
                    ),
                ),
            )
            .first()
        )
        if game is None:
            return Response(
                {"message": "Game not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        maps = []
        for entry in game.maps.all():
            image_path = (entry.image_path or "").strip()
            maps.append({
                "Map_name": entry.Map_name,
                "image_path": image_path,
                "image_url": request.build_absolute_uri(f"/media/{image_path}") if image_path else "",
                "width": entry.width,
                "height": entry.height,
                "coordinates_feature": entry.coordinates_feature,
                "origin_x": entry.origin_x,
                "origin_y": entry.origin_y,
                "pixels_per_unit": entry.pixels_per_unit,
            })
        has_image = any(entry["image_path"] for entry in maps)

        categories = []
        for category in game.item_categories.all():
            categories.append({
                "name": category.CategoryName,
                "subcategories": [
                    {
                        "name": subcategory.SubCategoryName,
                        "items": [
                            {
                                "id": item.id,
                                "name": item.ItemName,
                                "x": item.x_location,
                                "y": item.y_location,
                            }
                            for item in subcategory.Items.all()
                        ],
                    }
                    for subcategory in category.item_subcategories.all()
                ],
            })

        return Response({
            "game": GAMENAME,
            "maps": maps,
            "categories": categories,
            "map": "exists" if has_image else "not exists",
        })





class ManageGame(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        name = (request.data.get("name") or "").strip()

        if not name:
            return Response(
                {"message": "Game name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            Games.objects.create(name=name)
        except IntegrityError:
            return Response(
                {"message": "A game with that name already exists"},
                status=status.HTTP_409_CONFLICT,
            )

        return Response({"name": name}, status=status.HTTP_201_CREATED)
    
    
    def delete(self, request):
        name = (
            request.data.get("name")
            or request.query_params.get("name")
            or ""
        ).strip()

        if not name:
            return Response(
                {"message": "Game name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        deleted, _ = Games.objects.filter(name=name).delete()
        if not deleted:
            return Response(
                {"message": "Game not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({"name": name}, status=status.HTTP_200_OK)

    def patch(self, request):
        name = (request.data.get("name") or "").strip()
        new_name = (request.data.get("newName") or "").strip()

        if not name or not new_name:
            return Response(
                {"message": "Current name and new name are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if name == new_name:
            return Response({"name": new_name, "oldName": name})

        game = Games.objects.filter(name=name).first()
        if game is None:
            return Response(
                {"message": "Game not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if Games.objects.filter(name=new_name).exists():
            return Response(
                {"message": "A game with that name already exists"},
                status=status.HTTP_409_CONFLICT,
            )

        with transaction.atomic():
            renamed = Games.objects.create(name=new_name)
            GameMaps.objects.filter(GameName=game).update(GameName=renamed)
            ItemsCategories.objects.filter(GameName=game).update(GameName=renamed)
            ItemsSubCategories.objects.filter(GameName=game).update(GameName=renamed)
            Items.objects.filter(GameName=game).update(GameName=renamed)
            game.delete()

        return Response({"name": new_name, "oldName": name})


def _parse_bool(value):
    if isinstance(value, bool):
        return value
    return str(value or "").strip().lower() in ("true", "1", "on", "yes")


def _parse_coordinate_fields(data):
    use_coords = _parse_bool(data.get("coordinatesFeature"))
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


def _image_format_and_name(image, filename):
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


def _save_image_to_size(source, filename, width, height):
    source.seek(0)
    image = Image.open(source)
    image.load()
    fmt, name = _image_format_and_name(image, filename)
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
    return default_storage.save(f"maps/{name}", ContentFile(buffer.read(), name=name))


def _store_uploaded_image(uploaded, width, height):
    uploaded.seek(0)
    image = Image.open(uploaded)
    image.load()
    filename = uploaded.name
    if image.size == (width, height):
        uploaded.seek(0)
        return default_storage.save(f"maps/{get_valid_filename(filename)}", uploaded)
    return _save_image_to_size(uploaded, filename, width, height)


def _scale_stored_image(image_path, width, height):
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
    new_path = _save_image_to_size(original, filename, width, height)
    if new_path != image_path and default_storage.exists(image_path):
        default_storage.delete(image_path)
    return new_path


class addMap(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        game_name = (request.data.get("gameName") or "").strip()
        map_name = (request.data.get("name") or "").strip()
        width_raw = request.data.get("width")
        height_raw = request.data.get("height")
        image = request.FILES.get("image")

        if not game_name:
            return Response(
                {"message": "Game name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not map_name:
            return Response(
                {"message": "Map name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            width = int(width_raw)
            height = int(height_raw)
        except (TypeError, ValueError):
            return Response(
                {"message": "Width and height are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if width <= 0 or height <= 0:
            return Response(
                {"message": "Width and height must be positive"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        use_coords, origin_x, origin_y, pixels_per_unit, coord_error = (
            _parse_coordinate_fields(request.data)
        )
        if coord_error:
            return Response(
                {"message": coord_error},
                status=status.HTTP_400_BAD_REQUEST,
            )

        coord_kwargs = {
            "coordinates_feature": use_coords,
            "origin_x": origin_x,
            "origin_y": origin_y,
            "pixels_per_unit": pixels_per_unit,
        }

        game = Games.objects.filter(name=game_name).first()
        if game is None:
            return Response(
                {"message": "Game not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        existing = game.maps.first()
        if existing is not None:
            image_path = existing.image_path
            if image:
                if image_path and default_storage.exists(image_path):
                    default_storage.delete(image_path)
                image_path = _store_uploaded_image(image, width, height)
            else:
                image_path = _scale_stored_image(image_path, width, height)

            if map_name != existing.Map_name:
                if GameMaps.objects.filter(Map_name=map_name).exists():
                    return Response(
                        {"message": "A map with that name already exists"},
                        status=status.HTTP_409_CONFLICT,
                    )
                GameMaps.objects.create(
                    Map_name=map_name,
                    GameName=game,
                    image_path=image_path,
                    width=width,
                    height=height,
                    **coord_kwargs,
                )
                existing.delete()
            else:
                existing.image_path = image_path
                existing.width = width
                existing.height = height
                existing.coordinates_feature = use_coords
                existing.origin_x = origin_x
                existing.origin_y = origin_y
                existing.pixels_per_unit = pixels_per_unit
                existing.save()

            return Response(
                {
                    "name": map_name,
                    "image_path": image_path,
                    "width": width,
                    "height": height,
                    "replaced": True,
                    **coord_kwargs,
                }
            )

        image_path = _store_uploaded_image(image, width, height) if image else ""

        try:
            GameMaps.objects.create(
                Map_name=map_name,
                GameName=game,
                image_path=image_path,
                width=width,
                height=height,
                **coord_kwargs,
            )
        except IntegrityError:
            return Response(
                {"message": "A map with that name already exists"},
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            {
                "name": map_name,
                "image_path": image_path,
                "width": width,
                "height": height,
                "replaced": False,
                **coord_kwargs,
            },
            status=status.HTTP_201_CREATED,
        )


class ManageCategories(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        game_name = (request.data.get("gameName") or "").strip()
        name = (request.data.get("name") or "").strip()

        if not game_name:
            return Response(
                {"message": "Game name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not name:
            return Response(
                {"message": "Category name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        game = Games.objects.filter(name=game_name).first()
        if game is None:
            return Response(
                {"message": "Game not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            ItemsCategories.objects.create(CategoryName=name, GameName=game)
        except IntegrityError:
            return Response(
                {"message": "A category with that name already exists"},
                status=status.HTTP_409_CONFLICT,
            )

        return Response({"name": name}, status=status.HTTP_201_CREATED)

    def patch(self, request):
        game_name = (request.data.get("gameName") or "").strip()
        name = (request.data.get("name") or "").strip()
        new_name = (request.data.get("newName") or "").strip()

        if not game_name:
            return Response(
                {"message": "Game name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not name or not new_name:
            return Response(
                {"message": "Current name and new name are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        game = Games.objects.filter(name=game_name).first()
        if game is None:
            return Response(
                {"message": "Game not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        category = ItemsCategories.objects.filter(
            GameName=game,
            CategoryName=name,
        ).first()
        if category is None:
            return Response(
                {"message": "Category not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if name == new_name:
            return Response({"name": new_name})

        category.CategoryName = new_name
        try:
            category.save()
        except IntegrityError:
            return Response(
                {"message": "A category with that name already exists"},
                status=status.HTTP_409_CONFLICT,
            )

        return Response({"name": new_name, "oldName": name})


class ManageSubCategories(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        game_name = (request.data.get("gameName") or "").strip()
        category_name = (request.data.get("categoryName") or "").strip()
        name = (request.data.get("name") or "").strip()

        if not game_name:
            return Response(
                {"message": "Game name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not category_name:
            return Response(
                {"message": "Category name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not name:
            return Response(
                {"message": "Subcategory name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        game = Games.objects.filter(name=game_name).first()
        if game is None:
            return Response(
                {"message": "Game not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        category = ItemsCategories.objects.filter(
            GameName=game,
            CategoryName=category_name,
        ).first()
        if category is None:
            return Response(
                {"message": "Category not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            ItemsSubCategories.objects.create(
                SubCategoryName=name,
                PrimalCategory=category,
                GameName=game,
            )
        except IntegrityError:
            return Response(
                {"message": "A subcategory with that name already exists"},
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            {"name": name, "categoryName": category_name},
            status=status.HTTP_201_CREATED,
        )

    def patch(self, request):
        game_name = (request.data.get("gameName") or "").strip()
        category_name = (request.data.get("categoryName") or "").strip()
        name = (request.data.get("name") or "").strip()
        new_name = (request.data.get("newName") or "").strip()

        if not game_name:
            return Response(
                {"message": "Game name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not category_name:
            return Response(
                {"message": "Category name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not name or not new_name:
            return Response(
                {"message": "Current name and new name are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        game = Games.objects.filter(name=game_name).first()
        if game is None:
            return Response(
                {"message": "Game not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        category = ItemsCategories.objects.filter(
            GameName=game,
            CategoryName=category_name,
        ).first()
        if category is None:
            return Response(
                {"message": "Category not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        subcategory = ItemsSubCategories.objects.filter(
            GameName=game,
            PrimalCategory=category,
            SubCategoryName=name,
        ).first()
        if subcategory is None:
            return Response(
                {"message": "Subcategory not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if name == new_name:
            return Response({"name": new_name, "categoryName": category_name})

        subcategory.SubCategoryName = new_name
        try:
            subcategory.save()
        except IntegrityError:
            return Response(
                {"message": "A subcategory with that name already exists"},
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            {"name": new_name, "oldName": name, "categoryName": category_name}
        )


class ManageItems(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        game_name = (request.data.get("gameName") or "").strip()
        name = (request.data.get("name") or "").strip()
        category_name = (request.data.get("categoryName") or "").strip()
        subcategory_name = (request.data.get("subcategoryName") or "").strip()

        if not game_name:
            return Response(
                {"message": "Game name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not name:
            return Response(
                {"message": "Marker name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not category_name or not subcategory_name:
            return Response(
                {"message": "Category and subcategory are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            x_location = int(round(float(request.data.get("x"))))
            y_location = int(round(float(request.data.get("y"))))
        except (TypeError, ValueError):
            return Response(
                {"message": "X and Y are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        game = Games.objects.filter(name=game_name).first()
        if game is None:
            return Response(
                {"message": "Game not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        category = ItemsCategories.objects.filter(
            GameName=game,
            CategoryName=category_name,
        ).first()
        if category is None:
            return Response(
                {"message": "Category not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        subcategory = ItemsSubCategories.objects.filter(
            GameName=game,
            PrimalCategory=category,
            SubCategoryName=subcategory_name,
        ).first()
        if subcategory is None:
            return Response(
                {"message": "Subcategory not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        item = Items.objects.create(
            ItemName=name,
            GameName=game,
            CategoryName=category,
            SubCategoryName=subcategory,
            x_location=x_location,
            y_location=y_location,
        )

        return Response(
            {
                "name": item.ItemName,
                "x": item.x_location,
                "y": item.y_location,
                "categoryName": category_name,
                "subcategoryName": subcategory_name,
            },
            status=status.HTTP_201_CREATED,
        )
 