from pages.models import Videos, Category, ProjectTitle, Question, Answer
from django.shortcuts import get_list_or_404, get_object_or_404
from django.core.serializers import serialize
from django.db.models import Q, Count 
from django.http import HttpResponse
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth.models import User
from django.contrib.auth.models import Group, Permission
from django.http import JsonResponse, HttpResponse
from pages.models import VideoGroup
from settings.config import BASE_ID_START_POINT
import glob
import math
import random
import json
import pandas as pd
import numpy as np
import os
import shutil

from django.db.models import F

from registration.models import Userreg




# cluster_csv_file = 'media/cluster_csv/full_cluster_csv.csv'
csv_base_dir = os.path.join('media', 'cluster_csv')
parent_dir = os.getcwd()
media_dir = os.path.join(parent_dir, 'media')
finished_jobs_dir = os.path.join(media_dir, "finished_jobs")
local_video_path = os.path.join(media_dir, 'videos')


APP_LABEL = 'pages'



def export_job(assoc_project):
    # print("export job hit")
    # user_fields = ['id', 'finished_job', 'admin_approved']
    payload = []
    try:
        all_approved_users = Userreg.objects.filter(admin_approved=True, project=assoc_project)
        assoc_categories = None
        assoc_videos = None
        top_category = None
        
        for userreg_instance in all_approved_users:
            cur_payload = {}
            user = userreg_instance.user
            assoc_group = userreg_instance.group
            
            # print("user", user, '\n', 'assoc_group', assoc_group)
            assoc_categories = Category.objects.filter(group=assoc_group, admin_approved=True) 
            assoc_videos = get_list_or_404(Videos, category__admin_approved=True, checked_by=user, status=True, is_available=True)
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
        cur_group, created = VideoGroup.objects.get_or_create(name=f'{project_name}_grp_{idx}', project_name=project_name)
        groups.append(cur_group)
        # group_name = Group
   
    return groups

def helper_category_creation(new_project, num_annotators, groups, total_videos=None, cluster_keyword_id_similarity_pair=None):
    categories = []
    if not cluster_keyword_id_similarity_pair:
        ratio = 0.05
        categories_names = []
        video_per_category = int(total_videos * ratio)
        num_categories = int(total_videos/video_per_category)
        group_alias = new_project.project_name + "_" + new_project.project_type + "_group"
        # populate category names
        # print("total_video", total_videos,\"video_per_category", video_per_category, "num_categories", num_categories)
        for i in range(num_categories):
            cat_name = group_alias + f"_{i}"
            categories_names.append(cat_name)
        
        categories_names_indices = range(len(categories_names))
        quota = math.ceil(len(categories_names)/num_annotators)
        min_idx = 0
        max_idx = quota
        # create category instances
        for i in range(num_annotators):
            cur_group = groups[i]
            assoc_category_names = categories_names[min_idx:max_idx]
            for j, cat_name in enumerate(assoc_category_names):
                assoc_cluster_keywords = cat_name
                cluster_id = sum(random.sample(range(101), 3))
                new_category = Category()
                new_category.cluster_keywords = assoc_cluster_keywords
                new_category.cluster_id = cluster_id + i + j # to ensure the is unique
                new_category.group = cur_group
                new_category.project = new_project
                new_category.save()
                categories.append(new_category)
            min_idx = max_idx
            max_idx += quota
        return categories, video_per_category


    else:
        total_categories = len(cluster_keyword_id_similarity_pair)
        range_total_categories = range(total_categories)
        quota = math.ceil(total_categories/num_annotators)
        min_idx = 0
        max_idx = quota

        for idx in range(num_annotators):
            cur_group = groups[idx]
            assoc_category_keyword_idx = range_total_categories[min_idx:max_idx]
            for idx_cat in assoc_category_keyword_idx:
                assoc_cluster_keyword_id_similarity = cluster_keyword_id_similarity_pair[idx_cat]
                assoc_keyword = assoc_cluster_keyword_id_similarity[0]
                assoc_cluster_id = int(assoc_cluster_keyword_id_similarity[1])
                assoc_cluster_similarity_score =  round(float(assoc_cluster_keyword_id_similarity[2]), 2)
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


def create_categories(new_project, num_annotators, groups, total_videos=None, cluster_keyword_id_similarity_pair=None):
        """
            creates video clusters/category objects based on user provided cluster_csv files
            Params: num_annotators: int number of annotators for the current job
                    groups: array a list of groups to assign each category to
                    cluster_keyword_id_similarity_pair: array an array of a tupple of cluster_keyword, cluster_id,
                                                        cluster_similarity_score
            Returns: an array of catergories
        """
        if not cluster_keyword_id_similarity_pair:
            return helper_category_creation(new_project, num_annotators, groups, total_videos=total_videos)
            
        else:
            return helper_category_creation(new_project, num_annotators, groups, cluster_keyword_id_similarity_pair=cluster_keyword_id_similarity_pair)

def move_video_file(source_file, destination_path):
    shutil.copy(source_file, destination_path)
    return True       

def pipeline_with_cluster_csv(new_project, num_annotators, groups, cluster_csv, video_path):
    cluster_csv_df = pd.read_csv(cluster_csv, index_col=0)
    cluster_keywords = np.unique(cluster_csv_df['cluster_keywords'])
    cluster_keyword_id_similarity_pair = []
    for keyword in cluster_keywords:
        assoc_cluster_id = cluster_csv_df.loc[cluster_csv_df['cluster_keywords']==keyword, 'cluster_ids']
        assoc_cluster_id = assoc_cluster_id.iloc[0]
        assoc_cluster_similarity_score = cluster_csv_df.loc[cluster_csv_df['cluster_keywords']==keyword, 'cluster_similarity_score']
        assoc_cluster_similarity_score  = assoc_cluster_similarity_score.iloc[0]
        cur_pair = (keyword, assoc_cluster_id, assoc_cluster_similarity_score)
        cluster_keyword_id_similarity_pair.append(cur_pair)
    #create videos and assign to categories
    # assoc_video_path = os.path.join(media_dir, video_path)
    video_files = os.listdir(video_path)
    total_videos = len(video_path) 
    # create categories for videos based on the csv_file
    create_categories(new_project, num_annotators, groups, cluster_keyword_id_similarity_pair=cluster_keyword_id_similarity_pair)
    
    project_name = new_project.project_name
    destination_path = os.path.join(local_video_path, f'{project_name}')
    os.makedirs(destination_path, exist_ok=True)
    for video in video_files:
        if video == '.DS_Store':
            continue
        source_file = os.path.join(video_path, video)
        vid_name = int(video.split('.')[0])
        assoc_df_row = cluster_csv_df[cluster_csv_df['filename'] == vid_name]
        cluster_id  = int(assoc_df_row['cluster_ids'].values[0])
        cluster_keywords = assoc_df_row['cluster_keywords'].values[0]
        video_similarity_score = round(float(assoc_df_row['video_similarity_score'].values[0]), 2)
        description = assoc_df_row['captions'].values[0]
        keywords = assoc_df_row['keywords'].values[0]
        #retrieve category
        assoc_category = get_object_or_404(Category, cluster_keywords=cluster_keywords, cluster_id=cluster_id, project=new_project)
        relative_video_path = f'videos/{project_name}'
        cur_vid = Videos(video_path=relative_video_path, checked_by=None, file_name=video)
        cur_vid.category = assoc_category
        cur_vid.project = new_project
        cur_vid.keywords = keywords
        cur_vid.video_similarity_score = video_similarity_score
        # print("video_similarity_score", video_similarity_score)
        cur_vid.description = description
        cur_vid.save()
        move_video_file(source_file, destination_path)
    return None


def pipeline_without_cluster_csv(new_project, num_annotators, groups, video_path=None, yt_file_type=None):
    if video_path:
        assoc_video_path = video_path #os.path.join(media_dir, video_path)
        video_files = os.listdir(assoc_video_path)
        total_videos = len(video_files)
        categories, videos_per_category = create_categories(new_project, num_annotators, groups, total_videos=total_videos)
        # divide the total_videos  by the total category to 
        # get the size of videos per category
        # videos_per_category = math.floor(total_videos/len(categories))
        min_idx = 0
        max_idx = videos_per_category

        project_name = project_name.project_name
        assoc_video_path = os.path.join(local_video_path, f'{project_name}')
        os.makedirs(assoc_video_path, exist_ok=True)
        for idx in range(len(categories)):
            assoc_category = categories[idx]
            # select matching bucket of videos
            # indexed by videos_per_category
            cur_video_slice = video_files[min_idx:max_idx]
            for idx_vid, video_name in enumerate(cur_video_slice):
                file_name = video_name.split('/')[-1]
                cur_video = Videos(video_path=assoc_video_path, checked_by=None, file_name=file_name)
                cur_video.category = assoc_category
                cur_video.project=new_project
                cur_video.save()
        
            min_idx = max_idx
            max_idx += videos_per_category

    elif yt_file_type:
        yt_file_dir = yt_file_type #os.path.join(media_dir, 'youtube_files')
        unique_vid_ids = set()
        if 'json' in str(yt_file_dir):
            json_files = glob.glob(os.path.join(yt_file_dir, '*.json'))
            txt_files = None
        elif 'txt' in str(yt_file_dir):
            txt_files = glob.glob(os.path.join(yt_file_dir, '*.txt'))
            json_files = None

        if json_files:
            #json_files = os.listdir(yt_json_file_path)
            for file in json_files:
                print("file>", file)
                # full_json_file_path = os.path.join(yt_file_dir, file)
                with open(file, 'r') as yt_vids:
                    data = json.load(yt_vids)
                    for idx, item in enumerate(data):
                        vid_id = item["id"]
                        unique_vid_ids.add(vid_id)
            
        elif txt_files:
            # read txt file
            for file in txt_files:
                # full_txt_file_path = os.path.join(yt_file_dir, file) 
                with open(file, 'r') as yt_txt_file:
                    txt_lines = yt_txt_file.readlines()
                for txt_line in txt_lines:
                    vid_id = txt_line.split('=')[-1]
                    unique_vid_ids.add(vid_id)


        total_videos = len(unique_vid_ids)
        categories, videos_per_category = create_categories(new_project, num_annotators, \
                                                            groups, total_videos=total_videos)
        unique_vid_ids = list(unique_vid_ids)
        random.shuffle(unique_vid_ids)
        min_idx = 0
        max_idx = videos_per_category
        ID_START_POINT = BASE_ID_START_POINT
        for idx in range(len(categories)):
            assoc_category = categories[idx]
            cur_video_slice = unique_vid_ids[min_idx:max_idx]
            
            for idx_vid, vid_id in enumerate(cur_video_slice):
                ID_START_POINT += 1
                if ID_START_POINT % 1000 == 0:
                    print(ID_START_POINT, idx_vid)
                file_name = ID_START_POINT # filename starts from 10
                cur_video = Videos(youtube_vid_id=vid_id, file_name=file_name)
                cur_video.category = assoc_category
                cur_video.project = new_project
                cur_video.save()
            min_idx = max_idx
            max_idx += videos_per_category

    return None    


def handle_upload_videos(request, project_type, num_annotators, project_name, cluster_csv, video_path=None, yt_file_type=None):
    
    new_project, _ = ProjectTitle.objects.get_or_create(user=request.user, project_type=project_type, project_name=project_name)
    if cluster_csv and not new_project.cluster_csv:
        new_project.cluster_csv = cluster_csv
    
    if not new_project.number_of_annotators:
        new_project.number_of_annotators =  num_annotators
    new_project.save()
    # return {"status": "just hit"}

    groups = create_groups(num_annotators, project_name)
     # return {"status": "just hit"}
    if cluster_csv: 
        # checks if videos have been preprocessed from ML pipeline
        # cluster_csv = os.path.join(csv_base_dir, cluster_csv)
        if video_path:
            pipeline_with_cluster_csv(new_project, num_annotators, groups, cluster_csv, video_path=video_path)
        elif yt_file_type:
            new_project.is_link = True
            new_project.save()
            pipeline_with_cluster_csv(new_project, num_annotators, groups, cluster_csv, yt_file_type=yt_file_type)
    else:
        print("no CSV pipeline for Video QA")
        if video_path:
            pipeline_without_cluster_csv(new_project, num_annotators, groups, video_path=video_path)
        elif yt_file_type:
            new_project.is_link = True
            new_project.save()
            pipeline_without_cluster_csv(new_project, num_annotators, groups, yt_file_type=yt_file_type)
    

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
    assoc_userreg = Userreg.objects.get(user=user)
    cur_project = assoc_userreg.project
    project_name = cur_project.project_name
    # all_groups = Group.objects.filter(name__icontains=cur_project)
    all_groups = VideoGroup.objects.filter(project_name=project_name)
    
    assoc_grp_users = []
    for group in all_groups:
        assoc_user = group.userregs.all().first()
        if assoc_user:
            assoc_grp_users.append(assoc_user)  
    
    for user in assoc_grp_users:
        # retrieve user processed videos
        user = User.objects.get(username=user)
        assoc_userreg = Userreg.objects.get(user=user)
        assoc_group = assoc_userreg.group
        try:
            assoc_categories = Category.objects.filter(group=assoc_group).annotate(
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
        assoc_user = Userreg.objects.get(user= request.user)
        try:
            cur_group = assoc_user.group
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
        assoc_video = get_object_or_404(Videos, file_name=term, project=assoc_project, is_available=True)
        assoc_category = assoc_video.category
        cluster_keywords = assoc_category.cluster_keywords
        assoc_group = assoc_category.group
        # print("assoc_video", assoc_video, "assoc_category", assoc_category, "assoc_group", assoc_group, "cluster_keywords", cluster_keywords)
        
        # cur_category = Category.objects.get(cluster_keywords=cluster_keywords, group=assoc_group)
        videos = Videos.objects.filter(category=assoc_category, project=assoc_project, is_available=True)
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
        ).filter(is_available=True).order_by('-checked', 'id')
    else:
        cluster_keywords = category.strip()
        assoc_category = get_object_or_404(Category, cluster_keywords=cluster_keywords, project=assoc_project)
        annotator = get_object_or_404(User, username=annotator)
        videos = Videos.objects.filter(category=assoc_category, is_available=True, checked_by__username=annotator, status=True).order_by('id')
        print("videos", videos)

    qs = videos
    # print('a qs', qs)
    videos = serialize('json', qs, fields=('file_name', 'video_path', 'checked_by', 'status', 'video_similarity_score', 'keywords', 'project_type', 'youtube_vid_id', 'is_available'))
    # videos = serialize('json', qs, fields=('file_name', 'video_path', 'checked_by', 'status', 'keywords', 'is_available'))
    
    return HttpResponse(videos, content_type='application/json')

def get_paginated_video_list(term, group):
    #term is category field in the DB
    assoc_grp = Group.objects.get(name=group)
    # print("assoc_grp", assoc_grp)
    category = Category.objects.get(cluster_id=int(term), group=assoc_grp)
    qs = Videos.objects.all().filter(category=category, is_available=True).filter(checked_by=None)

    videos = serialize('json', qs, fields=('file_name', 'video_path', 'checked_by', 'status', 'youtube_vid_id', 'is_available'))
    
    return HttpResponse(videos, content_type='application/json')

def serialize_videos(videos):
    
    serialized_videos = serialize('json', videos, fields=('file_name', 'video_path', 'checked_by', 'status', 'video_similarity_score', 'keywords', 'project_type', 'youtube_vid_id', 'is_available'))
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
    else:
        user_processed = len(get_list_or_404(Videos, checked_by=user, status=True, is_available=True))
    
        all_processed = Videos.objects.filter(project=project, status=True, is_available=True).count() #len(get_list_or_404(Videos, checked_by__isnull=False, status=True))
        context = (user_processed, all_processed)
    
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
    serialized_rem = serialize('json', remaining, fields=('file_name', 'video', 'checked_by', 'status', 'is_available'))
 
    serialized_total = serialize('json', total, fields=('file_name', 'video', 'checked_by', 'status', 'is_available'))
    serialized_rem_total = (serialized_rem, serialized_total)
    rem_total = (len(remaining), len(total))
    context = {'serialized_rem_total': serialized_rem_total,
               'rem_total': rem_total}
    
    # context = json.dumps(context, indent=2)
    # print(context, 'hii')
    return context

def prepare_export_data(request, usernames, is_youtube_link):
    if usernames:
        usernames_list = usernames.split('_')
        data = {}
        if is_youtube_link:
            sn_counter = 1
            serial_nums = []
            username_col = []
            video_ids = []
            video_links = []
            assoc_qs = []
            assoc_ans_1s = []
            assoc_ans_2s = []
            assoc_ans_3s = []
            assoc_ans_4s = []
            correct_ans = []
            for user in usernames_list:
                assoc_user = User.objects.get(username=user)
                #retrieve users videos
                user_videos = Videos.objects.filter(checked_by=assoc_user)
                for user_video in user_videos:
                    
                    # retrived assoc_qs
                    cur_qs = user_video.question
                    if not cur_qs:
                        continue
                    else:
                        serial_nums.append(sn_counter)
                        username_col.append(user)
                        youtube_vid_id = user_video.youtube_vid_id
                        video_ids.append(youtube_vid_id)
                        default_link  = f"https://www.youtube.com/embed/{youtube_vid_id}?si=AID4kFGq8mcMy4MY&output=embed"
                        video_links.append(default_link)
                        assoc_qs.append(cur_qs.question)
                        # retrieve ans
                        cur_answers = Answer.objects.filter(question=cur_qs)

                        ans1 = cur_answers[0]
                        assoc_ans_1s.append(ans1.answer)
                        if ans1.correct:
                            correct_ans.append(1)

                        ans2 = cur_answers[1]
                        assoc_ans_2s.append(ans2.answer)
                        if ans2.correct:
                            correct_ans.append(2)

                        ans3 = cur_answers[2]
                        assoc_ans_3s.append(ans3.answer)
                        if ans3.correct:
                            correct_ans.append(3)

                        ans4 = cur_answers[3]
                        assoc_ans_4s.append(ans4.answer)
                        if ans4.correct:
                            correct_ans.append(4)
                    sn_counter += 1
            data['SN'] = serial_nums
            data['Usernames'] = username_col   
            data['Video IDs'] = video_ids 
            data['Video Links'] = video_links
            data['Questions'] = assoc_qs  
            data['Answer One'] = assoc_ans_1s
            data['Answer Two'] = assoc_ans_2s   
            data['Answer Three'] = assoc_ans_2s
            data['Answer Four'] = assoc_ans_4s   
            data['Correct'] = correct_ans

        else:
            username_col_vals = []
            category_col_vals = []
            file_name_col_vals = []
            # videos = [FIELDS]
            
            for user in usernames_list:
                # users_categories_videos.setdefault(user, {})
                base_user = User.objects.get(username=user)
                user_object = base_user.userreg
                assoc_project = user_object.project
                assoc_videos = Videos.objects.all().filter(checked_by=base_user.id, project=assoc_project, status=True, category__admin_approved=True)
                for vid in assoc_videos:
                    username_col_vals.append(user)
                    category_col_vals.append(vid.category)
                    file_name_col_vals.append(vid.file_name)
                    
            data["Users"] = username_col_vals
            data["Video Categories"] = category_col_vals
            data["Filenames"] = file_name_col_vals
        
        return data