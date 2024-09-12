import os

trial_vid = 'trial_vids'

print(os.path.isdir(trial_vid))

print(os.getcwd())
wkdir = os.getcwd()

for idx, file in enumerate(sorted(os.listdir(trial_vid)), 1):

    if idx <= 100:
        class_name = 'className'
        cluster_id = 'music'
        full_path = os.path.join(wkdir, f'{trial_vid}')
        new_file_name = f'{class_name}{idx}_{cluster_id}.webm'
        os.rename(f'{full_path}/{file}', f'{full_path}/{new_file_name}')
        

    elif 100 < idx <= 200:
        class_name = 'className'
        cluster_id = 'sports'
        full_path = os.path.join(wkdir, f'{trial_vid}')
        new_file_name = f'{class_name}{idx}_{cluster_id}.webm'
        os.rename(f'{full_path}/{file}', f'{full_path}/{new_file_name}')
    
    elif 200 < idx <= 300:
        class_name = 'className'
        cluster_id = 'singing'
        full_path = os.path.join(wkdir, f'{trial_vid}')
        new_file_name = f'{class_name}{idx}_{cluster_id}.webm'
        os.rename(f'{full_path}/{file}', f'{full_path}/{new_file_name}')
    
    elif 300 < idx <= 400:
        class_name = 'className'
        cluster_id = 'reading'
        full_path = os.path.join(wkdir, f'{trial_vid}')
        new_file_name = f'{class_name}{idx}_{cluster_id}.webm'
        os.rename(f'{full_path}/{file}', f'{full_path}/{new_file_name}')

    elif 400 < idx <= 500:
        class_name = 'className'
        cluster_id = 'swiming'
        full_path = os.path.join(wkdir, f'{trial_vid}')
        new_file_name = f'{class_name}{idx}_{cluster_id}.webm'
        os.rename(f'{full_path}/{file}', f'{full_path}/{new_file_name}')









    
    from django.db import models
from django.contrib.auth.models import Group
from django.core.validators import MinValueValidator
from registration.models import Userreg

# Create your models here.

class AnnotationGroup(models.Model):
    name = models.CharField(max_length=50, verbose_name="Annotation group")
    # user = models.ForeignKey(Userreg, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self) -> str:
        return self.name

class Category(models.Model):
    cluster_keywords = models.CharField(max_length=250)
    cluster_id = models.IntegerField()
    group = models.ForeignKey(AnnotationGroup, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return self.cluster_keywords
    
    def get_total_videos(self):
        return self.videos_set.all()
    def get_unprocessed_videos(self):
        return self.videos_set.all().filter(checked_by='')
    
    def get_confidence_level(self):
        confidence = 0
        low = 60
        high = 100
        total_vids_cluster = len(self.videos_set.all())
        if total_vids_cluster < low:
            confidence = 80
        elif low < confidence < high:
            confidence = 60
        else:
            confidence = 30
        return confidence



class ProjectTitle(models.Model):
    """
        A class definind the name of the video annotation cycle
        All videos must belong to a particular project
        This helps in group management
    """
    project_name = models.CharField(max_length=100)
    cluster_csv = models.FileField(upload_to='cluster_csv', verbose_name='Trec Videos Cluster Info', null=True, blank=True)
    number_of_annotators = models.CharField(max_length=2, null=True, blank=True)

    def __str__(self):
        return self.project_name

class Videos(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    checked_by = models.CharField(max_length=50, null=True, blank=True)
    # sets the group associated with the video instance to null
    group = models.ForeignKey(AnnotationGroup, on_delete=models.SET_NULL, null=True)
    project = models.ForeignKey(ProjectTitle, default='', on_delete=models.CASCADE)
    video = models.FileField(upload_to='videos', verbose_name='Trec Videos')
    file_name = models.CharField(max_length=50, null=True, blank=True)
    description = models.CharField(max_length=500, null=True, blank=True)
    keywords = models.CharField(max_length=250, null=True, blank=True)
    status = models.BooleanField(default=False)
    date_uploaded = models.DateField(auto_now_add=True)

    def __str__(self):
        return self.file_name
    
    def get_unprocessed_videos(self):
        return self.objects.all().filter(checked_by='')
    




from .models import Videos, Category, ProjectTitle, AnnotationGroup
from django.shortcuts import get_list_or_404, get_object_or_404
from django.core.serializers import serialize
from django.http import HttpResponse
from django.contrib.contenttypes.models import ContentType
import math
import json
import pandas as pd
import os


from django.contrib.auth.models import Group, Permission

cluster_csv_file = 'media/cluster_csv/vids_clusters_keywords.csv'
print("is file", os.path.isfile(cluster_csv_file))


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
        # print(idx)
        cur_group, created = AnnotationGroup.objects.get_or_create(name=f"{project_name}_grp_{idx}")
        # cur_group, created = Group.objects.get_or_create(name=f'{project_name}_grp_{idx}')
        groups.append(cur_group)
        # group_name = Group
    
    return groups


def handle_upload_videos(request, num_annotators, project_name, uploaded_videos, cluster_csv):
    print("uucluster_csv", cluster_csv)
    
    # for idx, row in cluster_csv_df.iterrows():
    #     cluster_keywords = row['cluster_keyword']
    #     cluster_id = row['cluster_ids']
    #     if idx == 3:
    #         break
    #     print(row)
    # return "done"
    # create_groups(num_groups, project_name, permisions_list)
    """
        TODO: Divide the total video uploaded by the number of anotators
              The assign groups when on these values as iterators
    """
    total_uploaded_vids = len(uploaded_videos)
    # permisions_list = create_permisions()
    groups = create_groups(num_annotators, project_name)
    print("available groups", groups)
    
    new_project = ProjectTitle(cluster_csv=cluster_csv, project_name=project_name, number_of_annotators=num_annotators)
    new_project.save()
    # print(f'groups : {groups } \t total_uploaded_vids: {total_uploaded_vids} num_annotators: {num_annotators}')

    # put this into the loop of annotators
    cluster_csv_df = pd.read_csv(cluster_csv_file, index_col=0)
    min_idx = 0
    quota = math.ceil(total_uploaded_vids/num_annotators)
    max_idx = quota
    for idx in range(num_annotators):
        cur_group = groups[idx]
        cur_uploaded_vid_batch = uploaded_videos[min_idx:max_idx]
        for vid in cur_uploaded_vid_batch:
            print("cur_group", cur_group)
            vid_name = int(str(vid).split('.')[0])
            assoc_df_row = cluster_csv_df[cluster_csv_df['filename'] == vid_name]
            cluster_id = int(assoc_df_row['cluster_ids'].values[0])
            cluster_keywords = assoc_df_row['cluster_keywords'].values[0]
            description = assoc_df_row['captions'].values[0]
            keywords = assoc_df_row['keywords'].values[0]
            
            try: 
                #checks to see if a category with this cluster_id exist,
                #if it exist, 
                new_category = Category.objects.get(cluster_id=cluster_id)
                print('yes', new_category)
            except Exception as e:
                new_category = Category()
                new_category.cluster_keywords = cluster_keywords
                new_category.cluster_id = cluster_id
                new_category.group = cur_group
                new_category.save()

            
            cur_vid = Videos(video=vid, checked_by='', file_name=vid_name)
            cur_vid.category = new_category
            cur_vid.project = new_project
            cur_vid.keywords = keywords
            cur_vid.description = description
            cur_vid.group = cur_group
            cur_vid.save()
        min_idx = max_idx
        max_idx += quota


def display_categories(request=None):
    """
        Displays categories of videos matching user group
    """
    if not request.user.is_anonymous:
        user = request.user
        try:
            cur_group = AnnotationGroup.objects.get(user=user)
            print("cur_group", cur_group )
            categories = Category.objects.all().filter(group=cur_group)
        except Exception as e:
            print('e', e=='Group matching query does not exist.')
            categories = None
    else:
        # videos = get_list_or_404(Videos, che=False)
        categories = Category.objects.all()
    return categories


def  get_video_list(term):
    term = term.split(' ')[0]
    print("tipti", term)
    cur_category = Category.objects.get(cluster_keywords=term)
    videos = Videos.objects.filter(category=cur_category)
    # print('videos', videos)
    # print('cur_cat', cur_category)
    qs = videos
    # print('a qs', qs)
    videos = serialize('json', qs, fields=('file_name', 'video', 'checked_by', 'status'))
    
    return HttpResponse(videos, content_type='application/json')

def get_paginated_video_list(term):
    #term is category field in the DB
    category = Category.objects.get(cluster_id=int(term))
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
