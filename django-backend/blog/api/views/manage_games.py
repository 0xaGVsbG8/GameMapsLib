from django.db import IntegrityError, transaction
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ...authentication import CookieJWTAuthentication
from ...models import GameMaps, Games, Items, ItemsCategories, ItemsSubCategories
from ..helpers import (
    delete_game_media,
    ensure_game_media,
    parse_bool,
    rename_game_media,
)


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

        ensure_game_media(name)
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

        delete_game_media(name)
        return Response({"name": name}, status=status.HTTP_200_OK)

    def patch(self, request):
        name = (request.data.get("name") or "").strip()
        new_name = (request.data.get("newName") or "").strip()
        has_public = "public" in request.data

        if not name:
            return Response(
                {"message": "Game name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        game = Games.objects.filter(name=name).first()
        if game is None:
            return Response(
                {"message": "Game not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if has_public and not new_name:
            game.public = parse_bool(request.data.get("public"))
            game.save(update_fields=["public"])
            return Response({"name": game.name, "public": game.public})

        if not new_name:
            return Response(
                {"message": "Current name and new name are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if name == new_name:
            return Response({
                "name": new_name,
                "oldName": name,
                "public": game.public,
            })

        if Games.objects.filter(name=new_name).exists():
            return Response(
                {"message": "A game with that name already exists"},
                status=status.HTTP_409_CONFLICT,
            )

        public_value = (
            parse_bool(request.data.get("public")) if has_public else game.public
        )

        with transaction.atomic():
            renamed = Games.objects.create(name=new_name, public=public_value)
            GameMaps.objects.filter(GameName=game).update(GameName=renamed)
            ItemsCategories.objects.filter(GameName=game).update(GameName=renamed)
            ItemsSubCategories.objects.filter(GameName=game).update(GameName=renamed)
            Items.objects.filter(GameName=game).update(GameName=renamed)
            game.delete()

        rename_game_media(name, new_name)

        return Response({
            "name": new_name,
            "oldName": name,
            "public": public_value,
        })
