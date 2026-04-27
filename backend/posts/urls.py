from django.urls import path
from .views import (
    PostListCreateView, PostDetailView,
    LikeToggleView, CommentListCreateView, CommentDetailView
)

urlpatterns = [
    path('posts/', PostListCreateView.as_view(), name='post_list_create'),
    path('posts/<int:pk>/', PostDetailView.as_view(), name='post_detail'),
    path('posts/<int:pk>/like/', LikeToggleView.as_view(), name='post_like'),
    path('posts/<int:pk>/comments/', CommentListCreateView.as_view(), name='post_comments'),
    path('comments/<int:pk>/', CommentDetailView.as_view(), name='comment_detail'),
]
