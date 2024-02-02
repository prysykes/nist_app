from django.urls import path
from . import views

urlpatterns = [
    path('user_login', views.user_login, name='user_login'),
    path('user_logout', views.user_logout, name='user_logout'),
    path('user_registration/', views.signup, name='signup'),
    path('activate_account/<uidb64>/<token>', 
         views.VerificationView.as_view(), name='activate_account'),
]
