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

    class Meta:
        model = Videos
        fields = ['video']
