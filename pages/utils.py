from pages.models import Videos, Category, ProjectTitle, Question, Answer
from django.shortcuts import get_list_or_404, get_object_or_404
from django.core.serializers import serialize
from django.db.models import Q, Count 
from django.http import HttpResponse
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth.models import User
from django.contrib.auth.models import Group, Permission
from django.http import JsonResponse, HttpResponse
import math
import json
import pandas as pd
import numpy as np
import os
import shutil

from django.db.models import F

from registration.models import Userreg




cluster_csv_file = 'media/cluster_csv/full_cluster_csv.csv'

parent_dir = os.getcwd()
media_dir = os.path.join(parent_dir, 'media')
finished_jobs_dir = os.path.join(media_dir, "finished_jobs")


APP_LABEL = 'pages'



def export_job(project_type):
    # print("export job hit")
    # user_fields = ['id', 'finished_job', 'admin_approved']
    assoc_project = ProjectTitle.objects.get(project_type=project_type)
    print("assoc_project", assoc_project)
    payload = []
    try:
        all_approved_users = Userreg.objects.filter(admin_approved=True, project=assoc_project)
        print("len all_approved_users", len(all_approved_users), all_approved_users)
        assoc_categories = None
        assoc_videos = None
        top_category = None
        
        for userreg_instance in all_approved_users:
            cur_payload = {}
            user = userreg_instance.user
            assoc_group = user.groups.all().first()
            # print("user", user, '\n', 'assoc_group', assoc_group)
            assoc_categories = Category.objects.filter(group=assoc_group, admin_approved=True) 
            assoc_videos = get_list_or_404(Videos, category__admin_approved=True, checked_by=user, status=True)
            top_category = assoc_categories.annotate(
                video_count=Count('video_categories', filter=Q(video_categories__status=True))
            ).order_by('-video_count').first()
            top_category_name = top_category.cluster_keywords
            num_vids_tc = top_category.video_count
            total_accepted_vids = len(assoc_videos)
        
            cur_payload['user'] = user.username
            cur_payload["top_category"] = top_category_name
            cur_payload["num_vids_tc"] = num_vids_tc
            cur_payload["total_accepted_vids"] = total_accepted_vids
            payload.append(cur_payload)

        # all_approved_users = serialize_objects(all_approved_users, *user_fields)
    except Exception as e:
        print("export_job could not find any approved users", e)
        # print(e)
        all_approved_users = None
    # print("payload", payload)
    return payload
    return JsonResponse(payload, safe=False)

def create_groups(num_annotators, project_name):
    """
    creates a group to associate with each video
    Params: num_groups: int
            project_name: str
    
    return: project_name_group_idx idx = 0, 1,2,3,4,5
    """
    groups = []
    for idx in range(1, num_annotators+1):
        cur_group, created = Group.objects.get_or_create(name=f'{project_name}_grp_{idx}')
        groups.append(cur_group)
        # group_name = Group
   
    return groups

def create_categories(new_project, num_annotators, groups, cluster_keyword_id_similarity_pair):
        """
            creates video clusters/category objects based on user provided cluster_csv files
            Params: num_annotators: int number of annotators for the current job
                    groups: array a list of groups to assign each category to
                    cluster_keyword_id_similarity_pair: array an array of a tupple of cluster_keyword, cluster_id,
                                                        cluster_similarity_score
            Returns: an array of catergories
        """
        categories = []
        total_categories = len(cluster_keyword_id_similarity_pair)
        range_total_categories = range(total_categories)
        quota = math.ceil(total_categories/num_annotators)
        min_idx = 0
        max_idx = quota

        # pick an annotator and assign videos to her
        for idx in range(num_annotators):
            cur_group = groups[idx]
            assoc_category_keyword_idx = range_total_categories[min_idx:max_idx]
            for idx_cat in assoc_category_keyword_idx:
                assoc_cluster_keyword_id_similarity = cluster_keyword_id_similarity_pair[idx_cat]
                assoc_keyword = assoc_cluster_keyword_id_similarity[0]
                assoc_cluster_id = int(assoc_cluster_keyword_id_similarity[1])
                assoc_cluster_similarity_score = round(float(assoc_cluster_keyword_id_similarity[2]), 2)
                # print("assoc_cluster_similarity_score", assoc_cluster_similarity_score)
                new_category = Category()
                new_category.cluster_keywords = assoc_keyword
                new_category.cluster_id = assoc_cluster_id
                new_category.cluster_similarity_score = assoc_cluster_similarity_score
                new_category.group = cur_group
                new_category.project = new_project
                new_category.save()
                categories.append(new_category)
            min_idx = max_idx
            max_idx += quota
        return categories

def handle_upload_videos(request, project_type, num_annotators, project_name, uploaded_videos, cluster_csv):
    if project_type == "image_qa":
        print("do process videos as image QA")
    elif project_type == "annotation":
        print("do process videos as annotation")
    # print(f"handle upload video hit {project_type}")
    
    new_project = ProjectTitle(project_type=project_type, cluster_csv=cluster_csv, project_name=project_name, number_of_annotators=num_annotators, user=request.user)
    new_project.save()
    # return {"status": "just hit"}

    groups = create_groups(num_annotators, project_name)
     # return {"status": "just hit"}

    cluster_csv_df = pd.read_csv(cluster_csv_file, index_col=0)
    cluster_keywords = np.unique(cluster_csv_df['cluster_keywords'])
    cluster_keyword_id_similarity_pair = []

    for keyword in cluster_keywords:
        assoc_cluster_id = cluster_csv_df.loc[cluster_csv_df['cluster_keywords']==keyword, 'cluster_ids']
        assoc_cluster_id = assoc_cluster_id.iloc[0]
        assoc_cluster_similarity_score = cluster_csv_df.loc[cluster_csv_df['cluster_keywords']==keyword, 'cluster_similarity_score']
        assoc_cluster_similarity_score  = assoc_cluster_similarity_score.iloc[0]
        
        cur_pair = (keyword, assoc_cluster_id, assoc_cluster_similarity_score)
        cluster_keyword_id_similarity_pair.append(cur_pair)
    
    #create categories for videos
    create_categories(new_project, num_annotators, groups, cluster_keyword_id_similarity_pair)

    #create videos and assign to categories
    for video in uploaded_videos:
        vid_name = int(str(video).split('.')[0])
        assoc_df_row = cluster_csv_df[cluster_csv_df['filename'] == vid_name]
        cluster_id  = int(assoc_df_row['cluster_ids'].values[0])
        cluster_keywords = assoc_df_row['cluster_keywords'].values[0]
        video_similarity_score = round(float(assoc_df_row['video_similarity_score'].values[0]), 2)
        description = assoc_df_row['captions'].values[0]
        keywords = assoc_df_row['keywords'].values[0]
        #retrieve category
        assoc_category = get_object_or_404(Category, cluster_keywords=cluster_keywords, cluster_id=cluster_id, project=new_project)
        
        cur_vid = Videos(video=video, checked_by=None, file_name=vid_name)
        cur_vid.category = assoc_category
        cur_vid.project = new_project
        cur_vid.keywords = keywords
        cur_vid.video_similarity_score = video_similarity_score
        # print("video_similarity_score", video_similarity_score)
        cur_vid.description = description
        cur_vid.save()


def create_question_answers(question=None, answers=None):
    new_question = Question()
    new_question.question = question
    new_question.save()
    

    for idx, ans in enumerate(answers):
        new_answer = Answer()
        new_answer.answer = ans
        new_answer.question = new_question
        if idx == 0:
            new_answer.correct = True
        new_answer.save()
    return new_question
    

def prepare_processed_videos(request=None, user=None, project_type=None):
    from pages.models import ProjectTitle
    from django.db.models import Count, Q, F
    pay_load = {}
    print(f"user {user}")
    cur_project = ProjectTitle.objects.get(user=user, project_type=project_type)
    all_groups = Group.objects.filter(name__icontains=cur_project)
    assoc_grp_users = []
    for group in all_groups:
        assoc_user = group.user_set.all()[0]
        assoc_grp_users.append(assoc_user)

  
    
    for user in assoc_grp_users:
        # retrieve user processed videos
        try:
            assoc_categories = Category.objects.filter(group__user__id=user.id).annotate(
                # count the num of associated videos where status=True
                true_status_videos=Count('video_categories', filter=Q(video_categories__status=True))
            ).filter(true_status_videos__gt=0)
            
            
        except:
            assoc_categories = None
        
 
        pay_load[user] = assoc_categories
    
    return pay_load

def display_categories(request=None):
    """
        Displays categories of videos matching user group
    """
    if not request.user.is_anonymous:
        user = request.user
        try:
            cur_group = Group.objects.get(user=user)
            print("cur_group", cur_group )
            categories = Category.objects.all().filter(group=cur_group)
            print("len(categories)", len(categories))
        except Exception as e:
            print('e', e=='Group matching query does not exist.')
            categories = None
    else:
        # videos = get_list_or_404(Videos, che=False)
        categories = Category.objects.all()
    return categories


def  get_video_list(term=None, category=None, cluster_group=None, annotator=None, assoc_project=None, is_admin=None):
    from django.db.models import Case, When, Value, BooleanField
    #  videos = get_video_list(term=None, category=category, cluster_group=cluster_group)
    # print("term", term, "group", group)
    if term:
        assoc_video = get_object_or_404(Videos, file_name=term, project=assoc_project)
        assoc_category = assoc_video.category
        cluster_keywords = assoc_category.cluster_keywords
        assoc_group = assoc_category.group
        # print("assoc_video", assoc_video, "assoc_category", assoc_category, "assoc_group", assoc_group, "cluster_keywords", cluster_keywords)
        
        # cur_category = Category.objects.get(cluster_keywords=cluster_keywords, group=assoc_group)
        videos = Videos.objects.filter(category=assoc_category, project=assoc_project)
    elif cluster_group:
        cluster_keywords = category.strip()
        assoc_group = Group.objects.get(name=cluster_group)
        
        assoc_category = get_object_or_404(Category, cluster_keywords=cluster_keywords, group=assoc_group, project=assoc_project)
        videos = assoc_category.video_categories.annotate(
            checked=Case(
                When(checked_by=None, then=Value(False)),
                default=Value(True),
                output_field=BooleanField(),
            )
        ).order_by('-checked', 'id')
    else:
        
        cluster_keywords = category.strip()
        assoc_category = get_object_or_404(Category, cluster_keywords=cluster_keywords, project=assoc_project)
        annotator = get_object_or_404(User, username=annotator)
        videos = Videos.objects.filter(category=assoc_category, checked_by__username=annotator, status=True).order_by('id')
        

    qs = videos
    # print('a qs', qs)
    videos = serialize('json', qs, fields=('file_name', 'video', 'checked_by', 'status', 'keywords'))
    
    return HttpResponse(videos, content_type='application/json')

def get_paginated_video_list(term, group):
    #term is category field in the DB
    assoc_grp = Group.objects.get(name=group)
    # print("assoc_grp", assoc_grp)
    category = Category.objects.get(cluster_id=int(term), group=assoc_grp)
    qs = Videos.objects.all().filter(category=category).filter(checked_by=None)

    videos = serialize('json', qs, fields=('file_name', 'video', 'checked_by', 'status'))
    
    return HttpResponse(videos, content_type='application/json')

def serialize_videos(videos):
    
    serialized_videos = serialize('json', videos, fields=('file_name', 'video', 'checked_by', 'status', 'video_similarity_score', 'keywords', 'project_type'))
    # print("serialized_videos", type(serialized_videos))

    return serialized_videos 

def serialize_objects(obj, *args):
    serialized_objects = serialize('json', obj, fields=args)
    return serialized_objects

def get_rem_total_per_category(category):
    uprocessed_videos = category.get_unprocessed_videos()
    total_videos = category.get_total_videos()
    rem_total_per_category = (len(uprocessed_videos), len(total_videos))

    # context = {"rem_total_per_category": rem_total_per_category}
    return rem_total_per_category

def get_user_all_processed(user, is_admin=None, category=None,project=None):

    if is_admin:
        user_processed = len(get_list_or_404(Videos, category=category, checked_by=user, status=True))
        # all_processed_videos = Videos.objects.filter(project=assoc_project_type).exclude(checked_by=None).count()
        all_processed = Videos.objects.filter(project=project, status=True).count() #len(get_list_or_404(Videos, checked_by__isnull=False, status=True))
        context = (user_processed, all_processed)
        print("admin all_processed", all_processed)
        print("admin user_processed", user_processed)
    else:
        user_processed = len(get_list_or_404(Videos, checked_by=user, status=True))
    
        all_processed = Videos.objects.filter(project=project, status=True).count() #len(get_list_or_404(Videos, checked_by__isnull=False, status=True))
        context = (user_processed, all_processed)
        print("user all_processed", all_processed)
        print("user user_processed", user_processed)
    
    return context

def move_selected_videos(destination_dir, source_dir, finished_jobs_csv):
    finished_job_df = pd.read_csv(finished_jobs_csv)
    all_videos = os.listdir(source_dir)
    sample_video_file_ext = all_videos[2].split('.')[1]
    # print(sample_video_file_ext)

    for idx, row in finished_job_df.iterrows():
        assoc_filename = row['Filenames']
        assoc_filename = str(assoc_filename) + "." + sample_video_file_ext
        
        assoc_file_index = all_videos.index(assoc_filename)
        assoc_video = all_videos[assoc_file_index]
        source_video_full_path = os.path.join(source_dir, assoc_video)
        destination_video_full_path = os.path.join(destination_dir, assoc_video)
        # copy video
        shutil.copyfile(source_video_full_path, destination_video_full_path)

        # print("checks", os.path.isfile(source_video_full_path), os.path.isfile(destination_video_full_path))
    zip_file_name = "compressed_videos"
    shutil.make_archive(os.path.join(finished_jobs_dir, zip_file_name), 'zip', destination_dir)
    return f"{zip_file_name}.zip"

def check_user_decision(file_name, cur_user, appr_or_rej=None, assoc_project=None, is_admin=None):
   
    video = get_object_or_404(Videos, file_name=file_name, project=assoc_project)
    # print("is_admin", is_admin, "file_name", file_name, "assoc_project",  assoc_project, "appr_or_rej", appr_or_rej)
    
    if appr_or_rej == 'approve':
        if is_admin:
            # no need to change the user
            video.status = True
            video.admin_approve = True
            video.save()
            
        else:
            
            video.checked_by = cur_user
            video.status = True
            video.save()
    elif appr_or_rej == 'reject':
        if is_admin:
            video.status = False
            video.admin_approve = False
            video.save()
        else:
            video.checked_by = cur_user
            video.status = False
            video.save()
 

def get_rem_and_total(category, cur_user):
    # Category.objects.all().filter(category=category)
    # cur_category = get_object_or_404(Category, category=category)
    remaining = category.get_unprocessed_videos(cur_user)
    total = category.get_total_videos()

    # serialize rem and total videos
    serialized_rem = serialize('json', remaining, fields=('file_name', 'video', 'checked_by', 'status'))
 
    serialized_total = serialize('json', total, fields=('file_name', 'video', 'checked_by', 'status'))
    serialized_rem_total = (serialized_rem, serialized_total)
    rem_total = (len(remaining), len(total))
    context = {'serialized_rem_total': serialized_rem_total,
               'rem_total': rem_total}
    
    # context = json.dumps(context, indent=2)
    # print(context, 'hii')
    return context