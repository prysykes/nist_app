from .models import Videos, ProjectTitle
from django.forms import ModelForm
from django import forms

class ProjectTitleForm(forms.ModelForm):
    project_name = forms.CharField(widget=forms.TextInput(attrs={
        "name": "project_name",
        "type": "text",
        "class": "upload_form",
        "size": 20
    }), label="Enter project name")

    cluster_csv = forms.FileField(widget=forms.FileInput(attrs={
        "name": "cluster_csv",
        "type": "File",
        "class": "upload_form",
    }), label="Upload clustered videos csv")

    annotators = forms.IntegerField(widget=forms.NumberInput(attrs={
        "name": "num_annotators",
        "type": "text",
        "class": "uplod_form",
        "size": 2,
    }), label='Enter the number of annotators')

    class Meta:
        model = ProjectTitle
        fields = ['project_name', 'cluster_csv', 'annotators']

class VideoUploadForm(forms.ModelForm):
    video = forms.FileField(widget=forms.TextInput(attrs={
        "name": "videos",
        "type": "File",
        "class": "uplod_form",
        "multiple": "True" ,
    }), label="Upload videos")
    # number_of_annotators = models.IntegerField()

    class Meta:
        model = Videos
        fields = ['video']
