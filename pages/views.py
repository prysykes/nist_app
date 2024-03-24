from django.shortcuts import render
from django.shortcuts import render, redirect, get_list_or_404
from django.contrib.auth.models import User, Group
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages
from .upload_form import VideoUploadForm
from .models import Category, Videos
from .utils import handle_upload_videos
from .utils import display_categories, get_rem_and_total,  get_video_list, check_user_decision, get_paginated_video_list
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.http import JsonResponse

from django.db.models import Q # allows us to perform != in django filter




def index(request):
    
    # avaliable_groups = Group.objects.all()
    # print('request.user', request.user.is_anonymous)
    video_upload_form = VideoUploadForm()
    categories = display_categories(request)
    # print('available groups', avaliable_groups)
    
    if not request.user.is_anonymous:
        user = request.user
        all_videos = Videos.objects.all()
        all_processed_videos = Videos.objects.all().filter(~Q(checked_by=''))
        percentage_process_all_vids = round(len(all_processed_videos)/ len(all_videos) * 100)
        print('percentage_process_all_vids', percentage_process_all_vids)
        groups = user.groups.all()
        cur_category = Category.objects.all().filter(group = groups[0])
        user_assigned_videos = Videos.objects.all().filter(group=groups[0])
        # print('groups', str(groups[0]), cur_category, len(user_assigned_videos))
        
        user_processed_videos = Videos.objects.all().filter(checked_by=user)
        percentage_remaining = round(len(user_processed_videos)/len(user_assigned_videos) *100)
        # print('user procesed video', user_processed_videos)
    else:
        percentage_remaining = None
        percentage_process_all_vids = None
    
    # print(type(categories))
    if request.method == 'POST':
        if request.POST.get('username') != None: #check if the login form was submitted
            # print('user logn hit', request.POST)
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
            num_annotators = int(request.POST.get('annotators'))
            project_name = request.POST.get('project_name')
            handle_upload_videos(request, num_annotators, project_name, uploaded_videos, video_upload_form)
            return redirect('/')

    else:
        if categories == None or len(categories) == 0 :
            if percentage_remaining != None:
                context = {
                    'video_upload': video_upload_form,
                    'total_processed': percentage_remaining,
                    'percentage_process_all_vids': percentage_process_all_vids
                    # 'categories': categories
                }
            else:
                context = {
                    'video_upload': video_upload_form,
                    # 'categories': categories
                }
        else:
            if percentage_remaining!= None:
                context = {
                    'video_upload': video_upload_form,
                    'categories': categories,
                    'total_processed': percentage_remaining,
                    'percentage_process_all_vids': percentage_process_all_vids
                }
            else:
                context = {
                    'video_upload': video_upload_form,
                    'categories': categories,
                    # 'total_processed': len(user_process_videos),
                }

        return render(request, 'index.html', context)

def sign_up(request):
    context = {}
    return render(request, 'sign_up.html', context)

def display_videos(request):
    if request.method == 'GET':
        term = request.GET.get('term')
        # print(term)
    
    videos = get_video_list(term)
    # print(videos)

    return videos

def paginated_vid_list(request):
    if request.method == 'GET':
        term = request.GET.get('term')
        videos = get_paginated_video_list(term)
    print('videos.get_unprocessed_videos()', videos)
    return videos

def get_unprocessed_vids(request):
    cur_user = request.user
    print(cur_user, 'cur')
    if request.method == "GET":
        selection = request.GET.get('selection')
        split_selection = selection.split('_')
        file_name = split_selection[0]
        category = split_selection[1]
        apr_rej = split_selection[2]
        context = get_rem_and_total(category)
        # return HttpResponse(videos, content_type='application/json')
        
        check_user_decision(file_name, category, cur_user, appr_or_rej=apr_rej)
        # print('context', context)
    return JsonResponse(context, safe=False)


   