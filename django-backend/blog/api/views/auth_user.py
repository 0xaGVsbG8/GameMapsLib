from django.contrib.auth import authenticate
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from ..helpers import first_error, request_fields


class AuthUserSerializer(serializers.Serializer):
    username = serializers.CharField(
        error_messages={
            "required": "Username is required",
            "blank": "Username is required",
        },
    )
    password = serializers.CharField(
        error_messages={
            "required": "Password is required",
            "blank": "Password is required",
        },
    )


class AuthUserView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = AuthUserSerializer(data=request_fields(request))
        if not serializer.is_valid():
            return Response(
                {"message": first_error(serializer.errors)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(
            username=serializer.validated_data["username"],
            password=serializer.validated_data["password"],
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

        cookie_kwargs = {
            "httponly": True,
            "secure": False,
            "samesite": "Lax",
            "path": "/",
        }
        response.set_cookie(
            key="access_token",
            value=str(refresh.access_token),
            **cookie_kwargs,
        )
        response.set_cookie(
            key="refresh_token",
            value=str(refresh),
            **cookie_kwargs,
        )

        return response
