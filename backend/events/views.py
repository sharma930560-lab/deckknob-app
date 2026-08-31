from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Event, EventRSVP
from .serializers import EventSerializer

from django.utils import timezone
from datetime import timedelta


class EventListCreateView(generics.ListCreateAPIView):
    serializer_class = EventSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)

    def get_queryset(self):
        queryset = Event.objects.all()
        today_only = self.request.query_params.get('today', None)
        if today_only == 'true':
            now = timezone.now()
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            today_end = today_start + timedelta(days=1)
            queryset = queryset.filter(date_time__range=(today_start, today_end))
        return queryset


class EventDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)

    def perform_update(self, serializer):
        if self.get_object().user != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have permission to edit this event.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.user != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have permission to delete this event.")
        instance.delete()


class EventRSVPView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, pk):
        try:
            event = Event.objects.get(pk=pk)
        except Event.DoesNotExist:
            return Response({'detail': 'Event not found.'}, status=status.HTTP_404_NOT_FOUND)

        rsvp_type = request.data.get('rsvp_type')
        if rsvp_type not in ('going', 'interested'):
            return Response(
                {'detail': 'rsvp_type must be "going" or "interested".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rsvp, created = EventRSVP.objects.get_or_create(
            user=request.user,
            event=event,
            defaults={'rsvp_type': rsvp_type},
        )
        if not created:
            rsvp.rsvp_type = rsvp_type
            rsvp.save(update_fields=['rsvp_type'])

        return Response({'rsvp_type': rsvp.rsvp_type}, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        try:
            event = Event.objects.get(pk=pk)
        except Event.DoesNotExist:
            return Response({'detail': 'Event not found.'}, status=status.HTTP_404_NOT_FOUND)

        EventRSVP.objects.filter(user=request.user, event=event).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
