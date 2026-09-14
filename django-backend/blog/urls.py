from django.urls import path

from .api import views

urlpatterns = [
    path("", views.test_api, name="home"),
    path("auth-user", views.AuthUserView.as_view(), name="auth-user"),
    path("isUserAuthed", views.isUserAuthed.as_view(), name="isUserAuthed"),
    path("getGlobalInfo", views.getGlobalInfo.as_view(), name="getGlobalInfo"),
    path("getGameInfo", views.getGameInfo.as_view(), name="getGameInfo"),
    path("ManageGames", views.ManageGame.as_view(), name="ManageGames"),
    path("addMap", views.addMap.as_view(), name="addMap"),
    path("ManageCategories", views.ManageCategories.as_view(), name="ManageCategories"),
    path("ManageSubCategories", views.ManageSubCategories.as_view(), name="ManageSubCategories"),
    path("ManageItems", views.ManageItems.as_view(), name="ManageItems"),
    # path("protected", views.Protected.as_view(), name="Protected"),
]
