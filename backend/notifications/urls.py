from django.urls import path
from notifications.views import NotificationListView, MarkAllReadView

urlpatterns = [
    path('notifications/', NotificationListView.as_view(), name='notification_list'),
    path('notifications/mark-read/', MarkAllReadView.as_view(), name='notification_mark_read'),
]
