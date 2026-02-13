from django import template

register = template.Library()

@register.filter(name='get_approved_videos')
def get_approved_videos(category):
    return category.video_categories.filter(status=True, is_available=True).count()
