"""
WebRTC configuration for the calling system
Contains ICE server configuration for STUN/TURN
"""
from django.conf import settings


def get_webrtc_config():
    """
    Returns WebRTC configuration for frontend
    """
    ice_servers = [
        {
            'urls': settings.WEBRTC_CONFIG.get('STUN_SERVER', 'stun:stun.l.google.com:19302')
        }
    ]
    
    # Add TURN server if configured
    turn_server = settings.WEBRTC_CONFIG.get('TURN_SERVER')
    if turn_server:
        ice_servers.append({
            'urls': turn_server,
            'username': settings.WEBRTC_CONFIG.get('TURN_USERNAME', ''),
            'credential': settings.WEBRTC_CONFIG.get('TURN_PASSWORD', '')
        })
    
    return {
        'iceServers': ice_servers,
        'iceCandidatePoolSize': 10
    }
