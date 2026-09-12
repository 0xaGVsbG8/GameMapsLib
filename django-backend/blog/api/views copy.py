import http
from sys import flags
from django.db import IntegrityError
from django.http import HttpResponse
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated
from ..authentication import CookieJWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from ..models import Games
from .serializers import GameInfoSerializer

@api_view(["GET"])
def test_api(request):
    return Response({
        "message": "Hello from Django API"
    })




class AuthUserView(APIView):

    authentication_classes = []
    permission_classes = []
    
    # def get_permissions(self):
    #     if self.request.method == "GET":
    #         return [IsAuthenticated()]

    #     return []

    # def get(self, request):
    #     print("========== GET ==========")

    #     auth = CookieJWTAuthentication()

    #     try:
    #         result = auth.authenticate(request)
    #     except InvalidToken:
    #         return Response(
    #             {"authenticated": False},
    #             status=status.HTTP_401_UNAUTHORIZED
    #         )

    #     if result is None:
    #         return Response(
    #             {"authenticated": False},
    #             status=status.HTTP_401_UNAUTHORIZED
    #         )

    #     user, token = result
        
    #     print('authed')

    #     return Response({
    #         "authenticated": True,
    #         "username": user.username,
    #     })
    

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        
        user = authenticate(
            username=username,
            password=password,
        )
        
        if user is None:
            return Response(
                {"message": "Invalid username or password"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_staff:
            return Response(
                {"message": "You are not an admin"},
                status=status.HTTP_403_FORBIDDEN,
            )
            
            
        refresh = RefreshToken.for_user(user)
        
        response = Response({
            "message": "Login successful",
            "username": user.username,
        })
        
        response.set_cookie(
            key="access_token",
            value=str(refresh.access_token),
            httponly=True,
            secure=False,  # True when https
            samesite="Lax",
        )

        response.set_cookie(
            key="refresh_token", 
            value=str(refresh),
            httponly=True,
            secure=False,
            samesite="Lax",
        )
        
        
        return response

        
    


class isUserAuthed(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        print('ure authed')
        return Response({})
    
    
    


class getGlobalInfo(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        games = Games.objects.values_list("name", flat=True)
        data = {
            'games': games
        }
        return Response(data)


class getGameInfo(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        games = Games.objects.values_list("name", flat=True)
        data = {}
        serializer = GameInfoSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        return Response(data)





class addGame(APIView):
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

        return Response({"name": name}, status=status.HTTP_201_CREATED)
    