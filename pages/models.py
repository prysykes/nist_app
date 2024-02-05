from django.db import models

# Create your models here.

class Category(models.Model):
    cluster_id = models.CharField(max_length=30, unique=True)

    def __str__(self):
        return self.cluster_id

class Videos(models.Model):
    cluster_id = models.ForeignKey(Category, on_delete=models.CASCADE, default='cluster_id')
    checked_by = models.CharField(max_length=30, null=True, blank=True)
    video = models.FileField(upload_to='videos', verbose_name='Trec Videos')
    file_name = models.CharField(max_length=30, null=True, blank=True)
    status = models.BooleanField(default=False)
    date_uploaded = models.DateField(auto_now_add=True)

    def __str__(self):
        return self.file_name