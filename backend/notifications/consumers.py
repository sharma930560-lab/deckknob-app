"""
NotificationConsumer — Django Channels WebSocket consumer for real-time notifications.

Connection flow:
  1. Client connects to ws/notifications/?token=<JWT>
  2. Consumer validates the JWT token
  3. On success: adds the user to group notifications_{user_id} and accepts the connection
  4. On failure: closes the connection with code 4001

Push flow:
  - Server-side code calls channel_layer.group_send(notifications_{user_id}, {...})
  - notification_message() handler forwards the payload to the WebSocket client as JSON

Requirements: 8.1, 8.7, 15.6
"""

import json

from channels.generic.websocket import AsyncWebsocketConsumer
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


def _get_user_id_from_token(token_str: str):
    """
    Validate a JWT access token string and return the user_id (int) on success,
    or raise TokenError / InvalidToken on failure.
    """
    token = AccessToken(token_str)
    return token['user_id']


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for per-user real-time notifications.
    Each authenticated user is placed in the group notifications_{user_id}.
    """

    async def connect(self):
        # Extract JWT from query string: ?token=<JWT>
        query_string = self.scope.get('query_string', b'').decode('utf-8')
        token_str = None
        for part in query_string.split('&'):
            if part.startswith('token='):
                token_str = part[len('token='):]
                break

        if not token_str:
            # No token provided — reject
            await self.close(code=4001)
            return

        try:
            user_id = _get_user_id_from_token(token_str)
        except (InvalidToken, TokenError):
            # Invalid or expired JWT — reject
            await self.close(code=4001)
            return

        self.user_id = user_id
        self.group_name = f'notifications_{user_id}'

        # Join the user's personal notification group
        await self.channel_layer.group_add(self.group_name, self.channel_name)

        await self.accept()

    async def disconnect(self, close_code):
        # Leave the notification group on disconnect
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        # Clients do not send messages to this consumer — ignore any incoming data
        pass

    async def notification_message(self, event):
        """
        Handler for messages sent to the group via channel_layer.group_send().
        Forwards the notification payload to the WebSocket client as JSON.

        Expected event format:
          {
            "type": "notification.message",
            "notification": { ... serialized notification data ... }
          }
        """
        notification = event.get('notification', {})
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'notification': notification,
        }))
