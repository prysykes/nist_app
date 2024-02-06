from .models import Videos, Category
from django.shortcuts import get_list_or_404, get_object_or_404




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

        
        cur_vid = Videos(video=vid, checked_by=request.user, file_name=cur_filename)
        cur_vid.category = new_category
        cur_vid.save()


def display_videos(request=None):
    videos = get_list_or_404(Videos, status=False)
    categories = get_list_or_404(Category)
    return categories
    
