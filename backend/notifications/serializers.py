from django.utils import timezone
from rest_framework import serializers
from notifications.models import Notification


def relative_time(dt):
    """Return a human-readable relative time string, e.g. '2h ago'."""
    now = timezone.now()
    diff = now - dt
    seconds = int(diff.total_seconds())

    if seconds < 60:
        return f"{seconds}s ago"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes}m ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours}h ago"
    days = hours // 24
    if days < 7:
        return f"{days}d ago"
    weeks = days // 7
    if weeks < 4:
        return f"{weeks}w ago"
    months = days // 30
    if months < 12:
        return f"{months}mo ago"
    years = days // 365
    return f"{years}y ago"


class NotificationSerializer(serializers.ModelSerializer):
    actor_username = serializers.ReadOnlyField(source='actor.username')
    actor_profile_pic = serializers.ReadOnlyField(source='actor.profile_pic')
    target_thumbnail = serializers.SerializerMethodField()
    relative_time = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = (
            'id',
            'recipient',
            'actor',
            'actor_username',
            'actor_profile_pic',
            'verb',
            'is_read',
            'created_at',
            'target_thumbnail',
            'relative_time',
        )

    def get_target_thumbnail(self, obj):
        if obj.target_post and obj.target_post.media_url:
            return obj.target_post.media_url
        if obj.target_reel and obj.target_reel.media_url:
            return obj.target_reel.media_url
        return None

    def get_relative_time(self, obj):
        return relative_time(obj.created_at)
