"""
Notification signal receivers.

Triggers a notifications.Notification record and pushes it to the
user's WebSocket group (notifications_{user_id}) for each social event:

  - Post/Reel like      → verb='like'
  - Post/Reel comment   → verb='comment'
  - Follow              → verb='follow'
  - Event update        → verb='event_update'  (for all RSVP'd users)
  - Live status toggle  → verb='live'          (for all followers)

Note: 'share' notifications are created directly in the share views
(PostShareView / ReelShareView) and pushed from there.

Requirements: 8.2, 8.3, 9.4
"""

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models.signals import post_save
from django.dispatch import receiver

from notifications.models import Notification
from notifications.serializers import NotificationSerializer


def _push_notification(notification: Notification) -> None:
    """
    Serialize a Notification and push it to the recipient's WS group.
    Safe to call from synchronous code (uses async_to_sync).
    """
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return  # No channel layer configured (e.g., during tests without channels)

    data = NotificationSerializer(notification).data

    async_to_sync(channel_layer.group_send)(
        f'notifications_{notification.recipient_id}',
        {
            'type': 'notification.message',
            'notification': data,
        },
    )


def _create_and_push(recipient, actor, verb, target_post=None, target_reel=None, target_event=None):
    """
    Create a Notification record and push it to the recipient's WS group.
    Skips self-notifications (actor == recipient).
    """
    if actor == recipient:
        return

    notification = Notification.objects.create(
        recipient=recipient,
        actor=actor,
        verb=verb,
        target_post=target_post,
        target_reel=target_reel,
        target_event=target_event,
    )
    _push_notification(notification)


# ── Like signals ─────────────────────────────────────────────────────────────

@receiver(post_save, sender='posts.Like')
def on_post_like(sender, instance, created, **kwargs):
    if not created:
        return
    _create_and_push(
        recipient=instance.post.user,
        actor=instance.user,
        verb='like',
        target_post=instance.post,
    )


@receiver(post_save, sender='posts.ReelLike')
def on_reel_like(sender, instance, created, **kwargs):
    if not created:
        return
    _create_and_push(
        recipient=instance.reel.user,
        actor=instance.user,
        verb='like',
        target_reel=instance.reel,
    )


# ── Comment signals ───────────────────────────────────────────────────────────

@receiver(post_save, sender='posts.Comment')
def on_post_comment(sender, instance, created, **kwargs):
    if not created:
        return
    _create_and_push(
        recipient=instance.post.user,
        actor=instance.user,
        verb='comment',
        target_post=instance.post,
    )


@receiver(post_save, sender='posts.ReelComment')
def on_reel_comment(sender, instance, created, **kwargs):
    if not created:
        return
    _create_and_push(
        recipient=instance.reel.user,
        actor=instance.user,
        verb='comment',
        target_reel=instance.reel,
    )


# ── Follow signal ─────────────────────────────────────────────────────────────

@receiver(post_save, sender='users.Follow')
def on_follow(sender, instance, created, **kwargs):
    if not created:
        return
    _create_and_push(
        recipient=instance.following,
        actor=instance.follower,
        verb='follow',
    )
