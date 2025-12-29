import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useWebRTC } from '@/hooks/useWebRTC';
import { usePresence } from '@/hooks/usePresence';
import UserCard from '@/components/UserCard';
import VideoCallModal from '@/components/VideoCallModal';
import IncomingCallModal from '@/components/IncomingCallModal';
import { NotificationBell } from '@/components/NotificationBell';

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout, isAuthenticated, loading } = useAuth();
  const {
    localVideoRef,
    remoteVideoRef,
    callStatus,
    isCallActive,
    currentCall,
    audioEnabled,
    videoEnabled,
    startCall,
    acceptCall,
    endCall,
    toggleAudio,
    toggleVideo,
  } = useWebRTC();
  const { onlineUsers, incomingCall, rejectCall, clearIncomingCall } = usePresence();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  const handleVideoCall = async (username: string) => {
    try {
      await startCall(username, 'video');
    } catch (error) {
      console.error('Failed to start video call:', error);
      alert('Failed to start video call');
    }
  };

  const handleAudioCall = async (username: string) => {
    try {
      await startCall(username, 'audio');
    } catch (error) {
      console.error('Failed to start audio call:', error);
      alert('Failed to start audio call');
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-secondary">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const callTitle = currentCall
    ? `${currentCall.call_type === 'video' ? '📹' : '🎤'} Call with ${
        currentCall.caller_username === user.username
          ? currentCall.receiver_username
          : currentCall.caller_username
      }`
    : 'Call';

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
                  className="text-blue-600 border-b-2 border-blue-600 px-3 py-2 font-medium"
                >
                  Calls
                </button>
                <button
                  onClick={() => router.push('/groups')}
                  className="text-gray-600 hover:text-blue-600 px-3 py-2 font-medium"
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
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">👥 Online Users</h2>
          <p className="text-gray-600">Click on a user to start a call</p>
        </div>

        {/* Online Users Grid */}
        {onlineUsers.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-lg">
            <div className="text-6xl mb-4">👥</div>
            <p className="text-xl text-gray-600 mb-2">No users online right now</p>
            <p className="text-gray-500">
              Open this page in another browser or device to test
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {onlineUsers.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                onVideoCall={handleVideoCall}
                onAudioCall={handleAudioCall}
              />
            ))}
          </div>
        )}
      </main>

      {/* Video Call Modal */}
      <VideoCallModal
        isActive={isCallActive}
        callTitle={callTitle}
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
