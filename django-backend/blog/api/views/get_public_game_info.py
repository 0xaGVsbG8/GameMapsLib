from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from ...models import Games
from ..helpers import coalesce_game_media
from ..serializers import GameInfoSerializer
from .get_game_info import build_game_info, game_info_queryset


class getPublicGameInfo(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        serializer = GameInfoSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        GAMENAME = serializer.validated_data["GameName"]
        if not Games.objects.filter(name=GAMENAME, public=True).exists():
            return Response(
                {"message": "Game not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        coalesce_game_media(GAMENAME)
        game = game_info_queryset().filter(name=GAMENAME, public=True).first()
        return Response(build_game_info(request, game))
