import random
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from .serializers import UserSerializer, RegisterSerializer
from .models import Follow

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

class CurrentUserView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        profile_pic_data = request.data.get('profile_pic')
        if profile_pic_data and isinstance(profile_pic_data, str):
            if profile_pic_data.startswith('data:image/') or profile_pic_data.startswith('data:video/'):
                import base64
                import uuid
                import os
                from django.core.files.base import ContentFile
                from django.core.files.storage import default_storage
                from django.conf import settings
                
                try:
                    # Handle base64 encoded avatars/images
                    header, imgstr = profile_pic_data.split(';base64,')
                    ext = header.split('/')[-1]
                    if ext == 'jpeg':
                        ext = 'jpg'
                    
                    filename = f"avatar_{request.user.username}_{uuid.uuid4().hex[:8]}.{ext}"
                    data = ContentFile(base64.b64decode(imgstr), name=filename)
                    
                    # Make sure media directory exists
                    os.makedirs(os.path.join(str(settings.MEDIA_ROOT), 'avatars'), exist_ok=True)
                    
                    # Save to media/avatars
                    file_path = default_storage.save(os.path.join('avatars', filename), data)
                    
                    # Build URL path
                    relative_url = settings.MEDIA_URL + file_path.replace('\\', '/')
                    public_url = request.build_absolute_uri(relative_url)
                    
                    # Update request data
                    if hasattr(request.data, '_mutable'):
                        request.data._mutable = True
                    request.data['profile_pic'] = public_url
                except Exception as e:
                    pass
            elif profile_pic_data.startswith('blob:') or profile_pic_data.startswith('http') or profile_pic_data.startswith('/media/'):
                # Accept direct image URLs or blob-references directly to update profile_pic field
                pass

        return super().update(request, *args, **kwargs)


class UserDetailView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    lookup_field = 'username'

class FollowToggleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, username):
        target_user = get_object_or_404(User, username=username)
        if target_user == request.user:
            return Response({'error': 'You cannot follow yourself.'}, status=status.HTTP_400_BAD_REQUEST)
            
        follow, created = Follow.objects.get_or_create(follower=request.user, following=target_user)
        
        if not created:
            follow.delete()
            return Response({'status': 'unfollowed'}, status=status.HTTP_200_OK)
        
        return Response({'status': 'followed'}, status=status.HTTP_201_CREATED)


class LiveStatusView(APIView):
    """
    PATCH /api/users/live-status/
    Toggles the authenticated user's is_live flag.
    Returns {"is_live": bool}.
    Also triggers a 'live' notification to all followers when going live.
    """
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        user = request.user
        user.is_live = not user.is_live
        user.save(update_fields=['is_live'])

        # If the user just went live, notify all followers
        if user.is_live:
            from notifications.models import Notification as WsNotification
            from notifications.serializers import NotificationSerializer
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer

            channel_layer = get_channel_layer()
            follower_ids = Follow.objects.filter(
                following=user
            ).values_list('follower_id', flat=True)

            for follower_id in follower_ids:
                notif = WsNotification.objects.create(
                    recipient_id=follower_id,
                    actor=user,
                    verb='live',
                )
                if channel_layer:
                    data = NotificationSerializer(notif).data
                    async_to_sync(channel_layer.group_send)(
                        f'notifications_{follower_id}',
                        {'type': 'notification.message', 'notification': data},
                    )

        return Response({'is_live': user.is_live}, status=status.HTTP_200_OK)


class UsernameCheckView(APIView):
    """
    GET /api/auth/check-username/?username=<username>
    Returns {"available": bool, "suggestions": []} when taken.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        username = request.query_params.get('username', '').strip().lower()
        if not username or len(username) < 3:
            return Response({'available': False, 'error': 'Username must be at least 3 characters.'}, status=400)

        taken = User.objects.filter(username__iexact=username).exists()

        if not taken:
            return Response({'available': True, 'suggestions': []})

        # Generate unique suggestions
        suffixes = ['_dj', '_mix', '_beats', '_live', '_wav', str(random.randint(10, 99)), str(random.randint(100, 999))]
        suggestions = []
        random.shuffle(suffixes)
        for suffix in suffixes:
            candidate = f"{username}{suffix}"
            if not User.objects.filter(username__iexact=candidate).exists():
                suggestions.append(candidate)
            if len(suggestions) == 3:
                break

        return Response({'available': False, 'suggestions': suggestions})
