import os
from django.db import models
from django.db.models.signals import post_delete
from django.dispatch import receiver
from pages.models import Videos


parent_dir = os.getcwd()
media_dir = os.path.join(parent_dir, 'media')

@receiver(post_delete, sender=Videos)
def delete_file(sender, instance, **kwargs):
    video_path_attr = instance.video_path
    file_name = instance.file_name
    video_file_path = os.path.join(media_dir, video_path_attr)
    
    video_file = os.path.join(video_file_path, file_name)

    if os.path.isfile(video_file):
        os.remove(video_file)
    