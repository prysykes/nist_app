from django.db import models
from django.contrib.auth.models import Group
from django.core.validators import MinValueValidator

# Create your models here.

class Category(models.Model):
    category = models.CharField(max_length=30)

    def __str__(self):
        return self.category
    
    def get_total_videos(self):
        return self.videos_set.all()
    def get_unprocessed_videos(self):
        return self.videos_set.all().filter(checked_by='')

class ProjectTitle(models.Model):
    """
        A class definind the name of the video annotation cycle
        All videos must belong to a particular project
        This helps in group management
    """
    project_name = models.CharField(max_length=30)

    def __str__(self):
        return self.project_name

class Videos(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    checked_by = models.CharField(max_length=30, null=True, blank=True)
    # sets the group associated with the video instance to null
    group = models.ForeignKey(Group, on_delete=models.SET_NULL, null=True)
    project = models.ForeignKey(ProjectTitle, default='', on_delete=models.CASCADE)
    video = models.FileField(upload_to='videos', verbose_name='Trec Videos')
    file_name = models.CharField(max_length=30, null=True, blank=True)
    status = models.BooleanField(default=False)
    number_of_annotators = models.CharField(max_length=2, null=True, blank=True)
    date_uploaded = models.DateField(auto_now_add=True)

    def __str__(self):
        return self.file_name
    
    def get_unprocessed_videos(self):
        return self.objects.all().filter(checked_by='')
    
    