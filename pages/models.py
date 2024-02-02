from django.db import models
from django.contrib.auth.models import User

# Create your models here.
class Videos:
    checked_by = models.CharField(max_length=30, null=True, blank=True)
    video = models.FileField(upload_to='videos', verbose_name='Trec Videos')
    file_name = models.CharField(max_length=30, null=True, blank=True)
    cluster_id = models.CharField(max_length=20)
    status = models.BooleanField(default=False)
    date_uploaded = models.DateField(auto_now_add=True)

    def __str__(self):
        return self.video