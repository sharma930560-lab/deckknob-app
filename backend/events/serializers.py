from rest_framework import serializers
from .models import Event, EventRSVP

class EventSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    profile_pic = serializers.ReadOnlyField(source='user.profile_pic')
    going_count = serializers.SerializerMethodField()
    interested_count = serializers.SerializerMethodField()
    user_rsvp_type = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = (
            'id', 'user', 'username', 'profile_pic', 'title', 'description',
            'media_url', 'media_type', 'date_time', 'latitude', 'longitude',
            'location_name', 'venue_url', 'created_at',
            'going_count', 'interested_count', 'user_rsvp_type',
        )
        read_only_fields = ('user', 'created_at')

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

    def get_going_count(self, obj):
        return obj.rsvps.filter(rsvp_type='going').count()

    def get_interested_count(self, obj):
        return obj.rsvps.filter(rsvp_type='interested').count()

    def get_user_rsvp_type(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            rsvp = EventRSVP.objects.filter(user=request.user, event=obj).first()
            if rsvp:
                return rsvp.rsvp_type
        return None
