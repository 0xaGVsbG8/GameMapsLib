from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ...authentication import CookieJWTAuthentication
from ...models import Games, Items, ItemsCategories, ItemsSubCategories
from ..helpers import save_game_icon


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

        icon_file = request.FILES.get("icon")
        icon_name = save_game_icon(game_name, icon_file)

        item = Items.objects.create(
            ItemName=name,
            GameName=game,
            CategoryName=category,
            SubCategoryName=subcategory,
            x_location=x_location,
            y_location=y_location,
            **({"icon": icon_name} if icon_name else {}),
        )

        return Response(
            {
                "name": item.ItemName,
                "x": item.x_location,
                "y": item.y_location,
                "icon": item.icon if item.icon and "." in str(item.icon) else None,
                "categoryName": category_name,
                "subcategoryName": subcategory_name,
            },
            status=status.HTTP_201_CREATED,
        )

    def patch(self, request):
        game_name = (request.data.get("gameName") or "").strip()
        new_name = (request.data.get("newName") or "").strip()
        item_id = request.data.get("id")

        if not game_name:
            return Response(
                {"message": "Game name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not new_name:
            return Response(
                {"message": "Marker name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            item_id = int(item_id)
        except (TypeError, ValueError):
            return Response(
                {"message": "Item id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        game = Games.objects.filter(name=game_name).first()
        if game is None:
            return Response(
                {"message": "Game not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        item = Items.objects.filter(id=item_id, GameName=game).first()
        if item is None:
            return Response(
                {"message": "Item not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        update_fields = []
        if item.ItemName != new_name:
            item.ItemName = new_name
            update_fields.append("ItemName")

        x_raw = request.data.get("x", None)
        y_raw = request.data.get("y", None)
        if x_raw is not None and x_raw != "":
            try:
                x_location = int(round(float(x_raw)))
            except (TypeError, ValueError):
                return Response(
                    {"message": "X must be a number"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if item.x_location != x_location:
                item.x_location = x_location
                update_fields.append("x_location")
        if y_raw is not None and y_raw != "":
            try:
                y_location = int(round(float(y_raw)))
            except (TypeError, ValueError):
                return Response(
                    {"message": "Y must be a number"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if item.y_location != y_location:
                item.y_location = y_location
                update_fields.append("y_location")

        icon_file = request.FILES.get("icon")
        clear_icon = str(request.data.get("clearIcon") or "").strip().lower() in (
            "1",
            "true",
            "on",
            "yes",
        )
        if icon_file:
            icon_name = save_game_icon(game_name, icon_file)
            if icon_name:
                item.icon = icon_name
                update_fields.append("icon")
        elif clear_icon:
            item.icon = None
            update_fields.append("icon")

        if update_fields:
            item.save(update_fields=update_fields)

        return Response({
            "id": item.id,
            "name": item.ItemName,
            "x": item.x_location,
            "y": item.y_location,
            "icon": item.icon if item.icon and "." in str(item.icon) else None,
        })

    def delete(self, request):
        game_name = (
            request.data.get("gameName")
            or request.query_params.get("gameName")
            or ""
        ).strip()
        item_id = request.data.get("id") or request.query_params.get("id")

        if not game_name:
            return Response(
                {"message": "Game name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            item_id = int(item_id)
        except (TypeError, ValueError):
            return Response(
                {"message": "Item id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        game = Games.objects.filter(name=game_name).first()
        if game is None:
            return Response(
                {"message": "Game not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        deleted, _ = Items.objects.filter(id=item_id, GameName=game).delete()
        if not deleted:
            return Response(
                {"message": "Item not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({"id": item_id}, status=status.HTTP_200_OK)
