from django.contrib import admin

from .models import Videos, Category


class VideosAdmin(admin.ModelAdmin):
    list_display = ('file_name', 'cluster_id', 'status')
    search_fields = ['file_name']


admin.site.register(Videos, VideosAdmin)


class CategoryAdmin(admin.ModelAdmin):
    list_display = ['cluster_id']
    search_fields = ['cluster_id']


admin.site.register(Category, CategoryAdmin)



# from django.contrib import admin
# from .models import Userreg

# # Register your models here.
# class UserAdmin(admin.ModelAdmin):
#     list_display = ('user', 'date_created',)
#     search_fields = ['user']


# admin.site.register(Userreg, UserAdmin)