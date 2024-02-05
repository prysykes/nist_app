from django.shortcuts import render
from django.shortcuts import render, redirect
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages
from .upload_form import VideoUploadForm
from .models import Videos
from .utils import handle_upload_videos
from .utils import display_videos

display_videos()

# checked_by = models.CharField(max_length=30, null=True, blank=True)
#     video = models.FileField(upload_to='videos', verbose_name='Trec Videos')
#     file_name = models.CharField(max_length=30, null=True, blank=True)
#     cluster_id = models.CharField(max_length=20)
#     status = models.BooleanField(default=False)
#     date_uploaded = models.DateField(auto_now_add=True)

# @login_required(login_url='user_login')



def index(request):
    video_upload_form = VideoUploadForm()
    if request.method == 'POST':
        if request.POST.get('username') != None: #check if the login form was submitted
            print('user logn hit', request.POST)
            username = request.POST.get('username')
            password = request.POST.get('password')
            user = authenticate(request, username=username, password=password)
            if user is not None:
                login(request, user)
                return redirect('/')
            else:
                messages.info(request, "Account inactive, login to your email to activate your account")
            return redirect('/')
        else:
            video_upload_form = VideoUploadForm(request.POST, request.FILES)
            uploaded_videos = request.FILES.getlist('video')
            handle_upload_videos(request, uploaded_videos, video_upload_form)
            return redirect('/')

    else:
        context = {
            'video_upload': video_upload_form
        }
        return render(request, 'index.html', context)

def sign_up(request):
    context = {}
    return render(request, 'sign_up.html', context)