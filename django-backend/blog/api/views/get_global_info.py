from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ...authentication import CookieJWTAuthentication
from ...models import Games
from ..helpers import overview_stats


class getGlobalInfo(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "games": Games.objects.values_list("name", flat=True),
            "stats": overview_stats(),
        })
