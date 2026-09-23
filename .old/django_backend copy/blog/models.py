from pathlib import Path
from shutil import copyfileobj

from django.conf import settings
from django.db import models
from django.utils.text import slugify

ICON_CHOICES = [
    ("travel", "Travel"),
    ("tower", "Tower"),
    ("alpha", "Alpha"),
    ("dungeon", "Dungeon"),
    ("chest", "Chest"),
    ("element", "Element"),
    ("fruit", "Fruit"),
    ("note", "Note"),
    ("statue-alt", "Statue"),
    ("grace", "Grace"),
    ("boss", "Boss"),
    ("merchant", "Merchant"),
    ("seed", "Seed"),
    ("tear", "Tear"),
]

ALLOWED_MAP_EXTENSIONS = {".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif"}


def unique_slug(value: str, exists, max_length: int = 64) -> str:
    base = slugify(value)[:max_length] or "item"
    candidate = base
    index = 2
    while exists(candidate):
        suffix = f"-{index}"
        candidate = f"{base[: max_length - len(suffix)]}{suffix}"
        index += 1
    return candidate


class Site(models.Model):
    id = models.SlugField(primary_key=True, default="default", max_length=64)
    title = models.CharField(max_length=200)

    class Meta:
        ordering = ["id"]

    def __str__(self) -> str:
        return self.title

    def as_maps_json(self) -> dict:
        games = self.games.prefetch_related(
            "maps__categories__items__markers",
        )
        return {
            "title": self.title,
            "games": [
                {
                    "id": game.id,
                    "name": game.name,
                    "maps": [
                        {
                            "id": game_map.id,
                            "name": game_map.name,
                            "image": game_map.image_url,
                            "categories": [
                                {
                                    "id": category.slug,
                                    "name": category.name,
                                    "items": [
                                        {
                                            "id": item.slug,
                                            "name": item.name,
                                            "icon": item.icon,
                                            "enabledByDefault": item.enabled_by_default,
                                            "markers": [
                                                {
                                                    "id": marker.slug,
                                                    "name": marker.name,
                                                    "x": marker.x,
                                                    "y": marker.y,
                                                }
                                                for marker in item.markers.all()
                                            ],
                                        }
                                        for item in category.items.all()
                                    ],
                                }
                                for category in game_map.categories.all()
                            ],
                        }
                        for game_map in game.maps.all()
                    ],
                }
                for game in games
            ],
        }


class Game(models.Model):
    id = models.SlugField(primary_key=True, max_length=64)
    site = models.ForeignKey(
        Site,
        on_delete=models.CASCADE,
        related_name="games",
        default="default",
    )
    name = models.CharField(max_length=200)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]

    def __str__(self) -> str:
        return self.name


class GameMap(models.Model):
    id = models.SlugField(primary_key=True, max_length=64)
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name="maps")
    name = models.CharField(max_length=200)
    image = models.CharField(
        max_length=255,
        blank=True,
        help_text="Public image path used by the map viewer, e.g. /maps/palpagos.svg",
    )
    image_file = models.FileField(
        upload_to="maps/",
        blank=True,
        help_text="Upload a map image (SVG, PNG, JPG, or WebP).",
    )
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name = "map"
        verbose_name_plural = "maps"

    def __str__(self) -> str:
        return f"{self.game.name} / {self.name}"

    @property
    def image_url(self) -> str:
        if self.image:
            return self.image
        if self.image_file:
            return self.image_file.url
        return ""

    def sync_uploaded_image(self) -> None:
        if not self.image_file:
            return
        extension = Path(self.image_file.name).suffix.lower()
        if extension not in ALLOWED_MAP_EXTENSIONS:
            return
        public_name = f"{self.id}{extension}"
        self.image = f"/maps/{public_name}"
        type(self).objects.filter(pk=self.pk).update(image=self.image)
        frontend_dir = getattr(settings, "FRONTEND_PUBLIC_MAPS", None)
        if not frontend_dir:
            return
        frontend_dir = Path(frontend_dir)
        frontend_dir.mkdir(parents=True, exist_ok=True)
        with self.image_file.open("rb") as source, (frontend_dir / public_name).open("wb") as dest:
            copyfileobj(source, dest)

    def as_editor_json(self) -> dict:
        categories = self.categories.prefetch_related("items__markers")
        return {
            "id": self.id,
            "name": self.name,
            "image": self.image_url,
            "game": {"id": self.game_id, "name": self.game.name},
            "icons": [choice[0] for choice in ICON_CHOICES],
            "categories": [
                {
                    "pk": category.pk,
                    "slug": category.slug,
                    "name": category.name,
                    "items": [
                        {
                            "pk": item.pk,
                            "slug": item.slug,
                            "name": item.name,
                            "icon": item.icon,
                            "enabledByDefault": item.enabled_by_default,
                            "markers": [
                                {
                                    "pk": marker.pk,
                                    "slug": marker.slug,
                                    "name": marker.name,
                                    "x": marker.x,
                                    "y": marker.y,
                                }
                                for marker in item.markers.all()
                            ],
                        }
                        for item in category.items.all()
                    ],
                }
                for category in categories
            ],
        }


class Category(models.Model):
    map = models.ForeignKey(GameMap, on_delete=models.CASCADE, related_name="categories")
    slug = models.SlugField(max_length=64, blank=True)
    name = models.CharField(max_length=200)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]
        constraints = [
            models.UniqueConstraint(fields=["map", "slug"], name="uniq_category_per_map"),
        ]
        verbose_name_plural = "categories"

    def __str__(self) -> str:
        return f"{self.map.name} / {self.name}"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(
                self.name,
                lambda slug: Category.objects.filter(map=self.map, slug=slug)
                .exclude(pk=self.pk)
                .exists(),
            )
        super().save(*args, **kwargs)


class Item(models.Model):
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name="items",
    )
    slug = models.SlugField(max_length=64, blank=True)
    name = models.CharField(max_length=200)
    icon = models.CharField(max_length=64, choices=ICON_CHOICES, default="travel")
    enabled_by_default = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["category", "slug"],
                name="uniq_item_per_category",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.category.name} / {self.name}"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(
                self.name,
                lambda slug: Item.objects.filter(category=self.category, slug=slug)
                .exclude(pk=self.pk)
                .exists(),
            )
        super().save(*args, **kwargs)


class Marker(models.Model):
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name="markers")
    slug = models.SlugField(max_length=64, blank=True)
    name = models.CharField(max_length=200)
    x = models.FloatField()
    y = models.FloatField()
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]
        constraints = [
            models.UniqueConstraint(fields=["item", "slug"], name="uniq_marker_per_item"),
        ]

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(
                self.name,
                lambda slug: Marker.objects.filter(item=self.item, slug=slug)
                .exclude(pk=self.pk)
                .exists(),
            )
        super().save(*args, **kwargs)
