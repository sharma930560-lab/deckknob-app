from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from notifications.models import Notification
from notifications.serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    """
    GET /api/notifications/
    Returns the last 50 notifications for the authenticated user,
    ordered by most recent first.
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Notification.objects
            .filter(recipient=self.request.user)
            .order_by('-created_at')[:50]
        )


class MarkAllReadView(APIView):
    """
    POST /api/notifications/mark-read/
    Marks all unread notifications for the authenticated user as read.
    Returns {"marked_read": N} where N is the number of notifications updated.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        updated_count = (
            Notification.objects
            .filter(recipient=request.user, is_read=False)
            .update(is_read=True)
        )
        return Response({'marked_read': updated_count}, status=status.HTTP_200_OK)
