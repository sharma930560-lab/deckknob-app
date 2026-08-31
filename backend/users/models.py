from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    bio = models.TextField(blank=True, null=True)
    profile_pic = models.URLField(max_length=500, blank=True, null=True)
    is_live = models.BooleanField(default=False)
    # Onboarding fields
    city = models.CharField(max_length=100, blank=True, null=True)
    genre = models.CharField(max_length=100, blank=True, null=True)
    # Instagram OAuth
    instagram_username = models.CharField(max_length=60, blank=True, null=True)
    instagram_access_token = models.TextField(blank=True, null=True)  # long-lived token

    def __str__(self):
        return self.username

class Follow(models.Model):
    follower = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='following', on_delete=models.CASCADE)
    following = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='followers', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('follower', 'following')

    def __str__(self):
        return f"{self.follower.username} follows {self.following.username}"  # type: ignore


