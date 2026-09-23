from django import forms
from .models import Games



class AddGameForm(forms.ModelForm):
    class Meta:
        model = Games
        fields = ["name"]

    def clean_name(self):
        name = self.cleaned_data["name"]

        if Games.objects.filter(name=name).exists():
            raise forms.ValidationError(
                "This game category already exists"
            )

        return name