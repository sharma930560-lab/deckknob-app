from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import RegisterView, CurrentUserView, UserDetailView, FollowToggleView, LiveStatusView, UsernameCheckView

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='auth_register'),
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', CurrentUserView.as_view(), name='auth_me'),
    path('auth/check-username/', UsernameCheckView.as_view(), name='check_username'),
    path('users/live-status/', LiveStatusView.as_view(), name='live_status'),
    path('users/<str:username>/', UserDetailView.as_view(), name='user_detail'),
    path('users/<str:username>/follow/', FollowToggleView.as_view(), name='follow_toggle'),
]
