from django.db import models
import uuid

# Create your models here.


class Games(models.Model):
    name = models.CharField(
        max_length=100,
        unique=True,
    )
    
    public = models.BooleanField(default=False)

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
    
    coordinates_feature = models.BooleanField(default=False)
    origin_x = models.FloatField(null=True, blank=True)
    origin_y = models.FloatField(null=True, blank=True)
    pixels_per_unit = models.FloatField(null=True, blank=True)
    

    def __str__(self):
        return self.Map_name
    
    class Meta:
        verbose_name_plural = "Game Maps"
        
        
        
class ItemsCategories(models.Model):
 
    CategoryName = models.CharField(
        max_length=100,
    )
    
    GameName = models.ForeignKey(
        Games,
        on_delete=models.CASCADE,
        related_name="item_categories"
    )
 
    def __str__(self):
        return self.CategoryName
    
    class Meta:
        verbose_name_plural = "Items Categories"
        constraints = [
            models.UniqueConstraint(
                fields=["CategoryName", "GameName"],
                name="unique_category_per_game"
            )
        ]
        
        
class ItemsSubCategories(models.Model):
    
    
 
    SubCategoryName = models.CharField(
        max_length=100,
    )
    
    PrimalCategory =models.ForeignKey(
        ItemsCategories,
        on_delete=models.CASCADE,
        related_name="item_subcategories"
    )
    
    
    GameName = models.ForeignKey(
        Games,
        on_delete=models.CASCADE,
        related_name="item_subcategories"
    )
    
    Default_icon = models.CharField(
        max_length=200,
        null=True
    ) #path
    
 
    def __str__(self):
        return self.SubCategoryName
    
    class Meta:
        verbose_name_plural = "Items SubCategories"      
        constraints = [
            models.UniqueConstraint(
                fields=["SubCategoryName", "GameName", 'PrimalCategory'],
                name="unique_subcategory_per_game"
            )
        ]
        
        
class Items(models.Model):
    
    ItemName = models.CharField(max_length=100)
 
    GameName = models.ForeignKey(
        Games,
        on_delete=models.CASCADE,
        related_name="Items"
    )
    
    CategoryName = models.ForeignKey(
        ItemsCategories,
        on_delete=models.CASCADE,
        related_name="Items"
    )
    
    SubCategoryName = models.ForeignKey(
        ItemsSubCategories,
        on_delete=models.CASCADE,
        related_name="Items"
    )
    
    Unique_token =  models.CharField(
        max_length=36,
        default=uuid.uuid4,
        # unique=True
    )
    
    icon = models.CharField(
        max_length=200,
        default=uuid.uuid4,
        null=True,
        blank=True,
    ) #path
    
    x_location = models.IntegerField()
    y_location = models.IntegerField()
 
    def __str__(self):
        return self.ItemName
    
    class Meta:
        verbose_name_plural = "Items"