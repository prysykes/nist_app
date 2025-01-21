from django.contrib import admin
from .models import Userreg, VideoGroup

# Register your models here.
class UserAdmin(admin.ModelAdmin):
    list_display = ('user', 'date_created',)
    search_fields = ['user']


admin.site.register(Userreg, UserAdmin)

class VideoGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_assigned')
    search_fields = ['name']

admin.site.register(VideoGroup, VideoGroupAdmin)
