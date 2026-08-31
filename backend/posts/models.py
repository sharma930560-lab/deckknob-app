from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

class Post(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='posts')
    media_url = models.URLField(max_length=1000)
    media_type = models.CharField(max_length=20) # e.g., 'image', 'video'
    caption = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Post by {self.user.username} at {self.created_at}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        from .utils import parse_hashtags
        tags = parse_hashtags(self.caption or '')
        for tag_name in tags:
            hashtag, _ = Hashtag.objects.get_or_create(name=tag_name)
            hashtag.posts.add(self)

class Like(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='likes')
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'post')

    def __str__(self):
        return f"{self.user.username} likes {self.post.id}"

class Comment(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='comments')
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    text = models.TextField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.user.username} on {self.post.id}"

class Story(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='post_stories')
    media_url = models.URLField(max_length=1000)
    media_type = models.CharField(max_length=20, default='image')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=24)
        super().save(*args, **kwargs)

    class Meta:
        verbose_name_plural = 'Stories'

    def __str__(self):
        return f"Story by {self.user.username} expires at {self.expires_at}"


class Reel(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reels')
    media_url = models.URLField(max_length=1000)
    caption = models.TextField(blank=True, null=True)
    duration_seconds = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Reel by {self.user.username} at {self.created_at}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        from .utils import parse_hashtags
        tags = parse_hashtags(self.caption or '')
        for tag_name in tags:
            hashtag, _ = Hashtag.objects.get_or_create(name=tag_name)
            hashtag.reels.add(self)

class Bookmark(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bookmarks')
    post = models.ForeignKey(Post, on_delete=models.CASCADE, null=True, blank=True, related_name='bookmarks')
    reel = models.ForeignKey('posts.Reel', on_delete=models.CASCADE, null=True, blank=True, related_name='bookmarks')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'post'],
                condition=models.Q(post__isnull=False),
                name='unique_user_post_bookmark',
            ),
            models.UniqueConstraint(
                fields=['user', 'reel'],
                condition=models.Q(reel__isnull=False),
                name='unique_user_reel_bookmark',
            ),
        ]

    def __str__(self):
        target = self.post_id or self.reel_id
        return f"{self.user.username} bookmarked {target}"


class ReelLike(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    reel = models.ForeignKey(Reel, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'reel')

    def __str__(self):
        return f"{self.user.username} likes reel {self.reel.id}"


class ReelComment(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    reel = models.ForeignKey(Reel, on_delete=models.CASCADE, related_name='comments')
    text = models.TextField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.user.username} on reel {self.reel.id}"


class Hashtag(models.Model):
    name = models.CharField(max_length=100, unique=True)  # lowercase, no '#'
    posts = models.ManyToManyField(Post, blank=True, related_name='hashtags')
    reels = models.ManyToManyField(Reel, blank=True, related_name='hashtags')

    def __str__(self):
        return f"#{self.name}"
