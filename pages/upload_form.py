from .models import Videos, ProjectTitle
from django.forms import ModelForm
from django import forms

class ProjectTitleForm(forms.ModelForm):

    class Meta:
        model = ProjectTitle
        fields = ['project_type', 'project_name', 'cluster_csv', 'number_of_annotators']
        widgets = {
            'project_type': forms.Select(attrs={
                'class': 'upload_form'
            }),
            'project_name': forms.TextInput(attrs={
                "type": "text",
                "class": "upload_form",
                "placeholder": "Enter project name"
            }),
            'cluster_csv': forms.FileInput(attrs={
                "class": "upload_form"
            }),
            'number_of_annotators': forms.NumberInput(attrs={
                "type": "number",
                "class": "upload_form",
                "min": "1",
                "placeholder": "e.g., 3",
                "required": "required"
            })
        }
        labels = {
            'project_type': 'Select project type',
            'project_name': 'Enter project name',
            'cluster_csv': 'Upload clustered videos csv',
            'number_of_annotators': 'Enter the number of annotators'
        }

# class VideoUploadForm(forms.ModelForm):
#     video = forms.FileField(widget=forms.TextInput(attrs={
#         "name": "videos",
#         "type": "File",
#         "class": "uplod_form",
#         "multiple": "True" ,
#     }), label="Upload videos")
#     # number_of_annotators = models.IntegerField()

#     class Meta:
#         model = Videos
#         fields = ['video']
