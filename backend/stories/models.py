from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone


class Story(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='stories',
    )
    media_url = models.URLField(max_length=1000)
    media_type = models.CharField(max_length=10)  # 'image' | 'video'
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ['created_at']

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=24)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Story by {self.user} at {self.created_at}"


class StoryView(models.Model):
    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name='views')
    viewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    viewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('story', 'viewer')

    def __str__(self):
        return f"{self.viewer} viewed story {self.story_id}"


class StoryHighlight(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='highlights',
    )
    title = models.CharField(max_length=50)
    cover_url = models.URLField(max_length=1000, blank=True, null=True)
    stories = models.ManyToManyField(Story, blank=True)

    def __str__(self):
        return f"{self.user}'s highlight: {self.title}"
