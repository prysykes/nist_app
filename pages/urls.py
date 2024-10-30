from django.urls import path
from . import views




urlpatterns = [
    path('', views.index, name='index'), 
    path('display_videos', views.display_videos, name='display_videos'),
    path('get_videos_per_category', views.get_videos_per_category, name='get_videos_per_category'),
    path('get_next_video', views.get_next_video, name='get_next_video'),
    path('get_unprocessed_vids', views.get_unprocessed_vids, name='get_unprocessed_vids'),
    path('process_user_decision', views.process_user_decision, name='process_user_decision'),
    path('admin_approve', views.admin_approve, name='admin_approve'),
    path('reject_all', views.reject_all, name="reject_all"),
    path('end_annotation', views.end_annotation, name='end_annotation'),
    path('export_job', views.export_job, name="export_job"),
    path('export_all_videos', views.export_all_videos, name='export_all_videos')
    
]