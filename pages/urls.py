from django.urls import path
from . import views




urlpatterns = [
    path('', views.index, name='index'), 
    path('display_videos', views.display_videos, name='display_videos'),
    path('process_user_selection', views.process_user_selection, name='process_user_selection'),
    
]