from .models import Videos, Category
from django.shortcuts import get_list_or_404, get_object_or_404
from django.core.serializers import serialize
from django.http import HttpResponse
import json




# class Category(models.Model):
#     category = models.CharField(max_length=30, unique=True)

#     def __str__(self):
#         return self.cluster_id

# class Videos(models.Model):
#     category = models.ForeignKey(Category, on_delete=models.CASCADE, default='cluster_id')
#     checked_by = models.CharField(max_length=30, null=True, blank=True)
#     video = models.FileField(upload_to='videos', verbose_name='Trec Videos')
#     file_name = models.CharField(max_length=30, null=True, blank=True)
#     status = models.BooleanField(default=False)
#     date_uploaded = models.DateField(auto_now_add=True)

#     def __str__(self):
#         return self.file_name


def handle_upload_videos(request, uploaded_videos, video_upload_form):
    for vid in uploaded_videos:
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
        cur_vid.save()


def display_categories(request=None):
    # videos = get_list_or_404(Videos, che=False)
    categories = Category.objects.all()
    return categories


#  category = models.ForeignKey(Category, on_delete=models.CASCADE)
#     checked_by = models.CharField(max_length=30, null=True, blank=True)
#     video = models.FileField(upload_to='videos', verbose_name='Trec Videos')
#     file_name = models.CharField(max_length=30, null=True, blank=True)
#     status = models.BooleanField(default=False)
#     date_uploaded = models.DateField(auto_now_add=True)


def  get_video_list(term):
    cur_category = Category.objects.get(category = term)
    videos = Videos.objects.filter(category=cur_category)
    # print('cur_cat', cur_category)
    qs = videos
    # print('a qs', qs)
    videos = serialize('json', qs, fields=('file_name', 'video', 'checked_by', 'status'))
    
    return HttpResponse(videos, content_type='application/json')

def check_user_decision(file_name, category, cur_user, appr_or_rej=None):
    video = get_object_or_404(Videos, file_name=file_name)
    print('video.checked_by', video.checked_by)
    # print(video)
    
    if appr_or_rej == 'approve':
        video.checked_by = str(cur_user)
        video.status = True
        video.save()
    elif appr_or_rej == 'reject':
        video.checked_by = str(cur_user)
        video.save()
