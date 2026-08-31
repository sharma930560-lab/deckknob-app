from rest_framework import serializers
from .models import Story, StoryView, StoryHighlight


class StorySerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    profile_pic = serializers.ReadOnlyField(source='user.profile_pic')
    views_count = serializers.SerializerMethodField()
    has_unseen = serializers.SerializerMethodField()

    class Meta:
        model = Story
        fields = (
            'id', 'user', 'username', 'profile_pic',
            'media_url', 'media_type', 'created_at', 'expires_at',
            'views_count', 'has_unseen',
        )
        read_only_fields = ('user', 'created_at', 'expires_at')

    def get_views_count(self, obj):
        return obj.views.count()

    def get_has_unseen(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return not obj.views.filter(viewer=request.user).exists()
        return True

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class StoryViewSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoryView
        fields = ('id', 'story', 'viewer', 'viewed_at')
        read_only_fields = ('viewer', 'viewed_at')


class StoryHighlightSerializer(serializers.ModelSerializer):
    stories = StorySerializer(many=True, read_only=True)

    class Meta:
        model = StoryHighlight
        fields = ('id', 'user', 'title', 'cover_url', 'stories')
        read_only_fields = ('user',)

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
