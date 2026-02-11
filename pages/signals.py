import os
import logging
from django.db.models.signals import post_delete
from django.dispatch import receiver
from pages.models import Videos

logger = logging.getLogger(__name__)

parent_dir = os.getcwd()
resources_dir = os.path.join(parent_dir, 'nist_trecvid_resources')

@receiver(post_delete, sender=Videos)
def delete_file(sender, instance, **kwargs):
    """Delete the video file when a Videos instance is deleted"""
    try:
        video_path_attr = instance.video_path
        file_name = instance.file_name

        # Skip if video_path is None, empty, or the string "None"
        if not video_path_attr or video_path_attr == 'None' or video_path_attr == 'null':
            logger.debug(f"Skipping file deletion for {file_name}: invalid video_path")
            return

        # Skip if file_name is None or empty
        if not file_name:
            logger.debug("Skipping file deletion: no file_name")
            return

        video_file_path = os.path.join(resources_dir, video_path_attr)
        video_file = os.path.join(video_file_path, file_name)

        if os.path.isfile(video_file):
            os.remove(video_file)
            logger.info(f"Deleted video file: {video_file}")
    except Exception as e:
        logger.error(f"Error deleting video file: {str(e)}")
    