from django.db import IntegrityError
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ...authentication import CookieJWTAuthentication
from ...models import Games, ItemsCategories, ItemsSubCategories
from ..helpers import first_error, request_fields, save_game_icon


class CreateSubcategorySerializer(serializers.Serializer):
    gameName = serializers.CharField(
        error_messages={
            "required": "Game name is required",
            "blank": "Game name is required",
        },
    )
    categoryName = serializers.CharField(
        error_messages={
            "required": "Category name is required",
            "blank": "Category name is required",
        },
    )
    name = serializers.CharField(
        error_messages={
            "required": "Subcategory name is required",
            "blank": "Subcategory name is required",
        },
    )
    icon = serializers.ImageField(required=False, allow_null=True)


class RenameSubcategorySerializer(serializers.Serializer):
    gameName = serializers.CharField(
        error_messages={
            "required": "Game name is required",
            "blank": "Game name is required",
        },
    )
    categoryName = serializers.CharField(
        error_messages={
            "required": "Category name is required",
            "blank": "Category name is required",
        },
    )
    name = serializers.CharField(
        error_messages={
            "required": "Current name and new name are required",
            "blank": "Current name and new name are required",
        },
    )
    newName = serializers.CharField(
        error_messages={
            "required": "Current name and new name are required",
            "blank": "Current name and new name are required",
        },
    )
    icon = serializers.ImageField(required=False, allow_null=True)
    clearIcon = serializers.BooleanField(required=False, default=False)


class DeleteSubcategorySerializer(serializers.Serializer):
    gameName = serializers.CharField(
        error_messages={
            "required": "Game name is required",
            "blank": "Game name is required",
        },
    )
    categoryName = serializers.CharField(
        error_messages={
            "required": "Category name is required",
            "blank": "Category name is required",
        },
    )
    name = serializers.CharField(
        error_messages={
            "required": "Subcategory name is required",
            "blank": "Subcategory name is required",
        },
    )


class ManageSubCategories(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreateSubcategorySerializer(data=request_fields(request))
        if not serializer.is_valid():
            return Response(
                {"message": first_error(serializer.errors)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        game_name = serializer.validated_data["gameName"]
        category_name = serializer.validated_data["categoryName"]
        name = serializer.validated_data["name"]
        icon = serializer.validated_data.get("icon")

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
                Default_icon=save_game_icon(game_name, icon),
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
        serializer = RenameSubcategorySerializer(data=request_fields(request))
        if not serializer.is_valid():
            return Response(
                {"message": first_error(serializer.errors)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        game_name = serializer.validated_data["gameName"]
        category_name = serializer.validated_data["categoryName"]
        name = serializer.validated_data["name"]
        new_name = serializer.validated_data["newName"]
        icon = serializer.validated_data.get("icon")
        clear_icon = serializer.validated_data.get("clearIcon")

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

        if name == new_name and not icon and not clear_icon:
            return Response({"name": new_name, "categoryName": category_name})

        subcategory.SubCategoryName = new_name
        try:
            if icon:
                subcategory.Default_icon = save_game_icon(game_name, icon)
            elif clear_icon:
                subcategory.Default_icon = None
            subcategory.save()
        except IntegrityError:
            return Response(
                {"message": "A subcategory with that name already exists"},
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            {"name": new_name, "oldName": name, "categoryName": category_name}
        )

    def delete(self, request):
        serializer = DeleteSubcategorySerializer(data=request_fields(request))
        if not serializer.is_valid():
            return Response(
                {"message": first_error(serializer.errors)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        game_name = serializer.validated_data["gameName"]
        category_name = serializer.validated_data["categoryName"]
        name = serializer.validated_data["name"]

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

        deleted, _ = ItemsSubCategories.objects.filter(
            GameName=game,
            PrimalCategory=category,
            SubCategoryName=name,
        ).delete()
        if not deleted:
            return Response(
                {"message": "Subcategory not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {"name": name, "categoryName": category_name},
            status=status.HTTP_200_OK,
        )
