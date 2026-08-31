from django.contrib import admin

from .models import Bookmark, Comment, Hashtag, Like, Post, Reel, ReelComment, ReelLike, Story


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'media_type', 'created_at')
    list_filter = ('media_type',)
    search_fields = ('user__username', 'caption')


@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'post', 'created_at')


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'post', 'created_at')
    search_fields = ('user__username', 'text')


@admin.register(Story)
class StoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'media_type', 'created_at', 'expires_at')


@admin.register(Bookmark)
class BookmarkAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'post', 'reel', 'created_at')


@admin.register(Reel)
class ReelAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'duration_seconds', 'created_at')
    search_fields = ('user__username', 'caption')


@admin.register(ReelLike)
class ReelLikeAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'reel', 'created_at')


@admin.register(ReelComment)
class ReelCommentAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'reel', 'created_at')
    search_fields = ('user__username', 'text')


@admin.register(Hashtag)
class HashtagAdmin(admin.ModelAdmin):
    list_display = ('id', 'name')
    search_fields = ('name',)
