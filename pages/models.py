import os
import logging
from django.db import models
from django.contrib.auth.models import Group, User
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from django.db.models import Case, When, Value, BooleanField
from django.utils import timezone

logger = logging.getLogger(__name__)

# Create your models here.
parent_dir = os.getcwd()
media_dir = os.path.join(parent_dir, 'media')
    
class VideoGroup(models.Model):
    name = models.CharField(max_length=100, unique=True, db_index=True)
    project_name = models.CharField(max_length=100, db_index=True)
    user = models.ForeignKey(
        User,
        blank=True,
        null=True,
        on_delete=models.SET_NULL,
        related_name='video_groups'
    )
    is_assigned = models.BooleanField(default=False, db_index=True)
    date_added = models.DateTimeField(auto_now_add=True)
    date_modified = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Video Group"
        verbose_name_plural = "Video Groups"
        ordering = ['project_name', 'name']

    def __str__(self):
        return f"{self.name} ({self.project_name})"

    def clean(self):
        """Validate model fields"""
        super().clean()
        if not self.name or not self.name.strip():
            raise ValidationError({'name': 'Group name cannot be empty'})
        if not self.project_name or not self.project_name.strip():
            raise ValidationError({'project_name': 'Project name cannot be empty'})

class Category(models.Model):
    cluster_keywords = models.CharField(max_length=250, db_index=True)
    cluster_id = models.IntegerField(db_index=True)
    group = models.ForeignKey("VideoGroup", on_delete=models.SET_NULL, null=True, blank=True, related_name='categories')
    admin_approved = models.BooleanField(default=False, db_index=True)
    project = models.ForeignKey('ProjectTitle', blank=True, null=True, on_delete=models.CASCADE, related_name='categories')
    cluster_similarity_score = models.FloatField(default=0.0, validators=[MinValueValidator(0.0)])

    class Meta:
        ordering = ['-cluster_similarity_score']
        verbose_name_plural = "Categories"
        indexes = [
            models.Index(fields=['cluster_keywords', 'project']),
            models.Index(fields=['group', 'admin_approved']),
        ]

    def __str__(self):
        return f"{self.cluster_keywords} (Project: {self.project})"

    def clean(self):
        """Validate model fields"""
        super().clean()
        if not self.cluster_keywords or not self.cluster_keywords.strip():
            raise ValidationError({'cluster_keywords': 'Cluster keywords cannot be empty'})
        if self.cluster_similarity_score < 0 or self.cluster_similarity_score > 1:
            raise ValidationError({'cluster_similarity_score': 'Similarity score must be between 0 and 1'})

    def get_total_videos(self):
        """Get all videos in this category"""
        return self.video_categories.all()

    def get_unprocessed_videos(self, user=None):
        """Get all unprocessed videos in this category"""
        try:
            assoc_videos = self.video_categories.filter(
                is_available=True,
                status__isnull=True
            ).order_by('-video_similarity_score', 'id')
            return assoc_videos
        except Exception as e:
            logger.error(f"Error retrieving unprocessed videos for category {self.id}: {str(e)}")
            return self.video_categories.none()

    def get_next_video(self):
        """Get the next unprocessed video in this category"""
        try:
            next_video = self.video_categories.filter(
                status=None,
                is_available=True
            ).order_by('-video_similarity_score', 'id').first()
            return next_video
        except Exception as e:
            logger.error(f"Error retrieving next video for category {self.id}: {str(e)}")
            return None

    def get_confidence_level(self):
        """Calculate confidence level based on number of videos in cluster"""
        try:
            total_vids_cluster = self.video_categories.count()
            low_threshold = 60
            high_threshold = 100

            # Fix: Check total_vids_cluster, not confidence
            if total_vids_cluster < low_threshold:
                confidence = 80
            elif low_threshold <= total_vids_cluster < high_threshold:
                confidence = 60
            else:
                confidence = 30
            return confidence
        except Exception as e:
            logger.error(f"Error calculating confidence level for category {self.id}: {str(e)}")
            return 0
   

class ProjectTitle(models.Model):
    """
    A class defining the name of the video annotation cycle.
    All videos must belong to a particular project.
    This helps in group management.
    """
    PROJECT_TYPE = [
        ("annotation", "Video Annotation"),
        ("video_qa", "Video Question Answering")
    ]
    project_type = models.CharField(
        max_length=10,
        choices=PROJECT_TYPE,
        default="annotation",
        db_index=True
    )
    project_name = models.CharField(
        max_length=100,
        unique=True,
        db_index=True
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='projects'
    )
    is_link = models.BooleanField(default=False)
    cluster_csv = models.FileField(
        upload_to='cluster_csv',
        verbose_name='Trec Videos Cluster Info',
        null=True,
        blank=True
    )
    number_of_annotators = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)]
    )
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Project Title"
        verbose_name_plural = "Project Titles"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.project_name} ({self.get_project_type_display()})"

    def clean(self):
        """Validate model fields"""
        super().clean()
        if not self.project_name or not self.project_name.strip():
            raise ValidationError({'project_name': 'Project name cannot be empty'})
        if self.number_of_annotators is not None and self.number_of_annotators < 1:
            raise ValidationError({'number_of_annotators': 'Number of annotators must be at least 1'})

class Question(models.Model):
    question = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Question"
        verbose_name_plural = "Questions"
        ordering = ['-created_at']

    def __str__(self):
        return self.question[:100] + ('...' if len(self.question) > 100 else '')

    def clean(self):
        """Validate model fields"""
        super().clean()
        if not self.question or not self.question.strip():
            raise ValidationError({'question': 'Question cannot be empty'})

class Answer(models.Model):
    answer = models.TextField()
    correct = models.BooleanField(default=False, db_index=True)
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="question_answers"
    )
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Answer"
        verbose_name_plural = "Answers"
        ordering = ['question', '-correct', 'id']

    def __str__(self):
        prefix = "[Correct] " if self.correct else ""
        return f"{prefix}{self.answer[:100]}" + ('...' if len(self.answer) > 100 else '')

    def clean(self):
        """Validate model fields"""
        super().clean()
        if not self.answer or not self.answer.strip():
            raise ValidationError({'answer': 'Answer cannot be empty'})

class Videos(models.Model):
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name="video_categories"
    )
    checked_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='checked_videos'
    )
    question = models.ForeignKey(
        Question,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='videos'
    )
    project = models.ForeignKey(
        ProjectTitle,
        on_delete=models.CASCADE,
        related_name='videos'
    )
    video_path = models.CharField(max_length=250, db_index=True)
    youtube_vid_id = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        db_index=True
    )
    is_available = models.BooleanField(default=True, db_index=True)
    file_name = models.CharField(
        max_length=250,
        null=True,
        blank=True,
        db_index=True
    )
    description = models.TextField(null=True, blank=True)
    keywords = models.CharField(max_length=250, null=True, blank=True)
    status = models.BooleanField(default=None, blank=True, null=True, db_index=True)
    video_similarity_score = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0)]
    )
    admin_approve = models.BooleanField(default=False)
    date_uploaded = models.DateTimeField(auto_now_add=True)
    date_modified = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-video_similarity_score', 'id']
        verbose_name = "Video"
        verbose_name_plural = "Videos"
        indexes = [
            models.Index(fields=['project', 'status', 'is_available']),
            models.Index(fields=['category', 'is_available']),
            models.Index(fields=['checked_by', 'status']),
        ]

    def __str__(self):
        return f"{self.file_name or 'Unnamed'} - {self.project}"

    def clean(self):
        """Validate model fields"""
        super().clean()
        if not self.file_name or not self.file_name.strip():
            raise ValidationError({'file_name': 'File name cannot be empty'})
        if not self.video_path or not self.video_path.strip():
            raise ValidationError({'video_path': 'Video path cannot be empty'})
        if self.video_similarity_score < 0 or self.video_similarity_score > 1:
            raise ValidationError({'video_similarity_score': 'Similarity score must be between 0 and 1'})

    @classmethod
    def get_unprocessed_videos(cls, project=None, is_available=True):
        """Get all unprocessed videos, optionally filtered by project"""
        queryset = cls.objects.filter(
            checked_by__isnull=True,
            is_available=is_available
        )
        if project:
            queryset = queryset.filter(project=project)
        return queryset 
    
    