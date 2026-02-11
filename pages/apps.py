import os
import logging
from django.apps import AppConfig
from django.db.models.signals import post_delete

logger = logging.getLogger(__name__)


class PagesConfig(AppConfig):

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'pages'

    def ready(self):
        from pages.signals import delete_file
        from pages.models import Videos
        post_delete.connect(delete_file, sender=Videos)

        # Create required directory structure on app startup
        self._create_resource_directories()

    def _create_resource_directories(self):
        """
        Create the nist_trecvid_resources directory structure if it doesn't exist.
        This runs once when the app starts.
        """
        # Get the base directory (nist_app project root)
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

        # Define the resource directory structure
        resource_base = os.path.join(base_dir, 'nist_trecvid_resources')
        subdirectories = [
            'cluster_csv',
            'videos',
            'youtube_files_json',
            'youtube_files_txt',
        ]

        try:
            # Create base resource directory
            if not os.path.exists(resource_base):
                os.makedirs(resource_base)
                logger.info(f"Created resource directory: {resource_base}")

            # Create subdirectories
            for subdir in subdirectories:
                subdir_path = os.path.join(resource_base, subdir)
                if not os.path.exists(subdir_path):
                    os.makedirs(subdir_path)
                    logger.info(f"Created subdirectory: {subdir_path}")

        except Exception as e:
            logger.error(f"Error creating resource directories: {str(e)}")
