from django.db.models import Count
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse

from .forms import AddGameForm, CategoryForm, ItemForm, MapForm, MarkerForm
from .models import Category, GameMap, Games, Item, Marker


def _selected_game(request):
    name = request.GET.get("game") or request.POST.get("selected_game")
    if not name:
        return None
    return Games.objects.filter(pk=name).first()


def _dashboard_maps(game=None):
    maps = GameMap.objects.select_related("game").annotate(
        category_count=Count("categories", distinct=True),
        item_count=Count("categories__items", distinct=True),
        marker_count=Count("categories__items__markers", distinct=True),
    )
    if game:
        maps = maps.filter(game=game)
    return maps


def _home_url(game=None):
    url = reverse("home")
    if game:
        return f"{url}?game={game.name}"
    return url


def home(request):
    selected_game = _selected_game(request)
    return render(
        request,
        "blog/index.html",
        {
            "games": Games.objects.all(),
            "selected_game": selected_game,
            "dashboard_maps": _dashboard_maps(selected_game),
            "dashboard_stats": {
                "games": Games.objects.count(),
                "maps": GameMap.objects.count(),
                "categories": Category.objects.count(),
                "markers": Marker.objects.count(),
            },
        },
    )


def add_game(request):
    if request.method == "POST":
        form = AddGameForm(request.POST)
        if form.is_valid():
            game = form.save()
            return redirect(_home_url(game))
    else:
        form = AddGameForm()

    return render(
        request,
        "blog/form.html",
        {
            "form": form,
            "games": Games.objects.all(),
            "selected_game": None,
            "title": "Add game",
            "submit_label": "Add game",
        },
    )


def add_map(request):
    selected_game = _selected_game(request)
    initial = {"game": selected_game} if selected_game else None

    if request.method == "POST":
        form = MapForm(request.POST, request.FILES)
        if form.is_valid():
            game_map = form.save()
            return redirect(_home_url(game_map.game))
    else:
        form = MapForm(initial=initial)

    return render(
        request,
        "blog/form.html",
        {
            "form": form,
            "games": Games.objects.all(),
            "selected_game": selected_game,
            "title": "Add map",
            "submit_label": "Add map",
            "multipart": True,
        },
    )


def add_category(request):
    selected_game = _selected_game(request)
    if request.method == "POST":
        form = CategoryForm(request.POST, game=selected_game)
        if form.is_valid():
            category = form.save()
            return redirect(_home_url(category.map.game))
    else:
        form = CategoryForm(game=selected_game)

    return render(
        request,
        "blog/form.html",
        {
            "form": form,
            "games": Games.objects.all(),
            "selected_game": selected_game,
            "title": "Add category",
            "submit_label": "Add category",
        },
    )


def add_marker(request):
    selected_game = _selected_game(request)
    if request.method == "POST":
        form = MarkerForm(request.POST, game=selected_game)
        if form.is_valid():
            marker = form.save()
            return redirect(_home_url(marker.item.category.map.game))
    else:
        form = MarkerForm(game=selected_game)

    return render(
        request,
        "blog/form.html",
        {
            "form": form,
            "games": Games.objects.all(),
            "selected_game": selected_game,
            "title": "Add marker",
            "submit_label": "Add marker",
        },
    )


def map_detail(request, pk):
    game_map = get_object_or_404(
        GameMap.objects.select_related("game").prefetch_related(
            "categories__items__markers"
        ),
        pk=pk,
    )
    return render(
        request,
        "blog/map_detail.html",
        {
            "games": Games.objects.all(),
            "selected_game": game_map.game,
            "game_map": game_map,
        },
    )


def map_editor(request, pk):
    game_map = get_object_or_404(
        GameMap.objects.select_related("game").prefetch_related(
            "categories__items__markers"
        ),
        pk=pk,
    )
    selected_game = game_map.game
    category_form = CategoryForm(game=selected_game, initial={"map": game_map})
    item_form = ItemForm(game_map=game_map)
    marker_form = MarkerForm(game_map=game_map)

    if request.method == "POST":
        action = request.POST.get("action")
        if action == "add_category":
            category_form = CategoryForm(request.POST, game=selected_game)
            if category_form.is_valid():
                category_form.save()
                return redirect("map_editor", pk=pk)
        elif action == "add_item":
            item_form = ItemForm(request.POST, game_map=game_map)
            if item_form.is_valid():
                item_form.save()
                return redirect("map_editor", pk=pk)
        elif action == "add_marker":
            marker_form = MarkerForm(request.POST, game_map=game_map)
            if marker_form.is_valid():
                marker_form.save()
                return redirect("map_editor", pk=pk)
        elif action == "upload_image" and request.FILES.get("image"):
            game_map.image = request.FILES["image"]
            game_map.save()
            return redirect("map_editor", pk=pk)

    markers = Marker.objects.filter(item__category__map=game_map).select_related(
        "item__category"
    )
    return render(
        request,
        "blog/map_editor.html",
        {
            "games": Games.objects.all(),
            "selected_game": selected_game,
            "game_map": game_map,
            "category_form": category_form,
            "item_form": item_form,
            "marker_form": marker_form,
            "markers": markers,
        },
    )
