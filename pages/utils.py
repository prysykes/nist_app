from .models import Videos, Category, ProjectTitle
from django.shortcuts import get_list_or_404, get_object_or_404
from django.core.serializers import serialize
from django.http import HttpResponse
from django.contrib.contenttypes.models import ContentType
import math
import json


from django.contrib.auth.models import Group, Permission



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
        print(idx)
        cur_group, created = Group.objects.get_or_create(name=f'{project_name}_grp_{idx}')
        groups.append(cur_group)
        # group_name = Group
    return groups


def handle_upload_videos(request, num_annotators, project_name, uploaded_videos, video_upload_form):
    # create_groups(num_groups, project_name, permisions_list)
    """
        TODO: Divide the total video uploaded by the number of anotators
              The assign groups when on these values as iterators
    """
    total_uploaded_vids = len(uploaded_videos)
    # permisions_list = create_permisions()
    groups = create_groups(num_annotators, project_name)
    

    print(f'groups : {groups } \t total_uploaded_vids: {total_uploaded_vids} num_annotators: {num_annotators}')

    # put this into the loop of annotators
    min_idx = 0
    quota = math.ceil(total_uploaded_vids/num_annotators)
    max_idx = quota
    for idx in range(num_annotators):
        cur_uploaded_vid_batch = uploaded_videos[min_idx:max_idx]
        for vid in cur_uploaded_vid_batch:
            new_project = ProjectTitle()
            new_project.project_name = project_name
            new_project.save()
            str_vid = str(vid)
            # print(str_vid, type(str_vid))
            split_vid = str_vid.split('_')
            cur_filename = split_vid[0]
            cur_clusterid = split_vid[1].split('.')[0]
            # print(split_vid, cur_filename, cur_clusterid)
            
            try: 
                #checks to see if a category with this cluster_id exist,
                #if it exist, 
                new_category = Category.objects.get(category = cur_clusterid)
                print('yes', new_category)
            except Exception as e:
                new_category = Category()
                new_category.category = cur_clusterid
                new_category.save()

            
            cur_vid = Videos(video=vid, checked_by='', file_name=cur_filename)
            cur_vid.category = new_category
            cur_vid.project = new_project
            cur_vid.group = groups[idx]
            cur_vid.save()
        min_idx = max_idx
        max_idx += quota


def display_categories(request=None):
    # videos = get_list_or_404(Videos, che=False)
    categories = Category.objects.all()
    return categories


def  get_video_list(term):
    term = term.split(' ')[0]
    cur_category = Category.objects.get(category = term)
    videos = Videos.objects.filter(category=cur_category)
    # print('videos', videos)
    # print('cur_cat', cur_category)
    qs = videos
    # print('a qs', qs)
    videos = serialize('json', qs, fields=('file_name', 'video', 'checked_by', 'status'))
    
    return HttpResponse(videos, content_type='application/json')

def get_paginated_video_list(term):
    #term is category field in the DB
    category = Category.objects.get(category=term)
    qs = Videos.objects.all().filter(category=category).filter(checked_by='')

    videos = serialize('json', qs, fields=('file_name', 'video', 'checked_by', 'status'))
    
    return HttpResponse(videos, content_type='application/json')

def check_user_decision(file_name, category, cur_user, appr_or_rej=None):
    print('appr_or_rej', appr_or_rej, appr_or_rej=='approve')
    video = get_object_or_404(Videos, file_name=file_name)
    print('video.checked_by', video.file_name, appr_or_rej=='approve')
    # print(video)
    
    if appr_or_rej == 'approve':
        video.checked_by = str(cur_user)
        video.status = True
        video.save()
    elif appr_or_rej == 'reject':
        video.checked_by = str(cur_user)
        video.status = False
        video.save()

def get_rem_and_total(category):
    # Category.objects.all().filter(category=category)
    cur_category = get_object_or_404(Category, category=category)
    remaining = cur_category.get_unprocessed_videos()
    total = cur_category.get_total_videos()

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