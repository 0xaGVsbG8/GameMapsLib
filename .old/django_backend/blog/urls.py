from django.urls import path

from . import views

urlpatterns = [
    path("", views.home, name="home"),
    path("add-game/", views.add_game, name="add_game"),
    path("add-map/", views.add_map, name="add_map"),
    path("add-category/", views.add_category, name="add_category"),
    path("add-marker/", views.add_marker, name="add_marker"),
    path("maps/<int:pk>/", views.map_detail, name="map_detail"),
    path("maps/<int:pk>/editor/", views.map_editor, name="map_editor"),
]
