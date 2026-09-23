from django import forms

from .models import Category, GameMap, Games, Item, Marker


class AddGameForm(forms.ModelForm):
    class Meta:
        model = Games
        fields = ["name"]

    def clean_name(self):
        name = self.cleaned_data["name"]
        if Games.objects.filter(name=name).exists():
            raise forms.ValidationError("This game already exists")
        return name


class MapForm(forms.ModelForm):
    class Meta:
        model = GameMap
        fields = ["game", "name", "image"]


class CategoryForm(forms.ModelForm):
    class Meta:
        model = Category
        fields = ["map", "name"]

    def __init__(self, *args, game=None, **kwargs):
        super().__init__(*args, **kwargs)
        if game:
            self.fields["map"].queryset = GameMap.objects.filter(game=game)


class ItemForm(forms.ModelForm):
    class Meta:
        model = Item
        fields = ["category", "name"]

    def __init__(self, *args, game=None, game_map=None, **kwargs):
        super().__init__(*args, **kwargs)
        categories = Category.objects.all()
        if game_map:
            categories = categories.filter(map=game_map)
        elif game:
            categories = categories.filter(map__game=game)
        self.fields["category"].queryset = categories


class MarkerForm(forms.ModelForm):
    class Meta:
        model = Marker
        fields = ["item", "name", "x", "y"]
        widgets = {
            "x": forms.NumberInput(attrs={"step": "0.01"}),
            "y": forms.NumberInput(attrs={"step": "0.01"}),
        }

    def __init__(self, *args, game=None, game_map=None, **kwargs):
        super().__init__(*args, **kwargs)
        items = Item.objects.select_related("category")
        if game_map:
            items = items.filter(category__map=game_map)
        elif game:
            items = items.filter(category__map__game=game)
        self.fields["item"].queryset = items
