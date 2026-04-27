from rest_framework import serializers
from .models import Event

class EventSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    profile_pic = serializers.ReadOnlyField(source='user.profile_pic')

    class Meta:
        model = Event
        fields = (
            'id', 'user', 'username', 'profile_pic', 'title', 'description', 
            'media_url', 'media_type', 'date_time', 'latitude', 'longitude', 
            'location_name', 'created_at'
        )
        read_only_fields = ('user', 'created_at')

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
