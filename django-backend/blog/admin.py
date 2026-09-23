from django.contrib import admin
from .models import Games, GameMaps, ItemsCategories, ItemsSubCategories, Items

# Register your models here.

admin.site.register(Games)
admin.site.register(GameMaps)
# admin.site.register(ItemsCategories)
# admin.site.register(ItemsSubCategories)
# admin.site.register(Items)



@admin.register(ItemsCategories)
class ItemsCategoriesAdmin(admin.ModelAdmin):
    list_display = ("CategoryName", "related_to")

    @admin.display(description="Related to game")
    def related_to(self, obj):
        return obj.GameName
    
    

@admin.register(ItemsSubCategories)
class ItemsCategoriesAdmin(admin.ModelAdmin):
    list_display = ("SubCategoryName", "related_to", 'related_to_category')

    @admin.display(description="Related to game")
    def related_to(self, obj):
        return obj.GameName 
    
    
    @admin.display(description="Related to category")
    def related_to_category(self, obj):
        return obj.PrimalCategory
    
    
    
    
    
@admin.register(Items)
class ItemsAdmin(admin.ModelAdmin):
    list_display = (
        "ItemName",
        "related_to_game",
        "related_to_category",
        "related_to_subcategory",
    )

    @admin.display(description="Related to game")
    def related_to_game(self, obj):
        return obj.GameName

    @admin.display(description="Related to category")
    def related_to_category(self, obj):
        return obj.CategoryName

    @admin.display(description="Related to subcategory")
    def related_to_subcategory(self, obj):
        return obj.SubCategoryName