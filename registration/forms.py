from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User
from .models import Userreg


class RegistrationForm(UserCreationForm):
    """User registration form with styled widgets"""

    first_name = forms.CharField(
        max_length=30,
        required=True,
        widget=forms.TextInput(attrs={
            'placeholder': 'Enter your first name',
            'autocomplete': 'given-name'
        })
    )

    last_name = forms.CharField(
        max_length=30,
        required=True,
        widget=forms.TextInput(attrs={
            'placeholder': 'Enter your last name',
            'autocomplete': 'family-name'
        })
    )

    email = forms.EmailField(
        required=True,
        widget=forms.EmailInput(attrs={
            'placeholder': 'Enter your email address',
            'autocomplete': 'email'
        })
    )

    username = forms.CharField(
        max_length=150,
        widget=forms.TextInput(attrs={
            'placeholder': 'Choose a username',
            'autocomplete': 'username'
        })
    )

    password1 = forms.CharField(
        label='Password',
        widget=forms.PasswordInput(attrs={
            'placeholder': 'Create a strong password',
            'autocomplete': 'new-password'
        })
    )

    password2 = forms.CharField(
        label='Confirm Password',
        widget=forms.PasswordInput(attrs={
            'placeholder': 'Confirm your password',
            'autocomplete': 'new-password'
        })
    )

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email',
                  'username', 'password1', 'password2']


class UserregForm(forms.ModelForm):
    """User registration profile form with styled widgets"""

    project_name = forms.CharField(
        max_length=100,
        widget=forms.TextInput(attrs={
            'placeholder': 'Enter project name (e.g., myproject2025)'
        }),
        label='Project Name'
    )

    class Meta:
        model = Userreg
        fields = ['project_name', 'project_type', 'is_job_admin']
        exclude = ['user']
        labels = {
            'project_type': 'Project Type',
            'is_job_admin': 'I am a Project Administrator'
        }
        widgets = {
            'project_type': forms.Select(attrs={
                'style': 'cursor: pointer;'
            }),
            'is_job_admin': forms.CheckboxInput(attrs={
                'style': 'width: 20px; height: 20px;'
            })
        }