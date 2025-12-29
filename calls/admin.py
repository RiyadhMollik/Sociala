from django.contrib import admin
from .models import (
    Call, CallSignal, Page, PageFollower, PageRole,
    Group, GroupMember, Post, Like, Comment,
    DirectMessage, GroupMessage, Notification,
    FriendRequest, Story
)


@admin.register(Call)
class CallAdmin(admin.ModelAdmin):
    list_display = ['id', 'caller', 'receiver', 'call_type', 'status', 'duration', 'initiated_at']
    list_filter = ['status', 'call_type', 'initiated_at']
    search_fields = ['caller__username', 'receiver__username', 'room_id']
    readonly_fields = ['room_id', 'initiated_at', 'ringing_at', 'accepted_at', 'ended_at', 'duration']
    
    fieldsets = (
        ('Participants', {
            'fields': ('caller', 'receiver', 'call_type')
        }),
        ('Status', {
            'fields': ('status', 'room_id')
        }),
        ('Timestamps', {
            'fields': ('initiated_at', 'ringing_at', 'accepted_at', 'ended_at', 'duration')
        }),
    )


@admin.register(CallSignal)
class CallSignalAdmin(admin.ModelAdmin):
    list_display = ['id', 'call', 'signal_type', 'sender', 'created_at']
    list_filter = ['signal_type', 'created_at']
    search_fields = ['call__room_id', 'sender__username']
    readonly_fields = ['created_at']


@admin.register(Page)
class PageAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'creator', 'follower_count', 'is_verified', 'created_at']
    list_filter = ['category', 'is_verified', 'is_published']
    search_fields = ['name', 'description', 'creator__username']
    readonly_fields = ['created_at', 'updated_at', 'follower_count']


@admin.register(PageFollower)
class PageFollowerAdmin(admin.ModelAdmin):
    list_display = ['user', 'page', 'notifications_enabled', 'followed_at']
    list_filter = ['notifications_enabled', 'followed_at']
    search_fields = ['user__username', 'page__name']


@admin.register(PageRole)
class PageRoleAdmin(admin.ModelAdmin):
    list_display = ['user', 'page', 'role', 'assigned_at']
    list_filter = ['role', 'assigned_at']
    search_fields = ['user__username', 'page__name']


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ['name', 'creator', 'privacy', 'member_count', 'created_at']
    list_filter = ['privacy', 'created_at']
    search_fields = ['name', 'description', 'creator__username']
    readonly_fields = ['created_at', 'updated_at', 'member_count']


@admin.register(GroupMember)
class GroupMemberAdmin(admin.ModelAdmin):
    list_display = ['user', 'group', 'role', 'status', 'joined_at']
    list_filter = ['role', 'status', 'joined_at']
    search_fields = ['user__username', 'group__name']
