from django.db import IntegrityError
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ...authentication import CookieJWTAuthentication
from ...models import Games
from ..helpers import (
    delete_game_media,
    ensure_game_media,
    first_error,
    rename_game_media,
    request_fields,
)


class CreateGameSerializer(serializers.Serializer):
    name = serializers.CharField(
        error_messages={
            "required": "Game name is required",
            "blank": "Game name is required",
        },
    )


class GameNameSerializer(serializers.Serializer):
    name = serializers.CharField(
        error_messages={
            "required": "Game name is required",
            "blank": "Game name is required",
        },
    )


class PatchGameSerializer(serializers.Serializer):
    name = serializers.CharField(
        error_messages={
            "required": "Game name is required",
            "blank": "Game name is required",
        },
    )
    newName = serializers.CharField(required=False, allow_blank=True, default="")
    public = serializers.BooleanField(required=False)

    def validate(self, attrs):
        if not attrs.get("newName") and "public" not in self.initial_data:
            raise serializers.ValidationError(
                "Current name and new name are required",
            )
        return attrs


class ManageGame(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreateGameSerializer(data=request_fields(request))
        if not serializer.is_valid():
            return Response(
                {"message": first_error(serializer.errors)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        name = serializer.validated_data["name"]

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
        serializer = GameNameSerializer(data=request_fields(request))
        if not serializer.is_valid():
            return Response(
                {"message": first_error(serializer.errors)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        name = serializer.validated_data["name"]

        deleted, _ = Games.objects.filter(name=name).delete()
        if not deleted:
            return Response(
                {"message": "Game not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        delete_game_media(name)
        return Response({"name": name}, status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = PatchGameSerializer(data=request_fields(request))
        if not serializer.is_valid():
            return Response(
                {"message": first_error(serializer.errors)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        name = serializer.validated_data["name"]
        new_name = serializer.validated_data.get("newName") or ""
        has_public = "public" in serializer.initial_data

        game = Games.objects.filter(name=name).first()
        if game is None:
            return Response(
                {"message": "Game not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        renamed = bool(new_name) and name != new_name
        if renamed and Games.objects.filter(name=new_name).exists():
            return Response(
                {"message": "A game with that name already exists"},
                status=status.HTTP_409_CONFLICT,
            )

        if renamed:
            game.name = new_name
        if has_public:
            game.public = serializer.validated_data["public"]
        if renamed or has_public:
            game.save()
        if renamed:
            rename_game_media(name, new_name)

        return Response({
            "name": game.name,
            "oldName": name,
            "public": game.public,
        })
