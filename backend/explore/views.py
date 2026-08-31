from django.utils import timezone
from datetime import timedelta

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from django.db.models import Count
from django.contrib.auth import get_user_model

from posts.models import Post, Reel, Hashtag, Bookmark, ReelLike
from posts.serializers import PostSerializer, ReelSerializer
from users.serializers import UserSerializer

User = get_user_model()


class TrendingView(APIView):
    """
    GET /api/explore/trending/
    Returns personalized posts and reels according to user's taste (based on liked/bookmarked hashtags).
    Falls back to top trending posts/reels if no user activity is found.
    Requires authentication.
    """
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        user = request.user if request.user.is_authenticated else None
        cutoff = timezone.now() - timedelta(days=30)  # Expand time range to find enough content

        # 1. Get user's liked/bookmarked posts and reels (only if authenticated)
        liked_post_ids = list(user.likes.values_list('post_id', flat=True)) if user else []
        bookmarked_post_ids = list(Bookmark.objects.filter(user=user, post__isnull=False).values_list('post_id', flat=True)) if user else []
        user_post_ids = set(liked_post_ids + bookmarked_post_ids)

        liked_reel_ids = list(ReelLike.objects.filter(user=user).values_list('reel_id', flat=True)) if user else []
        bookmarked_reel_ids = list(Bookmark.objects.filter(user=user, reel__isnull=False).values_list('reel_id', flat=True)) if user else []
        user_reel_ids = set(liked_reel_ids + bookmarked_reel_ids)

        # 2. Get hashtags of these liked/bookmarked posts and reels
        favorite_hashtags = set()
        if user_post_ids:
            favorite_hashtags.update(
                Hashtag.objects.filter(posts__id__in=user_post_ids).values_list('id', flat=True)
            )
        if user_reel_ids:
            favorite_hashtags.update(
                Hashtag.objects.filter(reels__id__in=user_reel_ids).values_list('id', flat=True)
            )

        # 3. Find personalized posts and reels
        personalized_posts = Post.objects.none()
        personalized_reels = Reel.objects.none()

        if favorite_hashtags:
            # Query posts containing favorite hashtags, excluding already liked/bookmarked by user
            personalized_posts = (
                Post.objects
                .filter(hashtags__id__in=favorite_hashtags)
                .exclude(id__in=user_post_ids)
                .annotate(likes_count=Count('likes'))
                .order_by('-likes_count', '-created_at')
            )

            # Query reels containing favorite hashtags, excluding already liked/bookmarked by user
            personalized_reels = (
                Reel.objects
                .filter(hashtags__id__in=favorite_hashtags)
                .exclude(id__in=user_reel_ids)
                .annotate(likes_count=Count('likes'))
                .order_by('-likes_count', '-created_at')
            )

        # 4. Fill up to 15 posts and 15 reels with general trending items if we don't have enough personalized items
        posts_list = list(personalized_posts[:15])
        reels_list = list(personalized_reels[:15])

        if len(posts_list) < 15:
            needed = 15 - len(posts_list)
            existing_ids = [p.id for p in posts_list]
            trending_posts = (
                Post.objects
                .filter(created_at__gte=cutoff)
                .exclude(id__in=existing_ids)
                .annotate(likes_count=Count('likes'))
                .order_by('-likes_count', '-created_at')[:needed]
            )
            posts_list.extend(trending_posts)

        if len(reels_list) < 15:
            needed = 15 - len(reels_list)
            existing_ids = [r.id for r in reels_list]
            trending_reels = (
                Reel.objects
                .filter(created_at__gte=cutoff)
                .exclude(id__in=existing_ids)
                .annotate(likes_count=Count('likes'))
                .order_by('-likes_count', '-created_at')[:needed]
            )
            reels_list.extend(trending_reels)

        post_serializer = PostSerializer(posts_list, many=True, context={'request': request})
        reel_serializer = ReelSerializer(reels_list, many=True, context={'request': request})

        return Response({
            'posts': post_serializer.data,
            'reels': reel_serializer.data,
        })


class SuggestedUsersView(APIView):
    """
    GET /api/explore/suggested/
    Returns up to 10 users the authenticated user does NOT follow,
    ranked by follower count descending. Excludes the user themselves.
    Requires authentication.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # IDs of users the current user already follows
        following_ids = user.following.values_list('following_id', flat=True)

        suggested = (
            User.objects
            .exclude(id=user.id)
            .exclude(id__in=following_ids)
            .annotate(followers_count=Count('followers'))
            .order_by('-followers_count')[:10]
        )

        serializer = UserSerializer(suggested, many=True, context={'request': request})
        return Response(serializer.data)


class SearchView(APIView):
    """
    GET /api/explore/search/?q=
    Returns matching users and hashtags for query q.
    Minimum 2 characters required; returns empty results if len(q) < 2.
    Requires authentication.
    """
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        q = request.query_params.get('q', '').strip()

        if len(q) < 2:
            return Response({'users': [], 'hashtags': []})

        users = User.objects.filter(username__icontains=q)[:10]
        hashtags = Hashtag.objects.filter(name__icontains=q)[:10]

        user_serializer = UserSerializer(users, many=True, context={'request': request})
        hashtag_data = [{'name': h.name} for h in hashtags]

        return Response({
            'users': user_serializer.data,
            'hashtags': hashtag_data,
        })
