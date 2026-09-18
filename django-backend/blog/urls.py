from django.urls import path

from .api.views.add_map import addMap
from .api.views.auth_user import AuthUserView
from .api.views.get_game_info import getGameInfo
from .api.views.get_global_info import getGlobalInfo
from .api.views.is_user_authed import isUserAuthed
from .api.views.manage_categories import ManageCategories
from .api.views.manage_games import ManageGame
from .api.views.manage_items import ManageItems
from .api.views.manage_subcategories import ManageSubCategories
from .api.views.test_api import test_api

urlpatterns = [
    path("", test_api, name="home"),
    path("auth-user", AuthUserView.as_view(), name="auth-user"),
    path("isUserAuthed", isUserAuthed.as_view(), name="isUserAuthed"),
    path("getGlobalInfo", getGlobalInfo.as_view(), name="getGlobalInfo"),
    path("getGameInfo", getGameInfo.as_view(), name="getGameInfo"),
    path("ManageGames", ManageGame.as_view(), name="ManageGames"),
    path("addMap", addMap.as_view(), name="addMap"),
    path("ManageCategories", ManageCategories.as_view(), name="ManageCategories"),
    path("ManageSubCategories", ManageSubCategories.as_view(), name="ManageSubCategories"),
    path("ManageItems", ManageItems.as_view(), name="ManageItems"),
]
