from rest_framework import generics, permissions
from .models import SocialLink
from .serializers import SocialLinkSerializer

class SocialLinkListCreateView(generics.ListCreateAPIView):
    serializer_class = SocialLinkSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)

    def get_queryset(self):
        user_id = self.request.query_params.get('user_id')
        if user_id:
            return SocialLink.objects.filter(user__id=user_id)
        if self.request.user.is_authenticated:
            return SocialLink.objects.filter(user=self.request.user)
        return SocialLink.objects.none()

class SocialLinkDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SocialLinkSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return SocialLink.objects.filter(user=self.request.user)
