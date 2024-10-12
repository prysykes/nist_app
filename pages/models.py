from django.db import models
from django.contrib.auth.models import Group, User
from django.core.validators import MinValueValidator
from django.db.models import Case, When, Value, BooleanField

# Create your models here.

class Category(models.Model):
    cluster_keywords = models.CharField(max_length=250)
    cluster_id = models.IntegerField()
    group = models.ForeignKey(Group, on_delete=models.SET_NULL, null=True)
    admin_approved = models.BooleanField(default=False)
    cluster_similarity_score = models.FloatField(default=0.0)

    def __str__(self):
        return self.cluster_keywords
    
    def get_total_videos(self):
        return self.video_categories.all()
    
    #TODO: change the id later to similarity score
        # compute the keyword similarity score for each video
        # while uploading it.
    def get_unprocessed_videos(self, user=None):
        # get all videos belonging to a user
        assoc_videos = self.video_categories.exclude(status__isnull=False).order_by('id')
        return assoc_videos
    
    def get_next_video(self):
        try:
            next_video = self.video_categories.filter(status=None).earliest('id')
            # print('pre next_video', next_video)
            # next_video = next_video[0]
            # print('post next_video', next_video)
        except:
            next_video = None
        return next_video
    
    def get_confidence_level(self):
        confidence = 0
        low = 60
        high = 100
        total_vids_cluster = len(self.video_categories.all())
        if total_vids_cluster < low:
            confidence = 80
        elif low < confidence < high:
            confidence = 60
        else:
            confidence = 30
        return confidence
    class Meta:
        ordering = ['-cluster_similarity_score']
   

class ProjectTitle(models.Model):
    """
        A class definind the name of the video annotation cycle
        All videos must belong to a particular project
        This helps in group management
    """
    project_name = models.CharField(max_length=100)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    cluster_csv = models.FileField(upload_to='cluster_csv', verbose_name='Trec Videos Cluster Info', null=True, blank=True)
    number_of_annotators = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return self.project_name

class Videos(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="video_categories")
    checked_by = models.ForeignKey(User, on_delete=models.DO_NOTHING, blank=True, null=True)
    # sets the group associated with the video instance to null
    # group = models.ForeignKey(Group, on_delete=models.SET_NULL, null=True)
    project = models.ForeignKey(ProjectTitle, default='', on_delete=models.CASCADE)
    video = models.FileField(upload_to='videos', verbose_name='Trec Videos')
    file_name = models.CharField(max_length=50, null=True, blank=True)
    description = models.CharField(max_length=500, null=True, blank=True)
    keywords = models.CharField(max_length=250, null=True, blank=True)
    status = models.BooleanField(default=None, blank=True, null=True)
    video_similarity_score = models.FloatField(default=0.0)

    date_uploaded = models.DateField(auto_now_add=True)

    def __str__(self):
        return self.file_name
    
    def get_unprocessed_videos(self):
        return self.objects.all().filter(checked_by='')
    
    class Meta:
        ordering = ['-video_similarity_score'] 
    
    