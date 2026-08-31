from django.urls import path
from .views import (
    PostListCreateView, PostDetailView,
    LikeToggleView, CommentListCreateView, CommentDetailView,
    BookmarkToggleView, BookmarkListView,
    PostShareView, ReelShareView,
    ReelListCreateView, ReelLikeToggleView, ReelBookmarkToggleView, ReelCommentListCreateView,
    HashtagFeedView, InstagramSyncView,
    UserPostsListView, UserReelsListView,
)

urlpatterns = [
    path('posts/', PostListCreateView.as_view(), name='post_list_create'),
    path('posts/instagram-sync/', InstagramSyncView.as_view(), name='instagram_sync'),
    path('posts/<int:pk>/', PostDetailView.as_view(), name='post_detail'),
    path('posts/<int:pk>/like/', LikeToggleView.as_view(), name='post_like'),
    path('posts/<int:pk>/comments/', CommentListCreateView.as_view(), name='post_comments'),
    path('posts/<int:pk>/bookmark/', BookmarkToggleView.as_view(), name='post_bookmark'),
    path('posts/<int:pk>/share/', PostShareView.as_view(), name='post_share'),
    path('comments/<int:pk>/', CommentDetailView.as_view(), name='comment_detail'),
    path('bookmarks/', BookmarkListView.as_view(), name='bookmark_list'),
    path('reels/', ReelListCreateView.as_view(), name='reel_list_create'),
    path('reels/<int:pk>/like/', ReelLikeToggleView.as_view(), name='reel_like'),
    path('reels/<int:pk>/bookmark/', ReelBookmarkToggleView.as_view(), name='reel_bookmark'),
    path('reels/<int:pk>/comments/', ReelCommentListCreateView.as_view(), name='reel_comments'),
    path('reels/<int:pk>/share/', ReelShareView.as_view(), name='reel_share'),
    path('hashtags/<str:name>/', HashtagFeedView.as_view(), name='hashtag_feed'),
    # Per-user profile endpoints
    path('users/<str:username>/posts/', UserPostsListView.as_view(), name='user_posts'),
    path('users/<str:username>/reels/', UserReelsListView.as_view(), name='user_reels'),
]
