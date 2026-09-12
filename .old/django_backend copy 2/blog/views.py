from django.shortcuts import render, redirect
from django.http import HttpResponse
from .models import Games
from .forms import AddGameForm

# Create your views here.


def home(request):
    
    if request.method == 'POST':
        selected_game = request.POST.get("selected_game")
    
    return render( request, 'blog/index.html',{
        "games": Games.objects.all(),
        "selected_game": selected_game,
    })
    
    
    

def add_game(request):
    if request.method == "POST":
        form = AddGameForm(request.POST)

        if form.is_valid():
            form.save()
            return redirect("home")
    else:
        form = AddGameForm()

    return render(request, "blog/add_game.html", {
        "form": form,
    })