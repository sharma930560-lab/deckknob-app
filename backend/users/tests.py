from rest_framework.test import APITestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status

User = get_user_model()

class UsernameCheckViewTests(APITestCase):
    def setUp(self):
        self.check_url = reverse('check_username')
        # Create a test user
        self.existing_user = User.objects.create_user(
            username='dj_maya',
            email='maya@test.com',
            password='testpassword123'
        )

    def test_username_available(self):
        """Test that a non-existent username is available."""
        response = self.client.get(f"{self.check_url}?username=dj_unique")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['available'], True)
        self.assertEqual(response.data['suggestions'], [])

    def test_username_taken(self):
        """Test that an existing username is taken and returns suggestions."""
        response = self.client.get(f"{self.check_url}?username=dj_maya")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['available'], False)
        self.assertEqual(len(response.data['suggestions']), 3)
        for suggestion in response.data['suggestions']:
            self.assertNotEqual(suggestion, 'dj_maya')
            self.assertFalse(User.objects.filter(username__iexact=suggestion).exists())

    def test_username_case_insensitive(self):
        """Test case-insensitivity of availability check."""
        response = self.client.get(f"{self.check_url}?username=DJ_MAYA")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['available'], False)
        self.assertEqual(len(response.data['suggestions']), 3)

    def test_username_too_short(self):
        """Test that a username shorter than 3 characters is rejected."""
        response = self.client.get(f"{self.check_url}?username=dj")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['available'], False)
        self.assertIn('error', response.data)

    def test_username_empty(self):
        """Test that an empty username is rejected."""
        response = self.client.get(self.check_url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['available'], False)
        self.assertIn('error', response.data)
