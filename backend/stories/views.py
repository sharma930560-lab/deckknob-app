from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from users.models import Follow
from .models import Story, StoryView, StoryHighlight
from .serializers import StorySerializer, StoryViewSerializer, StoryHighlightSerializer

ALLOWED_FULL_MIME_TYPES = {
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
}

ALLOWED_SHORTHAND_TYPES = {'image', 'video'}


def _is_valid_media_type(media_type: str) -> bool:
    """Accept full MIME strings or image/video shorthand."""
    return media_type in ALLOWED_FULL_MIME_TYPES or media_type in ALLOWED_SHORTHAND_TYPES


class StoryFeedView(APIView):
    """
    GET /api/stories/feed/
    Returns active (non-expired) stories for followed users + self,
    grouped by user. Response format:
      [{user: {id, username, profile_pic}, stories: [...], has_unseen: bool}]
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        now = timezone.now()

        # Collect IDs of users whose stories we want: self + followed users
        followed_ids = Follow.objects.filter(
            follower=request.user
        ).values_list('following_id', flat=True)

        user_ids = set(followed_ids) | {request.user.id}

        # Fetch active stories for those users
        active_stories = (
            Story.objects
            .filter(user_id__in=user_ids, expires_at__gt=now)
            .select_related('user')
            .prefetch_related('views')
            .order_by('user_id', 'created_at')
        )

        # Group stories by user
        groups = {}
        for story in active_stories:
            uid = story.user_id
            if uid not in groups:
                groups[uid] = {
                    'user': {
                        'id': story.user.id,
                        'username': story.user.username,
                        'profile_pic': story.user.profile_pic,
                    },
                    'stories': [],
                    '_all_seen': True,
                }
            serialized = StorySerializer(story, context={'request': request}).data
            groups[uid]['stories'].append(serialized)
            # has_unseen for the group is True if ANY story is unseen
            if serialized['has_unseen']:
                groups[uid]['_all_seen'] = False

        result = []
        for uid, group in groups.items():
            result.append({
                'user': group['user'],
                'stories': group['stories'],
                'has_unseen': not group['_all_seen'],
            })

        return Response(result, status=status.HTTP_200_OK)


class StoryCreateView(generics.CreateAPIView):
    """
    POST /api/stories/
    Creates a new story for the authenticated user.
    Validates MIME type from the media_type field.
    """
    serializer_class = StorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        media_type = request.data.get('media_type', '')
        if not _is_valid_media_type(media_type):
            allowed = sorted(ALLOWED_FULL_MIME_TYPES | ALLOWED_SHORTHAND_TYPES)
            return Response(
                {'error': f'Unsupported file type: {media_type}. Allowed types: {", ".join(allowed)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class StoryViewCreateView(APIView):
    """
    POST /api/stories/{id}/view/
    Records a StoryView for the authenticated user. Idempotent (get_or_create).
    Returns {"viewed": true}.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        story = get_object_or_404(Story, pk=pk)
        StoryView.objects.get_or_create(story=story, viewer=request.user)
        return Response({'viewed': True}, status=status.HTTP_200_OK)


class StoryDeleteView(generics.DestroyAPIView):
    """
    DELETE /api/stories/{id}/
    Only the story author can delete. Returns 403 if not owner.
    """
    queryset = Story.objects.all()
    serializer_class = StorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_destroy(self, instance):
        if instance.user != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You do not have permission to delete this story.')
        instance.delete()


class StoryHighlightListView(generics.ListAPIView):
    """
    GET /api/stories/highlights/{user_id}/
    Lists all highlights for a given user.
    """
    serializer_class = StoryHighlightSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return StoryHighlight.objects.filter(
            user_id=self.kwargs['user_id']
        ).prefetch_related('stories')


class StoryHighlightCreateView(generics.CreateAPIView):
    """
    POST /api/stories/highlights/
    Creates a highlight for the authenticated user.
    """
    serializer_class = StoryHighlightSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
