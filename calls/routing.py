from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # WebRTC Call routing
    re_path(r'ws/call/(?P<room_name>[\w-]+)/$', consumers.CallConsumer.as_asgi()),
    re_path(r'ws/presence/$', consumers.UserPresenceConsumer.as_asgi()),
    
    # Direct messaging
    re_path(r'ws/messages/(?P<recipient_id>\d+)/$', consumers.DirectMessageConsumer.as_asgi()),
    re_path(r'ws/chat/(?P<recipient_id>\d+)/$', consumers.DirectMessageConsumer.as_asgi()),  # Alias for /messages/
    
    # Group messaging
    re_path(r'ws/group/(?P<group_id>\d+)/$', consumers.GroupMessageConsumer.as_asgi()),
    
    # User online status
    re_path(r'ws/status/$', consumers.UserStatusConsumer.as_asgi()),
    
    # Notifications
    re_path(r'ws/notifications/$', consumers.NotificationConsumer.as_asgi()),
]
