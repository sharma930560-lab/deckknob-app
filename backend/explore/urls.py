from django.urls import path
from .views import TrendingView, SuggestedUsersView, SearchView

urlpatterns = [
    path('explore/trending/', TrendingView.as_view(), name='explore_trending'),
    path('explore/suggested/', SuggestedUsersView.as_view(), name='explore_suggested'),
    path('explore/search/', SearchView.as_view(), name='explore_search'),
]
