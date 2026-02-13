from django import template

register = template.Library()

@register.filter(name='get_rejected_videos')
def get_rejected_videos(category):
    return category.video_categories.filter(status=False, is_available=True).count()
