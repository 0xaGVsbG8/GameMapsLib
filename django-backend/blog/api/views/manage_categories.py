from django.db import IntegrityError
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ...authentication import CookieJWTAuthentication
from ...models import Games, ItemsCategories
from ..helpers import first_error, request_fields


class CreateCategorySerializer(serializers.Serializer):
    gameName = serializers.CharField(
        error_messages={
            "required": "Game name is required",
            "blank": "Game name is required",
        },
    )
    name = serializers.CharField(
        error_messages={
            "required": "Category name is required",
            "blank": "Category name is required",
        },
    )


class RenameCategorySerializer(serializers.Serializer):
    gameName = serializers.CharField(
        error_messages={
            "required": "Game name is required",
            "blank": "Game name is required",
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


class DeleteCategorySerializer(serializers.Serializer):
    gameName = serializers.CharField(
        error_messages={
            "required": "Game name is required",
            "blank": "Game name is required",
        },
    )
    name = serializers.CharField(
        error_messages={
            "required": "Category name is required",
            "blank": "Category name is required",
        },
    )


class ManageCategories(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreateCategorySerializer(data=request_fields(request))
        if not serializer.is_valid():
            return Response(
                {"message": first_error(serializer.errors)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        game_name = serializer.validated_data["gameName"]
        name = serializer.validated_data["name"]

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
        serializer = RenameCategorySerializer(data=request_fields(request))
        if not serializer.is_valid():
            return Response(
                {"message": first_error(serializer.errors)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        game_name = serializer.validated_data["gameName"]
        name = serializer.validated_data["name"]
        new_name = serializer.validated_data["newName"]

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

    def delete(self, request):
        serializer = DeleteCategorySerializer(data=request_fields(request))
        if not serializer.is_valid():
            return Response(
                {"message": first_error(serializer.errors)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        game_name = serializer.validated_data["gameName"]
        name = serializer.validated_data["name"]

        game = Games.objects.filter(name=game_name).first()
        if game is None:
            return Response(
                {"message": "Game not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        deleted, _ = ItemsCategories.objects.filter(
            GameName=game,
            CategoryName=name,
        ).delete()
        if not deleted:
            return Response(
                {"message": "Category not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({"name": name}, status=status.HTTP_200_OK)
