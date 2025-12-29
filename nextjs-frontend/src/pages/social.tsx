import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { usePresence } from '@/hooks/usePresence';
import { useFriendRequests } from '@/hooks/useFriendRequests';
import { useStories } from '@/hooks/useStories';
import api from '@/lib/api';
import CreatePost from '@/components/CreatePost';
import PostCard from '@/components/PostCard';
import IncomingCallModal from '@/components/IncomingCallModal';
import VideoCallModal from '@/components/VideoCallModal';
import AddStoryModal from '@/components/AddStoryModal';
import StoryViewer from '@/components/StoryViewer';
import { useWebRTC } from '@/hooks/useWebRTC';
import { NotificationBell } from '@/components/NotificationBell';

interface Post {
  id: number;
  author: {
    id: number;
    username: string;
  };
  content: string;
  image?: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
}

export default function SocialPage() {
  const router = useRouter();
  const { user, logout, isAuthenticated, loading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [activeTab, setActiveTab] = useState<'feed' | 'all'>('all');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showAddStory, setShowAddStory] = useState(false);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [selectedStoryGroup, setSelectedStoryGroup] = useState<any>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  
  const { incomingCall, rejectCall, clearIncomingCall, onlineUsers } = usePresence();
  const {
    receivedRequests,
    friends,
    sentRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    sendFriendRequest,
  } = useFriendRequests();
  
  const {
    friendsStories,
    myStories,
    createStory,
    viewStory,
  } = useStories();
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
      loadPosts();
      loadAllUsers();
    }
  }, [isAuthenticated, activeTab]);

  // Reload users when friend data changes
  useEffect(() => {
    if (isAuthenticated && (friends.length > 0 || sentRequests.length > 0 || receivedRequests.length > 0)) {
      loadAllUsers();
    }
  }, [friends, sentRequests, receivedRequests]);

  const loadPosts = async () => {
    setLoadingPosts(true);
    try {
      const endpoint = activeTab === 'feed' ? '/posts/feed/' : '/posts/';
      const response = await api.get(endpoint);
      setPosts(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      const response = await api.get('/users/');
      // Handle paginated response
      const users = response.data.results || response.data;
      
      // Filter out current user, friends, and users with pending requests
      const friendIds = new Set(friends.map(f => f.id));
      const sentRequestIds = new Set(sentRequests.map(r => r.receiver.id));
      const receivedRequestIds = new Set(receivedRequests.map(r => r.sender.id));
      
      const filteredUsers = users.filter((u: any) => 
        u.id !== user?.id && 
        !friendIds.has(u.id) && 
        !sentRequestIds.has(u.id) && 
        !receivedRequestIds.has(u.id)
      );
      setAllUsers(filteredUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleSendRequest = async (userId: number) => {
    const success = await sendFriendRequest(userId);
    if (success) {
      // Remove user from the list
      setAllUsers(allUsers.filter(u => u.id !== userId));
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

  const callTitle = currentCall
    ? `${currentCall.call_type === 'video' ? '📹' : '🎤'} Call with ${
        currentCall.caller_username === user.username
          ? currentCall.receiver_username
          : currentCall.caller_username
      }`
    : 'Call';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <header className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-lg p-2 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-green-500 to-blue-600 bg-clip-text text-transparent">
                Sociala.
              </h1>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-xl mx-8">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Start typing to search.."
                  className="w-full bg-gray-100 rounded-full py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Right Icons */}
            <div className="flex items-center space-x-4">
              <button className="p-2 hover:bg-blue-50 rounded-lg text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </button>
              <button className="p-2 hover:bg-blue-50 rounded-lg text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>
              <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-blue-50 rounded-lg text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <button className="p-2 hover:bg-blue-50 rounded-lg text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
              <button className="p-2 hover:bg-blue-50 rounded-lg text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </button>
              <NotificationBell />
              <button onClick={() => router.push('/messages')} className="p-2 hover:bg-blue-50 rounded-lg text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
              <button className="p-2 hover:bg-blue-50 rounded-lg text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold cursor-pointer">
                {user.username.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar */}
          <aside className="col-span-3">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden sticky top-20">
              {/* New Feeds */}
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-gray-500 text-xs font-semibold uppercase mb-3">New Feeds</h3>
                <nav className="space-y-1">
                  <button onClick={() => setActiveTab('feed')} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition ${activeTab === 'feed' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeTab === 'feed' ? 'bg-blue-600' : 'bg-blue-100'}`}>
                      <svg className={`w-5 h-5 ${activeTab === 'feed' ? 'text-white' : 'text-blue-600'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                      </svg>
                    </div>
                    <span className="font-medium text-sm">Newsfeed</span>
                  </button>
                  
                  <button className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 transition">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="font-medium text-sm">Badges</span>
                  </button>

                  <button className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 transition">
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                      </svg>
                    </div>
                    <span className="font-medium text-sm">Explore Stories</span>
                  </button>

                  <button onClick={() => router.push('/groups')} className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 transition">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                      </svg>
                    </div>
                    <span className="font-medium text-sm">Popular Groups</span>
                  </button>

                  <button onClick={() => router.push('/pages')} className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 transition">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="font-medium text-sm">Business Pages</span>
                  </button>

                  <button className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 transition">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="font-medium text-sm">Author Profile</span>
                  </button>
                </nav>
              </div>

              {/* More Pages */}
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-gray-500 text-xs font-semibold uppercase mb-3">More Pages</h3>
                <nav className="space-y-1">
                  <button onClick={() => router.push('/messages')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 transition">
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                      <span className="font-medium text-sm">Email Box</span>
                    </div>
                    <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded">584</span>
                  </button>

                  <button className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 transition">
                    <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium text-sm">Near Hotel</span>
                  </button>

                  <button className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 transition">
                    <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium text-sm">Latest Event</span>
                  </button>

                  <button onClick={() => router.push('/dashboard')} className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 transition">
                    <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                    </svg>
                    <span className="font-medium text-sm">Live Stream</span>
                  </button>
                </nav>
              </div>

              {/* Account */}
              <div className="p-4">
                <h3 className="text-gray-500 text-xs font-semibold uppercase mb-3">Account</h3>
                <nav className="space-y-1">
                  <button className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 transition">
                    <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium text-sm">Settings</span>
                  </button>

                  <button className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 transition">
                    <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                    <span className="font-medium text-sm">Analytics</span>
                  </button>

                  <button onClick={() => router.push('/messages')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 transition">
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium text-sm">Chat</span>
                    </div>
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">23</span>
                  </button>

                  <button onClick={logout} className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium text-sm">Logout</span>
                  </button>
                </nav>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="col-span-6">
            {/* Stories */}
            <div className="mb-6">
              <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
                {/* Add Story Card */}
                <div className="flex-shrink-0">
                  <div 
                    className="w-32 h-48 bg-gradient-to-br from-gray-700 to-gray-900 rounded-2xl relative overflow-hidden cursor-pointer group"
                    onClick={() => setShowAddStory(true)}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <button className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                        <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                    <div className="absolute bottom-3 left-0 right-0 text-center">
                      <p className="text-white text-sm font-medium">Add Story</p>
                    </div>
                  </div>
                </div>

                {/* My Stories */}
                {myStories.length > 0 && (
                  <div className="flex-shrink-0">
                    <div 
                      className="w-32 h-48 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl relative overflow-hidden cursor-pointer group hover:shadow-lg transition"
                      onClick={() => {
                        setSelectedStoryGroup({ user: user, stories: myStories, has_unseen: false });
                        setCurrentStoryIndex(0);
                        setShowStoryViewer(true);
                      }}
                    >
                      {myStories[0]?.image && (
                        <img 
                          src={myStories[0].image} 
                          alt="My Story"
                          className="w-full h-full object-cover"
                        />
                      )}
                      {myStories[0]?.text_content && !myStories[0]?.image && (
                        <div 
                          className="w-full h-full flex items-center justify-center p-3"
                          style={{ backgroundColor: myStories[0].background_color }}
                        >
                          <p className="text-white text-sm font-bold text-center line-clamp-4">
                            {myStories[0].text_content}
                          </p>
                        </div>
                      )}
                      <div className="absolute top-3 left-3 w-10 h-10 bg-white rounded-full p-0.5">
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                          {user?.username.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3">
                        <p className="text-white text-sm font-medium truncate">Your Story</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Friends Stories */}
                {friendsStories.map((storyGroup, idx) => (
                  <div key={idx} className="flex-shrink-0">
                    <div 
                      className={`w-32 h-48 rounded-2xl relative overflow-hidden cursor-pointer group hover:shadow-lg transition ${
                        storyGroup.has_unseen ? 'ring-4 ring-blue-500' : ''
                      }`}
                      onClick={() => {
                        setSelectedStoryGroup(storyGroup);
                        setCurrentStoryIndex(0);
                        setShowStoryViewer(true);
                      }}
                    >
                      {storyGroup.stories[0]?.image && (
                        <img 
                          src={storyGroup.stories[0].image} 
                          alt={`${storyGroup.user.username}'s story`}
                          className="w-full h-full object-cover"
                        />
                      )}
                      {storyGroup.stories[0]?.text_content && !storyGroup.stories[0]?.image && (
                        <div 
                          className="w-full h-full flex items-center justify-center p-3"
                          style={{ backgroundColor: storyGroup.stories[0].background_color }}
                        >
                          <p className="text-white text-sm font-bold text-center line-clamp-4">
                            {storyGroup.stories[0].text_content}
                          </p>
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <div className={`w-10 h-10 rounded-full p-0.5 ${
                          storyGroup.has_unseen ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-gray-300'
                        }`}>
                          {storyGroup.user.profile_pic ? (
                            <img 
                              src={`http://localhost:8000${storyGroup.user.profile_pic}`} 
                              alt={storyGroup.user.username}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                              {storyGroup.user.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3">
                        <p className="text-white text-sm font-medium truncate drop-shadow-lg">
                          {storyGroup.user.username}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Create Post */}
            <CreatePost onPostCreated={loadPosts} />

            {/* Posts Feed */}
            {loadingPosts ? (
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg">Loading posts...</div>
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No posts yet</h3>
                <p className="text-gray-600">Be the first to create a post!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUsername={user.username}
                    onPostUpdated={loadPosts}
                  />
                ))}
              </div>
            )}
          </main>

          {/* Right Sidebar */}
          <aside className="col-span-3">
            <div className="space-y-6 sticky top-20">
              {/* Friend Requests */}
              {receivedRequests.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900">Friend Request</h3>
                    <span className="text-blue-600 text-sm font-medium">{receivedRequests.length} new</span>
                  </div>
                  <div className="space-y-4">
                    {receivedRequests.slice(0, 3).map((request) => (
                      <div key={request.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {request.sender.profile_pic ? (
                            <img 
                              src={`http://localhost:8000${request.sender.profile_pic}`} 
                              alt={request.sender.username}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {request.sender.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{request.sender.username}</p>
                            <p className="text-xs text-gray-500">{request.mutual_friends_count} mutual friends</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => acceptFriendRequest(request.id)}
                            className="px-4 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"
                          >
                            Confirm
                          </button>
                          <button 
                            onClick={() => rejectFriendRequest(request.id)}
                            className="px-4 py-1.5 bg-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-300"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* People You May Know */}
              {allUsers.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900">People You May Know</h3>
                  </div>
                  <div className="space-y-3">
                    {allUsers.slice(0, 5).map((person) => (
                      <div key={person.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {person.profile_pic ? (
                            <img 
                              src={`http://localhost:8000${person.profile_pic}`} 
                              alt={person.username}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-red-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {person.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{person.username}</p>
                            <p className="text-xs text-gray-500">{person.bio || 'No bio'}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleSendRequest(person.id)}
                          className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-700"
                        >
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contacts - Online Friends */}
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <h3 className="font-bold text-gray-900 mb-2 uppercase text-xs text-gray-500">CONTACTS</h3>
                <div className="space-y-2">
                  {friends.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No friends yet</p>
                  ) : (
                    friends.map((friend) => (
                      <div key={friend.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            {friend.profile_pic ? (
                              <img 
                                src={`http://localhost:8000${friend.profile_pic}`} 
                                alt={friend.username}
                                className="w-9 h-9 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                {friend.username.charAt(0).toUpperCase()}
                              </div>
                            )}
                            {friend.is_online && (
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                            )}
                          </div>
                          <span className="font-medium text-gray-900 text-sm">{friend.username}</span>
                        </div>
                        {friend.is_online && (
                          <span className="text-xs text-green-600 font-medium">Online</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Groups */}
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <h3 className="font-bold text-gray-900 mb-2 uppercase text-xs text-gray-500">GROUPS</h3>
                <div className="space-y-2">
                  {[
                    { name: 'Studio Express', members: '2 min', color: 'from-blue-500 to-blue-600' },
                    { name: 'Armany Design', members: '', color: 'from-orange-500 to-orange-600' },
                    { name: 'De fabous', members: '', color: 'from-red-500 to-pink-600' },
                  ].map((group, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-center space-x-3">
                        <div className={`w-9 h-9 bg-gradient-to-br ${group.color} rounded-full flex items-center justify-center text-white font-semibold text-xs`}>
                          {group.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900 text-sm">{group.name}</span>
                      </div>
                      {group.members && (
                        <span className="text-xs text-gray-500">{group.members}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pages */}
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <h3 className="font-bold text-gray-900 mb-2 uppercase text-xs text-gray-500">PAGES</h3>
                <div className="space-y-2">
                  {[
                    { name: 'Armany Seary', color: 'from-blue-500 to-blue-600' },
                    { name: 'Entropio Inc', color: 'from-yellow-500 to-orange-600' },
                  ].map((page, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-center space-x-3">
                        <div className={`w-9 h-9 bg-gradient-to-br ${page.color} rounded-full flex items-center justify-center text-white font-semibold text-xs`}>
                          {page.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900 text-sm">{page.name}</span>
                      </div>
                      <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

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

      {/* Add Story Modal */}
      <AddStoryModal
        isOpen={showAddStory}
        onClose={() => setShowAddStory(false)}
        onSubmit={createStory}
      />

      {/* Story Viewer */}
      {showStoryViewer && selectedStoryGroup && (
        <StoryViewer
          stories={selectedStoryGroup.stories}
          currentIndex={currentStoryIndex}
          onClose={() => {
            setShowStoryViewer(false);
            setSelectedStoryGroup(null);
            setCurrentStoryIndex(0);
          }}
          onNext={() => {
            if (currentStoryIndex < selectedStoryGroup.stories.length - 1) {
              setCurrentStoryIndex(currentStoryIndex + 1);
            } else {
              setShowStoryViewer(false);
              setSelectedStoryGroup(null);
              setCurrentStoryIndex(0);
            }
          }}
          onPrevious={() => {
            if (currentStoryIndex > 0) {
              setCurrentStoryIndex(currentStoryIndex - 1);
            }
          }}
          onView={viewStory}
        />
      )}
    </div>
  );
}
