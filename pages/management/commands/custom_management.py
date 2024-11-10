from django.core.management.base import BaseCommand
from django.shortcuts import get_list_or_404, get_object_or_404
from pages.models import ProjectTitle, Videos, Category

class Command(BaseCommand):
    def handle(self, *args, **options):
        help = "Management operations"
        # all_project_types = get_list_or_404(ProjectTitle)
        image_annotation_project = get_object_or_404(ProjectTitle, id=1374)
        # for project_type in all_project_types:
        #     print(project_type.id)
        print(image_annotation_project.project_type)

        self.stdout.write(self.style.SUCCESS("custom management done"))