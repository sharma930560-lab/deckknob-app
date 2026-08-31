from django.urls import path
from .views import EventListCreateView, EventDetailView, EventRSVPView

urlpatterns = [
    path('events/', EventListCreateView.as_view(), name='event_list_create'),
    path('events/<int:pk>/', EventDetailView.as_view(), name='event_detail'),
    path('events/<int:pk>/rsvp/', EventRSVPView.as_view(), name='event_rsvp'),
]
