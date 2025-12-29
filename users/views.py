from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import get_user_model

from .serializers import (
    UserSerializer,
    UserRegistrationSerializer,
    UserUpdateSerializer,
    OnlineStatusSerializer,
    UserLoginSerializer
)

User = get_user_model()


class UserRegistrationView(generics.CreateAPIView):
    """
    Public endpoint for user registration
    """

    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        user_data = UserSerializer(user).data
        return Response({
            'user': user_data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_201_CREATED)


class UserLoginView(generics.GenericAPIView):
    """
    Public endpoint for user login
    """
    serializer_class = UserLoginSerializer
    permission_classes = [AllowAny]
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for User model
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserRegistrationSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer
    
    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return super().get_permissions()
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        Get current user profile
        """
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def online_users(self, request):
        """
        Get list of online users
        """
        online_users = User.objects.filter(is_online=True).exclude(id=request.user.id)
        serializer = OnlineStatusSerializer(online_users, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        """
        Get user online status
        """
        user = self.get_object()
        serializer = OnlineStatusSerializer(user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def set_online(self, request):
        """
        Set user as online
        """
        request.user.is_online = True
        request.user.save()
        return Response({'status': 'online'})
    
    @action(detail=False, methods=['post'])
    def set_offline(self, request):
        """
        Set user as offline
        """
        request.user.is_online = False
        request.user.save()
        return Response({'status': 'offline'})
    
    @action(detail=True, methods=['post'])
    def follow(self, request, pk=None):
        """
        Follow a user
        """
        user_to_follow = self.get_object()
        
        if user_to_follow == request.user:
            return Response(
                {'error': 'You cannot follow yourself'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        request.user.follow(user_to_follow)
        return Response(
            {'message': f'Now following {user_to_follow.username}'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def unfollow(self, request, pk=None):
        """
        Unfollow a user
        """
        user_to_unfollow = self.get_object()
        
        if user_to_unfollow == request.user:
            return Response(
                {'error': 'You cannot unfollow yourself'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        request.user.unfollow(user_to_unfollow)
        return Response(
            {'message': f'Unfollowed {user_to_unfollow.username}'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['get'])
    def followers(self, request, pk=None):
        """
        Get followers of a user
        """
        user = self.get_object()
        followers = user.followers.all()
        serializer = UserSerializer(followers, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def following(self, request, pk=None):
        """
        Get users that a user is following
        """
        user = self.get_object()
        following = user.following.all()
        serializer = UserSerializer(following, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def friends(self, request):
        """
        Get list of friends (users with accepted friend requests)
        """
        from calls.models import FriendRequest
        from django.db.models import Q
        
        user = request.user
        
        # Get accepted friend requests
        friend_requests = FriendRequest.objects.filter(
            Q(sender=user, status='accepted') |
            Q(receiver=user, status='accepted')
        )
        
        # Extract friend IDs
        friend_ids = set()
        for fr in friend_requests:
            if fr.sender == user:
                friend_ids.add(fr.receiver.id)
            else:
                friend_ids.add(fr.sender.id)
        
        # Get friend users
        friends = User.objects.filter(id__in=friend_ids)
        serializer = UserSerializer(friends, many=True)
        return Response(serializer.data)
