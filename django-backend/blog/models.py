from django.db import models

# Create your models here.


class Games(models.Model):
    name = models.CharField(
        max_length=100,
        primary_key=True
    )

    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name_plural = "Games"
        
        
        
class GameMaps(models.Model):
    Map_name =  models.CharField(
        max_length=100,
        primary_key=True
    )
    GameName = models.ForeignKey(
        Games,
        on_delete=models.CASCADE,
        related_name="maps"
    )
    
    image_path = models.CharField(
        max_length=200,
    )
        
    width = models.IntegerField(default=1920)
    height = models.IntegerField(default=1080)

    def __str__(self):
        return self.Map_name
    
    class Meta:
        verbose_name_plural = "Game Maps"