from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('users.urls')),
    path('api/', include('social_links.urls')),
    path('api/', include('posts.urls')),
    path('api/', include('events.urls')),
]
