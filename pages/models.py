from django.db import models

# Create your models here.

class Category(models.Model):
    category = models.CharField(max_length=30)

    def __str__(self):
        return self.category

class Videos(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    checked_by = models.CharField(max_length=30, null=True, blank=True)
    video = models.FileField(upload_to='videos', verbose_name='Trec Videos')
    file_name = models.CharField(max_length=30, null=True, blank=True)
    status = models.BooleanField(default=False)
    date_uploaded = models.DateField(auto_now_add=True)

    def __str__(self):
        return self.file_name