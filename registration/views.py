from django.shortcuts import render, redirect
from .forms import RegistrationForm, UserregForm
from django.contrib.auth.models import User, Group
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages
from pages.models import ProjectTitle


from django.core.mail import EmailMessage
import threading

from django.urls import reverse

#required to build email activation
from django.views import View
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_str, force_bytes
from django.contrib.sites.shortcuts import get_current_site
from .utils import account_activation_token
from pages.models import VideoGroup

class FasterActivateEmail(threading.Thread):
    def __init__(self, email):
        self.email = email
        threading.Thread.__init__(self)
    
    def run(self):
        self.email.send(fail_silently=False)

def signup(request):
    registration_form = RegistrationForm()
    userreg_form = UserregForm()

    if request.method == "POST":
        
        registration_form = RegistrationForm(request.POST)
        userreg_form = UserregForm(request.POST)
        if registration_form.is_valid() and userreg_form.is_valid():
            username = registration_form.cleaned_data.get('username')
            user_email = registration_form.cleaned_data.get('email')
            user = registration_form.save()
            
            userreg = userreg_form.save(commit=False)
            
            
            project_name = userreg_form.cleaned_data.get('project_name').lower()
            is_job_admin = userreg_form.cleaned_data.get('is_job_admin')
            project_type = userreg_form.cleaned_data.get('project_type')
            assoc_group = VideoGroup.objects.filter(project_name=project_name, is_assigned=False).first()
            # print('assoc_group', assoc_group)
            if not is_job_admin:
                # this is an annotator
                userreg.group = assoc_group
                assoc_group.is_assigned = True
                assoc_group.user = user
                assoc_group.save()
                assoc_project = ProjectTitle.objects.get(project_name=project_name, project_type=project_type)
            else:
                userreg.is_job_admin = True
                assoc_project, _ = ProjectTitle.objects.get_or_create(project_name=project_name, project_type=project_type, user=user)
           
            userreg.project = assoc_project
            userreg.user = user
            userreg.save()
            userreg.activate_user()
            
            return redirect('/')
    registration_form = RegistrationForm()
    userreg_form = UserregForm()

    context = {
        'registration_form': registration_form,
        'userreg_form': userreg_form
    }

    return render(request, 'registration/sign_up.html', context)


class VerificationView(View):
    def get(self, request, uidb64, token):
        try:
            id = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=id)
            if user.is_active:
                return redirect('/')
            else:
                user.is_active = True
                user.save()
            messages.success(request, 'Account Successfully Activated...')
        except Exception as ex:
            print(ex)
            pass
        return redirect('/')

def user_login(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return redirect('/')
        else:
            messages.info(request, "Account inactive, login to your email to activate your account")
    return redirect('/')

def user_logout(request):
   
    logout(request)
    return redirect('/')

def user_registration(request):
    pass
