from rest_framework import serializers
from .models import SocialLink

class SocialLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = SocialLink
        fields = ('id', 'user', 'platform_name', 'url')
        read_only_fields = ('user',)

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['user'] = user
        return super().create(validated_data)
