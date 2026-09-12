from django.db import models


class Games(models.Model):
    name = models.CharField(max_length=100, primary_key=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "game"
        verbose_name_plural = "games"

    def __str__(self):
        return self.name


class GameMap(models.Model):
    game = models.ForeignKey(Games, on_delete=models.CASCADE, related_name="maps")
    name = models.CharField(max_length=200)
    image = models.FileField(upload_to="maps/", blank=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "map"
        verbose_name_plural = "maps"
        constraints = [
            models.UniqueConstraint(fields=["game", "name"], name="uniq_map_per_game"),
        ]

    def __str__(self):
        return f"{self.game.name} / {self.name}"

    @property
    def image_url(self):
        if self.image:
            return self.image.url
        return ""


class Category(models.Model):
    map = models.ForeignKey(GameMap, on_delete=models.CASCADE, related_name="categories")
    name = models.CharField(max_length=200)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "categories"

    def __str__(self):
        return f"{self.map.name} / {self.name}"


class Item(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="items")
    name = models.CharField(max_length=200)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.category.name} / {self.name}"


class Marker(models.Model):
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name="markers")
    name = models.CharField(max_length=200)
    x = models.FloatField(default=50)
    y = models.FloatField(default=50)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name
