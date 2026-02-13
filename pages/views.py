import os
import json
import logging
import uuid
import threading
import pandas as pd

from django.shortcuts import render, redirect, get_list_or_404, get_object_or_404
from django.contrib.auth.models import User, Group
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.http import JsonResponse, HttpResponse, HttpResponseBadRequest, HttpResponseServerError
from django.db.models import Q, Count, F
from django.views.decorators.http import require_http_methods, require_GET, require_POST
from django.db import transaction

from .upload_form import ProjectTitleForm
from .models import Category, Videos, ProjectTitle, Question, Answer, VideoGroup
from registration.models import Userreg
from .utils import (
    handle_upload_videos, export_job, display_categories, get_rem_total_per_category,
    get_video_list, check_user_decision, get_user_all_processed,
    get_paginated_video_list, serialize_videos, move_selected_videos,
    create_question_answers, prepare_export_data, serialize_objects,
    resources_dir, csv_base_dir, source_video_path, youtube_json_dir, youtube_txt_dir,
    upload_progress_tracker
)

logger = logging.getLogger(__name__) 



parent_dir = os.getcwd()
media_dir = os.path.join(parent_dir, 'media')
finished_jobs_dir = os.path.join(media_dir, "finished_jobs")


def index(request):
    """Main dashboard view for both admin and regular users"""
    from pages.utils import prepare_processed_videos

    # Handle unauthenticated users
    if not request.user.is_authenticated:
        if request.method == "POST":
            # Handle login form submission
            username = request.POST.get('username', '').strip()
            password = request.POST.get('password', '')

            if username and password:
                user = authenticate(request, username=username, password=password)
                if user is not None:
                    if user.is_active:
                        login(request, user)
                        logger.info(f"User {username} logged in successfully")
                        messages.success(request, f"Welcome back, {username}!")
                        return redirect('/')
                    else:
                        messages.warning(request, "Your account is inactive. Please check your email to activate your account.")
                else:
                    messages.error(request, "Invalid username or password")
            else:
                messages.error(request, "Username and password are required")

        # Render login page for unauthenticated users
        return render(request, 'index.html', {})

    try:
        user = request.user
        project_title_form = ProjectTitleForm()
        categories = display_categories(request)

        try:
            userreg_object = Userreg.objects.select_related('project', 'group').get(user=user)
            assoc_project = userreg_object.project
        except Userreg.DoesNotExist:
            logger.error(f"Userreg object not found for user {user.username}")
            messages.error(request, "User registration not found. Please contact administrator.")
            return redirect('/registration/user_registration/')

        # Admin user view
        if userreg_object.is_job_admin:
            total_videos = Videos.objects.filter(
                project=assoc_project,
                is_available=True
            ).count()
            accepted_videos = Videos.objects.filter(
                project=assoc_project,
                status__isnull=False,
                is_available=True
            ).count()

            if request.method == "POST":
                # Check if this is an AJAX request
                is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'

                try:
                    project_title_form = ProjectTitleForm(request.POST, request.FILES)
                    project_type = request.POST.get('project_type', '').strip()
                    project_name = request.POST.get('project_name', '').lower().strip()
                    num_annotators_str = request.POST.get('number_of_annotators', '').strip()

                    # Check if this is a simplified upload (existing session)
                    has_existing_session = bool(
                        assoc_project and
                        assoc_project.project_name and
                        assoc_project.project_type and
                        assoc_project.number_of_annotators
                    )

                    # Use existing project settings if in simplified mode
                    if has_existing_session and not project_name and not project_type and not num_annotators_str:
                        project_name = assoc_project.project_name
                        project_type = assoc_project.project_type
                        num_annotators = assoc_project.number_of_annotators
                        logger.info(f"Using existing session settings: project={project_name}, type={project_type}, annotators={num_annotators}")
                    else:
                        # Validate required fields for new project
                        if not project_name:
                            if is_ajax:
                                return JsonResponse({'status': 'error', 'message': 'Project name is required'})
                            messages.error(request, "Project name is required")
                            return redirect('/')

                        if not num_annotators_str:
                            if is_ajax:
                                return JsonResponse({'status': 'error', 'message': 'Number of annotators is required'})
                            messages.error(request, "Number of annotators is required")
                            return redirect('/')
                        try:
                            num_annotators = int(num_annotators_str)
                            if num_annotators < 1:
                                raise ValueError("Number of annotators must be at least 1")
                        except ValueError as e:
                            logger.error(f"Invalid number of annotators: {num_annotators_str}")
                            if is_ajax:
                                return JsonResponse({'status': 'error', 'message': 'Number of annotators must be a valid positive number'})
                            messages.error(request, "Number of annotators must be a valid positive number")
                            return redirect('/')

                    # Construct full paths using nist_trecvid_resources directory
                    cluster_csv_input = request.POST.get('cluster_csv', '').strip()
                    cluster_csv = None
                    if cluster_csv_input:
                        # User provides just the subdirectory or filename within csv_base_dir
                        full_csv_path = os.path.join(csv_base_dir, cluster_csv_input)
                        if os.path.isdir(full_csv_path):
                            csv_files = [os.path.join(full_csv_path, f) for f in os.listdir(full_csv_path) if f.endswith('.csv')]
                            cluster_csv = csv_files[0] if csv_files else None
                        elif os.path.isfile(full_csv_path):
                            cluster_csv = full_csv_path
                        logger.info(f"Cluster CSV path resolved to: {cluster_csv}")

                    # Construct full paths for video and YouTube directories
                    video_path_input = request.POST.get('video_path', '').strip()
                    youtube_json_input = request.POST.get('youtube_json_path', '').strip()
                    youtube_txt_input = request.POST.get('youtube_txt_path', '').strip()

                    video_path = None
                    if video_path_input:
                        video_path = os.path.join(source_video_path, video_path_input)
                        logger.info(f"Video path resolved to: {video_path}")

                    yt_file_type = None
                    if youtube_json_input:
                        yt_file_type = os.path.join(youtube_json_dir, youtube_json_input)
                        logger.info(f"YouTube JSON path resolved to: {yt_file_type}")
                    elif youtube_txt_input:
                        yt_file_type = os.path.join(youtube_txt_dir, youtube_txt_input)
                        logger.info(f"YouTube TXT path resolved to: {yt_file_type}")

                    if not video_path and not yt_file_type:
                        if is_ajax:
                            return JsonResponse({'status': 'error', 'message': 'Please provide either video path or YouTube file'})
                        messages.error(request, "Please provide either video path or YouTube file")
                        return redirect('/')

                    # Generate task ID for progress tracking
                    task_id = str(uuid.uuid4())
                    upload_progress_tracker.create_task(task_id)

                    # For AJAX requests, run upload in background thread for real-time progress
                    if is_ajax:
                        # Store user for background thread (request won't be available)
                        upload_user = request.user

                        def background_upload():
                            from django.db import connection
                            try:
                                if video_path:
                                    handle_upload_videos(
                                        upload_user, project_type, num_annotators,
                                        project_name, cluster_csv, video_path=video_path, task_id=task_id
                                    )
                                elif yt_file_type:
                                    handle_upload_videos(
                                        upload_user, project_type, num_annotators,
                                        project_name, cluster_csv, yt_file_type=yt_file_type, task_id=task_id
                                    )
                            except Exception as e:
                                logger.error(f"Background upload error: {str(e)}", exc_info=True)
                                upload_progress_tracker.error(task_id, str(e))
                            finally:
                                # Close database connection for this thread
                                connection.close()

                        # Start background thread
                        upload_thread = threading.Thread(target=background_upload, daemon=True)
                        upload_thread.start()

                        # Return immediately with task_id for progress polling
                        return JsonResponse({
                            'status': 'processing',
                            'message': 'Upload started',
                            'task_id': task_id
                        })

                    # For non-AJAX requests, process synchronously
                    if video_path:
                        handle_upload_videos(
                            request.user, project_type, num_annotators,
                            project_name, cluster_csv, video_path=video_path, task_id=task_id
                        )
                    elif yt_file_type:
                        handle_upload_videos(
                            request.user, project_type, num_annotators,
                            project_name, cluster_csv, yt_file_type=yt_file_type, task_id=task_id
                        )

                    messages.success(request, "Videos uploaded successfully")
                    return redirect('/')

                except Exception as e:
                    logger.error(f"Error uploading videos: {str(e)}", exc_info=True)
                    if is_ajax:
                        return JsonResponse({'status': 'error', 'message': str(e)})
                    messages.error(request, f"Error uploading videos: {str(e)}")
                    return redirect('/')
            else:
                # GET request for admin
                try:
                    project_type = assoc_project.project_type
                    users_processed_videos = prepare_processed_videos(
                        request=None, user=user, project_type=project_type
                    )
                except Exception as e:
                    logger.warning(f"Could not prepare processed videos for admin: {str(e)}")
                    users_processed_videos = None

                # Check if existing session exists (project with name, type, and annotators configured)
                has_existing_session = bool(
                    assoc_project and
                    assoc_project.project_name and
                    assoc_project.project_type and
                    assoc_project.number_of_annotators
                )

                context = {
                    'project_details': project_title_form,
                    'total_videos': total_videos,
                    'accepted_videos': accepted_videos,
                    'users_processed_videos': users_processed_videos,
                    'has_existing_session': has_existing_session,
                    'existing_project': assoc_project if has_existing_session else None
                }

                return render(request, 'index.html', context)
    
        # Regular user view — count all processed videos (approved + rejected)
        accepted_videos = Videos.objects.filter(
            project=assoc_project,
            status__isnull=False,
            is_available=True
        ).count()
        total_videos = Videos.objects.filter(
            project=assoc_project,
            is_available=True
        ).count()

        user_assigned_videos = []
        total_user_assigned_vids = 0
        percentage_remaining = 0

        try:
            user_group = userreg_object.group
            if user_group:
                user_categories = Category.objects.filter(
                    project=assoc_project,
                    group=user_group
                ).prefetch_related('video_categories')

                for cat in user_categories:
                    cur_cat_videos = Videos.objects.filter(
                        project=assoc_project,
                        category=cat,
                        is_available=True
                    )
                    total_user_assigned_vids += cur_cat_videos.count()
                    user_assigned_videos.append(cur_cat_videos)
        except Exception as e:
            logger.warning(f"Error retrieving user assigned videos: {str(e)}")
            user_assigned_videos = []

        user_processed_videos = Videos.objects.filter(
            project=assoc_project,
            checked_by=user,
            status__isnull=False,
            is_available=True
        )
        user_approved_count = Videos.objects.filter(
            project=assoc_project,
            checked_by=user,
            status=True,
            is_available=True
        ).count()
        user_rejected_count = Videos.objects.filter(
            project=assoc_project,
            checked_by=user,
            status=False,
            is_available=True
        ).count()

        try:
            if total_user_assigned_vids > 0:
                percentage_remaining = (user_processed_videos.count() / total_user_assigned_vids) * 100
                percentage_remaining = round(percentage_remaining, 2)
            else:
                percentage_remaining = 0
        except Exception as e:
            logger.warning(f"Error calculating percentage: {str(e)}")
            percentage_remaining = 0

        # Build context for regular users
        if not categories or categories.count() == 0:
            context = {
                'percentage_rem_user': percentage_remaining,
                'user_processed_videos': user_processed_videos.count(),
                'total_user_assigned_vids': total_user_assigned_vids,
                'accepted_videos': accepted_videos,
                'total_videos': total_videos,
                'user_approved_count': user_approved_count,
                'user_rejected_count': user_rejected_count,
            }
        else:
            first_category = categories.first()
            project_type = first_category.project.project_type if first_category else 'annotation'

            context = {
                'categories': categories,
                'percentage_rem_user': percentage_remaining,
                'user_processed_videos': user_processed_videos.count(),
                'total_user_assigned_vids': total_user_assigned_vids,
                'accepted_videos': accepted_videos,
                'total_videos': total_videos,
                'project_type': project_type,
                'user_approved_count': user_approved_count,
                'user_rejected_count': user_rejected_count,
            }

        return render(request, 'index.html', context)

    except Exception as e:
        logger.error(f"Error in index view: {str(e)}", exc_info=True)
        messages.error(request, "An error occurred. Please try again.")
        return render(request, 'index.html', {})

def sign_up(request):
    context = {}
    return render(request, 'sign_up.html', context)

@login_required
@require_GET
def retrieve_video_qa(request):
    """Retrieve video QA information"""
    try:
        file_name = request.GET.get('file_name')
        cluster_keywords = request.GET.get('cluster_keywords')
        annotator = request.GET.get('annotator')

        if not file_name or not cluster_keywords:
            return JsonResponse({
                'error': 'Missing required parameters'
            }, status=400)

        user = request.user
        try:
            userreg_obj = Userreg.objects.select_related('project').get(user=user)
        except Userreg.DoesNotExist:
            return JsonResponse({
                'error': 'User registration not found'
            }, status=404)

        assoc_project = userreg_obj.project

        try:
            assoc_category = Category.objects.get(
                project=assoc_project,
                cluster_keywords=cluster_keywords
            )
        except Category.DoesNotExist:
            return JsonResponse({
                'error': 'Category not found'
            }, status=404)

        # Retrieve video based on whether request is from admin or user
        try:
            if not annotator:
                # called from user page
                assoc_video = Videos.objects.select_related('question').get(
                    file_name=file_name,
                    checked_by=user,
                    project=assoc_project,
                    category=assoc_category,
                    is_available=True
                )
            else:
                # called from admin page
                annotator_user = User.objects.get(username=annotator)
                assoc_video = Videos.objects.select_related('question').get(
                    file_name=file_name,
                    project=assoc_project,
                    category=assoc_category,
                    is_available=True
                )
        except Videos.DoesNotExist:
            return JsonResponse({
                'error': 'Video not found'
            }, status=404)
        except User.DoesNotExist:
            return JsonResponse({
                'error': 'Annotator not found'
            }, status=404)

        payload = {}

        # Retrieve question and answers
        if assoc_video.question:
            try:
                assoc_question = assoc_video.question
                assoc_answers = assoc_question.question_answers.all()

                question_load = {
                    "id": assoc_question.id,
                    "value": assoc_question.question
                }
                payload['question'] = question_load

                for idx, ans in enumerate(assoc_answers):
                    answer_load = {
                        "id": ans.id,
                        "value": ans.answer
                    }
                    if ans.correct:
                        payload[f'ans-{idx}-correct'] = answer_load
                    else:
                        payload[f'ans-{idx}'] = answer_load
            except Exception as e:
                logger.error(f"Error retrieving question/answers: {str(e)}")
                payload['question'] = None
        else:
            payload['question'] = None

        return JsonResponse({"data": payload})

    except Exception as e:
        logger.error(f"Error in retrieve_video_qa: {str(e)}", exc_info=True)
        return JsonResponse({
            'error': 'An error occurred while retrieving video QA'
        }, status=500)

@login_required
@require_POST
def submit_vid_qa(request):
    """Submit video Q&A data"""
    try:
        is_edit = request.GET.get('is_edit')
        video_filename = request.POST.get('video_filename')
        cluster_keywords = request.POST.get('cluster_keyword')

        # Validate required fields
        if not video_filename or not cluster_keywords:
            return JsonResponse({
                'error': 'Missing required fields: video_filename or cluster_keyword'
            }, status=400)

        user = request.user

        try:
            userreg_object = Userreg.objects.select_related('project').get(user=user)
        except Userreg.DoesNotExist:
            return JsonResponse({'error': 'User registration not found'}, status=404)

        assoc_project = userreg_object.project

        try:
            assoc_category = Category.objects.get(cluster_keywords=cluster_keywords, project=assoc_project)
        except Category.DoesNotExist:
            return JsonResponse({'error': 'Category not found'}, status=404)

        try:
            cur_video = Videos.objects.get(
                category=assoc_category,
                project=assoc_project,
                file_name=video_filename,
                is_available=True
            )
        except Videos.DoesNotExist:
            return JsonResponse({'error': 'Video not found'}, status=404)

        payload = {}

        with transaction.atomic():
            if is_edit:
                def populate_payload(assoc_id, key, value, payload, obj=None, isQuestion=False):
                    if isQuestion:
                        payload.setdefault(key, {"id": assoc_id, "value": value})
                    else:
                        if obj.correct:
                            payload.setdefault(f'{key}-correct', {"id": assoc_id, "value": value})
                        else:
                            payload.setdefault(key, {"id": assoc_id, "value": value})
                    return payload

                for key, value in request.POST.items():
                    if "question" in key:
                        assoc_id = int(key.split('-')[-1])
                        new_key = key.split('-')[0]
                        assoc_question = Question.objects.get(id=assoc_id)
                        assoc_question.question = value
                        assoc_question.save()
                        cur_video.question = assoc_question
                        cur_video.save()
                        populate_payload(assoc_id, new_key, value, payload, isQuestion=True)
                    elif "ans-0" in key:
                        assoc_id = int(key.split('-')[-1])
                        new_key = key.split('-')[0] + "-" + key.split('-')[1]
                        assoc_ans = Answer.objects.get(id=assoc_id)
                        assoc_ans.answer = value
                        assoc_ans.save()
                        populate_payload(assoc_id, new_key, value, payload, obj=assoc_ans, isQuestion=False)
                    elif "ans-1" in key:
                        assoc_id = int(key.split('-')[-1])
                        new_key = key.split('-')[0] + "-" + key.split('-')[1]
                        assoc_ans = Answer.objects.get(id=assoc_id)
                        assoc_ans.answer = value
                        assoc_ans.save()
                        populate_payload(assoc_id, new_key, value, payload, obj=assoc_ans, isQuestion=False)
                    elif "ans-2" in key:
                        assoc_id = int(key.split('-')[-1])
                        new_key = key.split('-')[0] + "-" + key.split('-')[1]
                        assoc_ans = Answer.objects.get(id=assoc_id)
                        assoc_ans.answer = value
                        assoc_ans.save()
                        populate_payload(assoc_id, new_key, value, payload, obj=assoc_ans, isQuestion=False)
                    elif "ans-3" in key:
                        assoc_id = int(key.split('-')[-1])
                        new_key = key.split('-')[0] + "-" + key.split('-')[1]
                        assoc_ans = Answer.objects.get(id=assoc_id)
                        assoc_ans.answer = value
                        assoc_ans.save()
                        populate_payload(assoc_id, new_key, value, payload, obj=assoc_ans, isQuestion=False)

                return JsonResponse(payload)

            else:
                # Get and validate Q&A fields
                question_text = request.POST.get('question', '').strip().lower()
                correct_ans = request.POST.get('correct_ans', '').strip().lower()
                answer_one = request.POST.get('opt_ans_one', '').strip().lower()
                answer_two = request.POST.get('opt_ans_two', '').strip().lower()
                answer_three = request.POST.get('opt_ans_three', '').strip().lower()

                if question_text:
                    answers = [correct_ans, answer_one, answer_two, answer_three]
                    # Process video question
                    question_obj = create_question_answers(question=question_text, answers=answers)
                    cur_video.question = question_obj
                    cur_video.status = True
                    cur_video.checked_by = user
                    cur_video.save()

                    # Build payload data
                    payload['question'] = {'id': question_obj.id, 'value': question_obj.question}
                    question_answers = question_obj.question_answers.all()
                    for idx, ans in enumerate(question_answers):
                        if ans.correct:
                            payload[f'ans-{idx}-correct'] = {'id': ans.id, 'value': ans.answer}
                        else:
                            payload[f'ans-{idx}'] = {'id': ans.id, 'value': ans.answer}

                    logger.info(f"User {user.username} submitted Q&A for video {video_filename}")
                else:
                    # No question provided - mark as rejected/skipped
                    cur_video.status = False
                    cur_video.checked_by = user
                    cur_video.save()
                    logger.info(f"User {user.username} skipped video {video_filename}")

                return JsonResponse(payload)

    except Exception as e:
        logger.error(f"Error in submit_vid_qa: {str(e)}", exc_info=True)
        return JsonResponse({'error': 'An error occurred while processing Q&A'}, status=500)

@login_required
@require_GET
def admin_approve(request):
    """Admin view to approve or reject user annotations"""
    try:
        admin_user = request.user
        try:
            admin_userreg_obj = Userreg.objects.select_related('project').get(user=admin_user)
        except Userreg.DoesNotExist:
            return JsonResponse({'error': 'Admin user not found'}, status=404)

        if not admin_userreg_obj.is_job_admin:
            return JsonResponse({'error': 'Unauthorized'}, status=403)

        project = admin_userreg_obj.project
        project_type = project.project_type

        with transaction.atomic():
            # Handle bulk category approval
            if request.GET.get('user_categories'):
                user_categories_str = request.GET.get('user_categories')
                # Use ||| delimiter to avoid conflicts with hyphens in category names
                parts = user_categories_str.split('|||')

                if len(parts) < 2:
                    return JsonResponse({
                        'error': 'Invalid user_categories format'
                    }, status=400)

                username = parts[0].strip()
                categories = [cat.strip() for cat in parts[1:] if cat.strip()]
                status = request.GET.get('status')

                if status not in ['approved', 'rejected']:
                    return JsonResponse({
                        'error': 'Invalid status value'
                    }, status=400)

                try:
                    user_object = User.objects.get(username=username)
                    # Get the Userreg for this user that matches the admin's project
                    userreg_object = Userreg.objects.get(user=user_object)

                    # Verify the user belongs to the same project as the admin
                    if userreg_object.project != project:
                        logger.warning(f"User {username} belongs to project {userreg_object.project}, not {project}")
                        # Update the userreg to point to the correct project if needed
                        # This handles cases where users might be shared across projects
                except (User.DoesNotExist, Userreg.DoesNotExist):
                    return JsonResponse({
                        'error': f'User {username} not found'
                    }, status=404)

                # Update categories
                categories_updated = 0
                for category_keyword in categories:
                    try:
                        # Try exact match first
                        assoc_category = Category.objects.filter(
                            cluster_keywords=category_keyword,
                            project=project
                        ).first()

                        # Fallback to case-insensitive match
                        if not assoc_category:
                            assoc_category = Category.objects.filter(
                                cluster_keywords__iexact=category_keyword,
                                project=project
                            ).first()

                        # Fallback to contains match
                        if not assoc_category:
                            assoc_category = Category.objects.filter(
                                cluster_keywords__icontains=category_keyword,
                                project=project
                            ).first()

                        if assoc_category:
                            assoc_category.admin_approved = (status == "approved")
                            assoc_category.save()
                            categories_updated += 1
                            logger.info(f"Category '{category_keyword}' set to admin_approved={status == 'approved'}")
                        else:
                            logger.warning(f"Category '{category_keyword}' not found in project {project.project_name}")

                    except Exception as e:
                        logger.error(f"Error updating category {category_keyword}: {str(e)}")
                        continue

                logger.info(f"Updated {categories_updated} categories for user {username}")

                # Update user approval status
                userreg_object.admin_approved = (status == "approved")
                userreg_object.save()
                logger.info(f"User {username} admin_approved set to {status == 'approved'}")

            # Handle single cluster approval
            elif request.GET.get('cluster_keyword'):
                cluster_keyword = request.GET.get("cluster_keyword")
                status = request.GET.get("status")

                if status not in ['approved', 'rejected']:
                    return JsonResponse({
                        'error': 'Invalid status value'
                    }, status=400)

                try:
                    assoc_category = Category.objects.select_related('group').get(
                        cluster_keywords=cluster_keyword,
                        project=project
                    )
                except Category.DoesNotExist:
                    return JsonResponse({
                        'error': 'Category not found'
                    }, status=404)

                assoc_group = assoc_category.group
                if not assoc_group or not assoc_group.user:
                    return JsonResponse({
                        'error': 'Group or user not found'
                    }, status=404)

                try:
                    assoc_user = Userreg.objects.get(user=assoc_group.user)
                except Userreg.DoesNotExist:
                    return JsonResponse({
                        'error': 'User registration not found'
                    }, status=404)

                # Update category approval
                assoc_category.admin_approved = (status == "approved")
                assoc_category.save()

                if status == "approved":
                    assoc_user.admin_approved = True
                    assoc_user.save()
                elif status == "rejected":
                    # Check if user has any other approved categories
                    all_user_approved_category = Category.objects.filter(
                        group=assoc_group,
                        admin_approved=True
                    )
                    if all_user_approved_category.count() == 0:
                        assoc_user.admin_approved = False
                        assoc_user.save()

        # Return updated payload
        payload = export_job(project)
        return JsonResponse(payload, safe=False)

    except Exception as e:
        logger.error(f"Error in admin_approve: {str(e)}", exc_info=True)
        return JsonResponse({
            'error': 'An error occurred while processing approval'
        }, status=500)

@login_required
@require_POST
def admin_approve_reject_video(request):
    """Admin approve or reject an individual video in a video_qa project."""
    try:
        admin_user = request.user
        try:
            admin_userreg = Userreg.objects.select_related('project').get(user=admin_user)
        except Userreg.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'User registration not found'}, status=404)

        if not admin_userreg.is_job_admin:
            return JsonResponse({'status': 'error', 'message': 'Unauthorized'}, status=403)

        file_name = request.POST.get('file_name')
        appr_rej = request.POST.get('appr_rej')

        if not file_name or not appr_rej:
            return JsonResponse({'status': 'error', 'message': 'file_name and appr_rej are required'}, status=400)

        assoc_project = admin_userreg.project
        check_user_decision(file_name, admin_user, appr_rej, assoc_project, is_admin=True)

        return JsonResponse({'status': 'success', 'message': f'Video {appr_rej}d successfully'})

    except Exception as e:
        logger.error(f"Error in admin_approve_reject_video: {str(e)}", exc_info=True)
        return JsonResponse({'status': 'error', 'message': 'An error occurred'}, status=500)


def get_job_summary(request):
    admin_username = request.GET.get('admin_username')
    logger.info(f"get_job_summary called for admin: {admin_username}")

    try:
        admin_user = User.objects.get(username=admin_username)
        assoc_project = admin_user.userreg.project
        logger.info(f"Admin's project: {assoc_project.project_name}")
    except (User.DoesNotExist, AttributeError) as e:
        logger.error(f"Error getting admin project: {str(e)}")
        return JsonResponse({'error': 'Admin user not found'}, status=404)

    payload = export_job(assoc_project)
    logger.info(f"get_job_summary returning {len(payload)} entries")
    return JsonResponse(payload, safe=False)

def export_all_videos(request):
    """
        exports user processed videos to a zil file
        based on whether is a youtube link or local video
    """
    project_admin_user = request.user
    assoc_project = project_admin_user.userreg.project
    is_youtube_link = assoc_project.is_link
    usernames = request.GET.get("usernames")

    # If no usernames provided, get all annotators who have processed videos in this project
    if not usernames:
        annotator_users = Videos.objects.filter(
            project=assoc_project,
            checked_by__isnull=False,
            status__isnull=False
        ).values_list('checked_by__username', flat=True).distinct()
        usernames = '_'.join(annotator_users) if annotator_users else ''

    data = prepare_export_data(request, usernames, is_youtube_link)
    if data:
        df = pd.DataFrame(data)
        os.makedirs(finished_jobs_dir, exist_ok=True)
        finished_jobs_csv = os.path.join(finished_jobs_dir, "finished_jobs.csv")
        df.to_csv(finished_jobs_csv, index=False)
    
        finished_jobs_csv = "media/finished_jobs/finished_jobs.csv"
     
        return JsonResponse({"finished_job_csv": finished_jobs_csv,
                            #"zip_file_path":zip_file_path if not is_youtube_link else None
                            })
    else:
       #TODO catch this in frontend and throw an alert to the user
       return JsonResponse({
            "message": "No processed video found",
            "status": 500
        })

def end_annotation(request):
    user = request.GET.get('user')
    restart_end = request.GET.get('restart_end')
    if restart_end == 'true':
        assoc_user = User.objects.get(username=user)
        assoc_user.userreg.finished_job = False
        assoc_user.userreg.save()
        context = {'restarted': True}
    else:
        assoc_user = User.objects.get(username=user)
        assoc_user.userreg.finished_job = True
        assoc_user.userreg.save()
        context = {'restarted': False}
        
    
    return JsonResponse(context)

def display_videos(request):
    if request.method == 'GET':
        request_dict_keys = dict(request.GET).keys()
        user = request.user
        user_object = User.objects.get(username=user)
        userreg_object = Userreg.objects.get(user=user_object) 
        assoc_project = userreg_object.project
        if "term" in request_dict_keys:
            term = request.GET.get('term')
            videos = get_video_list(term=term, assoc_project=assoc_project)
        elif "cluster_group" in request_dict_keys:
            category = request.GET.get('category')
            cluster_group = request.GET.get('cluster_group')
            videos = get_video_list(category=category, cluster_group=cluster_group, assoc_project=assoc_project)
        else:
            is_admin = request.GET.get('is_admin')
            if is_admin:
                category = request.GET.get('category')
                annotator = request.GET.get('annotator')
                videos = get_video_list(category=category, annotator=annotator, assoc_project=assoc_project, is_admin=is_admin)
            else:
                category = request.GET.get('category')
                annotator = request.GET.get('annotator')
                videos = get_video_list(category=category, annotator=annotator, assoc_project=assoc_project)
    # print("ff", videos)
    return videos

def get_videos_per_category(request):
    if request.method == 'GET':
        # print("get videos cat callled")
        
        from registration.models import Userreg
        term = request.GET.get('term')
        user = request.user
        assoc_usereg_instance = Userreg.objects.get(user=user)
        assoc_proj = assoc_usereg_instance.project
        

        assoc_category = get_object_or_404(Category, cluster_keywords=term, project=assoc_proj)
        
        # Order by status: unprocessed videos (status=None) first, then by similarity score
        videos = assoc_category.video_categories.filter(is_available=True).order_by(
            F('status').asc(nulls_first=True), '-video_similarity_score'
        )
     
        serialized_videos = serialize_videos(videos)
       
        serialized_videos_json = json.loads(serialized_videos)
        context = {"serialized_videos": serialized_videos_json,
                   "project_type": assoc_proj.project_type}
        # print("context", context)
        serialized_videos = JsonResponse(context, safe=False)

    # print('videos.get_unprocessed_videos()', videos)
    return serialized_videos

def get_unprocessed_vids(request):
    """
        Retrieves user filename and user decision (approve or reject) from a get request
        processes this video files and returns a context of remaiing unchecked videos
    """
    cur_user = request.user
    if request.method == "GET":
        file_name = request.GET.get('file_name')
        assoc_video = get_object_or_404(Videos, file_name=file_name, is_available=True)
        assoc_category = assoc_video.category
        videos = assoc_category.get_unprocessed_videos(cur_user)
        serialized_videos = serialize_videos(videos)
        serialized_videos = HttpResponse(serialized_videos, content_type='application/json')

    return serialized_videos

def process_user_decision(request):
    if request.method == 'GET':
        cur_user = request.user
        selection = request.GET.get('selection').split('_')
        appr_rej = selection[1]
        # print('appr_rej', appr_rej)
        file_name = selection[0]
        check_user_decision(file_name, cur_user, appr_rej)

        if appr_rej == 'approve':
            return JsonResponse({'info': f"Approved {file_name}"}) 
        elif appr_rej == 'reject':
            return JsonResponse({'info': f"Rejected {file_name}"})


@login_required
@require_GET
def bulk_approve_reject_category(request):
    """Bulk approve or reject all available videos in a category for an annotator user."""
    try:
        cur_user = request.user
        cluster_keywords = request.GET.get('cluster_keywords')
        action = request.GET.get('action')

        try:
            userreg = Userreg.objects.select_related('project', 'group').get(user=cur_user)
        except Userreg.DoesNotExist:
            return JsonResponse({'error': 'User registration not found'}, status=404)

        if userreg.is_job_admin:
            return JsonResponse({'error': 'Unauthorized: admins cannot use this endpoint'}, status=403)

        project = userreg.project
        if not project or project.project_type != 'annotation':
            return JsonResponse({'error': 'Bulk actions only available for annotation projects'}, status=400)

        if not cluster_keywords or action not in ('approve', 'reject'):
            return JsonResponse({'error': 'Invalid parameters'}, status=400)

        try:
            category = Category.objects.get(cluster_keywords=cluster_keywords, project=project)
        except Category.DoesNotExist:
            return JsonResponse({'error': f'Category not found: {cluster_keywords}'}, status=404)
        except Category.MultipleObjectsReturned:
            category = Category.objects.filter(cluster_keywords=cluster_keywords, project=project).first()

        status_value = True if action == 'approve' else False

        # Use explicit queryset on Videos model with category filter
        with transaction.atomic():
            updated_count = Videos.objects.filter(
                category=category,
                is_available=True
            ).update(
                status=status_value,
                checked_by_id=cur_user.pk
            )

        # Verify the update actually persisted
        verified_count = Videos.objects.filter(
            category=category,
            is_available=True,
            status=status_value,
            checked_by_id=cur_user.pk
        ).count()

        total = Videos.objects.filter(category=category, is_available=True).count()
        cat_approved = Videos.objects.filter(
            category=category, status=True, is_available=True
        ).count()
        cat_rejected = Videos.objects.filter(
            category=category, status=False, is_available=True
        ).count()

        user_processed = Videos.objects.filter(
            project=project,
            checked_by=cur_user,
            status__isnull=False,
            is_available=True
        ).count()
        accepted_videos = Videos.objects.filter(
            project=project,
            status__isnull=False,
            is_available=True
        ).count()
        total_project = Videos.objects.filter(
            project=project,
            is_available=True
        ).count()
        user_approved = Videos.objects.filter(
            project=project,
            checked_by=cur_user,
            status=True,
            is_available=True
        ).count()
        user_rejected = Videos.objects.filter(
            project=project,
            checked_by=cur_user,
            status=False,
            is_available=True
        ).count()

        return JsonResponse({
            'status': 'success',
            'updated_count': updated_count,
            'verified_count': verified_count,
            'cat_approved': cat_approved,
            'cat_rejected': cat_rejected,
            'total': total,
            'action': action,
            'user_processed': user_processed,
            'accepted_videos': accepted_videos,
            'total_project': total_project,
            'user_approved': user_approved,
            'user_rejected': user_rejected,
        })

    except Exception as e:
        logger.error(f"Error in bulk_approve_reject_category: {str(e)}", exc_info=True)
        return JsonResponse({'error': f'An error occurred: {str(e)}'}, status=500)


@login_required
@require_GET
def get_next_video(request):
    """Get the next video to annotate/review"""
    try:
        is_admin = request.GET.get('is_admin')

        cur_user = request.user

        try:
            userreg_object = Userreg.objects.select_related('project').get(user=cur_user)
        except Userreg.DoesNotExist:
            return JsonResponse({'error': 'User registration not found'}, status=404)

        assoc_project = userreg_object.project

        if request.GET.get('category'):
            # Initial category exploration - get first unprocessed video
            cluster_keywords = request.GET.get('category')
            try:
                assoc_category = Category.objects.get(cluster_keywords=cluster_keywords, project=assoc_project)
            except Category.DoesNotExist:
                return JsonResponse({'error': 'Category not found'}, status=404)

            next_video = assoc_category.video_categories.filter(
                status__isnull=True,
                is_available=True
            ).order_by('-video_similarity_score').first()

            # Handle case when no more videos to process
            if next_video:
                serialized_next_video = serialize_videos([next_video])
                serialized_next_video = json.loads(serialized_next_video)
            else:
                serialized_next_video = []

            return JsonResponse({"serialized_next_video": serialized_next_video})
        else:
            # Processing approve/reject and getting next video
            file_name = request.GET.get('file_name')
            appr_rej = request.GET.get('appr_rej')

            if not file_name:
                return JsonResponse({'error': 'file_name is required'}, status=400)
            if not appr_rej:
                return JsonResponse({'error': 'appr_rej is required'}, status=400)

            # Process user decision
            check_user_decision(file_name, cur_user, appr_rej, assoc_project, is_admin)

            try:
                assoc_video = Videos.objects.select_related('category', 'checked_by').get(
                    file_name=file_name,
                    project=assoc_project,
                    is_available=True
                )
            except Videos.DoesNotExist:
                return JsonResponse({'error': 'Video not found'}, status=404)

            assoc_category = assoc_video.category

            # Get next video based on user role
            if is_admin:
                from_admin_edit = request.GET.get('from_admin_edit')
                if from_admin_edit:
                    next_video = assoc_category.video_categories.filter(
                        status=True,
                        admin_approve=True,
                        question__isnull=False,
                        is_available=True
                    ).order_by('id').first()
                else:
                    next_video = assoc_category.video_categories.filter(
                        status=True,
                        admin_approve=False,
                        is_available=True
                    ).order_by('id').first()
            else:
                next_video = assoc_category.video_categories.filter(
                    status__isnull=True,
                    is_available=True
                ).order_by('-video_similarity_score').first()

            # Handle case when no more videos to process
            if next_video:
                serialized_next_video = serialize_videos([next_video])
                serialized_next_video = json.loads(serialized_next_video)
            else:
                serialized_next_video = []

            annotator = assoc_video.checked_by
            rem_total_per_category = get_rem_total_per_category(assoc_category)

            if is_admin:
                category_all_processed = get_user_all_processed(
                    annotator,
                    is_admin=is_admin,
                    category=assoc_category,
                    project=assoc_project
                )
                user_all_processed = category_all_processed
            else:
                user_all_processed = get_user_all_processed(cur_user, project=assoc_project)

            response_data = {
                "serialized_next_video": serialized_next_video,
                "rem_total_per_category": rem_total_per_category,
                "user_all_processed": user_all_processed
            }

            # Add approved/rejected counts for regular users
            if not is_admin:
                response_data["user_approved"] = Videos.objects.filter(
                    project=assoc_project, checked_by=cur_user,
                    status=True, is_available=True
                ).count()
                response_data["user_rejected"] = Videos.objects.filter(
                    project=assoc_project, checked_by=cur_user,
                    status=False, is_available=True
                ).count()

            return JsonResponse(response_data)

    except Exception as e:
        logger.error(f"Error in get_next_video: {str(e)}", exc_info=True)
        return JsonResponse({'error': 'An error occurred'}, status=500)

@login_required
@require_GET
def mark_as_unavailable(request):
    """Mark a video as unavailable"""
    try:
        filename = request.GET.get('filename')
        category = request.GET.get('category', '').strip()
        project_name = request.GET.get('project_name')

        if not filename or not category or not project_name:
            return JsonResponse({
                'error': 'Missing required parameters',
                'status': 400
            }, status=400)

        try:
            assoc_project = ProjectTitle.objects.get(project_name=project_name)
        except ProjectTitle.DoesNotExist:
            return JsonResponse({
                'error': 'Project not found',
                'status': 404
            }, status=404)

        try:
            assoc_category = Category.objects.get(
                project=assoc_project,
                cluster_keywords=category
            )
        except Category.DoesNotExist:
            return JsonResponse({
                'error': 'Category not found',
                'status': 404
            }, status=404)

        try:
            assoc_video = Videos.objects.get(
                category=assoc_category,
                file_name=filename
            )
        except Videos.DoesNotExist:
            return JsonResponse({
                'error': 'Video not found',
                'status': 404
            }, status=404)

        assoc_video.is_available = False
        assoc_video.save()

        logger.info(f"Video {filename} marked as unavailable by {request.user.username}")

        return JsonResponse({
            'filename': filename,
            'info': 'success',
            'status': 200
        })

    except Exception as e:
        logger.error(f"Error marking video as unavailable: {str(e)}", exc_info=True)
        return JsonResponse({
            'error': 'An error occurred',
            'status': 500
        }, status=500)


@login_required
@require_GET
def upload_progress(request):
    """Get the progress of an upload task"""
    try:
        task_id = request.GET.get('task_id')

        if not task_id:
            return JsonResponse({
                'status': 'error',
                'message': 'task_id is required'
            }, status=400)

        progress = upload_progress_tracker.get(task_id)

        return JsonResponse({
            'status': progress.get('status', 'unknown'),
            'percent': progress.get('percent', 0),
            'processed': progress.get('processed', 0),
            'total': progress.get('total', 0),
            'message': progress.get('message', '')
        })

    except Exception as e:
        logger.error(f"Error getting upload progress: {str(e)}", exc_info=True)
        return JsonResponse({
            'status': 'error',
            'message': 'An error occurred'
        }, status=500)


@login_required
@require_GET
def check_ongoing_jobs(request):
    """Check if there are ongoing annotation jobs for the admin's project"""
    try:
        admin_user = request.user
        admin_userreg = admin_user.userreg

        if not admin_userreg.is_job_admin:
            return JsonResponse({'error': 'Unauthorized'}, status=403)

        project = admin_userreg.project

        if not project:
            return JsonResponse({'error': 'No project found'}, status=404)

        # Check if the current user is the project owner
        if project.user != admin_user:
            return JsonResponse({
                'error': 'You can only delete videos from projects you created'
            }, status=403)

        # Count videos that have been processed (checked_by is not null)
        processed_videos = Videos.objects.filter(
            project=project,
            checked_by__isnull=False
        ).count()

        # Count total videos
        total_videos = Videos.objects.filter(project=project).count()

        # Get list of users working on this project (excluding the admin)
        active_annotators = Userreg.objects.filter(
            project=project,
            is_job_admin=False
        ).select_related('user')

        annotator_names = [ur.user.username for ur in active_annotators]

        has_ongoing_jobs = processed_videos > 0 or len(annotator_names) > 0

        return JsonResponse({
            'has_ongoing_jobs': has_ongoing_jobs,
            'processed_videos': processed_videos,
            'total_videos': total_videos,
            'active_annotators': annotator_names,
            'project_name': project.project_name
        })

    except Exception as e:
        logger.error(f"Error checking ongoing jobs: {str(e)}", exc_info=True)
        return JsonResponse({
            'error': 'An error occurred while checking jobs'
        }, status=500)


@login_required
@require_GET
def delete_all_videos(request):
    """Delete all videos uploaded by the admin for their project"""
    try:
        admin_user = request.user
        admin_userreg = admin_user.userreg

        if not admin_userreg.is_job_admin:
            return JsonResponse({'error': 'Unauthorized'}, status=403)

        project = admin_userreg.project

        if not project:
            return JsonResponse({'error': 'No project found'}, status=404)

        # Check if the current user is the project owner
        if project.user != admin_user:
            return JsonResponse({
                'error': 'You can only delete videos from projects you created'
            }, status=403)

        # Confirm parameter to prevent accidental deletion
        confirm = request.GET.get('confirm', 'false').lower() == 'true'

        if not confirm:
            return JsonResponse({
                'error': 'Deletion not confirmed. Pass confirm=true to proceed.'
            }, status=400)

        with transaction.atomic():
            # Get count before deletion for logging
            video_count = Videos.objects.filter(project=project).count()
            category_count = Category.objects.filter(project=project).count()

            # Delete all videos for this project
            Videos.objects.filter(project=project).delete()

            # Delete all categories for this project
            Category.objects.filter(project=project).delete()

            # Reset annotator progress - clear their project association
            # but keep their accounts active
            annotators = Userreg.objects.filter(
                project=project,
                is_job_admin=False
            )

            for annotator in annotators:
                annotator.finished_job = False
                annotator.admin_approved = False
                annotator.save()

            logger.info(
                f"Admin {admin_user.username} deleted {video_count} videos and "
                f"{category_count} categories from project {project.project_name}"
            )

        return JsonResponse({
            'success': True,
            'deleted_videos': video_count,
            'deleted_categories': category_count,
            'message': f'Successfully deleted {video_count} videos and {category_count} categories'
        })

    except Exception as e:
        logger.error(f"Error deleting videos: {str(e)}", exc_info=True)
        return JsonResponse({
            'error': 'An error occurred while deleting videos'
        }, status=500)


@login_required
@require_GET
def list_annotators(request):
    """List all annotators assigned to the admin's project"""
    try:
        admin_user = request.user
        admin_userreg = admin_user.userreg

        if not admin_userreg.is_job_admin:
            return JsonResponse({'error': 'Unauthorized'}, status=403)

        project = admin_userreg.project

        if not project:
            return JsonResponse({'error': 'No project found'}, status=404)

        # Get all annotators for this project (excluding admin)
        annotators = Userreg.objects.filter(
            project=project,
            is_job_admin=False
        ).select_related('user', 'group')

        annotator_list = []
        active_count = 0
        finished_count = 0

        for annotator in annotators:
            # Calculate progress for this annotator
            if annotator.group:
                # Get categories assigned to this annotator's group
                assigned_categories = Category.objects.filter(
                    project=project,
                    group=annotator.group
                )

                # Count total and processed videos
                total_videos = 0
                processed_videos = 0

                for cat in assigned_categories:
                    cat_videos = Videos.objects.filter(
                        project=project,
                        category=cat,
                        is_available=True
                    )
                    total_videos += cat_videos.count()
                    processed_videos += cat_videos.filter(checked_by__isnull=False).count()

                progress = f"{processed_videos}/{total_videos}"
                progress_percent = (processed_videos / total_videos * 100) if total_videos > 0 else 0
            else:
                progress = "N/A"
                progress_percent = 0

            # Determine status
            if annotator.finished_job:
                status = "completed"
                finished_count += 1
            elif progress_percent > 0:
                status = "active"
                active_count += 1
            else:
                status = "pending"
                active_count += 1

            annotator_list.append({
                'username': annotator.user.username,
                'email': annotator.user.email or 'Not provided',
                'group': annotator.group.name if annotator.group else 'Not assigned',
                'status': status,
                'progress': progress,
                'progress_percent': round(progress_percent, 1),
                'finished_job': annotator.finished_job,
                'admin_approved': annotator.admin_approved
            })

        return JsonResponse({
            'annotators': annotator_list,
            'total_count': len(annotator_list),
            'active_count': active_count,
            'finished_count': finished_count,
            'project_name': project.project_name
        })

    except Exception as e:
        logger.error(f"Error listing annotators: {str(e)}", exc_info=True)
        return JsonResponse({
            'error': 'An error occurred while fetching annotators'
        }, status=500)


@login_required
@require_GET
def delete_annotator(request):
    """Delete an annotator from the admin's project"""
    try:
        admin_user = request.user
        admin_userreg = admin_user.userreg

        if not admin_userreg.is_job_admin:
            return JsonResponse({'error': 'Unauthorized'}, status=403)

        project = admin_userreg.project

        if not project:
            return JsonResponse({'error': 'No project found'}, status=404)

        # Get the username to delete
        username = request.GET.get('username', '').strip()

        if not username:
            return JsonResponse({'error': 'Username is required'}, status=400)

        # Confirm parameter to prevent accidental deletion
        confirm = request.GET.get('confirm', 'false').lower() == 'true'

        if not confirm:
            return JsonResponse({
                'error': 'Deletion not confirmed. Pass confirm=true to proceed.'
            }, status=400)

        try:
            # Find the user
            user_to_delete = User.objects.get(username=username)
            userreg_to_delete = Userreg.objects.get(user=user_to_delete, project=project)

            # Ensure we're not deleting an admin
            if userreg_to_delete.is_job_admin:
                return JsonResponse({
                    'error': 'Cannot delete an admin user'
                }, status=400)

        except User.DoesNotExist:
            return JsonResponse({
                'error': f'User {username} not found'
            }, status=404)
        except Userreg.DoesNotExist:
            return JsonResponse({
                'error': f'User {username} is not assigned to this project'
            }, status=404)

        with transaction.atomic():
            # Clear videos checked by this annotator (reset to unchecked)
            Videos.objects.filter(
                project=project,
                checked_by=user_to_delete
            ).update(checked_by=None, status=False)

            # Reset the VideoGroup to make it available for new annotators
            VideoGroup.objects.filter(user=user_to_delete).update(
                is_assigned=False,
                user=None
            )

            # Delete the Userreg (removes project association)
            userreg_to_delete.delete()

            # Delete the user account as well
            user_to_delete.delete()

            logger.info(
                f"Admin {admin_user.username} deleted annotator {username} "
                f"from project {project.project_name}"
            )

        return JsonResponse({
            'success': True,
            'message': f'Successfully deleted user {username}',
            'username': username
        })

    except Exception as e:
        logger.error(f"Error deleting annotator: {str(e)}", exc_info=True)
        return JsonResponse({
            'error': 'An error occurred while removing the annotator'
        }, status=500)
