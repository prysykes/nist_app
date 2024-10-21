from django.shortcuts import render
from django.shortcuts import render, redirect, get_list_or_404, get_object_or_404
from django.contrib.auth.models import User, Group
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages
from .upload_form import VideoUploadForm, ProjectTitleForm
from .models import Category, Videos
from .utils import handle_upload_videos
from .utils import display_categories, get_rem_total_per_category, get_video_list, check_user_decision, get_user_all_processed, get_paginated_video_list, serialize_videos
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.http import JsonResponse, HttpResponse
import json

from django.db.models import Q # allows us to perform != in django filter


# def health_check(request):
#     # disable SSL redirect only for this health check view
#     return JsonResponse({'status': 'ok'}, status=200)


def index(request):
    from pages.utils import prepare_processed_videos
    
    # avaliable_groups = Group.objects.all()
    # print('request.user', request.user.is_anonymous)
    video_upload_form = VideoUploadForm()
    project_title_form = ProjectTitleForm()
    categories = display_categories(request)
    # print("categories", categories)
    # print('available groups', avaliable_groups)
    user = request.user
    if not user.is_anonymous:
        user_groups = str(user.groups.all())
        #ensures that only admin can upload videos
        if "admin" in user_groups:
            total_videos = Videos.objects.all().count()
            all_processed_videos = Videos.objects.exclude(checked_by=None).count()
            if request.method == "POST":

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
                try:
                    users_processed_videos = prepare_processed_videos(request=None, user=user)
                except:
                    users_processed_videos = None
                context = {
                        'project_details': project_title_form,
                        'video_upload': video_upload_form,
                        'total_videos': total_videos,
                        'all_processed_videos': all_processed_videos,
                        'users_processed_videos': users_processed_videos
                    }
                return render(request, 'index.html', context)
    
    if not request.user.is_anonymous:
        
        user = request.user
        #TODO: redo logic for all processed videos
        # all_processed_videos = len(Videos.objects.all().filter(status=True, checked_by=str(user)))
        percentage_process_all_vids = len(Videos.objects.exclude(checked_by=None))
        total_videos = len(get_list_or_404(Videos))

        
        try:
            user_group = user.groups.all()[0]
            user_assigned_videos = []
            total_user_assigned_vids = 0
            user_categories = get_list_or_404(Category, group=user_group)
            
            for cat in user_categories:
                cur_cat_videos = get_list_or_404(Videos, category=cat)
                len_vids = len(cur_cat_videos)
                total_user_assigned_vids += len_vids
                user_assigned_videos.append(cur_cat_videos)
        except IndexError:
            user_assigned_videos = []

        user_processed_videos = Videos.objects.all().filter(checked_by=user)
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

def admin_approve(request):
    from registration.models import Userreg
    user_catergories = request.GET.get('user_catergories').split('-')
    user = user_catergories[0].strip() # user is the first item in the user_categories list
    categories = user_catergories[1:]

    user_object = User.objects.get(username=user)
    userreg_object = Userreg.objects.get(user=user_object) # userreg_object has a one-to-one to user_object
    
    # set admin_approved in the category as True
    for category in categories:
        assoc_category = Category.objects.get(cluster_keywords=category)
        assoc_category.admin_approved = True
        assoc_category.save()
    userreg_object.admin_approved = True
    userreg_object.save()
 

    return JsonResponse({"info": f"Accepted {user} videos"})

def end_annotation(request):
    user = request.GET.get('user')
    restart_end = request.GET.get('restart_end')
    if restart_end == 'true':
        assoc_user = User.objects.get(username=user)
        assoc_user.userreg.finished_job = False
        assoc_user.userreg.save()
        context = {'restarted': True}
    else:
        assoc_user = User.objects.get(username=user)
        assoc_user.userreg.finished_job = True
        assoc_user.userreg.save()
        context = {'restarted': False}
        
    
    return JsonResponse(context)

def display_videos(request):
    if request.method == 'GET':
        request_dict_keys = dict(request.GET).keys()
        if "term" in request_dict_keys:
            term = request.GET.get('term')
            videos = get_video_list(term=term)
        elif "cluster_group" in request_dict_keys:
            category = request.GET.get('category')
            cluster_group = request.GET.get('cluster_group')
            videos = get_video_list(category=category, cluster_group=cluster_group)
        else:
            category = request.GET.get('category')
            annotator = request.GET.get('annotator')
            videos = get_video_list(category=category, annotator=annotator)

    return videos

def get_videos_per_category(request):
    if request.method == 'GET':
        term = request.GET.get('term')
        assoc_category = get_object_or_404(Category, cluster_keywords=term)
        videos = assoc_category.video_categories.all().order_by('-video_similarity_score')
        serialized_videos = serialize_videos(videos)
        serialized_videos = HttpResponse(serialized_videos, content_type='application/json')
      
        # group = request.GET.get('group')
        # videos = get_paginated_video_list(term, group)
    # print('videos.get_unprocessed_videos()', videos)
    return serialized_videos

def get_unprocessed_vids(request):
    """
        Retrieves user filename and user decision (approve or reject) from a get request
        processes this video files and returns a context of remaiing unchecked videos
    """
    cur_user = request.user
    if request.method == "GET":
        file_name = request.GET.get('file_name')
        assoc_video = get_object_or_404(Videos, file_name=file_name)
        assoc_category = assoc_video.category
        videos = assoc_category.get_unprocessed_videos(cur_user)
        serialized_videos = serialize_videos(videos)
        serialized_videos = HttpResponse(serialized_videos, content_type='application/json')

    return serialized_videos

def process_user_decision(request):
    if request.method == 'GET':
        cur_user = request.user
        selection = request.GET.get('selection').split('_')
        appr_rej = selection[1]
        print('appr_rej', appr_rej)
        file_name = selection[0]
        check_user_decision(file_name, cur_user, appr_rej)

        if appr_rej == 'approve':
            return JsonResponse({'info': f"Approved {file_name}"}) 
        elif appr_rej == 'reject':
            return JsonResponse({'info': f"Rejected {file_name}"}) 

def get_next_video(request):
    cur_user = request.user
    if request.method == 'GET':
        if request.GET.get('category'):
            cluster_keywords = request.GET.get('category')
            assoc_category = Category.objects.get(cluster_keywords=cluster_keywords)
            next_video = assoc_category.video_categories.filter(status__isnull=True).order_by('-video_similarity_score').first()
            serialized_next_video = serialize_videos([next_video])
            serialized_next_video = json.loads(serialized_next_video)
            context = {"serialized_next_video": serialized_next_video}
            context = JsonResponse(context)
        else:
            file_name = request.GET.get('file_name')
            print("file_name", file_name)
            appr_rej = request.GET.get('appr_rej')
            check_user_decision(file_name, cur_user, appr_rej)
            assoc_video = get_object_or_404(Videos, file_name=file_name)
            assoc_category = assoc_video.category
        
            next_video = assoc_category.video_categories.filter(status__isnull=True).order_by('-video_similarity_score').first()
            
            serialized_next_video = serialize_videos([next_video])
            serialized_next_video = json.loads(serialized_next_video)
            
            rem_total_per_category = get_rem_total_per_category(assoc_category)

            user_all_processed = get_user_all_processed(cur_user)

            context = {"serialized_next_video": serialized_next_video,
                    "rem_total_per_category": rem_total_per_category,
                    "user_all_processed": user_all_processed}
            # # context = {"rem_total_per_category":rem_total_per_category}
            context = JsonResponse(context)
        # context = HttpResponse(context, content_type='application/json')
        
        
    return context


def reject_all(request, *args, **kwargs):
    # get request.user
    # get the user group
    # get the cluster keyword
    # pull all videos from the database matching this cluster
    # set checkedby == request.user
    # set status == False
    # to reject all the videos
    pass



   