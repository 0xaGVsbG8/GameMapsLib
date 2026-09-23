from django.contrib import admin
from django.db.models import Count
from django.urls import path, reverse
from django.utils.html import format_html

from . import admin_api
from .models import Category, Game, GameMap, Item, Marker, Site


class GameInline(admin.TabularInline):
    model = Game
    extra = 1


class GameMapInline(admin.TabularInline):
    model = GameMap
    extra = 1
    fields = ("id", "name", "image", "image_file", "sort_order")


class CategoryInline(admin.TabularInline):
    model = Category
    extra = 1
    fields = ("name", "sort_order")


class ItemInline(admin.TabularInline):
    model = Item
    extra = 1
    fields = ("name", "icon", "enabled_by_default", "sort_order")


class MarkerInline(admin.TabularInline):
    model = Marker
    extra = 1
    fields = ("name", "x", "y", "sort_order")


@admin.register(Site)
class SiteAdmin(admin.ModelAdmin):
    list_display = ("id", "title")
    search_fields = ("id", "title")
    inlines = [GameInline]


@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "site", "sort_order")
    list_filter = ("site",)
    search_fields = ("id", "name")
    autocomplete_fields = ("site",)
    inlines = [GameMapInline]
    save_on_top = True

    def save_formset(self, request, form, formset, change):
        instances = formset.save()
        for instance in instances:
            if isinstance(instance, GameMap) and instance.image_file:
                instance.sync_uploaded_image()


@admin.register(GameMap)
class GameMapAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "game", "image", "sort_order", "editor_link")
    list_filter = ("game",)
    search_fields = ("id", "name", "game__name")
    autocomplete_fields = ("game",)
    inlines = [CategoryInline]
    save_on_top = True

    @admin.display(description="Editor")
    def editor_link(self, obj):
        url = reverse("admin:blog_map_editor", args=[obj.pk])
        return format_html('<a class="button" href="{}">Visual editor</a>', url)

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if obj.image_file:
            obj.sync_uploaded_image()


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "map", "sort_order")
    list_filter = ("map__game", "map")
    search_fields = ("name", "slug")
    autocomplete_fields = ("map",)
    prepopulated_fields = {"slug": ("name",)}
    inlines = [ItemInline]
    save_on_top = True


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "category", "icon", "enabled_by_default", "sort_order")
    list_filter = ("enabled_by_default", "icon", "category__map__game", "category")
    search_fields = ("name", "slug")
    autocomplete_fields = ("category",)
    prepopulated_fields = {"slug": ("name",)}
    inlines = [MarkerInline]
    save_on_top = True


@admin.register(Marker)
class MarkerAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "item", "x", "y", "sort_order")
    list_filter = ("item__category__map__game", "item__category__map", "item")
    search_fields = ("name", "slug", "item__name")
    autocomplete_fields = ("item",)
    list_editable = ("x", "y")
    prepopulated_fields = {"slug": ("name",)}


def _dashboard_context():
    maps = (
        GameMap.objects.select_related("game")
        .annotate(
            category_count=Count("categories", distinct=True),
            item_count=Count("categories__items", distinct=True),
            marker_count=Count("categories__items__markers", distinct=True),
        )
        .order_by("game__sort_order", "sort_order", "name")
    )
    return {
        "dashboard_maps": maps,
        "dashboard_stats": {
            "games": Game.objects.count(),
            "maps": GameMap.objects.count(),
            "categories": Category.objects.count(),
            "markers": Marker.objects.count(),
        },
        "add_map_url": reverse("admin:blog_gamemap_add"),
        "add_category_url": reverse("admin:blog_category_add"),
        "add_marker_url": reverse("admin:blog_marker_add"),
    }


_original_index = admin.site.index
_original_get_urls = admin.site.get_urls


def _index(request, extra_context=None):
    extra_context = extra_context or {}
    extra_context.update(_dashboard_context())
    return _original_index(request, extra_context)


def _get_urls():
    custom = [
        path(
            "map-editor/<slug:map_id>/",
            admin.site.admin_view(admin_api.map_editor),
            name="blog_map_editor",
        ),
        path(
            "api/maps/<slug:map_id>/",
            admin.site.admin_view(admin_api.map_detail),
            name="blog_map_detail",
        ),
        path(
            "api/maps/<slug:map_id>/image/",
            admin.site.admin_view(admin_api.upload_map_image),
            name="blog_map_image",
        ),
        path(
            "api/categories/",
            admin.site.admin_view(admin_api.category_create),
            name="blog_category_create",
        ),
        path(
            "api/categories/<int:pk>/",
            admin.site.admin_view(admin_api.category_detail),
            name="blog_category_detail",
        ),
        path(
            "api/items/",
            admin.site.admin_view(admin_api.item_create),
            name="blog_item_create",
        ),
        path(
            "api/items/<int:pk>/",
            admin.site.admin_view(admin_api.item_detail),
            name="blog_item_detail",
        ),
        path(
            "api/markers/",
            admin.site.admin_view(admin_api.marker_create),
            name="blog_marker_create",
        ),
        path(
            "api/markers/<int:pk>/",
            admin.site.admin_view(admin_api.marker_detail),
            name="blog_marker_detail",
        ),
    ]
    return custom + _original_get_urls()


admin.site.index = _index
admin.site.get_urls = _get_urls
admin.site.index_template = "admin/blog/dashboard.html"
admin.site.site_header = "Maps Admin"
admin.site.site_title = "Maps Admin"
admin.site.index_title = "Dashboard"
