from django.apps import AppConfig
from django.db.models.signals import post_delete



class PagesConfig(AppConfig):
    
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'pages'

    def ready(self):
        from pages.signals import delete_file
        from pages.models import Videos
        post_delete.connect(delete_file, sender=Videos)
