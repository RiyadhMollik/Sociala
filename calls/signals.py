from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Like, Comment, Notification


@receiver(post_save, sender=Like)
def create_like_notification(sender, instance, created, **kwargs):
    """Create notification when someone likes a post or comment"""
    if not created:
        return
    
    # Don't notify if user likes their own content
    if instance.post:
        if instance.user == instance.post.author:
            return
        
        # Create notification for post like
        notification = Notification.objects.create(
            user=instance.post.author,
            actor=instance.user,
            notification_type='like_post',
            post=instance.post
        )
        
        # Send real-time notification via WebSocket
        channel_layer = get_channel_layer()
        if instance.post.author.channel_name:
            async_to_sync(channel_layer.send)(
                instance.post.author.channel_name,
                {
                    'type': 'notification_message',
                    'notification': {
                        'id': notification.id,
                        'type': 'like_post',
                        'actor': instance.user.username,
                        'message': f'{instance.user.username} liked your post',
                        'created_at': notification.created_at.isoformat(),
                        'is_read': False,
                    }
                }
            )
    
    elif instance.comment:
        if instance.user == instance.comment.author:
            return
        
        # Create notification for comment like
        notification = Notification.objects.create(
            user=instance.comment.author,
            actor=instance.user,
            notification_type='like_comment',
            comment=instance.comment,
            post=instance.comment.post
        )
        
        # Send real-time notification via WebSocket
        channel_layer = get_channel_layer()
        if instance.comment.author.channel_name:
            async_to_sync(channel_layer.send)(
                instance.comment.author.channel_name,
                {
                    'type': 'notification_message',
                    'notification': {
                        'id': notification.id,
                        'type': 'like_comment',
                        'actor': instance.user.username,
                        'message': f'{instance.user.username} liked your comment',
                        'created_at': notification.created_at.isoformat(),
                        'is_read': False,
                    }
                }
            )


@receiver(post_save, sender=Comment)
def create_comment_notification(sender, instance, created, **kwargs):
    """Create notification when someone comments on a post"""
    if not created:
        return
    
    # Don't notify if user comments on their own post
    if instance.author == instance.post.author:
        return
    
    # Create notification
    notification = Notification.objects.create(
        user=instance.post.author,
        actor=instance.author,
        notification_type='comment',
        post=instance.post,
        comment=instance
    )
    
    # Send real-time notification via WebSocket
    channel_layer = get_channel_layer()
    if instance.post.author.channel_name:
        async_to_sync(channel_layer.send)(
            instance.post.author.channel_name,
            {
                'type': 'notification_message',
                'notification': {
                    'id': notification.id,
                    'type': 'comment',
                    'actor': instance.author.username,
                    'message': f'{instance.author.username} commented on your post',
                    'created_at': notification.created_at.isoformat(),
                    'is_read': False,
                }
            }
        )
