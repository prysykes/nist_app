## Usage Instructions for the ML Pipeline
AVCAS processes, labels, and groups thousands of unlabeled and uncategorized videos for easy annotation and selection. The associated notebook provides different utitilties for video keyframe extraction, frame to embedding conversion, embedding projection to lower dimensional space for clustering purposes. 
***
## Usage
1. All functionalities needed to process, videos, group them and provide cluster confidence are integrated in the RunPipeline() class and can be called with the following parameters.
    i. trecvid_vidoes = directory where the videos are stored
    ii. vid_keyframes_dir= directory where the pipeline should save the keyframe
    iii.n_components=25 -determines the size of the lower dimension projection, 
    iv. n_neighbours=9, 
    v. random_state=42, 
    vi. verbose=False - informational

2. We employed keybert for keyword extraction hence, it should be instantiated thus: keyword_model = KeyBERT()
3. Instantiate the RunPipeline() class thus: run_pipeline = RunPipeline(trecvid_videos, vid_keyframes_dir, processed_files, keyword_model=keyword_model, n_components=25, n_neighbours=9, random_state=42, verbose=False)
4. This returns a dataframe that can be written to a csv of choice as shown in the notebook.