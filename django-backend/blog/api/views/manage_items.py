from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ...authentication import CookieJWTAuthentication
from ...models import Games, Items, ItemsCategories, ItemsSubCategories
from ..helpers import first_error, request_fields, save_game_icon


class CreateItemSerializer(serializers.Serializer):
    gameName = serializers.CharField(
        error_messages={
            "required": "Game name is required",
            "blank": "Game name is required",
        },
    )
    name = serializers.CharField(
        error_messages={
            "required": "Marker name is required",
            "blank": "Marker name is required",
        },
    )
    categoryName = serializers.CharField(
        error_messages={
            "required": "Category and subcategory are required",
            "blank": "Category and subcategory are required",
        },
    )
    subcategoryName = serializers.CharField(
        error_messages={
            "required": "Category and subcategory are required",
            "blank": "Category and subcategory are required",
        },
    )
    x = serializers.FloatField(
        error_messages={
            "required": "X and Y are required",
            "invalid": "X and Y are required",
        },
    )
    y = serializers.FloatField(
        error_messages={
            "required": "X and Y are required",
            "invalid": "X and Y are required",
        },
    )
    icon = serializers.ImageField(required=False, allow_null=True)

    def validate_x(self, value):
        return int(round(value))

    def validate_y(self, value):
        return int(round(value))


class UpdateItemSerializer(serializers.Serializer):
    gameName = serializers.CharField(
        error_messages={
            "required": "Game name is required",
            "blank": "Game name is required",
        },
    )
    newName = serializers.CharField(
        error_messages={
            "required": "Marker name is required",
            "blank": "Marker name is required",
        },
    )
    id = serializers.IntegerField(
        error_messages={
            "required": "Item id is required",
            "invalid": "Item id is required",
        },
    )
    x = serializers.FloatField(required=False, allow_null=True)
    y = serializers.FloatField(required=False, allow_null=True)
    icon = serializers.ImageField(required=False, allow_null=True)
    clearIcon = serializers.BooleanField(required=False, default=False)

    def to_internal_value(self, data):
        data = data.copy()
        for key in ("x", "y"):
            if data.get(key) == "":
                data.pop(key, None)
        return super().to_internal_value(data)

    def validate_x(self, value):
        if value is None:
            return value
        return int(round(value))

    def validate_y(self, value):
        if value is None:
            return value
        return int(round(value))


class DeleteItemSerializer(serializers.Serializer):
    gameName = serializers.CharField(
        error_messages={
            "required": "Game name is required",
            "blank": "Game name is required",
        },
    )
    id = serializers.IntegerField(
        error_messages={
            "required": "Item id is required",
            "invalid": "Item id is required",
        },
    )


class ManageItems(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreateItemSerializer(data=request_fields(request))
        if not serializer.is_valid():
            return Response(
                {"message": first_error(serializer.errors)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        game_name = serializer.validated_data["gameName"]
        name = serializer.validated_data["name"]
        category_name = serializer.validated_data["categoryName"]
        subcategory_name = serializer.validated_data["subcategoryName"]
        x_location = serializer.validated_data["x"]
        y_location = serializer.validated_data["y"]
        icon_file = serializer.validated_data.get("icon")

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
        serializer = UpdateItemSerializer(data=request_fields(request))
        if not serializer.is_valid():
            return Response(
                {"message": first_error(serializer.errors)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        game_name = serializer.validated_data["gameName"]
        new_name = serializer.validated_data["newName"]
        item_id = serializer.validated_data["id"]
        icon_file = serializer.validated_data.get("icon")
        clear_icon = serializer.validated_data.get("clearIcon")

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

        if "x" in serializer.validated_data and serializer.validated_data["x"] is not None:
            x_location = serializer.validated_data["x"]
            if item.x_location != x_location:
                item.x_location = x_location
                update_fields.append("x_location")
        if "y" in serializer.validated_data and serializer.validated_data["y"] is not None:
            y_location = serializer.validated_data["y"]
            if item.y_location != y_location:
                item.y_location = y_location
                update_fields.append("y_location")

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
        serializer = DeleteItemSerializer(data=request_fields(request))
        if not serializer.is_valid():
            return Response(
                {"message": first_error(serializer.errors)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        game_name = serializer.validated_data["gameName"]
        item_id = serializer.validated_data["id"]

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
