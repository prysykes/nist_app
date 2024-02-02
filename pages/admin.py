from django.contrib import admin

from .models import Videos


class VideosAdmin(admin.ModelAdmin):
    list_display = ['file_name', 'cluster_id', 'status']
    search_fields = ['file_name']


admin.site.register(Videos, VideosAdmin)