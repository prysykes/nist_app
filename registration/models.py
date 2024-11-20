from django.db import models
from django.contrib.auth.models import User
from pages.models import ProjectTitle

# print('USER', User)
# Create your models here.

class Userreg(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, verbose_name='User')
    title = models.CharField(max_length=5)
    date_created = models.DateField(auto_now_add=True)
    finished_job = models.BooleanField(default=False)
    admin_approved = models.BooleanField(default=False)
    # is_job_admin = models.BooleanField(default=False)
    project  = models.ForeignKey(ProjectTitle, blank=True, null=True, on_delete=models.DO_NOTHING)

    def __str__(self):
        return self.user.username
