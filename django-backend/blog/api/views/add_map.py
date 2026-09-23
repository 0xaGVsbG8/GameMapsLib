from django.core.files.storage import default_storage
from django.db import IntegrityError
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ...authentication import CookieJWTAuthentication
from ...models import GameMaps, Games
from ..helpers import first_error, request_fields, scale_stored_image, store_uploaded_image


class AddMapSerializer(serializers.Serializer):
    gameName = serializers.CharField(
        error_messages={
            "required": "Game name is required",
            "blank": "Game name is required",
        },
    )
    name = serializers.CharField(
        error_messages={
            "required": "Map name is required",
            "blank": "Map name is required",
        },
    )
    width = serializers.IntegerField(
        min_value=1,
        error_messages={
            "required": "Width and height are required",
            "invalid": "Width and height are required",
            "min_value": "Width and height must be positive",
        },
    )
    height = serializers.IntegerField(
        min_value=1,
        error_messages={
            "required": "Width and height are required",
            "invalid": "Width and height are required",
            "min_value": "Width and height must be positive",
        },
    )
    image = serializers.ImageField(required=False, allow_null=True)
    coordinatesFeature = serializers.BooleanField(required=False, default=False)
    originX = serializers.FloatField(required=False, allow_null=True)
    originY = serializers.FloatField(required=False, allow_null=True)
    pixelsPerUnit = serializers.FloatField(required=False, allow_null=True)

    def validate(self, attrs):
        if not attrs.get("coordinatesFeature"):
            attrs["originX"] = None
            attrs["originY"] = None
            attrs["pixelsPerUnit"] = None
            return attrs
        if (
            attrs.get("originX") is None
            or attrs.get("originY") is None
            or attrs.get("pixelsPerUnit") is None
        ):
            raise serializers.ValidationError(
                "Origin X, origin Y, and pixels per unit are required",
            )
        if attrs["pixelsPerUnit"] <= 0:
            raise serializers.ValidationError("Pixels per unit must be positive")
        return attrs


class addMap(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AddMapSerializer(data=request_fields(request))
        if not serializer.is_valid():
            return Response(
                {"message": first_error(serializer.errors)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        game_name = serializer.validated_data["gameName"]
        map_name = serializer.validated_data["name"]
        width = serializer.validated_data["width"]
        height = serializer.validated_data["height"]
        image = serializer.validated_data.get("image")
        use_coords = serializer.validated_data["coordinatesFeature"]
        origin_x = serializer.validated_data["originX"]
        origin_y = serializer.validated_data["originY"]
        pixels_per_unit = serializer.validated_data["pixelsPerUnit"]
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
