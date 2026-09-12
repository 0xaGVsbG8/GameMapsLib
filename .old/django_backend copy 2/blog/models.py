# Create your models here.
from django.db import models


class Games(models.Model):
    name = models.CharField(
        max_length=100,
        primary_key=True
    )

    def __str__(self):
        return self.name