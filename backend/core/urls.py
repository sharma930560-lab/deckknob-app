from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from users.instagram_oauth import (
    InstagramConnectView,
    InstagramCallbackView,
    InstagramStatusView,
    InstagramDisconnectView,
    InstagramRefreshView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('users.urls')),
    path('api/', include('social_links.urls')),
    path('api/', include('posts.urls')),
    path('api/', include('events.urls')),
    path('api/', include('stories.urls')),
    path('api/', include('notifications.urls')),
    path('api/', include('explore.urls')),
    # Instagram OAuth
    path('api/instagram/connect/',    InstagramConnectView.as_view(),    name='ig_connect'),
    path('api/instagram/callback/',   InstagramCallbackView.as_view(),   name='ig_callback'),
    path('api/instagram/status/',     InstagramStatusView.as_view(),     name='ig_status'),
    path('api/instagram/disconnect/', InstagramDisconnectView.as_view(), name='ig_disconnect'),
    path('api/instagram/refresh/',    InstagramRefreshView.as_view(),    name='ig_refresh'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

