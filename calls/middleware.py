from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from urllib.parse import parse_qs

User = get_user_model()


class JWTAuthMiddleware:
    """
    JWT authentication middleware for Django Channels WebSocket
    Checks for token in query parameters or cookies
    """
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        # Get token from query string or cookies
        token = None
        query_string = scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        
        print(f"🔐 JWTAuthMiddleware: query_string={query_string}")
        
        # Try to get token from query parameters
        if 'token' in query_params:
            token = query_params['token'][0]
            print(f"✅ Token found in query params")
        
        # Try to get token from cookies
        if not token and 'headers' in scope:
            for header_name, header_value in scope.get('headers', []):
                if header_name == b'cookie':
                    cookies = header_value.decode().split('; ')
                    for cookie in cookies:
                        # Check for both 'token' and 'access_token' cookie names
                        if cookie.startswith('token='):
                            token = cookie.split('=')[1]
                            print(f"✅ Token found in cookies (token)")
                            break
                        elif cookie.startswith('access_token='):
                            token = cookie.split('=')[1]
                            print(f"✅ Token found in cookies (access_token)")
                            break
        
        # Try to get from Authorization header (for testing)
        if not token and 'headers' in scope:
            for header_name, header_value in scope.get('headers', []):
                if header_name == b'authorization':
                    auth_header = header_value.decode()
                    if auth_header.startswith('Bearer '):
                        token = auth_header[7:]
                        print(f"✅ Token found in Authorization header")
                    break
        
        # Authenticate user with token
        if token:
            print(f"🔍 Authenticating with token: {token[:20]}...")
            scope['user'] = await self.get_user_from_token(token)
            print(f"👤 User authenticated: {scope['user']}")
        else:
            print(f"❌ No token found, user is anonymous")
            scope['user'] = AnonymousUser()
        
        return await self.app(scope, receive, send)
    
    @database_sync_to_async
    def get_user_from_token(self, token):
        """Get user from JWT token"""
        try:
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            user = User.objects.get(id=user_id)
            return user
        except Exception as e:
            print(f"JWT Auth Error: {e}")
            return AnonymousUser()
