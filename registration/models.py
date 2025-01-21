from django.db import models
from django.contrib.auth.models import User, Group
from pages.models import ProjectTitle, VideoGroup

# print('USER', User)
# Create your models here.

class Userreg(models.Model):
    PROJECT_TYPE = [
        ("annotation", "Video Annotation"),
        ("video_qa", "Video Question Answering")
    ]
    project_type = models.CharField(max_length=10, choices=PROJECT_TYPE, default="annotation")
    project_name = models.CharField(max_length=50, default="")
    user = models.OneToOneField(User, on_delete=models.CASCADE, verbose_name='User', related_name='userreg')
    date_created = models.DateField(auto_now_add=True)
    finished_job = models.BooleanField(default=False)
    admin_approved = models.BooleanField(default=False)
    # is_admin = models.BooleanField(default=False)
    is_job_admin = models.BooleanField(default=False)
    group = models.ForeignKey(VideoGroup, blank=True, null=True, on_delete=models.DO_NOTHING, related_name='userregs')
    project  = models.ForeignKey(ProjectTitle, blank=True, null=True, on_delete=models.DO_NOTHING)

    def activate_user(self):
        self.user.is_active = True
        self.user.save()
    def __str__(self):
        return self.user.username

