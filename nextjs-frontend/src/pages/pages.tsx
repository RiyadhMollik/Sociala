import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { usePresence } from '@/hooks/usePresence';
import api from '@/lib/api';
import IncomingCallModal from '@/components/IncomingCallModal';
import VideoCallModal from '@/components/VideoCallModal';
import { useWebRTC } from '@/hooks/useWebRTC';
import { NotificationBell } from '@/components/NotificationBell';

interface Page {
  id: number;
  name: string;
  category: string;
  description?: string;
  profile_picture?: string;
  cover_photo?: string;
  website?: string;
  email?: string;
  phone?: string;
  creator_details: {
    id: number;
    username: string;
  };
  follower_count: number;
  is_following: boolean;
  is_verified: boolean;
  created_at: string;
}

export default function PagesPage() {
  const router = useRouter();
  const { user, logout, isAuthenticated, loading } = useAuth();
  const [pages, setPages] = useState<Page[]>([]);
  const [myPages, setMyPages] = useState<Page[]>([]);
  const [followingPages, setFollowingPages] = useState<Page[]>([]);
  const [loadingPages, setLoadingPages] = useState(true);
  const [activeTab, setActiveTab] = useState<'discover' | 'my-pages' | 'following'>('discover');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  // Form states
  const [pageName, setPageName] = useState('');
  const [pageCategory, setPageCategory] = useState('business');
  const [pageDescription, setPageDescription] = useState('');
  const [pageWebsite, setPageWebsite] = useState('');
  const [pageEmail, setPageEmail] = useState('');
  const [pagePhone, setPagePhone] = useState('');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [coverPhoto, setCoverPhoto] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

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

  const categories = [
    { value: 'business', label: 'Business or Brand' },
    { value: 'community', label: 'Community or Public Figure' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'education', label: 'Education' },
    { value: 'nonprofit', label: 'Non-Profit Organization' },
    { value: 'personal', label: 'Personal Blog' },
    { value: 'other', label: 'Other' },
  ];

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadPages();
    }
  }, [isAuthenticated, activeTab, selectedCategory]);

  const loadPages = async () => {
    setLoadingPages(true);
    try {
      if (activeTab === 'discover') {
        const url = selectedCategory ? `/pages/?category=${selectedCategory}` : '/pages/';
        const response = await api.get(url);
        setPages(response.data.results || response.data);
      } else if (activeTab === 'my-pages') {
        const response = await api.get('/pages/my_pages/');
        setMyPages(response.data);
      } else if (activeTab === 'following') {
        const response = await api.get('/pages/following/');
        setFollowingPages(response.data);
      }
    } catch (error) {
      console.error('Failed to load pages:', error);
    } finally {
      setLoadingPages(false);
    }
  };

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const formData = new FormData();
      formData.append('name', pageName);
      formData.append('category', pageCategory);
      if (pageDescription) formData.append('description', pageDescription);
      if (pageWebsite) formData.append('website', pageWebsite);
      if (pageEmail) formData.append('email', pageEmail);
      if (pagePhone) formData.append('phone', pagePhone);
      if (profilePicture) formData.append('profile_picture', profilePicture);
      if (coverPhoto) formData.append('cover_photo', coverPhoto);

      await api.post('/pages/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Reset form
      setPageName('');
      setPageCategory('business');
      setPageDescription('');
      setPageWebsite('');
      setPageEmail('');
      setPagePhone('');
      setProfilePicture(null);
      setCoverPhoto(null);
      setShowCreateModal(false);

      // Reload pages
      loadPages();
    } catch (error: any) {
      console.error('Failed to create page:', error);
      alert(error.response?.data?.name?.[0] || 'Failed to create page');
    } finally {
      setCreating(false);
    }
  };

  const handleFollowPage = async (pageId: number) => {
    try {
      await api.post(`/pages/${pageId}/follow/`);
      loadPages();
    } catch (error) {
      console.error('Failed to follow page:', error);
    }
  };

  const handleUnfollowPage = async (pageId: number) => {
    try {
      await api.post(`/pages/${pageId}/unfollow/`);
      loadPages();
    } catch (error) {
      console.error('Failed to unfollow page:', error);
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

  const callTitle = currentCall
    ? `Call with ${currentCall.caller_username === user?.username ? currentCall.receiver_username : currentCall.caller_username}`
    : '';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const currentPages = activeTab === 'discover' ? pages : activeTab === 'my-pages' ? myPages : followingPages;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-blue-600 cursor-pointer" onClick={() => router.push('/social')}>
                JVAI Community
              </h1>
            </div>

            <nav className="hidden md:flex space-x-6">
              <button onClick={() => router.push('/social')} className="text-gray-600 hover:text-gray-900">
                Feed
              </button>
              <button onClick={() => router.push('/messages')} className="text-gray-600 hover:text-gray-900">
                Messages
              </button>
              <button onClick={() => router.push('/groups')} className="text-gray-600 hover:text-gray-900">
                Groups
              </button>
              <button className="text-blue-600 font-semibold">
                Pages
              </button>
            </nav>

            <div className="flex items-center space-x-4">
              <NotificationBell />
              <div className="relative group">
                <button className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  {user?.username?.charAt(0).toUpperCase()}
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 hidden group-hover:block">
                  <button
                    onClick={logout}
                    className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-3xl font-bold text-gray-900">Pages</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition"
          >
            + Create Page
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('discover')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'discover'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Discover Pages
              </button>
              <button
                onClick={() => setActiveTab('my-pages')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'my-pages'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Pages
              </button>
              <button
                onClick={() => setActiveTab('following')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'following'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Following
              </button>
            </nav>
          </div>

          {/* Category Filter */}
          {activeTab === 'discover' && (
            <div className="p-4 border-b border-gray-200">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Pages Grid */}
        {loadingPages ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading pages...</p>
          </div>
        ) : currentPages.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No pages found</h3>
            <p className="text-gray-500 mb-6">
              {activeTab === 'my-pages'
                ? 'You haven\'t created any pages yet'
                : activeTab === 'following'
                ? 'You\'re not following any pages yet'
                : 'No pages available in this category'}
            </p>
            {activeTab === 'my-pages' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition"
              >
                Create Your First Page
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentPages.map((page) => (
              <div key={page.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition">
                {/* Cover Photo */}
                {page.cover_photo && (
                  <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600">
                    <img src={`http://localhost:8000${page.cover_photo}`} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                
                {/* Profile Picture */}
                <div className="px-6 pt-4">
                  <div className="flex items-start space-x-4">
                    {page.profile_picture ? (
                      <img
                        src={`http://localhost:8000${page.profile_picture}`}
                        alt={page.name}
                        className="w-20 h-20 rounded-lg object-cover border-4 border-white -mt-10"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-2xl border-4 border-white -mt-10">
                        {page.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center space-x-1">
                        <h3 className="font-bold text-lg text-gray-900">{page.name}</h3>
                        {page.is_verified && (
                          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {categories.find(c => c.value === page.category)?.label || page.category}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 py-4">
                  {page.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{page.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>{page.follower_count} followers</span>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    {page.is_following ? (
                      <button
                        onClick={() => handleUnfollowPage(page.id)}
                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-semibold transition"
                      >
                        Following
                      </button>
                    ) : (
                      <button
                        onClick={() => handleFollowPage(page.id)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition"
                      >
                        Follow
                      </button>
                    )}
                    <button
                      onClick={() => router.push(`/pages/${page.id}`)}
                      className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-semibold transition"
                    >
                      View Page
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Page Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Create New Page</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreatePage} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Page Name *</label>
                <input
                  type="text"
                  value={pageName}
                  onChange={(e) => setPageName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter page name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                <select
                  value={pageCategory}
                  onChange={(e) => setPageCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={pageDescription}
                  onChange={(e) => setPageDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tell people about your page"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                  <input
                    type="url"
                    value={pageWebsite}
                    onChange={(e) => setPageWebsite(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={pageEmail}
                    onChange={(e) => setPageEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="contact@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={pagePhone}
                  onChange={(e) => setPagePhone(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+1 234 567 8900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Profile Picture</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProfilePicture(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cover Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCoverPhoto(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold transition"
                >
                  {creating ? 'Creating...' : 'Create Page'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
