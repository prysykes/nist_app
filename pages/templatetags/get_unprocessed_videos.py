from django import template
from pages.models import Category

register = template.Library()

@register.filter(name='get_unprocessed_videos')
def get_unprocessed_videos(category, user):
    return len(category.get_unprocessed_videos(user))

