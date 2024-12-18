import os
import pandas as pd

from django.shortcuts import render
from django.shortcuts import render, redirect, get_list_or_404, get_object_or_404
from django.contrib.auth.models import User, Group
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages
from .upload_form import VideoUploadForm, ProjectTitleForm
from .models import Category, Videos
from registration.models import Userreg
from .utils import handle_upload_videos
from .utils import (export_job, display_categories, get_rem_total_per_category, 
                    get_video_list, check_user_decision, get_user_all_processed, 
                    get_paginated_video_list, serialize_videos,
                    move_selected_videos, create_question_answers)
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.http import JsonResponse, HttpResponse
import json
from pages.utils import serialize_objects
from pages.models import Question, Answer

from django.db.models import Q, Count 



parent_dir = os.getcwd()
media_dir = os.path.join(parent_dir, 'media')
finished_jobs_dir = os.path.join(media_dir, "finished_jobs")


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
        # print("user", user)
        user_object = User.objects.get(username=user)
        userreg_object = Userreg.objects.get(user=user_object) 
        assoc_project = userreg_object.project
        #ensures that only admin can upload videos
        if "admin" in user_groups:
            total_videos = Videos.objects.filter(project=assoc_project).count()
            accepted_videos= Videos.objects.filter(project=assoc_project, status=True).count()
            if request.method == "POST":

                project_title_form = ProjectTitleForm(request.POST, request.FILES)
                video_upload_form = VideoUploadForm(request.POST, request.FILES)
                uploaded_videos = request.FILES.getlist('video')
                cluster_csv = request.FILES.get('cluster_csv')
                num_annotators = int(request.POST.get('number_of_annotators'))
                project_name = request.POST.get('project_name')
                project_type = request.POST.get('project_type')
                # print(f"uploaded_videos {uploaded_videos} \n cluster_csv {cluster_csv} \n num_annotators {num_annotators} \n project_name {project_name}")
                handle_upload_videos(request, project_type, num_annotators, project_name, uploaded_videos, cluster_csv)
                return redirect('/')
            else:
                try:
                    project_type = assoc_project.project_type
                    users_processed_videos = prepare_processed_videos(request=None, user=user, project_type=project_type)
                except:
                    users_processed_videos = None
                context = {
                        'project_details': project_title_form,
                        'video_upload': video_upload_form,
                        'total_videos': total_videos,
                        'accepted_videos': accepted_videos,
                        'users_processed_videos': users_processed_videos
                    }
                
                return render(request, 'index.html', context)
    
    if not request.user.is_anonymous:
        
        user = request.user
        user_object = User.objects.get(username=user)
        userreg_object = Userreg.objects.get(user=user_object) 
        assoc_project_type = userreg_object.project
        #TODO: redo logic for all processed videos
        # all_processed_videos = len(Videos.objects.all().filter(status=True, checked_by=str(user)))
        accepted_videos = Videos.objects.filter(project=assoc_project_type, status=True).count()
        total_videos = len(get_list_or_404(Videos, project=assoc_project_type))

        
        try:
            user_group = user.groups.all()[0]
            user_assigned_videos = []
            total_user_assigned_vids = 0
            user_categories = get_list_or_404(Category, project=assoc_project_type, group=user_group)
            
            for cat in user_categories:
                cur_cat_videos = get_list_or_404(Videos, project=assoc_project_type, category=cat)
                len_vids = len(cur_cat_videos)
                total_user_assigned_vids += len_vids
                user_assigned_videos.append(cur_cat_videos)
        except IndexError:
            user_assigned_videos = []

        user_processed_videos = Videos.objects.filter(project=assoc_project_type, checked_by=user, status=True)
        try:
            percentage_remaining = (len(user_processed_videos)/total_user_assigned_vids) *100
            percentage_remaining = round(percentage_remaining, 2)
        except ZeroDivisionError:
            percentage_remaining = 0
        # print('user procesed video', user_processed_videos)
    else:
        percentage_remaining = None
        accepted_videos = None
    
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
                    'accepted_videos': accepted_videos,
                    'total_videos': total_videos
                    # 'categories': categories
                }
            else:
                context = {
                    'video_upload': video_upload_form,
                    # 'categories': categories
                }
        else:
            first_category = categories.first()
            project_type = first_category.project.project_type
            # print("project_type", project_type)

            if percentage_remaining!= None:
                context = {
                    'video_upload': video_upload_form,
                    'categories': categories,
                    'percentage_rem_user': percentage_remaining,
                    'user_processed_videos': len(user_processed_videos),
                    'total_user_assigned_vids': total_user_assigned_vids,
                    'accepted_videos': accepted_videos,
                    'total_videos': total_videos,
                    'project_type': project_type
                }
            else:
                context = {
                    'video_upload': video_upload_form,
                    'categories': categories,
                    'project_type': project_type 
                    # 'percentage_rem_user': len(user_process_videos),
                }

        return render(request, 'index.html', context)

def sign_up(request):
    context = {}
    return render(request, 'sign_up.html', context)

def retrieve_video_qa(request):
    payload = {}
    file_name = request.GET.get('file_name')
    cluster_keywords = request.GET.get('cluster_keywords')
    annotator = request.GET.get('annotator')
    user = request.user
    user_obj = User.objects.get(username=user)
    userreg_obj = Userreg.objects.get(user=user_obj)

    assoc_project = userreg_obj.project
    assoc_category = Category.objects.get(project=assoc_project, cluster_keywords=cluster_keywords)
    # print(file_name,"-", assoc_project, "-", assoc_category)
    if not annotator:
        # called from user page
        assoc_video = Videos.objects.get(file_name=file_name, checked_by=user, project=assoc_project, category=assoc_category)

    else:
        # called from admin page
        user = User.objects.get(username=annotator)
        assoc_video = Videos.objects.get(file_name=file_name, project=assoc_project, category=assoc_category)

    try:
        assoc_question = assoc_video.question
        assoc_answers = assoc_question.question_answers.all()
        question_load = {"id": assoc_question.id,
                         "value": assoc_question.question}
        payload['question'] = question_load

        for idx, ans in enumerate(assoc_answers):
            if ans.correct:
                answer_load = {"id": ans.id,
                               "value":ans.answer}
                payload[f'ans-{idx}-correct'] = answer_load
            else:
                answer_load = {"id": ans.id,
                               "value":ans.answer}
                payload[f'ans-{idx}'] = answer_load
    except:
        payload['question'] = None
    return JsonResponse({"data": payload})

def submit_vid_qa(request):
    if request.method == 'POST':
        is_edit = request.GET.get('is_edit')
        video_filename = request.POST.get('video_filename')
        cluster_keywords = request.POST.get('cluster_keyword')

        user = request.user
        user_object = User.objects.get(username=user)
        userreg_object = Userreg.objects.get(user=user_object)
        assoc_project = userreg_object.project
        assoc_category = Category.objects.get(cluster_keywords=cluster_keywords, project=assoc_project)
        cur_video = Videos.objects.get(category=assoc_category, project=assoc_project, file_name=video_filename)
        
        if is_edit:
            print("is edit", cur_video)
            # print("request.POST", request.POST)
            def populate_payload(assoc_id, key, value, payload, obj=None, isQuestion=False):
                if isQuestion:
                    payload.setdefault(key, {"id": assoc_id, "value":value})
                else:
                    if  obj.correct:
                        payload.setdefault(f'{key}-correct', {"id": assoc_id, "value":value})
                    else:
                        payload.setdefault(key, {"id": assoc_id, "value":value})
                return payload
            payload = {}

            for key, value in request.POST.items():
                # print(key, value)
                if "question" in key:
                    assoc_id = int(key.split('-')[-1])
                    new_key = key.split('-')[0]
                    question = {"id":assoc_id, "value":value}
                    assoc_question = Question.objects.get(id=assoc_id)

                    assoc_question.question = value
                    assoc_question.save()
                    cur_video.question = assoc_question
                    cur_video.save()
                    populate_payload(assoc_id, new_key, value, payload, isQuestion=True)
                    # print("assoc_question", assoc_question, "new_qs_text", value)
                elif "ans-0" in key:
                    assoc_id = int(key.split('-')[-1])
                    new_key = key.split('-')[0] + "-" + key.split('-')[1]
                    correct_ans = {"id":assoc_id, "value":value}
                    assoc_ans = Answer.objects.get(id=assoc_id)
                    assoc_ans.answer = value
                    assoc_ans.save()
                    populate_payload(assoc_id, new_key, value, payload, obj=assoc_ans, isQuestion=False)
                    
                elif "ans-1" in key:
                    assoc_id = int(key.split('-')[-1])
                    new_key = key.split('-')[0] + "-" + key.split('-')[1]
                    answer_one = {"id":assoc_id, "value":value}
                    assoc_ans = Answer.objects.get(id=assoc_id)
                    assoc_ans.answer = value
                    
                    assoc_ans.save()
                    populate_payload(assoc_id, new_key, value, payload, obj=assoc_ans, isQuestion=False)
                elif "ans-2" in key:
                    assoc_id = int(key.split('-')[-1])
                    new_key = key.split('-')[0] + "-" + key.split('-')[1]
                    answer_two = {"id":assoc_id, "value":value}
                    assoc_ans = Answer.objects.get(id=assoc_id)
                    assoc_ans.answer = value
                    
                    assoc_ans.save()
                    populate_payload(assoc_id, new_key, value, payload, obj=assoc_ans, isQuestion=False)
                elif "ans-3" in key:
                    assoc_id = int(key.split('-')[-1])
                    new_key = key.split('-')[0] + "-" + key.split('-')[1]
                    answer_three = {"id":assoc_id, "value":value}
                    assoc_ans = Answer.objects.get(id=assoc_id)
                    assoc_ans.answer = value
                   
                    assoc_ans.save()
                    populate_payload(assoc_id, new_key, value, payload, obj=assoc_ans, isQuestion=False)
            #TODO: return a payload of the editted and replace the div
            return JsonResponse(payload)
                   
        else:
            question = request.POST.get('question')
            correct_ans = request.POST.get('correct_ans')
            answer_one = request.POST.get('opt_ans_one')
            answer_two = request.POST.get('opt_ans_two')
            answer_three = request.POST.get('opt_ans_three')
            answers = [correct_ans, answer_one, answer_two, answer_three]

            if question:
                #process video question
                question_obj = create_question_answers(question=question, answers=answers)
                cur_video.question = question_obj
                cur_video.status = True
                cur_video.checked_by = user
                cur_video.save()
            else:
                cur_video.status = False
                cur_video.checked_by = user
                cur_video.save()
        

       
    return JsonResponse({"info":"QA and Video sent"})

def admin_approve(request):
    from registration.models import Userreg
    admin_user = request.user
    admin_user_object = User.objects.get(username=admin_user)
    admin_userreg_obj = Userreg.objects.get(user=admin_user_object)
    project = admin_userreg_obj.project
    project_type = project.project_type
    
    if request.GET.get('user_catergories'):
        # print("user_catergories hit")

        user_catergories = request.GET.get('user_catergories').split('-')
        user = user_catergories[0].strip() # user is the first item in the user_categories list
        categories = user_catergories[1:]
        # print("categories", categories)
        status = request.GET.get('status')
        # print(status, "status")
        # return JsonResponse({"info": f"Accepted {user} videos"})
        user_object = User.objects.get(username=user)
        userreg_object = Userreg.objects.get(user=user_object) # userreg_object has a one-to-one to user_object
        # assoc_project = userreg_object.project
        
        # set admin_approved in the category as True
        for category in categories:
            assoc_category = Category.objects.get(cluster_keywords=category, project=project)
            if status == "approved":
                # print("approving all")
                assoc_category.admin_approved = True
                assoc_category.save()
            elif status == "rejected":
                assoc_category.admin_approved = False
                assoc_category.save()
        if status == "approved":
            userreg_object.admin_approved = True
            userreg_object.save()
        elif status == "rejected":
            userreg_object.admin_approved = False
            userreg_object.save()
 

        # return JsonResponse({"info": f"Accepted {user} videos"})
    
    elif request.GET.get('cluster_keyword'):
        cluster_keyword = request.GET.get("cluster_keyword")
        status = request.GET.get("status")
        assoc_category = Category.objects.get(cluster_keywords=cluster_keyword, project=project)
        assoc_group = assoc_category.group
        assoc_user = assoc_group.user_set.all()[0]
        assoc_user = Userreg.objects.filter(user=assoc_user)[0]
        
        # print("len(all_user_approved_category)", len(all_user_approved_category))
        # print("assoc_users.admin_approved", assoc_users.admin_approved)
        
        # print("assoc_users",  assoc_users)
        # retrieve the user here and make the admin approve = True
        if status == "approved":
            # print(">> approve per cluster")
            # print("sats", status)
            assoc_user.admin_approved = True
            assoc_user.save()
            assoc_category.admin_approved = True
            assoc_category.save()
        elif status == "rejected":
            # print("unapprove per cluster")
            assoc_category.admin_approved = False
            assoc_category.save()
            all_user_approved_category = Category.objects.filter(group=assoc_group, admin_approved=True)
            # check if there is no more approved category uder this user
            # if so, then set the admin approved of this user == 0
            if len(all_user_approved_category) == 0:
                assoc_user.admin_approved = False
                assoc_user.save()
            
        
        # return JsonResponse({"info": f"{cluster_keyword} {status}" })
    
    payload = export_job(project_type)
    # print("payload", payload)
    return JsonResponse(payload, safe=False)

def get_job_summary(request):
    project_type = request.GET.get("project_type")
    payload = export_job(project_type)
    
    return JsonResponse(payload, safe=False)

def export_all_videos(request):
    usernames = request.GET.get("usernames")
    FIELDS = ["Users", "Video Categories", "Filenames"]
    username_col_vals = []
    category_col_vals = []
    file_name_col_vals = []
    videos = [FIELDS]
    users_categories_videos = {}
    data = {}
    if usernames:
        usernames_list = usernames.split('_')
        # print("usernames_list", usernames_list)
        
        for user in usernames_list:
            users_categories_videos.setdefault(user, {})

            user_object = User.objects.get(username=user)
            assoc_group = user_object.groups.all().first()
            assoc_categories = Category.objects.filter(group=assoc_group, admin_approved=True)
            for assoc_cat in assoc_categories:
                assoc_cluster_keywords = assoc_cat.cluster_keywords
                

                assoc_videos = list(Videos.objects.filter(category=assoc_cat, checked_by=user_object, status=True).values_list('file_name', flat=True))
                assoc_total_videos = len(assoc_videos)

                users_list = [user]
                assoc_cluster_keywords_list = [assoc_cluster_keywords]
                users_list *=assoc_total_videos
                assoc_cluster_keywords_list *= assoc_total_videos
                # print("users_list", users_list, assoc_cluster_keywords_list)
                username_col_vals.extend(users_list)
                category_col_vals.extend(assoc_cluster_keywords_list)
                file_name_col_vals.extend(assoc_videos)
                
                # users_categories_videos[user].setdefault(assoc_cluster_keywords, None)
                # users_categories_videos[user][assoc_cluster_keywords] = assoc_videos
                # videos.append(list(assoc_videos))
        

    data["Users"] = username_col_vals
    data["Video Categories"] = category_col_vals
    data["Filenames"] = file_name_col_vals

    df = pd.DataFrame(data)
    finished_jobs_csv = os.path.join(finished_jobs_dir, "finished_jobs.csv")
    df.to_csv(finished_jobs_csv, index=False)
   
    finished_jobs_csv = "media/finished_jobs/finished_jobs.csv"
    destination_dir = os.path.join(finished_jobs_dir, "selected_videos")
    source_dir = os.path.join(media_dir, "videos")
    # print("is dir", os.path.isdir(destination_dir), os.path.isdir(source_dir))
    if len(destination_dir) < 2:
        zip_file_name = move_selected_videos(destination_dir, source_dir, finished_jobs_csv)
        zip_file_path = f"media/finished_jobs/{zip_file_name}"
    else:
        zip_file_path = f"media/finished_jobs/compressed_videos.zip"
   

    # print("data", data)
        
        # print("assoc cat", len(assoc_categories))
    # print("users_categories_videos", users_categories_videos)
    
    return JsonResponse({"finished_job_csv": finished_jobs_csv,
                         "zip_file_path":zip_file_path})

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
        user = request.user
        user_object = User.objects.get(username=user)
        userreg_object = Userreg.objects.get(user=user_object) 
        assoc_project = userreg_object.project
        if "term" in request_dict_keys:
            term = request.GET.get('term')
            videos = get_video_list(term=term, assoc_project=assoc_project)
        elif "cluster_group" in request_dict_keys:
            category = request.GET.get('category')
            cluster_group = request.GET.get('cluster_group')
            videos = get_video_list(category=category, cluster_group=cluster_group, assoc_project=assoc_project)
        else:
            is_admin = request.GET.get('is_admin')
            if is_admin:
                category = request.GET.get('category')
                annotator = request.GET.get('annotator')
                videos = get_video_list(category=category, annotator=annotator, assoc_project=assoc_project, is_admin=is_admin)
            else:
                category = request.GET.get('category')
                annotator = request.GET.get('annotator')
                videos = get_video_list(category=category, annotator=annotator, assoc_project=assoc_project)

    return videos

def get_videos_per_category(request):
    if request.method == 'GET':
        import json
        
        from registration.models import Userreg
        term = request.GET.get('term')
        user = request.user
        assoc_usereg_instance = Userreg.objects.get(user=user)
        assoc_proj = assoc_usereg_instance.project
        # print("assoc_proj", assoc_proj)

        assoc_category = get_object_or_404(Category, cluster_keywords=term, project=assoc_proj)
        # assoc_vid = Videos.objects.get(category=assoc_category, project=assoc_proj, file_name="24964")
        # assoc_vid.checked_by = None
        # assoc_vid.status = None
        # assoc_vid.question = None
        # assoc_vid.save()
        # return
        videos = assoc_category.video_categories.all().order_by('-video_similarity_score')
        serialized_videos = serialize_videos(videos)
        serialized_videos_json = json.loads(serialized_videos)
        # print("serialized_videos", serialized_videos_json)
        context = {"serialized_videos": serialized_videos_json,
                   "project_type": assoc_proj.project_type}
        # print("context", context)
        serialized_videos = JsonResponse(context, safe=False)
      
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
        # print('appr_rej', appr_rej)
        file_name = selection[0]
        check_user_decision(file_name, cur_user, appr_rej)

        if appr_rej == 'approve':
            return JsonResponse({'info': f"Approved {file_name}"}) 
        elif appr_rej == 'reject':
            return JsonResponse({'info': f"Rejected {file_name}"}) 

def get_next_video(request):
    is_admin = request.GET.get('is_admin')
    
    
    cur_user = request.user
    user_object = User.objects.get(username=cur_user )
    userreg_object = Userreg.objects.get(user=user_object)
    assoc_project = userreg_object.project
    if request.method == 'GET':
        if request.GET.get('category'):
            
            cluster_keywords = request.GET.get('category')
            assoc_category = Category.objects.get(cluster_keywords=cluster_keywords, project=assoc_project)
            next_video = assoc_category.video_categories.filter(status__isnull=True).order_by('-video_similarity_score').first()
            serialized_next_video = serialize_videos([next_video])
            serialized_next_video = json.loads(serialized_next_video)
            context = {"serialized_next_video": serialized_next_video}
            context = JsonResponse(context)
        else:
            # print("is_admin!!", is_admin, file_name)
            file_name = request.GET.get('file_name')
            appr_rej = request.GET.get('appr_rej')
            
            check_user_decision(file_name, cur_user, appr_rej, assoc_project, is_admin)
            assoc_video = get_object_or_404(Videos, file_name=file_name, project=assoc_project)
            assoc_category = assoc_video.category
            project_type = assoc_project.project_type
            

            if is_admin:
                from_admin_edit = request.GET.get('from_admin_edit')
                if from_admin_edit:
                    next_video = assoc_category.video_categories.filter(status=True, admin_approve=True, question__isnull=False).order_by('id').first()
                else:
                    next_video = assoc_category.video_categories.filter(status=True, admin_approve=False).order_by('id').first()
            else:
                next_video = assoc_category.video_categories.filter(status__isnull=True).order_by('-video_similarity_score').first()
            
            serialized_next_video = serialize_videos([next_video])
            serialized_next_video = json.loads(serialized_next_video)
            annotator = assoc_video.checked_by
          
        
            rem_total_per_category = get_rem_total_per_category(assoc_category)

            if is_admin:
                category_all_processed = get_user_all_processed(annotator, is_admin=is_admin, category=assoc_category, project=assoc_project)
                user_all_processed = category_all_processed
            else:
                user_all_processed = get_user_all_processed(cur_user, project=assoc_project)
            # print("user_all_processed", user_all_processed)
            
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



   