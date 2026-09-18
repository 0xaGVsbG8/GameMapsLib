from django.core.files.storage import default_storage
from django.db import IntegrityError
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ...authentication import CookieJWTAuthentication
from ...models import GameMaps, Games
from ..helpers import (
    parse_coordinate_fields,
    scale_stored_image,
    store_uploaded_image,
)


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
            parse_coordinate_fields(request.data)
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
                image_path = store_uploaded_image(image, width, height, game_name)
            else:
                image_path = scale_stored_image(image_path, width, height, game_name)

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

        image_path = store_uploaded_image(image, width, height, game_name) if image else ""

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
