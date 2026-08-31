from django.contrib import admin

from .models import Story, StoryHighlight, StoryView

admin.site.register(Story)
admin.site.register(StoryView)
admin.site.register(StoryHighlight)
