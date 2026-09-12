from django.urls import path
from . import views

urlpatterns = [
    path("", views.home, name="home"),
    path("add-game/", views.add_game, name="add_game"),
]