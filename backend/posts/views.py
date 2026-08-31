from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.db import models
from .models import Post, Like, Comment, Bookmark, Reel, ReelLike, ReelComment
from .serializers import PostSerializer, LikeSerializer, CommentSerializer, ReelSerializer, ReelCommentSerializer
from users.models import Follow
from notifications.models import Notification
import base64
import uuid
import os
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.conf import settings

# ---------------------------------------------------------------------------
# Constants — defined early so all views can reference them
# ---------------------------------------------------------------------------

REEL_ALLOWED_MIME_TYPES = {'video/mp4', 'video/webm'}
REEL_MAX_DURATION_SECONDS = 60         # 1 minute for reels
REEL_MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024  # 100 MB

POST_VIDEO_ALLOWED_MIME_TYPES = {'video/mp4', 'video/webm'}
POST_MAX_VIDEO_DURATION_SECONDS = 600  # 10 minutes for regular video posts

def save_base64_media(media_data, folder, request):
    if not isinstance(media_data, str) or not media_data.startswith('data:'):
        return media_data
    try:
        header, datastr = media_data.split(';base64,')
        mime_type = header.split('data:')[-1]
        ext = mime_type.split('/')[-1]
        if ext == 'jpeg':
            ext = 'jpg'
        # Sanitize extension just in case it contains extra MIME options
        ext = ext.split(';')[0]
        
        filename = f"{folder}_{request.user.username}_{uuid.uuid4().hex[:8]}.{ext}"
        data = ContentFile(base64.b64decode(datastr), name=filename)
        
        os.makedirs(os.path.join(settings.MEDIA_ROOT, folder), exist_ok=True)
        file_path = default_storage.save(os.path.join(folder, filename), data)
        
        relative_url = settings.MEDIA_URL + file_path.replace('\\', '/')
        public_url = request.build_absolute_uri(relative_url)
        return public_url
    except Exception as e:
        print("Error decoding base64 media:", e)
        return media_data

class PostListCreateView(generics.ListCreateAPIView):
    serializer_class = PostSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)

    def get_queryset(self):
        """Return own posts + posts from users the current user follows."""
        user = self.request.user
        if not user.is_authenticated:
            return Post.objects.all().order_by('-created_at')
        following_ids = Follow.objects.filter(follower=user).values_list('following_id', flat=True)
        return Post.objects.filter(
            models.Q(user=user) | models.Q(user_id__in=following_ids)
        ).order_by('-created_at')

    def create(self, request, *args, **kwargs):
        # Enforce video duration limit for video posts
        media_type = request.data.get('media_type', '')
        if media_type in POST_VIDEO_ALLOWED_MIME_TYPES or media_type == 'video':
            try:
                duration = int(request.data.get('duration_seconds', 0))
            except (TypeError, ValueError):
                duration = 0
            if duration > POST_MAX_VIDEO_DURATION_SECONDS:
                return Response(
                    {'detail': 'Video exceeds maximum duration of 10 minutes for posts.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        media_url = request.data.get('media_url', '')
        if media_url and isinstance(media_url, str) and media_url.startswith('data:'):
            data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
            data['media_url'] = save_base64_media(media_url, 'posts', request)
        else:
            data = request.data

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

class PostDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)

    def perform_update(self, serializer):
        if self.get_object().user != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have permission to edit this post.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.user != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have permission to delete this post.")
        instance.delete()

class LikeToggleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        post = get_object_or_404(Post, pk=pk)
        like, created = Like.objects.get_or_create(user=request.user, post=post)
        
        if not created:
            like.delete()
            return Response({'status': 'unliked'}, status=status.HTTP_200_OK)
        
        return Response({'status': 'liked'}, status=status.HTTP_201_CREATED)

class CommentListCreateView(generics.ListCreateAPIView):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return Comment.objects.filter(post_id=self.kwargs['pk'])

    def perform_create(self, serializer):
        post = get_object_or_404(Post, pk=self.kwargs['pk'])
        serializer.save(user=self.request.user, post=post)

class CommentDetailView(generics.DestroyAPIView):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_destroy(self, instance):
        if instance.user != self.request.user and instance.post.user != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have permission to delete this comment.")
        instance.delete()


class BookmarkToggleView(APIView):
    """
    POST /api/posts/{pk}/bookmark/
    Toggle bookmark for a post. Returns {"bookmarked": true/false}.
    Idempotent: duplicate calls return 200 with current state.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        post = get_object_or_404(Post, pk=pk)
        bookmark = Bookmark.objects.filter(user=request.user, post=post).first()

        if bookmark:
            bookmark.delete()
            return Response({'bookmarked': False}, status=status.HTTP_200_OK)

        Bookmark.objects.create(user=request.user, post=post)
        return Response({'bookmarked': True}, status=status.HTTP_200_OK)


class BookmarkListView(generics.ListAPIView):
    """
    GET /api/bookmarks/
    Returns the authenticated user's saved posts.
    """
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        bookmarked_post_ids = Bookmark.objects.filter(
            user=self.request.user,
            post__isnull=False,
        ).values_list('post_id', flat=True)
        return Post.objects.filter(id__in=bookmarked_post_ids).order_by('-created_at')


User = get_user_model()


class PostShareView(APIView):
    """
    POST /api/posts/{pk}/share/
    Share a post with one or more followers.
    Body: {"recipient_ids": [1, 2, 3]}
    Returns: {"shared_to": ["username1", "username2"]}
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        post = get_object_or_404(Post, pk=pk)
        recipient_ids = request.data.get('recipient_ids', [])

        if not isinstance(recipient_ids, list):
            return Response(
                {'detail': 'recipient_ids must be a list.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Collect the set of user IDs that follow the sender
        follower_ids = set(
            Follow.objects.filter(following=request.user).values_list('follower_id', flat=True)
        )

        shared_to = []
        errors = []

        for rid in recipient_ids:
            try:
                recipient = User.objects.get(pk=rid)
            except User.DoesNotExist:
                errors.append(f'User {rid} does not exist.')
                continue

            if rid not in follower_ids:
                errors.append(f'User {recipient.username} does not follow you.')
                continue

            Notification.objects.create(
                recipient=recipient,
                actor=request.user,
                verb='share',
                target_post=post,
            )
            shared_to.append(recipient.username)

        response_data = {'shared_to': shared_to}
        if errors:
            response_data['errors'] = errors

        return Response(response_data, status=status.HTTP_200_OK)


class ReelShareView(APIView):
    """
    POST /api/reels/{pk}/share/
    Share a reel with one or more followers.
    Body: {"recipient_ids": [1, 2, 3]}
    Returns: {"shared_to": ["username1", "username2"]}
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        reel = get_object_or_404(Reel, pk=pk)
        recipient_ids = request.data.get('recipient_ids', [])

        if not isinstance(recipient_ids, list):
            return Response(
                {'detail': 'recipient_ids must be a list.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Collect the set of user IDs that follow the sender
        follower_ids = set(
            Follow.objects.filter(following=request.user).values_list('follower_id', flat=True)
        )

        shared_to = []
        errors = []

        for rid in recipient_ids:
            try:
                recipient = User.objects.get(pk=rid)
            except User.DoesNotExist:
                errors.append(f'User {rid} does not exist.')
                continue

            if rid not in follower_ids:
                errors.append(f'User {recipient.username} does not follow you.')
                continue

            Notification.objects.create(
                recipient=recipient,
                actor=request.user,
                verb='share',
                target_reel=reel,
            )
            shared_to.append(recipient.username)

        response_data = {'shared_to': shared_to}
        if errors:
            response_data['errors'] = errors

        return Response(response_data, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Reels
# ---------------------------------------------------------------------------


class ReelPagination(PageNumberPagination):
    page_size = 10


class ReelListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/reels/  — paginated list of reels, ordered by -created_at (public)
    POST /api/reels/  — create a new reel (authenticated)
    """
    serializer_class = ReelSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    pagination_class = ReelPagination

    def get_queryset(self):
        return Reel.objects.all().order_by('-created_at')

    def create(self, request, *args, **kwargs):
        # Validate media_type
        media_type = request.data.get('media_type', '')
        if media_type not in REEL_ALLOWED_MIME_TYPES:
            return Response(
                {'detail': f'Invalid media type. Allowed types: {", ".join(sorted(REEL_ALLOWED_MIME_TYPES))}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate duration
        try:
            duration = int(request.data.get('duration_seconds', 0))
        except (TypeError, ValueError):
            duration = 0
        if duration > REEL_MAX_DURATION_SECONDS:
            return Response(
                {'detail': 'Video exceeds maximum duration of 60 seconds'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate file size via Content-Length header or 'size' field
        file_size = None
        content_length = request.META.get('CONTENT_LENGTH')
        if content_length:
            try:
                file_size = int(content_length)
            except (TypeError, ValueError):
                file_size = None
        if file_size is None:
            try:
                file_size = int(request.data.get('size', 0))
            except (TypeError, ValueError):
                file_size = 0
        if file_size and file_size > REEL_MAX_FILE_SIZE_BYTES:
            return Response(
                {'detail': 'File exceeds maximum size of 100 MB'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        media_url = request.data.get('media_url', '')
        if media_url and isinstance(media_url, str) and media_url.startswith('data:'):
            data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
            data['media_url'] = save_base64_media(media_url, 'reels', request)
        else:
            data = request.data

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class ReelLikeToggleView(APIView):
    """
    POST /api/reels/{pk}/like/
    Toggle a ReelLike. Returns {"liked": bool, "likes_count": int}.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        reel = get_object_or_404(Reel, pk=pk)
        like, created = ReelLike.objects.get_or_create(user=request.user, reel=reel)

        if not created:
            like.delete()
            liked = False
        else:
            liked = True

        likes_count = reel.likes.count()
        return Response({'liked': liked, 'likes_count': likes_count}, status=status.HTTP_200_OK)


class ReelBookmarkToggleView(APIView):
    """
    POST /api/reels/{pk}/bookmark/
    Toggle bookmark for a reel. Idempotent. Returns {"bookmarked": bool}.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        reel = get_object_or_404(Reel, pk=pk)
        bookmark = Bookmark.objects.filter(user=request.user, reel=reel).first()

        if bookmark:
            bookmark.delete()
            return Response({'bookmarked': False}, status=status.HTTP_200_OK)

        Bookmark.objects.create(user=request.user, reel=reel)
        return Response({'bookmarked': True}, status=status.HTTP_200_OK)


class ReelCommentListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/reels/{pk}/comments/  — list comments for a reel
    POST /api/reels/{pk}/comments/  — create a comment on a reel
    """
    serializer_class = ReelCommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return ReelComment.objects.filter(reel_id=self.kwargs['pk'])

    def perform_create(self, serializer):
        reel = get_object_or_404(Reel, pk=self.kwargs['pk'])
        serializer.save(user=self.request.user, reel=reel)


class HashtagFeedView(APIView):
    """
    GET /api/hashtags/{name}/
    Returns posts + reels tagged with the given hashtag in reverse-chronological order.
    Response: {"hashtag": name, "posts": [...], "reels": [...]}
    """
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request, name):
        from .models import Hashtag
        normalised = name.lower().lstrip('#')
        try:
            hashtag = Hashtag.objects.get(name=normalised)
        except Hashtag.DoesNotExist:
            return Response(
                {'hashtag': normalised, 'posts': [], 'reels': []},
                status=status.HTTP_200_OK,
            )

        posts = hashtag.posts.all().order_by('-created_at')
        reels = hashtag.reels.all().order_by('-created_at')

        posts_data = PostSerializer(posts, many=True, context={'request': request}).data
        reels_data = ReelSerializer(reels, many=True, context={'request': request}).data

        return Response(
            {'hashtag': normalised, 'posts': posts_data, 'reels': reels_data},
            status=status.HTTP_200_OK,
        )


class InstagramSyncView(APIView):
    """
    POST /api/posts/instagram-sync/
    Full content import: posts, reels, stories, profile pic update.
    Simulates connecting an Instagram account and pulling everything.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        ig = request.data.get('instagram_username', 'user_instagram').strip().lstrip('@')

        # ── 15 Posts ─────────────────────────────────────────────────────────
        all_posts = [
            {"media_url": "https://images.unsplash.com/photo-1516873240891-4bf014598ab4?w=900", "media_type": "image",
             "caption": f"Live from the booth last night 🎛️⚡ The crowd was everything. #techno #dj @{ig}"},
            {"media_url": "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=900", "media_type": "image",
             "caption": f"Warehouse mode activated 🏭🔊 Nothing hits like raw concrete reverb. #warehouse #underground @{ig}"},
            {"media_url": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=900", "media_type": "image",
             "caption": f"Digging through crates at the record shop 💿 Found a 1989 deep house white label. #vinyl #crate @{ig}"},
            {"media_url": "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=900", "media_type": "image",
             "caption": f"Backstage before the headline set 🎭🔥 Gratitude for every stage. #festival #live @{ig}"},
            {"media_url": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=900", "media_type": "image",
             "caption": f"Studio sessions go until the sun comes up ☀️🎚️ New EP coming soon. #studio #producer @{ig}"},
            {"media_url": "https://images.unsplash.com/photo-1574691250077-03a929faece5?w=900", "media_type": "image",
             "caption": f"Peak time energy at Berghain 🖤 The darkness hits different at 6AM. #berghain #peaktime @{ig}"},
            {"media_url": "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=900", "media_type": "image",
             "caption": f"New modular setup just landed 🔌🎹 Eurorack life is a beautiful rabbit hole. #modular #synth @{ig}"},
            {"media_url": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900", "media_type": "image",
             "caption": f"Open air vibes 🌿🔊 Nothing like dancing in a field until sunrise. #openair #rave @{ig}"},
            {"media_url": "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=900", "media_type": "image",
             "caption": f"Sound check done. Let's go 🎤✅ #soundcheck #dj #tonight @{ig}"},
            {"media_url": "https://images.unsplash.com/photo-1528489496900-d841974f5290?w=900", "media_type": "image",
             "caption": f"This city never sleeps and neither do I 🌃🌊 Berlin calling. #berlin #nightlife @{ig}"},
            {"media_url": "https://images.unsplash.com/photo-1535712376117-2b26cc812f55?w=900", "media_type": "image",
             "caption": f"Headphones + coffee = the morning ritual ☕🎧 Listening back to last night's recording. #morningvibes @{ig}"},
            {"media_url": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=900", "media_type": "image",
             "caption": f"LAN party turned into an impromptu rave 🎮💥 We did not plan this. #spontaneous #underground @{ig}"},
            {"media_url": "https://images.unsplash.com/photo-1549834125-82d3c8b49768?w=900", "media_type": "image",
             "caption": f"Tokyo selector session 🇯🇵🎶 The scene here is absolutely insane. #tokyo #djlife @{ig}"},
            {"media_url": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=900", "media_type": "image",
             "caption": f"Played my first track on an 808 today 🥁 Couldn't stop. #808 #drums #beatmaking @{ig}"},
            {"media_url": "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=900", "media_type": "image",
             "caption": f"The crowd was one organism last night 🫀 Collective consciousness on the dancefloor. #rave #techno @{ig}"},
        ]

        # ── 8 Reels ──────────────────────────────────────────────────────────
        all_reels = [
            {"media_url": "https://assets.mixkit.co/videos/preview/mixkit-dj-playing-music-at-a-club-42403-large.mp4",
             "caption": f"Mixing in the dark 🎧🌒 #afrohouse #live @{ig}", "duration_seconds": 15},
            {"media_url": "https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-dj-playing-music-on-a-mixer-42402-large.mp4",
             "caption": f"Pitch riding and tracking the groove 🎚️🕶️ #hardgroove #festival @{ig}", "duration_seconds": 22},
            {"media_url": "https://assets.mixkit.co/videos/preview/mixkit-man-dance-under-colorful-lights-1240-large.mp4",
             "caption": f"When the drop hits just right 💫🔥 #techno #dancefloor @{ig}", "duration_seconds": 10},
            {"media_url": "https://assets.mixkit.co/videos/preview/mixkit-crowd-at-a-music-festival-963-large.mp4",
             "caption": f"Fifty thousand people moving as one 🫀 This was the moment. #festival #peak @{ig}", "duration_seconds": 18},
            {"media_url": "https://assets.mixkit.co/videos/preview/mixkit-woman-dancing-at-a-night-club-4146-large.mp4",
             "caption": f"Bodies in motion, minds in the music 🌊 #clubnight #house @{ig}", "duration_seconds": 12},
            {"media_url": "https://assets.mixkit.co/videos/preview/mixkit-professional-dj-decks-1481-large.mp4",
             "caption": f"Locked in on the decks all night 🎛️ No breaks. #djset #vinyl @{ig}", "duration_seconds": 20},
            {"media_url": "https://assets.mixkit.co/videos/preview/mixkit-colorful-night-party-in-a-night-club-4069-large.mp4",
             "caption": f"After hours going off 🎆 The party started at 4AM. #afterhours #underground @{ig}", "duration_seconds": 14},
            {"media_url": "https://assets.mixkit.co/videos/preview/mixkit-disc-jockey-playing-in-a-night-club-40516-large.mp4",
             "caption": f"New track ID dropping this Friday 👁️ Stay tuned. #upcoming #release @{ig}", "duration_seconds": 25},
        ]

        # ── 6 Stories (24h expiry) ────────────────────────────────────────────
        all_stories = [
            {"media_url": "https://images.unsplash.com/photo-1516873240891-4bf014598ab4?w=600", "media_type": "image"},
            {"media_url": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600", "media_type": "image"},
            {"media_url": "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=600", "media_type": "image"},
            {"media_url": "https://assets.mixkit.co/videos/preview/mixkit-man-dance-under-colorful-lights-1240-large.mp4", "media_type": "video"},
            {"media_url": "https://images.unsplash.com/photo-1574691250077-03a929faece5?w=600", "media_type": "image"},
            {"media_url": "https://images.unsplash.com/photo-1471478331149-c72f17e33c73?w=600", "media_type": "image"},
        ]

        from stories.models import Story
        from django.utils import timezone
        from datetime import timedelta

        created_posts, created_reels, created_stories = [], [], []

        for p in all_posts:
            post = Post.objects.create(
                user=user,
                media_url=p['media_url'],
                media_type=p['media_type'],
                caption=p['caption'],
            )
            created_posts.append(post)

        for r in all_reels:
            reel = Reel.objects.create(
                user=user,
                media_url=r['media_url'],
                caption=r['caption'],
                duration_seconds=r['duration_seconds'],
            )
            created_reels.append(reel)

        expires = timezone.now() + timedelta(hours=24)
        for s in all_stories:
            story = Story.objects.create(
                user=user,
                media_url=s['media_url'],
                media_type=s['media_type'],
                expires_at=expires,
            )
            created_stories.append(story)

        # Update profile pic and store instagram handle if not already set
        update_fields = []
        if not user.profile_pic:
            user.profile_pic = "https://images.unsplash.com/photo-1516873240891-4bf014598ab4?w=400"
            update_fields.append('profile_pic')
        if update_fields:
            user.save(update_fields=update_fields)

        return Response({
            'status': 'success',
            'instagram_username': ig,
            'message': (
                f'Imported {len(created_posts)} posts, '
                f'{len(created_reels)} reels, and '
                f'{len(created_stories)} stories from @{ig}!'
            ),
            'imported_posts_count': len(created_posts),
            'imported_reels_count': len(created_reels),
            'imported_stories_count': len(created_stories),
        }, status=status.HTTP_201_CREATED)


class UserPostsListView(generics.ListAPIView):
    """
    GET /api/users/<username>/posts/
    Returns all posts for a given user (public endpoint).
    """
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        username = self.kwargs['username']
        user = get_object_or_404(get_user_model(), username=username)
        return Post.objects.filter(user=user).order_by('-created_at')


class UserReelsListView(generics.ListAPIView):
    """
    GET /api/users/<username>/reels/
    Returns all reels for a given user (public endpoint).
    """
    serializer_class = ReelSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        username = self.kwargs['username']
        user = get_object_or_404(get_user_model(), username=username)
        return Reel.objects.filter(user=user).order_by('-created_at')
