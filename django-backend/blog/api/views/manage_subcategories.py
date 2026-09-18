import uuid

from django.core.files.storage import default_storage
from django.db import IntegrityError
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ...authentication import CookieJWTAuthentication
from ...models import Games, ItemsCategories, ItemsSubCategories


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
        icon = request.FILES.get("icon")
        clear_icon = str(request.data.get("clearIcon") or "").strip().lower() in (
            "1",
            "true",
            "on",
            "yes",
        )

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

        if name == new_name and not icon and not clear_icon:
            return Response({"name": new_name, "categoryName": category_name})

        subcategory.SubCategoryName = new_name
        try:
            if icon:
                filename = str(uuid.uuid4()) + ".png"
                default_storage.save(
                    f"{game_name}/icons/{filename}",
                    icon,
                )
                subcategory.Default_icon = filename
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
        game_name = (
            request.data.get("gameName")
            or request.query_params.get("gameName")
            or ""
        ).strip()
        category_name = (
            request.data.get("categoryName")
            or request.query_params.get("categoryName")
            or ""
        ).strip()
        name = (
            request.data.get("name")
            or request.query_params.get("name")
            or ""
        ).strip()

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
