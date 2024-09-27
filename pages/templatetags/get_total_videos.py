from django import template
from pages.models import Category

register = template.Library()

@register.filter(name='get_total_videos')
def get_total_videos(category):
    return len(category.get_total_videos())

