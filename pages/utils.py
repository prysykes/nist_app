from .models import Videos, Category, ProjectTitle
from django.shortcuts import get_list_or_404, get_object_or_404
from django.core.serializers import serialize
from django.http import HttpResponse
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth.models import User
import math
import json
import pandas as pd
import numpy as np
import os


from django.contrib.auth.models import Group, Permission

cluster_csv_file = 'media/cluster_csv/vids_clusters_keywords.csv'


APP_LABEL = 'pages'


# def create_permisions():
#     all_permisions = []
#     content_type_v = ContentType.objects.get_for_model(Videos)
#     content_type_c = ContentType.objects.get_for_model(Category)
#     video_permisions = Permission.objects.filter(content_type__app_label=APP_LABEL, content_type__model='Vidoes')
#     category_permisions = Permission.objects.filter(content_type__app_label=APP_LABEL, content_type__model='Category')
#     all_permisions.extend(video_permisions)
#     all_permisions.extend(category_permisions)

#     return all_permisions



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

def create_categories(num_annotators, groups, cluster_keyword_id_pair):
        """
            creates video clusters/category objects based on user provided cluster_csv files
            Params: num_annotators: int number of annotators for the current job
                    groups: array a list of groups to assign each category to
                    cluster_keyword_id_pair: array an array of a tupple of cluster_keyword, cluster_id
            Returns: an array of catergories
        """
        categories = []
        total_categories = len(cluster_keyword_id_pair)
        range_total_categories = range(total_categories)
        quota = math.ceil(total_categories/num_annotators)
        min_idx = 0
        max_idx = quota

        for idx in range(num_annotators):
            cur_group = groups[idx]
            assoc_category_keyword_idx = range_total_categories[min_idx:max_idx]
            for idx_cat in assoc_category_keyword_idx:
                assoc_cluster_keyword_id = cluster_keyword_id_pair[idx_cat]
                assoc_keyword = assoc_cluster_keyword_id[0]
                assoc_cluster_id = int(assoc_cluster_keyword_id[1])
                new_category = Category()
                new_category.cluster_keywords = assoc_keyword
                new_category.cluster_id = assoc_cluster_id
                new_category.group = cur_group
                new_category.save()
                categories.append(new_category)
            min_idx = max_idx
            max_idx += quota
        return categories

def handle_upload_videos(request, num_annotators, project_name, uploaded_videos, cluster_csv):
    new_project = ProjectTitle(cluster_csv=cluster_csv, project_name=project_name, number_of_annotators=num_annotators, user=request.user)
    new_project.save()

    groups = create_groups(num_annotators, project_name)

    cluster_csv_df = pd.read_csv(cluster_csv_file, index_col=0)
    cluster_keywords = np.unique(cluster_csv_df['cluster_keywords'])
    cluster_keyword_id_pair = []

    for keyword in cluster_keywords:
        assoc_cluster_id = cluster_csv_df.loc[cluster_csv_df['cluster_keywords']==keyword, 'cluster_ids']
        assoc_cluster_id = assoc_cluster_id.iloc[0]
        cur_pair = (keyword, assoc_cluster_id)
        cluster_keyword_id_pair.append(cur_pair)
    
    #create categories for videos
    create_categories(num_annotators, groups, cluster_keyword_id_pair)

    #create videos and assign to categories
    for video in uploaded_videos:
        vid_name = int(str(video).split('.')[0])
        assoc_df_row = cluster_csv_df[cluster_csv_df['filename'] == vid_name]
        cluster_id  = int(assoc_df_row['cluster_ids'].values[0])
        cluster_keywords = assoc_df_row['cluster_keywords'].values[0]
        description = assoc_df_row['captions'].values[0]
        keywords = assoc_df_row['keywords'].values[0]
        #retrieve category
        assoc_category = get_object_or_404(Category, cluster_keywords=cluster_keywords, cluster_id=cluster_id)
        
        cur_vid = Videos(video=video, checked_by=None, file_name=vid_name)
        cur_vid.category = assoc_category
        cur_vid.project = new_project
        cur_vid.keywords = keywords
        cur_vid.description = description
        cur_vid.save()


def prepare_processed_videos(request=None, user=None):
    from pages.models import ProjectTitle
    from django.db.models import Count, Q, F
    pay_load = {}

    cur_project = ProjectTitle.objects.get(user=user)
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


def  get_video_list(term=None, category=None, cluster_group=None, annotator=None):
    from django.db.models import Case, When, Value, BooleanField
    #  videos = get_video_list(term=None, category=category, cluster_group=cluster_group)
    # print("term", term, "group", group)
    if term:
        assoc_video = get_object_or_404(Videos, file_name=term)
        assoc_category = assoc_video.category
        cluster_keywords = assoc_category.cluster_keywords
        assoc_group = assoc_category.group
        print("assoc_video", assoc_video, "assoc_category", assoc_category, "assoc_group", assoc_group, "cluster_keywords", cluster_keywords)
        
        # cur_category = Category.objects.get(cluster_keywords=cluster_keywords, group=assoc_group)
        videos = Videos.objects.filter(category=assoc_category)
    elif cluster_group:
        cluster_keywords = category.strip()
        assoc_group = Group.objects.get(name=cluster_group)
        
        assoc_category = get_object_or_404(Category, cluster_keywords=cluster_keywords, group=assoc_group)
        videos = assoc_category.video_categories.annotate(
            checked=Case(
                When(checked_by=None, then=Value(False)),
                default=Value(True),
                output_field=BooleanField(),
            )
        ).order_by('-checked', 'id')
    else:
        # select all videos that as approved = True and belongs 
        # to the request.user
        cluster_keywords = category.strip()
        assoc_category = get_object_or_404(Category, cluster_keywords=cluster_keywords)
        annotator = get_object_or_404(User, username=annotator)
        # print("no", annotator, assoc_category.group)
        videos = Videos.objects.filter(category=assoc_category, checked_by__username=annotator, status=True)
        


    # print('videos', videos)
    # print('cur_cat', cur_category)
    # for video in videos:
    #         print("yipee", video.checked_by, video.status)
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
    serialized_videos = serialize('json', videos, fields=('file_name', 'video', 'checked_by', 'status'))
    # print("serialized_videos", type(serialized_videos))

    return serialized_videos 

def get_rem_total_per_category(category):
    uprocessed_videos = category.get_unprocessed_videos()
    total_videos = category.get_total_videos()
    rem_total_per_category = (len(uprocessed_videos), len(total_videos))

    # context = {"rem_total_per_category": rem_total_per_category}
    return rem_total_per_category

def get_user_all_processed(user):
    user_processed = len(get_list_or_404(Videos, checked_by=user))
  
    all_processed = len(get_list_or_404(Videos, checked_by__isnull=False))
    context = (user_processed, all_processed)
 
    return context



def check_user_decision(file_name, cur_user, appr_or_rej=None):
    # print('appr_or_rej', appr_or_rej, appr_or_rej=='approve')
    video = get_object_or_404(Videos, file_name=file_name)
    # print(video)
    
    if appr_or_rej == 'approve':
        video.checked_by = cur_user
        video.status = True
        video.save()
    elif appr_or_rej == 'reject':
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