"""
Unit tests for Stories API endpoints.
Requirements: 3.10, 3.11, 15.4, 15.5
"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from .models import Story, StoryView, StoryHighlight
from users.models import Follow

User = get_user_model()


def make_user(username, password='testpass123'):
    return User.objects.create_user(username=username, password=password)


def make_story(user, media_type='image/jpeg', expired=False):
    """Helper to create a Story, optionally already expired."""
    now = timezone.now()
    if expired:
        expires_at = now - timedelta(hours=1)
    else:
        expires_at = now + timedelta(hours=24)
    return Story.objects.create(
        user=user,
        media_url='https://example.com/media.jpg',
        media_type=media_type,
        expires_at=expires_at,
    )


class StoryFeedViewTest(TestCase):
    """Tests for GET /api/stories/feed/"""

    def setUp(self):
        self.client = APIClient()
        self.user = make_user('feeduser')
        self.other = make_user('otheruser')
        self.client.force_authenticate(user=self.user)

    def test_excludes_expired_stories(self):
        """StoryFeedView must not return stories where expires_at < now."""
        # Create one active and one expired story for a followed user
        Follow.objects.create(follower=self.user, following=self.other)
        make_story(self.other, expired=False)
        make_story(self.other, expired=True)

        response = self.client.get('/api/stories/feed/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Find the group for self.other
        groups = {g['user']['id']: g for g in response.data}
        self.assertIn(self.other.id, groups)
        # Only the active story should appear
        self.assertEqual(len(groups[self.other.id]['stories']), 1)

    def test_includes_own_stories(self):
        """StoryFeedView includes the authenticated user's own stories."""
        make_story(self.user)
        response = self.client.get('/api/stories/feed/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        groups = {g['user']['id']: g for g in response.data}
        self.assertIn(self.user.id, groups)

    def test_excludes_unfollowed_users(self):
        """StoryFeedView does not include stories from users not followed."""
        stranger = make_user('stranger')
        make_story(stranger)
        response = self.client.get('/api/stories/feed/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        groups = {g['user']['id']: g for g in response.data}
        self.assertNotIn(stranger.id, groups)

    def test_requires_authentication(self):
        """StoryFeedView returns 401 for unauthenticated requests."""
        anon_client = APIClient()
        response = anon_client.get('/api/stories/feed/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_has_unseen_true_when_not_viewed(self):
        """has_unseen is True for a group when the user has not viewed all stories."""
        Follow.objects.create(follower=self.user, following=self.other)
        make_story(self.other)
        response = self.client.get('/api/stories/feed/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        groups = {g['user']['id']: g for g in response.data}
        self.assertTrue(groups[self.other.id]['has_unseen'])

    def test_has_unseen_false_when_all_viewed(self):
        """has_unseen is False for a group when the user has viewed all stories."""
        Follow.objects.create(follower=self.user, following=self.other)
        story = make_story(self.other)
        StoryView.objects.create(story=story, viewer=self.user)
        response = self.client.get('/api/stories/feed/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        groups = {g['user']['id']: g for g in response.data}
        self.assertFalse(groups[self.other.id]['has_unseen'])


class StoryCreateViewTest(TestCase):
    """Tests for POST /api/stories/"""

    def setUp(self):
        self.client = APIClient()
        self.user = make_user('creator')
        self.client.force_authenticate(user=self.user)

    def test_rejects_unsupported_mime_type(self):
        """StoryCreateView returns 400 for unsupported MIME types."""
        payload = {
            'media_url': 'https://example.com/file.gif',
            'media_type': 'image/gif',
        }
        response = self.client.post('/api/stories/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertIn('Unsupported file type', response.data['error'])

    def test_rejects_missing_mime_type(self):
        """StoryCreateView returns 400 when media_type is absent."""
        payload = {'media_url': 'https://example.com/file.mp4'}
        response = self.client.post('/api/stories/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_accepts_valid_image_mime_types(self):
        """StoryCreateView accepts image/jpeg, image/png, image/webp."""
        for mime in ('image/jpeg', 'image/png', 'image/webp'):
            payload = {
                'media_url': 'https://example.com/img.jpg',
                'media_type': mime,
            }
            response = self.client.post('/api/stories/', payload, format='json')
            self.assertEqual(
                response.status_code, status.HTTP_201_CREATED,
                msg=f'Expected 201 for {mime}, got {response.status_code}: {response.data}',
            )

    def test_accepts_valid_video_mime_types(self):
        """StoryCreateView accepts video/mp4 and video/webm."""
        for mime in ('video/mp4', 'video/webm'):
            payload = {
                'media_url': 'https://example.com/vid.mp4',
                'media_type': mime,
            }
            response = self.client.post('/api/stories/', payload, format='json')
            self.assertEqual(
                response.status_code, status.HTTP_201_CREATED,
                msg=f'Expected 201 for {mime}, got {response.status_code}: {response.data}',
            )

    def test_sets_user_from_request(self):
        """StoryCreateView assigns the authenticated user as the story owner."""
        payload = {
            'media_url': 'https://example.com/img.jpg',
            'media_type': 'image/jpeg',
        }
        response = self.client.post('/api/stories/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        story = Story.objects.get(pk=response.data['id'])
        self.assertEqual(story.user, self.user)

    def test_requires_authentication(self):
        """StoryCreateView returns 401 for unauthenticated requests."""
        anon_client = APIClient()
        payload = {
            'media_url': 'https://example.com/img.jpg',
            'media_type': 'image/jpeg',
        }
        response = anon_client.post('/api/stories/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class StoryViewCreateViewTest(TestCase):
    """Tests for POST /api/stories/{id}/view/"""

    def setUp(self):
        self.client = APIClient()
        self.owner = make_user('storyowner')
        self.viewer = make_user('viewer')
        self.story = make_story(self.owner)
        self.client.force_authenticate(user=self.viewer)

    def test_records_view(self):
        """StoryViewCreateView creates a StoryView record."""
        url = f'/api/stories/{self.story.pk}/view/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {'viewed': True})
        self.assertTrue(
            StoryView.objects.filter(story=self.story, viewer=self.viewer).exists()
        )

    def test_idempotent_double_call(self):
        """Calling view endpoint twice does not create duplicate StoryView records."""
        url = f'/api/stories/{self.story.pk}/view/'
        self.client.post(url)
        self.client.post(url)
        count = StoryView.objects.filter(story=self.story, viewer=self.viewer).count()
        self.assertEqual(count, 1)

    def test_requires_authentication(self):
        """StoryViewCreateView returns 401 for unauthenticated requests."""
        anon_client = APIClient()
        url = f'/api/stories/{self.story.pk}/view/'
        response = anon_client.post(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class StoryDeleteViewTest(TestCase):
    """Tests for DELETE /api/stories/{id}/"""

    def setUp(self):
        self.client = APIClient()
        self.owner = make_user('deleteowner')
        self.other = make_user('deleteother')
        self.story = make_story(self.owner)

    def test_owner_can_delete(self):
        """Story author can delete their own story."""
        self.client.force_authenticate(user=self.owner)
        url = f'/api/stories/{self.story.pk}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Story.objects.filter(pk=self.story.pk).exists())

    def test_non_owner_gets_403(self):
        """Non-owner receives 403 when attempting to delete a story."""
        self.client.force_authenticate(user=self.other)
        url = f'/api/stories/{self.story.pk}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        # Story should still exist
        self.assertTrue(Story.objects.filter(pk=self.story.pk).exists())

    def test_requires_authentication(self):
        """StoryDeleteView returns 401 for unauthenticated requests."""
        anon_client = APIClient()
        url = f'/api/stories/{self.story.pk}/'
        response = anon_client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
