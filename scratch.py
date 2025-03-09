# if video_path:
#         assoc_video_path = os.path.join(media_dir, video_path)
#         video_files = os.listdir(assoc_video_path)
#         total_videos = len(video_files)
#         categories, videos_per_category = create_categories(new_project, num_annotators, groups, total_videos=total_videos)
#         # divide the total_videos  by the total category to 
#         # get the size of videos per category
#         # videos_per_category = math.floor(total_videos/len(categories))
#         min_idx = 0
#         max_idx = videos_per_category
#         for idx in range(len(categories)):
#             assoc_category = categories[idx]
#             # select matching bucket of videos
#             # indexed by videos_per_category
#             cur_video_slice = video_files[min_idx:max_idx]
#             for idx_vid, video_name in enumerate(cur_video_slice):
#                 file_name = video_name.split('/')[-1]
#                 cur_video = Videos(video_path=video_path, checked_by=None, file_name=file_name)
#                 cur_video.category = assoc_category
#                 cur_video.project=new_project
#                 cur_video.save()
        
#             min_idx = max_idx
#             max_idx += videos_per_category

#         return None

# class Videos(models.Model):
#     category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="video_categories")
#     checked_by = models.ForeignKey(User, on_delete=models.DO_NOTHING, blank=True, null=True)
#     question = models.ForeignKey(Question, null=True, blank=True, on_delete=models.CASCADE)
#     project = models.ForeignKey(ProjectTitle, default='', on_delete=models.CASCADE)
#     # video = models.FileField(upload_to='videos', verbose_name='Trec Videos')
#     video_path = models.CharField(max_length=50) 
#     youtube_vid_id = models.CharField(max_length=50, null=True, blank=True)
#     is_available = models.BooleanField(default=True)
#     file_name = models.CharField(max_length=50, null=True, blank=True)
#     description = models.CharField(max_length=500, null=True, blank=True)
#     keywords = models.CharField(max_length=250, null=True, blank=True)
#     status = models.BooleanField(default=None, blank=True, null=True)
#     video_similarity_score = models.FloatField(default=0.0)
#     admin_approve = models.BooleanField(default=False, null=True, blank=True)

#     date_uploaded = models.DateField(auto_now_add=True)

#     def __str__(self):
#         return self.file_name
    
#     def get_unprocessed_videos(self):
#         return self.objects.all().filter(checked_by='')
    
#     class Meta:
#         ordering = ['-video_similarity_score'] 

#  is_admin = request.GET.get('is_admin')
    
#     cur_user = request.user
#     user_object = User.objects.get(username=cur_user )
#     userreg_object = Userreg.objects.get(user=user_object)
#     assoc_project = userreg_object.project
#     if request.method == 'GET':
#         if request.GET.get('category'):
#             cluster_keywords = request.GET.get('category')
#             assoc_category = Category.objects.get(cluster_keywords=cluster_keywords, project=assoc_project)
#             next_video = assoc_category.video_categories.filter(status__isnull=True, is_available=True).order_by('-video_similarity_score').first()
#             serialized_next_video = serialize_videos([next_video])
#             print('serialized_next_video', serialized_next_video)
#             serialized_next_video = json.loads(serialized_next_video)
#             context = {"serialized_next_video": serialized_next_video}
#             context = JsonResponse(context)
#         else:

# is_available

# 'json, txt'
# show_mark_unavailable(project_type, filename, category)

# if yt_file_type == 'json':
    #     print('json')
    #     return
    #     print("json path available", yt_file_type)
    #     youtube_json_path = os.path.join(media_dir, youtube_json_file)
    #     # youtube_json = os.listdir(youtube_json_path)[0]
    #     # yt_json_file_path = os.path.join(youtube_json_path, youtube_json)
    # if yt_file_type == 'text':
    #     print('text')
    #     return 
  

#   let project_name = category.split('_')[0]
#         console.log("project_name", project_name);

# class Answer(models.Model):
#     answer = models.CharField(max_length=250)
#     correct = models.BooleanField(default=False)
#     question = models.ForeignKey('Question', on_delete=models.CASCADE, related_name="question_answers")

#     def __str__(self):
#         return self.answer
    
# class Question(models.Model):
#     question = models.CharField(max_length=250)

#     def __str__(self):
#         return self.question

# payload = {'question': {'id': 40, 'value': 'how many speakers are in the video'}, 
#            'ans-0-correct': {'id': 133, 'value': '1'}, 'ans-1': {'id': 134, 'value': '2'}, 
#            'ans-2': {'id': 135, 'value': '4'}, 'ans-3': {'id': 136, 'value': '3'}}

# payload!! {'question': {'id': 43, 'value': 'what is the color of the facemask'}, 
#            'ans-0-correct': {'id': 145, 'value': 'black'}, 'ans-1': {'id': 146, 'value': 'white'}, 
#            'ans-2': {'id': 147, 'value': 'green'}, 'ans-3': {'id': 148, 'value': 'orange'}}


# username_col = []
# video_ids = []
# video_links = []
# assoc_qs = []
# assoc_ans_1s = []
# assoc_ans_2s = []
# assoc_ans_3s = []
# assoc_ans_4s = []
# correct_ans = []