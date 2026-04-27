from django.urls import path
from .views import SocialLinkListCreateView, SocialLinkDetailView

urlpatterns = [
    path('social-links/', SocialLinkListCreateView.as_view(), name='social_link_list_create'),
    path('social-links/<int:pk>/', SocialLinkDetailView.as_view(), name='social_link_detail'),
]
