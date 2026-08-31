"""
Real Instagram OAuth 2.0 integration using the Instagram Graph API.

Flow:
  1. GET  /api/instagram/connect/    → redirect user to Instagram login
  2. GET  /api/instagram/callback/   → exchange code → short-lived token
                                     → exchange short-lived → long-lived token
                                     → fetch real posts + reels + profile
                                     → store in DB, redirect to frontend
  3. GET  /api/instagram/status/     → returns current connection status
  4. POST /api/instagram/disconnect/ → clears stored token + ig username

Meta App setup instructions (shown to user if CLIENT_ID is not configured):
  1. Go to https://developers.facebook.com
  2. Create an App → choose "Consumer" type
  3. Add product "Instagram Graph API"
  4. Under "Instagram Graph API" → Settings:
     - Add your Instagram account as a test user
     - Add Valid OAuth Redirect URI: http://localhost:8000/api/instagram/callback/
  5. Copy App ID → INSTAGRAM_CLIENT_ID in backend/.env
  6. Copy App Secret → INSTAGRAM_CLIENT_SECRET in backend/.env
  7. Under App Review → Permissions, request: instagram_basic, instagram_content_publish
     (for personal use / dev mode, your own test account works without review)
"""

import requests
from urllib.parse import urlencode
from django.conf import settings
from django.shortcuts import redirect
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model

from posts.models import Post, Reel

User = get_user_model()


INSTAGRAM_AUTH_URL = "https://api.instagram.com/oauth/authorize"
INSTAGRAM_TOKEN_URL = "https://api.instagram.com/oauth/access_token"
INSTAGRAM_LONG_TOKEN_URL = "https://graph.instagram.com/access_token"
INSTAGRAM_MEDIA_URL = "https://graph.instagram.com/me/media"
INSTAGRAM_PROFILE_URL = "https://graph.instagram.com/me"
INSTAGRAM_MEDIA_DETAIL_URL = "https://graph.instagram.com/{media_id}"

# Media fields we want from the Graph API
MEDIA_FIELDS = "id,caption,media_type,media_url,thumbnail_url,timestamp,permalink"
PROFILE_FIELDS = "id,username,name,profile_picture_url,biography,followers_count,media_count"


def _is_configured():
    """Return True only if both OAuth credentials are set in env."""
    return bool(settings.INSTAGRAM_CLIENT_ID and
                settings.INSTAGRAM_CLIENT_SECRET and
                settings.INSTAGRAM_CLIENT_ID != 'YOUR_INSTAGRAM_APP_ID_HERE')


class InstagramConnectView(APIView):
    """
    GET /api/instagram/connect/
    Redirects the logged-in user to Instagram's OAuth consent screen.
    The JWT token is passed via ?next= so the callback can identify the user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _is_configured():
            return Response({
                'error': 'Instagram OAuth not configured.',
                'setup': (
                    'Set INSTAGRAM_CLIENT_ID, INSTAGRAM_CLIENT_SECRET, and '
                    'INSTAGRAM_REDIRECT_URI in backend/.env. '
                    'See backend/users/instagram_oauth.py for full instructions.'
                ),
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # Embed the user's pk in the state param so we can identify them on callback
        state = f"uid={request.user.pk}"

        params = {
            'client_id': settings.INSTAGRAM_CLIENT_ID,
            'redirect_uri': settings.INSTAGRAM_REDIRECT_URI,
            'scope': 'instagram_basic,instagram_content_publish',
            'response_type': 'code',
            'state': state,
        }
        auth_url = f"{INSTAGRAM_AUTH_URL}?{urlencode(params)}"
        return redirect(auth_url)


class InstagramCallbackView(APIView):
    """
    GET /api/instagram/callback/
    Called by Instagram after user grants permission.
    Exchanges the code, fetches media, imports into DB, redirects to frontend.
    """
    permission_classes = [AllowAny]  # must be open so Instagram can hit it

    def get(self, request):
        code = request.GET.get('code')
        state = request.GET.get('state', '')
        error = request.GET.get('error')

        frontend_base = 'http://localhost:5173'

        if error:
            return redirect(f"{frontend_base}/profile?ig_error={error}")

        if not code:
            return redirect(f"{frontend_base}/profile?ig_error=no_code")

        # Identify user from state param
        user = None
        if state.startswith('uid='):
            try:
                uid = int(state.split('=', 1)[1])
                user = User.objects.get(pk=uid)
            except (ValueError, User.DoesNotExist):
                pass

        if not user:
            return redirect(f"{frontend_base}/profile?ig_error=invalid_state")

        # ── Step 1: Exchange code for short-lived token ───────────────────────
        token_response = requests.post(INSTAGRAM_TOKEN_URL, data={
            'client_id': settings.INSTAGRAM_CLIENT_ID,
            'client_secret': settings.INSTAGRAM_CLIENT_SECRET,
            'grant_type': 'authorization_code',
            'redirect_uri': settings.INSTAGRAM_REDIRECT_URI,
            'code': code,
        }, timeout=15)

        if not token_response.ok:
            err = token_response.json().get('error_message', 'token_exchange_failed')
            return redirect(f"{frontend_base}/profile?ig_error={err}")

        short_data = token_response.json()
        short_token = short_data.get('access_token')
        ig_user_id = short_data.get('user_id')

        # ── Step 2: Exchange short-lived → long-lived token (60 days) ─────────
        long_response = requests.get(INSTAGRAM_LONG_TOKEN_URL, params={
            'grant_type': 'ig_exchange_token',
            'client_secret': settings.INSTAGRAM_CLIENT_SECRET,
            'access_token': short_token,
        }, timeout=15)

        long_token = short_token  # fallback to short if exchange fails
        if long_response.ok:
            long_token = long_response.json().get('access_token', short_token)

        # ── Step 3: Fetch real profile info ───────────────────────────────────
        profile_resp = requests.get(INSTAGRAM_PROFILE_URL, params={
            'fields': PROFILE_FIELDS,
            'access_token': long_token,
        }, timeout=15)

        ig_username = ''
        ig_profile_pic = None
        if profile_resp.ok:
            prof = profile_resp.json()
            ig_username = prof.get('username', '')
            ig_profile_pic = prof.get('profile_picture_url')

        # ── Step 4: Fetch all media (max 100 most recent) ─────────────────────
        media_resp = requests.get(INSTAGRAM_MEDIA_URL, params={
            'fields': MEDIA_FIELDS,
            'limit': 100,
            'access_token': long_token,
        }, timeout=15)

        imported_posts = 0
        imported_reels = 0

        if media_resp.ok:
            media_items = media_resp.json().get('data', [])

            for item in media_items:
                media_type = item.get('media_type', '')
                media_url = item.get('media_url') or item.get('thumbnail_url', '')
                caption = item.get('caption', '') or ''

                if not media_url:
                    continue

                # Skip carousel albums (no direct media_url for the album)
                if media_type == 'CAROUSEL_ALBUM':
                    # Optionally could fetch children, skip for now
                    continue

                if media_type == 'VIDEO':
                    # Check if it's short enough to be a reel (≤60s)
                    # Instagram Graph API doesn't give duration directly, treat VIDEO < 60s as reel
                    # Use thumbnail_url for reel cover if available
                    Reel.objects.get_or_create(
                        user=user,
                        media_url=media_url,
                        defaults={
                            'caption': caption[:500],
                            'duration_seconds': 30,  # default; Graph API doesn't expose duration
                        }
                    )
                    imported_reels += 1
                else:
                    # IMAGE
                    Post.objects.get_or_create(
                        user=user,
                        media_url=media_url,
                        defaults={
                            'caption': caption[:500],
                            'media_type': 'image',
                        }
                    )
                    imported_posts += 1

        # ── Step 5: Persist token + ig username on user ───────────────────────
        update_fields = ['instagram_access_token', 'instagram_username']
        user.instagram_access_token = long_token
        user.instagram_username = ig_username or f'ig_user_{ig_user_id}'

        if ig_profile_pic and not user.profile_pic:
            user.profile_pic = ig_profile_pic
            update_fields.append('profile_pic')

        user.save(update_fields=update_fields)

        # ── Redirect to frontend with success ─────────────────────────────────
        return redirect(
            f"{frontend_base}/profile"
            f"?ig_connected=1"
            f"&ig_username={user.instagram_username}"
            f"&ig_posts={imported_posts}"
            f"&ig_reels={imported_reels}"
        )


class InstagramStatusView(APIView):
    """
    GET /api/instagram/status/
    Returns whether the current user has connected Instagram.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'connected': bool(user.instagram_access_token),
            'instagram_username': user.instagram_username or None,
            'configured': _is_configured(),
        })


class InstagramDisconnectView(APIView):
    """
    POST /api/instagram/disconnect/
    Clears the stored token and ig username.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        user.instagram_access_token = None
        user.instagram_username = None
        user.save(update_fields=['instagram_access_token', 'instagram_username'])
        return Response({'status': 'disconnected'})


class InstagramRefreshView(APIView):
    """
    POST /api/instagram/refresh/
    Uses the stored long-lived token to re-fetch latest media from Instagram
    and import any new posts/reels. No re-auth needed (token lasts 60 days).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        if not user.instagram_access_token:
            return Response(
                {'error': 'Instagram not connected. Connect first via /api/instagram/connect/'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        token = user.instagram_access_token

        media_resp = requests.get(INSTAGRAM_MEDIA_URL, params={
            'fields': MEDIA_FIELDS,
            'limit': 100,
            'access_token': token,
        }, timeout=15)

        if not media_resp.ok:
            # Token might be expired — clear it
            err = media_resp.json().get('error', {}).get('message', 'token_expired')
            user.instagram_access_token = None
            user.save(update_fields=['instagram_access_token'])
            return Response(
                {'error': f'Instagram token error: {err}. Please reconnect.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        new_posts = 0
        new_reels = 0

        for item in media_resp.json().get('data', []):
            media_type = item.get('media_type', '')
            media_url = item.get('media_url') or item.get('thumbnail_url', '')
            caption = (item.get('caption') or '')[:500]

            if not media_url or media_type == 'CAROUSEL_ALBUM':
                continue

            if media_type == 'VIDEO':
                _, created = Reel.objects.get_or_create(
                    user=user,
                    media_url=media_url,
                    defaults={'caption': caption, 'duration_seconds': 30},
                )
                if created:
                    new_reels += 1
            else:
                _, created = Post.objects.get_or_create(
                    user=user,
                    media_url=media_url,
                    defaults={'caption': caption, 'media_type': 'image'},
                )
                if created:
                    new_posts += 1

        return Response({
            'status': 'refreshed',
            'new_posts': new_posts,
            'new_reels': new_reels,
            'message': f'Imported {new_posts} new posts and {new_reels} new reels.',
        })
