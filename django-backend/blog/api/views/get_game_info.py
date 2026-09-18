from django.db.models import Prefetch
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ...authentication import CookieJWTAuthentication
from ...models import Games, ItemsCategories, ItemsSubCategories
from ..serializers import GameInfoSerializer


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
                        "default_icon": subcategory.Default_icon,
                        "items": [
                            {
                                "id": item.id,
                                "name": item.ItemName,
                                "x": item.x_location,
                                "y": item.y_location,
                                "icon": item.icon if item.icon and "." in str(item.icon) else None,
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
            "public": game.public,
        })
