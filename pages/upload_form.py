from .models import Videos
from django.forms import ModelForm
from django import forms


class VideoUploadForm(forms.ModelForm):
    video = forms.FileField(widget=forms.TextInput(attrs={
        "name": "videos",
        "type": "File",
        "class": "uplod_form",
        "multiple": "True" ,
    }), label="upload videos")
    # number_of_annotators = models.IntegerField()
    project_name = forms.CharField(widget=forms.TextInput(attrs={
        "name": "project_name",
        "type": "text",
        "class": "uplod_form",
        "size": 30,
    }), label='Please enter the project name')
    annotators = forms.CharField(widget=forms.TextInput(attrs={
        "name": "num_annotators",
        "type": "text",
        "class": "uplod_form",
        "size": 2,
    }), label='Please enter the number of annotators')

    class Meta:
        model = Videos
        fields = ['video','annotators']
