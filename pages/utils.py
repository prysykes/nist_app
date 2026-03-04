import glob
import math
import random
import json
import logging
import os
import shutil

import pandas as pd
import numpy as np

from django.shortcuts import get_list_or_404, get_object_or_404
from django.core.serializers import serialize
from django.db.models import Q, Count, F
from django.http import HttpResponse, JsonResponse
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth.models import User, Group, Permission
from django.core.exceptions import ValidationError

from pages.models import Videos, Category, ProjectTitle, Question, Answer, VideoGroup
from registration.models import Userreg
from settings.config import BASE_ID_START_POINT

logger = logging.getLogger(__name__)




# Directory paths - using nist_trecvid_resources for source files
parent_dir = os.getcwd()
media_dir = os.path.join(parent_dir, 'media')
finished_jobs_dir = os.path.join(media_dir, "finished_jobs")

# New resource directories for source files (input)
resources_dir = os.path.join(parent_dir, 'nist_trecvid_resources')
csv_base_dir = os.path.join(resources_dir, 'cluster_csv')
source_video_path = os.path.join(resources_dir, 'videos')
youtube_json_dir = os.path.join(resources_dir, 'youtube_files_json')
youtube_txt_dir = os.path.join(resources_dir, 'youtube_files_txt')

# Destination path for processed videos (in nist_trecvid_resources folder)
local_video_path = os.path.join(resources_dir, 'videos')


# Upload progress tracking
class UploadProgressTracker:
    """Thread-safe progress tracker for video uploads"""

    def __init__(self):
        self._progress = {}
        import threading
        self._lock = threading.Lock()

    def create_task(self, task_id):
        """Initialize a new upload task"""
        with self._lock:
            self._progress[task_id] = {
                'status': 'initializing',
                'percent': 0,
                'processed': 0,
                'total': 0,
                'message': 'Initializing upload...'
            }

    def update(self, task_id, processed=None, total=None, message=None, status=None, percent=None):
        """Update progress for a task"""
        with self._lock:
            if task_id not in self._progress:
                return

            if processed is not None:
                self._progress[task_id]['processed'] = processed
            if total is not None:
                self._progress[task_id]['total'] = total
            if message is not None:
                self._progress[task_id]['message'] = message
            if status is not None:
                self._progress[task_id]['status'] = status

            # Calculate percent if processed and total are available
            if percent is not None:
                self._progress[task_id]['percent'] = percent
            elif self._progress[task_id]['total'] > 0:
                self._progress[task_id]['percent'] = int(
                    (self._progress[task_id]['processed'] / self._progress[task_id]['total']) * 100
                )

    def get(self, task_id):
        """Get progress for a task"""
        with self._lock:
            return self._progress.get(task_id, {
                'status': 'not_found',
                'percent': 0,
                'processed': 0,
                'total': 0,
                'message': 'Task not found'
            }).copy()

    def complete(self, task_id, message='Upload completed successfully'):
        """Mark a task as completed"""
        with self._lock:
            if task_id in self._progress:
                self._progress[task_id]['status'] = 'completed'
                self._progress[task_id]['percent'] = 100
                self._progress[task_id]['message'] = message

    def error(self, task_id, message='An error occurred'):
        """Mark a task as failed"""
        with self._lock:
            if task_id in self._progress:
                self._progress[task_id]['status'] = 'error'
                self._progress[task_id]['message'] = message

    def cleanup(self, task_id):
        """Remove a completed task from tracking"""
        with self._lock:
            if task_id in self._progress:
                del self._progress[task_id]

# Global progress tracker instance
upload_progress_tracker = UploadProgressTracker()


APP_LABEL = 'pages'



def export_job(assoc_project):
    """Export job information for all approved users"""
    payload = []
    try:
        # Get all approved categories for this project
        approved_categories = Category.objects.filter(
            admin_approved=True,
            project=assoc_project
        )

        logger.info(f"Found {approved_categories.count()} approved categories for project {assoc_project.project_name}")

        if not approved_categories.exists():
            logger.info(f"No approved categories found for project {assoc_project.project_name}")
            return payload

        # Collect all users who are admin_approved and belong to this project
        approved_userregs = Userreg.objects.filter(
            admin_approved=True,
            project=assoc_project
        ).select_related('user', 'group')

        logger.info(f"Found {approved_userregs.count()} approved userregs")

        # Track users we've already processed to avoid duplicates
        processed_users = set()

        for userreg in approved_userregs:
            user = userreg.user
            if user.username in processed_users:
                continue
            processed_users.add(user.username)

            try:
                # Get approved videos for this user in the project's approved categories
                assoc_videos = Videos.objects.filter(
                    category__in=approved_categories,
                    checked_by=user,
                    status=True,
                    is_available=True
                )

                # Find top category by video count for this user
                top_category = approved_categories.annotate(
                    video_count=Count(
                        'video_categories',
                        filter=Q(video_categories__status=True, video_categories__checked_by=user)
                    )
                ).filter(video_count__gt=0).order_by('-video_count').first()

                # Build payload - show user if they have approved categories
                cur_payload = {
                    'user': user.username,
                    'top_category': top_category.cluster_keywords if top_category else 'N/A',
                    'num_vids_tc': top_category.video_count if top_category else 0,
                    'total_accepted_vids': assoc_videos.count()
                }
                payload.append(cur_payload)

                logger.info(f"Added user {user.username} to payload: {cur_payload}")

            except Exception as e:
                logger.error(f"Error processing user {user.username}: {str(e)}")
                continue

    except Exception as e:
        logger.error(f"Error in export_job: {str(e)}", exc_info=True)

    logger.info(f"export_job returning payload with {len(payload)} entries")
    return payload

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

def pipeline_with_cluster_csv(new_project, num_annotators, groups, cluster_csv, video_path, task_id=None):
    """Process videos with a cluster CSV file containing ML pipeline output"""
    try:
        # Validate inputs
        if not os.path.exists(cluster_csv):
            raise ValueError(f"Cluster CSV file not found: {cluster_csv}")

        if not os.path.exists(video_path):
            raise ValueError(f"Video path not found: {video_path}")

        # Read cluster CSV
        logger.info(f"Reading cluster CSV: {cluster_csv}")
        if task_id:
            upload_progress_tracker.update(task_id, message='Reading cluster CSV...', status='processing')
        cluster_csv_df = pd.read_csv(cluster_csv, index_col=0)

        # Validate required columns
        required_columns = ['cluster_keywords', 'cluster_ids', 'cluster_similarity_score',
                          'filename', 'video_similarity_score']
        missing_columns = [col for col in required_columns if col not in cluster_csv_df.columns]
        if missing_columns:
            raise ValueError(f"Missing required columns in CSV: {missing_columns}")

        # Extract unique cluster information
        if task_id:
            upload_progress_tracker.update(task_id, message='Extracting cluster information...')
        cluster_keywords = np.unique(cluster_csv_df['cluster_keywords'])
        cluster_keyword_id_similarity_pair = []

        for keyword in cluster_keywords:
            keyword_df = cluster_csv_df[cluster_csv_df['cluster_keywords'] == keyword]
            assoc_cluster_id = keyword_df['cluster_ids'].iloc[0]
            assoc_cluster_similarity_score = keyword_df['cluster_similarity_score'].iloc[0]
            cur_pair = (keyword, assoc_cluster_id, assoc_cluster_similarity_score)
            cluster_keyword_id_similarity_pair.append(cur_pair)

        # Get video files
        video_files = [f for f in os.listdir(video_path) if not f.startswith('.')]
        total_videos = len(video_files)
        logger.info(f"Found {total_videos} video files")

        if task_id:
            upload_progress_tracker.update(task_id, total=total_videos, message='Creating categories...')

        # Create categories
        create_categories(
            new_project, num_annotators, groups,
            cluster_keyword_id_similarity_pair=cluster_keyword_id_similarity_pair
        )

        # Determine if source videos are already inside the videos directory
        project_name = new_project.project_name
        source_already_in_videos = os.path.commonpath([os.path.abspath(video_path), os.path.abspath(local_video_path)]) == os.path.abspath(local_video_path)

        if source_already_in_videos:
            # Videos are already in place, compute relative path from nist_trecvid_resources
            relative_video_path = os.path.relpath(video_path, resources_dir)
            destination_path = None
        else:
            destination_path = os.path.join(local_video_path, project_name)
            os.makedirs(destination_path, exist_ok=True)
            relative_video_path = f'videos/{project_name}'

        if task_id:
            upload_progress_tracker.update(task_id, message='Processing videos...')

        # Process each video file
        processed_count = 0
        skipped_count = 0

        for video in video_files:
            if video.startswith('.'):
                continue

            try:
                source_file = os.path.join(video_path, video)

                # Extract video ID from filename
                video_id_str = video.split('.')[0]
                try:
                    vid_name = int(video_id_str)
                except ValueError:
                    logger.warning(f"Could not parse video ID from filename: {video}")
                    skipped_count += 1
                    continue

                # Find video in CSV
                assoc_df_row = cluster_csv_df[cluster_csv_df['filename'] == vid_name]
                if assoc_df_row.empty:
                    logger.warning(f"Video {vid_name} not found in cluster CSV")
                    skipped_count += 1
                    continue

                # Extract video metadata
                cluster_id = int(assoc_df_row['cluster_ids'].values[0])
                cluster_keywords_val = assoc_df_row['cluster_keywords'].values[0]
                video_similarity_score = round(float(assoc_df_row['video_similarity_score'].values[0]), 2)

                # Get optional fields
                description = assoc_df_row.get('captions', pd.Series([None])).values[0]
                keywords = assoc_df_row.get('keywords', pd.Series([None])).values[0]

                # Retrieve category
                try:
                    assoc_category = Category.objects.get(
                        cluster_keywords=cluster_keywords_val,
                        cluster_id=cluster_id,
                        project=new_project
                    )
                except Category.DoesNotExist:
                    logger.error(f"Category not found for video {vid_name}")
                    skipped_count += 1
                    continue

                # Create video record
                cur_vid = Videos(
                    video_path=relative_video_path,
                    checked_by=None,
                    file_name=video
                )
                cur_vid.category = assoc_category
                cur_vid.project = new_project
                cur_vid.keywords = keywords if pd.notna(keywords) else None
                cur_vid.video_similarity_score = video_similarity_score
                cur_vid.description = description if pd.notna(description) else None
                cur_vid.save()

                # Copy video file only if source is outside the videos directory
                if destination_path:
                    move_video_file(source_file, destination_path)
                processed_count += 1

                # Update progress
                if task_id:
                    upload_progress_tracker.update(
                        task_id,
                        processed=processed_count,
                        message=f'Processing video {processed_count} of {total_videos}...'
                    )

                if processed_count % 100 == 0:
                    logger.info(f"Processed {processed_count} videos")

            except Exception as e:
                logger.error(f"Error processing video {video}: {str(e)}")
                skipped_count += 1
                continue

        logger.info(f"Pipeline completed. Processed: {processed_count}, Skipped: {skipped_count}")

        if task_id:
            upload_progress_tracker.complete(task_id, f'Completed! Processed {processed_count} videos.')

        return None

    except Exception as e:
        logger.error(f"Error in pipeline_with_cluster_csv: {str(e)}", exc_info=True)
        if task_id:
            upload_progress_tracker.error(task_id, str(e))
        raise


def pipeline_without_cluster_csv(new_project, num_annotators, groups, video_path=None, yt_file_type=None, task_id=None):
    """Process videos without a cluster CSV file"""
    try:
        if video_path:
            if not os.path.exists(video_path):
                logger.error(f"Video path does not exist: {video_path}")
                raise ValueError(f"Video path does not exist: {video_path}")

            assoc_video_path = video_path
            video_files = [f for f in os.listdir(assoc_video_path) if not f.startswith('.')]
            total_videos = len(video_files)

            if total_videos == 0:
                logger.error("No videos found in the specified path")
                raise ValueError("No videos found in the specified path")

            if task_id:
                upload_progress_tracker.update(task_id, total=total_videos, message='Creating categories...', status='processing')

            categories, videos_per_category = create_categories(
                new_project, num_annotators, groups, total_videos=total_videos
            )

            min_idx = 0
            max_idx = videos_per_category

            # Determine if source videos are already inside the videos directory
            project_name = new_project.project_name
            source_already_in_videos = os.path.commonpath([os.path.abspath(video_path), os.path.abspath(local_video_path)]) == os.path.abspath(local_video_path)

            if source_already_in_videos:
                relative_video_path = os.path.relpath(video_path, resources_dir)
                destination_path = None
            else:
                destination_path = os.path.join(local_video_path, project_name)
                os.makedirs(destination_path, exist_ok=True)
                relative_video_path = f'videos/{project_name}'

            if task_id:
                upload_progress_tracker.update(task_id, message='Processing videos...')

            processed_count = 0
            for idx in range(len(categories)):
                assoc_category = categories[idx]
                cur_video_slice = video_files[min_idx:max_idx]

                for idx_vid, video_name in enumerate(cur_video_slice):
                    if video_name.startswith('.'):
                        continue

                    source_file = os.path.join(assoc_video_path, video_name)
                    file_name = video_name.split('/')[-1]

                    cur_video = Videos(
                        video_path=relative_video_path,
                        checked_by=None,
                        file_name=file_name
                    )
                    cur_video.category = assoc_category
                    cur_video.project = new_project
                    cur_video.save()

                    # Copy video file only if source is outside the videos directory
                    if destination_path:
                        try:
                            move_video_file(source_file, destination_path)
                        except Exception as e:
                            logger.error(f"Error copying video file {video_name}: {str(e)}")

                    processed_count += 1
                    if task_id:
                        upload_progress_tracker.update(
                            task_id,
                            processed=processed_count,
                            message=f'Processing video {processed_count} of {total_videos}...'
                        )

                min_idx = max_idx
                max_idx += videos_per_category

            if task_id:
                upload_progress_tracker.complete(task_id, f'Completed! Processed {processed_count} videos.')

        elif yt_file_type:
            if not os.path.exists(yt_file_type):
                logger.error(f"YouTube file path does not exist: {yt_file_type}")
                raise ValueError(f"YouTube file path does not exist: {yt_file_type}")

            yt_file_dir = yt_file_type
            unique_vid_ids = set()
            json_files = None
            txt_files = None

            if 'json' in str(yt_file_dir) or os.path.isdir(yt_file_dir):
                json_files = glob.glob(os.path.join(yt_file_dir, '*.json'))

            if 'txt' in str(yt_file_dir) or (os.path.isdir(yt_file_dir) and not json_files):
                txt_files = glob.glob(os.path.join(yt_file_dir, '*.txt'))

            if json_files:
                for file in json_files:
                    logger.info(f"Processing JSON file: {file}")
                    try:
                        with open(file, 'r', encoding='utf-8') as yt_vids:
                            data = json.load(yt_vids)
                            for item in data:
                                if isinstance(item, dict) and "id" in item:
                                    vid_id = item["id"].strip()
                                    if vid_id:
                                        unique_vid_ids.add(vid_id)
                    except Exception as e:
                        logger.error(f"Error processing JSON file {file}: {str(e)}")
                        continue

            elif txt_files:
                for file in txt_files:
                    logger.info(f"Processing TXT file: {file}")
                    try:
                        with open(file, 'r', encoding='utf-8') as yt_txt_file:
                            txt_lines = yt_txt_file.readlines()
                        for txt_line in txt_lines:
                            txt_line = txt_line.strip()
                            if '=' in txt_line:
                                vid_id = txt_line.split('=')[-1].strip()
                            else:
                                vid_id = txt_line
                            if vid_id:
                                unique_vid_ids.add(vid_id)
                    except Exception as e:
                        logger.error(f"Error processing TXT file {file}: {str(e)}")
                        continue

            if not unique_vid_ids:
                logger.error("No YouTube video IDs found")
                raise ValueError("No YouTube video IDs found in the provided files")

            total_videos = len(unique_vid_ids)

            if task_id:
                upload_progress_tracker.update(task_id, total=total_videos, message='Creating categories...', status='processing')

            categories, videos_per_category = create_categories(
                new_project, num_annotators, groups, total_videos=total_videos
            )
            unique_vid_ids = list(unique_vid_ids)
            random.shuffle(unique_vid_ids)

            if task_id:
                upload_progress_tracker.update(task_id, message='Processing YouTube videos...')

            min_idx = 0
            max_idx = videos_per_category
            ID_START_POINT = BASE_ID_START_POINT
            processed_count = 0

            for idx in range(len(categories)):
                assoc_category = categories[idx]
                cur_video_slice = unique_vid_ids[min_idx:max_idx]

                for idx_vid, vid_id in enumerate(cur_video_slice):
                    ID_START_POINT += 1
                    processed_count += 1

                    if ID_START_POINT % 1000 == 0:
                        logger.info(f"Processing video {ID_START_POINT}")

                    file_name = str(ID_START_POINT)
                    cur_video = Videos(
                        youtube_vid_id=vid_id,
                        file_name=file_name,
                        video_path='youtube'
                    )
                    cur_video.category = assoc_category
                    cur_video.project = new_project
                    cur_video.save()

                    if task_id:
                        upload_progress_tracker.update(
                            task_id,
                            processed=processed_count,
                            message=f'Processing video {processed_count} of {total_videos}...'
                        )

                min_idx = max_idx
                max_idx += videos_per_category

            if task_id:
                upload_progress_tracker.complete(task_id, f'Completed! Processed {processed_count} YouTube videos.')

        return None

    except Exception as e:
        logger.error(f"Error in pipeline_without_cluster_csv: {str(e)}", exc_info=True)
        if task_id:
            upload_progress_tracker.error(task_id, str(e))
        raise    


def handle_upload_videos(user, project_type, num_annotators, project_name, cluster_csv, video_path=None, yt_file_type=None, task_id=None):
    """Handle video upload processing with or without cluster CSV

    Args:
        user: Django User object (can be passed from request.user or directly)
        project_type: Type of the project
        num_annotators: Number of annotators for the project
        project_name: Name of the project
        cluster_csv: Path to cluster CSV file (optional)
        video_path: Path to video files (optional)
        yt_file_type: Path to YouTube file (optional)
        task_id: Task ID for progress tracking (optional)
    """
    try:
        # Validate inputs
        if not project_name or not project_name.strip():
            raise ValueError("Project name is required")

        if num_annotators < 1:
            raise ValueError("Number of annotators must be at least 1")

        if not video_path and not yt_file_type:
            raise ValueError("Either video_path or yt_file_type must be provided")

        if task_id:
            upload_progress_tracker.update(task_id, message='Creating project...', status='processing')

        # Create or get project
        new_project, created = ProjectTitle.objects.get_or_create(
            user=user,
            project_type=project_type,
            project_name=project_name
        )

        if created:
            logger.info(f"Created new project: {project_name}")
        else:
            logger.info(f"Using existing project: {project_name}")

        # Update cluster CSV if provided
        if cluster_csv and not new_project.cluster_csv:
            if os.path.exists(cluster_csv):
                new_project.cluster_csv = cluster_csv
            else:
                logger.warning(f"Cluster CSV path does not exist: {cluster_csv}")

        # Update number of annotators if not set
        if not new_project.number_of_annotators:
            new_project.number_of_annotators = num_annotators

        # Set is_link flag for YouTube videos
        if yt_file_type:
            new_project.is_link = True

        new_project.save()

        if task_id:
            upload_progress_tracker.update(task_id, message='Creating annotator groups...')

        # Create groups for annotators
        groups = create_groups(num_annotators, project_name)
        logger.info(f"Created {len(groups)} groups for project {project_name}")

        # Process videos based on whether cluster CSV is provided
        if cluster_csv and os.path.exists(cluster_csv):
            logger.info("Processing videos with cluster CSV")
            if video_path:
                pipeline_with_cluster_csv(
                    new_project, num_annotators, groups,
                    cluster_csv, video_path=video_path, task_id=task_id
                )
            else:
                # Cluster CSV only works with local videos, not YouTube
                logger.warning("Cluster CSV provided but no video path. Using pipeline without CSV.")
                pipeline_without_cluster_csv(
                    new_project, num_annotators, groups,
                    yt_file_type=yt_file_type, task_id=task_id
                )
        else:
            logger.info("Processing videos without cluster CSV")
            if video_path:
                pipeline_without_cluster_csv(
                    new_project, num_annotators, groups,
                    video_path=video_path, task_id=task_id
                )
            elif yt_file_type:
                pipeline_without_cluster_csv(
                    new_project, num_annotators, groups,
                    yt_file_type=yt_file_type, task_id=task_id
                )

        logger.info(f"Successfully processed videos for project {project_name}")

    except Exception as e:
        logger.error(f"Error in handle_upload_videos: {str(e)}", exc_info=True)
        if task_id:
            upload_progress_tracker.error(task_id, str(e))
        raise
    

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
        # Try to find category - first try exact match, then try contains
        try:
            assoc_category = Category.objects.get(cluster_keywords=cluster_keywords, project=assoc_project)
        except Category.DoesNotExist:
            # Try case-insensitive match
            assoc_category = Category.objects.filter(
                cluster_keywords__iexact=cluster_keywords,
                project=assoc_project
            ).first()
            if not assoc_category:
                # Try contains match as fallback
                assoc_category = Category.objects.filter(
                    cluster_keywords__icontains=cluster_keywords,
                    project=assoc_project
                ).first()
            if not assoc_category:
                print(f"Category not found: '{cluster_keywords}' for project {assoc_project}")
                return HttpResponse(json.dumps([]), content_type='application/json')

        try:
            annotator_user = User.objects.get(username=annotator)
        except User.DoesNotExist:
            print(f"Annotator not found: '{annotator}'")
            return HttpResponse(json.dumps([]), content_type='application/json')

        videos = Videos.objects.filter(category=assoc_category, is_available=True, checked_by=annotator_user, status=True).order_by('id')
        print(f"Found {videos.count()} videos for category '{cluster_keywords}' by annotator '{annotator}'")

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
    total_videos = category.get_total_videos()
    total_count = len(total_videos)
    approved_count = category.video_categories.filter(status=True, is_available=True).count()
    rejected_count = category.video_categories.filter(status=False, is_available=True).count()
    return (approved_count, rejected_count, total_count)

def get_user_all_processed(user, is_admin=None, category=None, project=None):
    """
    Get count of processed videos for a user and total processed videos.
    Returns a tuple of (user_processed_count, all_processed_count).
    """
    if is_admin:
        user_processed = Videos.objects.filter(
            category=category,
            checked_by=user,
            status__isnull=False
        ).count()
        all_processed = Videos.objects.filter(
            project=project,
            status__isnull=False
        ).count()
    else:
        user_processed = Videos.objects.filter(
            checked_by=user,
            status__isnull=False,
            is_available=True
        ).count()
        all_processed = Videos.objects.filter(
            project=project,
            status__isnull=False,
            is_available=True
        ).count()

    return (user_processed, all_processed)

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
    """
    Process user's approve/reject decision for a video.
    Admin users can process any video, regular users can only process available videos.
    """
    import logging
    logger = logging.getLogger(__name__)

    # Validate required parameters
    if not file_name or not appr_or_rej:
        logger.warning(f"check_user_decision called with missing params: file_name={file_name}, appr_or_rej={appr_or_rej}")
        return

    # Admin can process any video, regular users only available videos
    if is_admin:
        video = get_object_or_404(Videos, file_name=file_name, project=assoc_project)
    else:
        video = get_object_or_404(Videos, file_name=file_name, project=assoc_project, is_available=True)

    if appr_or_rej == 'approve':
        if is_admin:
            # Admin approval - no need to change the checked_by user
            video.status = True
            video.admin_approve = True
            video.save()
            logger.info(f"Admin {cur_user.username} approved video {file_name}")
        else:
            video.checked_by = cur_user
            video.status = True
            video.save()
            logger.info(f"User {cur_user.username} approved video {file_name}")
    elif appr_or_rej == 'reject':
        if is_admin:
            video.status = False
            video.admin_approve = False
            video.save()
            logger.info(f"Admin {cur_user.username} rejected video {file_name}")
        else:
            video.checked_by = cur_user
            video.status = False
            video.save()
            logger.info(f"User {cur_user.username} rejected video {file_name}")


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
        admin_project = request.user.userreg.project
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
                #retrieve users videos scoped to admin's project
                user_videos = Videos.objects.filter(checked_by=assoc_user, project=admin_project, status__isnull=False)
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
                base_user = User.objects.get(username=user)
                assoc_videos = Videos.objects.filter(checked_by=base_user, project=admin_project, status=True, category__admin_approved=True)
                for vid in assoc_videos:
                    username_col_vals.append(user)
                    category_col_vals.append(vid.category)
                    file_name_col_vals.append(vid.file_name)
                    
            data["Users"] = username_col_vals
            data["Video Categories"] = category_col_vals
            data["Filenames"] = file_name_col_vals
        
        return data