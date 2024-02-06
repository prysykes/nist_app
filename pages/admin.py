from django.contrib import admin

from .models import Videos, Category


class VideosAdmin(admin.ModelAdmin):
    list_display = ('file_name', 'category', 'status')
    search_fields = ['file_name']


admin.site.register(Videos, VideosAdmin)


class CategoryAdmin(admin.ModelAdmin):
    list_display = ['category']
    search_fields = ['category']


admin.site.register(Category, CategoryAdmin)



# from django.contrib import admin
# from .models import Userreg

# # Register your models here.
# class UserAdmin(admin.ModelAdmin):
#     list_display = ('user', 'date_created',)
#     search_fields = ['user']


# admin.site.register(Userreg, UserAdmin)