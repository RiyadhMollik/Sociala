from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, UserRegistrationView, UserLoginView

router = DefaultRouter()
router.register(r'', UserViewSet, basename='user')

urlpatterns = [
    path('register/', UserRegistrationView.as_view(), name='user-register'),
    path('login/', UserLoginView.as_view(), name='user-login'),
    path('online/', UserViewSet.as_view({'get': 'online_users'}), name='online-users'),
    path('set-online/', UserViewSet.as_view({'post': 'set_online'}), name='set-online'),
    path('set-offline/', UserViewSet.as_view({'post': 'set_offline'}), name='set-offline'),
    path('<int:pk>/follow/', UserViewSet.as_view({'post': 'follow'}), name='user-follow'),
    path('<int:pk>/unfollow/', UserViewSet.as_view({'post': 'unfollow'}), name='user-unfollow'),
    path('<int:pk>/followers/', UserViewSet.as_view({'get': 'followers'}), name='user-followers'),
    path('<int:pk>/following/', UserViewSet.as_view({'get': 'following'}), name='user-following'),
    path('', include(router.urls)),
]
