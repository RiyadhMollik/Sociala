from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom User model for jvai community with social networking features
    """
    email = models.EmailField(unique=True)
    is_online = models.BooleanField(default=False)
    last_seen = models.DateTimeField(auto_now=True)
    profile_picture = models.ImageField(upload_to='profiles/', null=True, blank=True)
    bio = models.TextField(max_length=500, blank=True, null=True)
    
    # Social connections
    followers = models.ManyToManyField(
        'self',
        symmetrical=False,
        related_name='following',
        blank=True
    )
    
    # WebSocket tracking
    channel_name = models.CharField(max_length=255, blank=True, null=True)
    
    class Meta:
        db_table = 'users'
        ordering = ['-date_joined']
        indexes = [
            models.Index(fields=['is_online']),
            models.Index(fields=['username']),
        ]
    
    def __str__(self):
        return self.username
    
    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.username
    
    def follow(self, user):
        """Add a user to followers"""
        if user != self and user not in self.followers.all():
            self.followers.add(user)
    
    def unfollow(self, user):
        """Remove a user from followers"""
        if user in self.followers.all():
            self.followers.remove(user)
    
    def is_following(self, user):
        """Check if following a user"""
        return self.followers.filter(id=user.id).exists()
