from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User
from .models import Userreg
from django.forms import ModelForm

class RegistrationForm(UserCreationForm):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 
                  'username', 'password1', 'password2']

class UserregForm(ModelForm):
    class Meta:
        model = Userreg
        fields = ['project_name']
        exclude = ['user']