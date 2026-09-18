from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from ...models import Games
from ..helpers import overview_stats


class getPublicGames(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        games = Games.objects.filter(public=True).values_list("name", flat=True)
        return Response({
            "games": list(games),
            "stats": overview_stats(public_only=True),
        })
