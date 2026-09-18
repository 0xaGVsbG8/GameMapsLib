from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from ...models import Games
from ..serializers import GameInfoSerializer
from .get_game_info import build_game_info, game_info_queryset


class getPublicGameInfo(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        serializer = GameInfoSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        GAMENAME = serializer.validated_data["GameName"]
        game = game_info_queryset().filter(name=GAMENAME, public=True).first()
        if game is None:
            return Response(
                {"message": "Game not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(build_game_info(request, game))
