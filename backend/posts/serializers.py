from rest_framework import serializers
from .models import Post, Like, Comment

class CommentSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    profile_pic = serializers.ReadOnlyField(source='user.profile_pic')

    class Meta:
        model = Comment
        fields = ('id', 'user', 'username', 'profile_pic', 'post', 'text', 'created_at')
        read_only_fields = ('user', 'post', 'created_at')

class LikeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Like
        fields = ('id', 'user', 'post', 'created_at')
        read_only_fields = ('user', 'post', 'created_at')

class PostSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    profile_pic = serializers.ReadOnlyField(source='user.profile_pic')
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = ('id', 'user', 'username', 'profile_pic', 'media_url', 'media_type', 'caption', 'created_at', 'likes_count', 'comments_count', 'is_liked')
        read_only_fields = ('user', 'created_at')

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_comments_count(self, obj):
        return obj.comments.count()

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
