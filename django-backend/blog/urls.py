from django.urls import path

from .api import views

urlpatterns = [
    path("", views.test_api, name="home"),
    path("auth-user", views.AuthUserView.as_view(), name="auth-user"),
    path("isUserAuthed", views.isUserAuthed.as_view(), name="isUserAuthed"),
    path("getGlobalInfo", views.getGlobalInfo.as_view(), name="getGlobalInfo"),
    path("getGameInfo", views.getGameInfo.as_view(), name="getGameInfo"),
    path("addGame", views.addGame.as_view(), name="addGame"),
    # path("protected", views.Protected.as_view(), name="Protected"),
]
