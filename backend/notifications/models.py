from django.conf import settings
from django.db import models


class Notification(models.Model):
    VERB_CHOICES = [
        ('like', 'Like'),
        ('comment', 'Comment'),
        ('follow', 'Follow'),
        ('share', 'Share'),
        ('event_update', 'Event Update'),
        ('live', 'Live'),
    ]

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ws_notifications',
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_ws_notifications',
    )
    verb = models.CharField(max_length=20, choices=VERB_CHOICES)
    target_post = models.ForeignKey(
        'posts.Post',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    target_reel = models.ForeignKey(
        'posts.Reel',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    target_event = models.ForeignKey(
        'events.Event',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.actor} → {self.recipient}: {self.verb}"
