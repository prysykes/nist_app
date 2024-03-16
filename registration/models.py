from django.db import models
from django.contrib.auth.models import User

# print('USER', User)
# Create your models here.

class Userreg(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, verbose_name='User')
    title = models.CharField(max_length=5)
    date_created = models.DateField(auto_now_add=True)

    def __str__(self):
        return self.user.username
