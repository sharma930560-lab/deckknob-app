from django.urls import path
from .views import (
    StoryFeedView,
    StoryCreateView,
    StoryViewCreateView,
    StoryDeleteView,
    StoryHighlightListView,
    StoryHighlightCreateView,
)

urlpatterns = [
    path('stories/feed/', StoryFeedView.as_view(), name='story_feed'),
    path('stories/', StoryCreateView.as_view(), name='story_create'),
    path('stories/<int:pk>/view/', StoryViewCreateView.as_view(), name='story_view'),
    path('stories/<int:pk>/', StoryDeleteView.as_view(), name='story_delete'),
    path('stories/highlights/<int:user_id>/', StoryHighlightListView.as_view(), name='story_highlights'),
    path('stories/highlights/', StoryHighlightCreateView.as_view(), name='story_highlight_create'),
]
