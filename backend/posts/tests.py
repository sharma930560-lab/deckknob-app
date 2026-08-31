"""
Tests for the Bookmark feature — Task 11 of the DECKKNOB platform upgrade.

Includes:
  - Property 3: Bookmark toggle idempotence (subtask 11.1)
  - Property 7: Saved collection privacy (subtask 11.2)
"""

import pytest
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from hypothesis import given, settings as h_settings, HealthCheck
from hypothesis import strategies as st
from hypothesis.extra.django import TestCase as HypothesisTestCase

from posts.models import Post, Bookmark
from users.models import CustomUser


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_user(username, password="testpass123"):
    return CustomUser.objects.create_user(username=username, password=password)


def make_post(user):
    return Post.objects.create(
        user=user,
        media_url="https://example.com/img.jpg",
        media_type="image",
        caption="test post",
    )


# ---------------------------------------------------------------------------
# Property 3: Bookmark toggle idempotence
# Feature: deckknob-platform-upgrade, Property 3: Bookmark toggle idempotence
# Validates: Requirements 6.1, 6.2
# ---------------------------------------------------------------------------

class BookmarkToggleIdempotenceTest(HypothesisTestCase):
    """
    **Property 3: Bookmark toggle idempotence**

    For any user and any post, toggling the bookmark state twice
    (bookmark then un-bookmark) SHALL leave the user's Saved collection
    in the same state as before either toggle was applied.

    **Validates: Requirements 6.1, 6.2**
    """

    @given(
        username_suffix=st.integers(min_value=1, max_value=10_000),
    )
    @h_settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_double_toggle_restores_original_state(self, username_suffix):
        """
        Toggle bookmark twice via the API; assert the final bookmark count
        equals the initial count (idempotent round-trip).
        """
        # Feature: deckknob-platform-upgrade, Property 3: Bookmark toggle idempotence
        user = make_user(f"user_p3_{username_suffix}")
        post_owner = make_user(f"owner_p3_{username_suffix}")
        post = make_post(post_owner)

        client = APIClient()
        client.force_authenticate(user=user)

        url = reverse("post_bookmark", kwargs={"pk": post.pk})

        # Record initial state
        initial_count = Bookmark.objects.filter(user=user, post=post).count()

        # First toggle — creates bookmark
        resp1 = client.post(url)
        assert resp1.status_code == 200
        assert resp1.data["bookmarked"] is True

        # Second toggle — removes bookmark
        resp2 = client.post(url)
        assert resp2.status_code == 200
        assert resp2.data["bookmarked"] is False

        # Final count must equal initial count
        final_count = Bookmark.objects.filter(user=user, post=post).count()
        assert final_count == initial_count, (
            f"Expected bookmark count {initial_count} after double-toggle, "
            f"got {final_count}"
        )


# ---------------------------------------------------------------------------
# Property 7: Saved collection privacy
# Feature: deckknob-platform-upgrade, Property 7: Saved collection privacy
# Validates: Requirements 6.4
# ---------------------------------------------------------------------------

class SavedCollectionPrivacyTest(HypothesisTestCase):
    """
    **Property 7: Saved collection privacy**

    For any pair of distinct authenticated users A and B, the
    `/api/bookmarks/` endpoint SHALL return 403 when user A attempts
    to access user B's bookmarks (i.e., the endpoint only returns the
    requesting user's own bookmarks and never exposes another user's
    saved items).

    Since `/api/bookmarks/` always returns the *requesting* user's own
    bookmarks (enforced by `IsAuthenticated` + filtering on
    `request.user`), we verify that:
      1. User A's bookmarks are NOT visible when user B is authenticated.
      2. Unauthenticated requests receive 403.

    **Validates: Requirements 6.4**
    """

    @given(
        suffix_a=st.integers(min_value=1, max_value=10_000),
        suffix_b=st.integers(min_value=10_001, max_value=20_000),
    )
    @h_settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_unauthenticated_request_returns_403(self, suffix_a, suffix_b):
        """
        Unauthenticated requests to /api/bookmarks/ must return 403.

        Feature: deckknob-platform-upgrade, Property 7: Saved collection privacy
        """
        client = APIClient()  # no authentication
        url = reverse("bookmark_list")
        response = client.get(url)
        assert response.status_code in (401, 403), (
            f"Expected 401 or 403 for unauthenticated request, got {response.status_code}"
        )

    @given(
        suffix_a=st.integers(min_value=1, max_value=10_000),
        suffix_b=st.integers(min_value=10_001, max_value=20_000),
    )
    @h_settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_user_b_cannot_see_user_a_bookmarks(self, suffix_a, suffix_b):
        """
        User B's bookmark list must not contain posts bookmarked only by user A.

        Feature: deckknob-platform-upgrade, Property 7: Saved collection privacy
        """
        user_a = make_user(f"user_a_{suffix_a}")
        user_b = make_user(f"user_b_{suffix_b}")
        post_owner = make_user(f"owner_{suffix_a}_{suffix_b}")
        post = make_post(post_owner)

        # User A bookmarks the post
        Bookmark.objects.create(user=user_a, post=post)

        # User B authenticates and fetches their own bookmark list
        client = APIClient()
        client.force_authenticate(user=user_b)
        url = reverse("bookmark_list")
        response = client.get(url)

        assert response.status_code == 200, (
            f"Expected 200 for authenticated user B, got {response.status_code}"
        )

        # User B's list must not contain the post bookmarked by user A
        result_ids = [item["id"] for item in response.data]
        assert post.pk not in result_ids, (
            f"Post {post.pk} bookmarked by user A should not appear in user B's bookmark list"
        )
