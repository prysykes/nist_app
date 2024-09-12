from django.shortcuts import render
from django.shortcuts import render, redirect, get_list_or_404, get_object_or_404
from django.contrib.auth.models import User, Group
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages
from .upload_form import VideoUploadForm, ProjectTitleForm
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
    project_title_form = ProjectTitleForm()
    categories = display_categories(request)
    # print('available groups', avaliable_groups)
    user = request.user
    if not user.is_anonymous:
        user_groups = str(user.groups.all())
        #ensures that only admin can upload videos
        if "admin" in user_groups:
            if request.method == "POST":
                print("re req", request)

                project_title_form = ProjectTitleForm(request.POST, request.FILES)
                video_upload_form = VideoUploadForm(request.POST, request.FILES)
                uploaded_videos = request.FILES.getlist('video')
                cluster_csv = request.FILES.get('cluster_csv')
                num_annotators = int(request.POST.get('annotators'))
                project_name = request.POST.get('project_name')
                # print(f"uploaded_videos {uploaded_videos} \n cluster_csv {cluster_csv} \n num_annotators {num_annotators} \n project_name {project_name}")
                handle_upload_videos(request, num_annotators, project_name, uploaded_videos, cluster_csv)
                return redirect('/')
            else:
                context = {
                        'project_details': project_title_form,
                        'video_upload': video_upload_form,
                    }
                return render(request, 'index.html', context)
    
    if not request.user.is_anonymous:
        user = request.user
        #TODO: redo logic for all processed videos
        # all_processed_videos = len(Videos.objects.all().filter(status=True, checked_by=str(user)))
        percentage_process_all_vids = len(Videos.objects.exclude(checked_by=""))
        total_videos = len(get_list_or_404(Videos))
        user_group = user.groups.all()[0]
        try:
            user_assigned_videos = []
            total_user_assigned_vids = 0
            user_categories = get_list_or_404(Category, group=user_group)
            for cat in user_categories:
                cur_cat_videos = get_list_or_404(Videos, category=cat)
                len_vids = len(cur_cat_videos)
                total_user_assigned_vids += len_vids
                user_assigned_videos.append(cur_cat_videos)
            print("total_user_assigned_vids",total_user_assigned_vids)
        except IndexError:
            user_assigned_videos = []

        user_processed_videos = Videos.objects.all().filter(checked_by=str(user))
        print("len_user_processed_videos", len(user_processed_videos))
        try:
            percentage_remaining = (len(user_processed_videos)/total_user_assigned_vids) *100
            percentage_remaining = round(percentage_remaining, 2)
        except ZeroDivisionError:
            percentage_remaining = 0
        # print('user procesed video', user_processed_videos)
    else:
        percentage_remaining = None
        percentage_process_all_vids = None
    
    # print(type(categories))
   

    if request.method == "POST":
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
        else:
            messages.info(request, "Account inactive, login to your email to activate your account")
        return redirect('/')
    else:
        if categories == None or len(categories) == 0 :
            if percentage_remaining != None:
                context = {
                    'video_upload': video_upload_form,
                    'percentage_rem_user': percentage_remaining,
                    'user_processed_videos': len(user_processed_videos),
                    'total_user_assigned_vids': total_user_assigned_vids,
                    'percentage_process_all_vids': percentage_process_all_vids,
                    'total_videos': total_videos
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
                    'percentage_rem_user': percentage_remaining,
                    'user_processed_videos': len(user_processed_videos),
                    'total_user_assigned_vids': total_user_assigned_vids,
                    'percentage_process_all_vids': percentage_process_all_vids,
                    'total_videos': total_videos,
                }
            else:
                context = {
                    'video_upload': video_upload_form,
                    'categories': categories,
                    # 'percentage_rem_user': len(user_process_videos),
                }

        return render(request, 'index.html', context)

def sign_up(request):
    context = {}
    return render(request, 'sign_up.html', context)

def display_videos(request):
    if request.method == 'GET':
        request_dict_keys = dict(request.GET).keys()
        if "term" in request_dict_keys:
            term = request.GET.get('term')
            videos = get_video_list(term=term)
        else:
            category = request.GET.get('category')
            cluster_group = request.GET.get('cluster_group')
            print("cat", category, "cluster_group", cluster_group)
            videos = get_video_list(category=category, cluster_group=cluster_group)

    return videos

def paginated_vid_list(request):
    if request.method == 'GET':
        term = request.GET.get('term')
        group = request.GET.get('group')
        videos = get_paginated_video_list(term, group)
    print('videos.get_unprocessed_videos()', videos)
    return videos

def get_unprocessed_vids(request):
    """
        Retrieves user filename and user decision (approve or reject) from a get request
        processes this video files and returns a context of remaiing unchecked videos
    """
    cur_user = request.user
    if request.method == "GET":
        selection = request.GET.get('selection')
        split_selection = selection.split('_')
        file_name = split_selection[0]
        apr_rej = split_selection[1]
        assoc_video = get_object_or_404(Videos, file_name=file_name)
        assoc_category = assoc_video.category
        
        context = get_rem_and_total(assoc_category)
        # return HttpResponse(videos, content_type='application/json')
        
        check_user_decision(file_name, cur_user, appr_or_rej=apr_rej)
        # print('context', context)
    return JsonResponse(context, safe=False)


   