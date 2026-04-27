from django.db import models
from django.conf import settings

class SocialLink(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='social_links')
    platform_name = models.CharField(max_length=50) # e.g., Instagram, Spotify, YouTube
    url = models.URLField(max_length=500)

    class Meta:
        unique_together = ('user', 'platform_name')

    def __str__(self):
        return f"{self.user.username} - {self.platform_name}"
