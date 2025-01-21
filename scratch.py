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


for video in video_files:
        if video == '.DS_Store':
            continue
        vid_name = int(video.split('.')[0])
        assoc_df_row = cluster_csv_df[cluster_csv_df['filename'] == vid_name]
        cluster_id  = int(assoc_df_row['cluster_ids'].values[0])
        cluster_keywords = assoc_df_row['cluster_keywords'].values[0]
        video_similarity_score = round(float(assoc_df_row['video_similarity_score'].values[0]), 2)
        description = assoc_df_row['captions'].values[0]
        keywords = assoc_df_row['keywords'].values[0]
        #retrieve category
        assoc_category = get_object_or_404(Category, cluster_keywords=cluster_keywords, cluster_id=cluster_id, project=new_project)
        
        cur_vid = Videos(video_path=video_path, checked_by=None, file_name=video)
        cur_vid.category = assoc_category
        cur_vid.project = new_project
        cur_vid.keywords = keywords
        cur_vid.video_similarity_score = video_similarity_score
        # print("video_similarity_score", video_similarity_score)
        cur_vid.description = description
        cur_vid.save()
