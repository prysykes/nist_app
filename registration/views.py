import logging
import threading

from django.shortcuts import render, redirect
from django.contrib.auth.models import User, Group
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.core.mail import EmailMessage
from django.urls import reverse
from django.views import View
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_str, force_bytes
from django.contrib.sites.shortcuts import get_current_site
from django.db import transaction
from django.views.decorators.http import require_http_methods

from .forms import RegistrationForm, UserregForm
from .utils import account_activation_token
from pages.models import ProjectTitle, VideoGroup

logger = logging.getLogger(__name__)

class FasterActivateEmail(threading.Thread):
    def __init__(self, email):
        self.email = email
        threading.Thread.__init__(self)
    
    def run(self):
        self.email.send(fail_silently=False)

@require_http_methods(["GET", "POST"])
def signup(request):
    """User registration view"""
    if request.method == "POST":
        registration_form = RegistrationForm(request.POST)
        userreg_form = UserregForm(request.POST)

        if registration_form.is_valid() and userreg_form.is_valid():
            try:
                with transaction.atomic():
                    # Extract form data
                    username = registration_form.cleaned_data.get('username')
                    user_email = registration_form.cleaned_data.get('email')
                    project_name = userreg_form.cleaned_data.get('project_name', '').lower().strip()
                    is_job_admin = userreg_form.cleaned_data.get('is_job_admin')
                    project_type = userreg_form.cleaned_data.get('project_type')

                    if not project_name:
                        messages.error(request, "Project name is required")
                        return redirect('/registration/user_registration/')

                    # Create user account (inactive by default)
                    user = registration_form.save(commit=False)
                    user.is_active = False  # User must activate via email
                    user.save()

                    logger.info(f"Created new user: {username}")

                    # Create user registration profile
                    userreg = userreg_form.save(commit=False)
                    userreg.user = user

                    if not is_job_admin:
                        # Get existing project first
                        try:
                            assoc_project = ProjectTitle.objects.get(
                                project_name=project_name,
                                project_type=project_type
                            )
                        except ProjectTitle.DoesNotExist:
                            user.delete()  # Rollback user creation
                            messages.error(
                                request,
                                f"Project '{project_name}' not found. "
                                "Please check the project name and try again."
                            )
                            return redirect('/registration/user_registration/')

                        # This is an annotator - assign to available group
                        assoc_group = VideoGroup.objects.filter(
                            project_name=project_name,
                            is_assigned=False
                        ).first()

                        if not assoc_group:
                            user.delete()  # Rollback user creation
                            max_annotators = assoc_project.number_of_annotators or 0
                            messages.error(
                                request,
                                f"'{project_name}' allows only {max_annotators} annotator(s). "
                                "All slots are filled. Please contact the admin to increase this number."
                            )
                            return redirect('/registration/user_registration/')

                        userreg.group = assoc_group
                        assoc_group.is_assigned = True
                        assoc_group.user = user
                        assoc_group.save()

                        logger.info(f"Assigned user {username} to group {assoc_group.name}")
                    else:
                        # This is an admin - create or get project
                        userreg.is_job_admin = True
                        assoc_project, created = ProjectTitle.objects.get_or_create(
                            project_name=project_name,
                            project_type=project_type,
                            defaults={'user': user}
                        )

                        if created:
                            logger.info(f"Created new project: {project_name}")
                        else:
                            logger.info(f"Using existing project: {project_name}")

                    userreg.project = assoc_project
                    userreg.save()

                    # TODO: Send activation email
                    # For now, auto-activate the user
                    user.is_active = True
                    user.save()

                    messages.success(
                        request,
                        "Registration successful! You can now log in."
                    )
                    logger.info(f"Successfully registered user: {username}")

                    return redirect('/')

            except Exception as e:
                logger.error(f"Error during signup: {str(e)}", exc_info=True)
                messages.error(
                    request,
                    f"An error occurred during registration: {str(e)}"
                )
                return redirect('/registration/user_registration/')
        else:
            # Form validation errors
            for field, errors in registration_form.errors.items():
                for error in errors:
                    messages.error(request, f"{field}: {error}")
            for field, errors in userreg_form.errors.items():
                for error in errors:
                    messages.error(request, f"{field}: {error}")
    else:
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

@require_http_methods(["POST"])
def user_login(request):
    """User login view"""
    try:
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')

        if not username or not password:
            messages.error(request, "Username and password are required")
            return redirect('/')

        user = authenticate(request, username=username, password=password)

        if user is not None:
            if user.is_active:
                login(request, user)
                logger.info(f"User {username} logged in successfully")
                messages.success(request, f"Welcome back, {username}!")
                return redirect('/')
            else:
                logger.warning(f"Inactive user attempted login: {username}")
                messages.warning(
                    request,
                    "Your account is inactive. Please check your email to activate your account."
                )
        else:
            logger.warning(f"Failed login attempt for username: {username}")
            messages.error(request, "Invalid username or password")

    except Exception as e:
        logger.error(f"Error during login: {str(e)}", exc_info=True)
        messages.error(request, "An error occurred during login. Please try again.")

    return redirect('/')


@login_required
def user_logout(request):
    """User logout view"""
    try:
        username = request.user.username
        logout(request)
        logger.info(f"User {username} logged out")
        messages.success(request, "You have been logged out successfully")
    except Exception as e:
        logger.error(f"Error during logout: {str(e)}", exc_info=True)

    return redirect('/')

def user_registration(request):
    pass
