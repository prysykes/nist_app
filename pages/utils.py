from .models import Videos, Category
from django.shortcuts import get_list_or_404


# checked_by = models.CharField(max_length=30, null=True, blank=True)
# video = models.FileField(upload_to='videos', verbose_name='Trec Videos')
# file_name = models.CharField(max_length=30, null=True, blank=True)
# cluster_id = models.CharField(max_length=20)
# status = models.BooleanField(default=False)
# date_uploaded = models.DateField(auto_now_add=True)

def handle_upload_videos(request, uploaded_videos, video_upload_form):
    for vid in uploaded_videos:
        str_vid = str(vid)
        print(str_vid, type(str_vid))
        split_vid = str_vid.split('_')
        cur_filename = split_vid[0]
        cur_clusterid = split_vid[1].split('.')[0]
        print(split_vid, cur_filename, cur_clusterid)
        new_category = Category()
        new_category.cluster_id = cur_clusterid
        try: 
            category_list = get_list_or_404(Category)
            if new_category in category_list:
                pass
            else:
                new_category.save()
        except Exception as e:
            new_category.save()

        
        cur_vid = Videos(video=vid, checked_by=request.user, file_name=cur_filename, cluster_id=new_category)
        cur_vid.save()


def display_videos(request=None):
    videos = get_list_or_404(Videos, status=False)
    for idx, vid in enumerate(videos):
        if idx == 4:
            break
        print(vid, 'heh')
