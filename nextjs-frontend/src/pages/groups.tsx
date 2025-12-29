import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { usePresence } from '@/hooks/usePresence';
import api from '@/lib/api';
import IncomingCallModal from '@/components/IncomingCallModal';
import VideoCallModal from '@/components/VideoCallModal';
import { useWebRTC } from '@/hooks/useWebRTC';
import { NotificationBell } from '@/components/NotificationBell';

interface Group {
  id: number;
  name: string;
  description: string;
  image?: string;
  cover_photo?: string;
  privacy: 'public' | 'private' | 'secret';
  created_by: {
    id: number;
    username: string;
  } | string;
  members_count: number;
  is_member: boolean;
  user_role?: string;
  can_view: boolean;
  created_at: string;
}

export default function GroupsPage() {
  const router = useRouter();
  const { user, logout, isAuthenticated, loading } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupPrivacy, setGroupPrivacy] = useState<'public' | 'private' | 'secret'>('public');
  const [groupImage, setGroupImage] = useState<File | null>(null);
  const [groupCoverPhoto, setGroupCoverPhoto] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  // Helper function to get username from created_by
  const getCreatorUsername = (createdBy: any): string => {
    if (typeof createdBy === 'string') return createdBy;
    return createdBy?.username || 'Unknown';
  };

  const { incomingCall, rejectCall, clearIncomingCall } = usePresence();
  const {
    localVideoRef,
    remoteVideoRef,
    callStatus,
    isCallActive,
    currentCall,
    audioEnabled,
    videoEnabled,
    acceptCall,
    endCall,
    toggleAudio,
    toggleVideo,
  } = useWebRTC();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadGroups();
    }
  }, [isAuthenticated]);

  const loadGroups = async () => {
    setLoadingGroups(true);
    try {
      const response = await api.get('/groups/');
      setGroups(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    setCreating(true);
    try {
      const formData = new FormData();
      formData.append('name', groupName);
      formData.append('description', groupDescription);
      formData.append('privacy', groupPrivacy);
      if (groupImage) {
        formData.append('image', groupImage);
      }
      if (groupCoverPhoto) {
        formData.append('cover_photo', groupCoverPhoto);
      }

      await api.post('/groups/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setGroupName('');
      setGroupDescription('');
      setGroupPrivacy('public');
      setGroupImage(null);
      setGroupCoverPhoto(null);
      setShowCreateModal(false);
      loadGroups();
    } catch (error) {
      console.error('Failed to create group:', error);
      alert('Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinGroup = async (groupId: number) => {
    try {
      const response = await api.post(`/groups/${groupId}/join/`);
      alert(response.data.message || 'Join request sent');
      loadGroups();
    } catch (error) {
      console.error('Failed to join group:', error);
      alert('Failed to join group');
    }
  };

  const handleLeaveGroup = async (groupId: number) => {
    try {
      await api.post(`/groups/${groupId}/leave/`);
      loadGroups();
    } catch (error) {
      console.error('Failed to leave group:', error);
      alert('Failed to leave group');
    }
  };

  const handleAcceptCall = async () => {
    if (incomingCall) {
      try {
        await acceptCall(incomingCall);
        clearIncomingCall();
      } catch (error) {
        console.error('Failed to accept call:', error);
        alert('Failed to accept call');
      }
    }
  };

  const handleRejectCall = async () => {
    if (incomingCall) {
      await rejectCall(incomingCall.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-600 text-2xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-blue-600">JVAI Community</h1>
              
              <nav className="hidden md:flex space-x-4">
                <button
                  onClick={() => router.push('/social')}
                  className="text-gray-600 hover:text-blue-600 px-3 py-2 font-medium"
                >
                  Home
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="text-gray-600 hover:text-blue-600 px-3 py-2 font-medium"
                >
                  Calls
                </button>
                <button
                  onClick={() => router.push('/groups')}
                  className="text-blue-600 border-b-2 border-blue-600 px-3 py-2 font-medium"
                >
                  Groups
                </button>
                <button
                  onClick={() => router.push('/pages')}
                  className="text-gray-600 hover:text-blue-600 px-3 py-2 font-medium"
                >
                  Pages
                </button>
                <button
                  onClick={() => router.push('/messages')}
                  className="text-gray-600 hover:text-blue-600 px-3 py-2 font-medium"
                >
                  Messages
                </button>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <NotificationBell />
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-gray-800 hidden sm:block">{user.username}</span>
              </div>
              <button
                onClick={logout}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Groups</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Group</span>
          </button>
        </div>

        {/* Groups Grid */}
        {loadingGroups ? (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">Loading groups...</div>
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Groups Yet</h3>
            <p className="text-gray-600 mb-6">Create your first group to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <div key={group.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* Cover Photo or Group Image */}
                {group.cover_photo ? (
                  <img src={`http://localhost:8000${group.cover_photo}`} alt={group.name} className="w-full h-48 object-cover" />
                ) : group.image ? (
                  <img src={`http://localhost:8000${group.image}`} alt={group.name} className="w-full h-48 object-cover" />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                    <span className="text-6xl text-white">👥</span>
                  </div>
                )}

                {/* Group Info */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-bold text-gray-800 flex-1">{group.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      group.privacy === 'public' 
                        ? 'bg-green-100 text-green-800' 
                        : group.privacy === 'private' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {group.privacy === 'public' ? '🌐 Public' : group.privacy === 'private' ? '🔒 Private' : '🔐 Secret'}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-4 line-clamp-2">{group.description}</p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>{group.members_count} members</span>
                    <span>by {getCreatorUsername(group.created_by)}</span>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2">
                    {group.is_member ? (
                      <>
                        <button
                          onClick={() => router.push(`/groups/${group.id}`)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition flex items-center justify-center space-x-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => handleLeaveGroup(group.id)}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium transition"
                        >
                          Leave
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleJoinGroup(group.id)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition"
                      >
                        {group.privacy === 'public' ? 'Join Group' : 'Request to Join'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Create New Group</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateGroup}>
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">Group Name</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">Description</label>
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="Describe your group"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">Privacy</label>
                <select
                  value={groupPrivacy}
                  onChange={(e) => setGroupPrivacy(e.target.value as 'public' | 'private' | 'secret')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="public">🌐 Public - Anyone can join</option>
                  <option value="private">🔒 Private - Requires approval</option>
                  <option value="secret">🔐 Secret - Invite only</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">Group Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setGroupImage(e.target.files?.[0] || null)}
                  className="w-full"
                />
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">Cover Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setGroupCoverPhoto(e.target.files?.[0] || null)}
                  className="w-full"
                />
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !groupName.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Video Call Modal */}
      <VideoCallModal
        isActive={isCallActive}
        callTitle={
          currentCall
            ? `${currentCall.call_type === 'video' ? '📹' : '🎤'} Call with ${
                currentCall.caller_username === user.username
                  ? currentCall.receiver_username
                  : currentCall.caller_username
              }`
            : 'Call'
        }
        callStatus={callStatus}
        callType={currentCall?.call_type || 'video'}
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onEndCall={endCall}
      />

      {/* Incoming Call Modal */}
      <IncomingCallModal
        isActive={!!incomingCall && !isCallActive}
        callData={incomingCall}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
      />
    </div>
  );
}
