from django.contrib import admin

from .models import Videos, Category, ProjectTitle


class VideosAdmin(admin.ModelAdmin):
    list_display = ('file_name', 'category', 'status')
    search_fields = ['file_name']


admin.site.register(Videos, VideosAdmin)


class CategoryAdmin(admin.ModelAdmin):
    list_display = ['cluster_keywords']
    search_fields = ['cluster_keywords']


admin.site.register(Category, CategoryAdmin)

class ProjectTitleAdmin(admin.ModelAdmin):
    list_display = ['project_name', 'number_of_annotators']
    search_fields = ('project_name',)

admin.site.register(ProjectTitle, ProjectTitleAdmin)

# class AnnotationGroupAdmin(admin.ModelAdmin):
#     list_display = ("name",)
#     search_fields = ['name']

# admin.site.register(AnnotationGroup, AnnotationGroupAdmin)

# from django.contrib import admin
# from .models import Userreg

# # Register your models here.
# class UserAdmin(admin.ModelAdmin):
#     list_display = ('user', 'date_created',)
#     search_fields = ['user']


# admin.site.register(Userreg, UserAdmin)