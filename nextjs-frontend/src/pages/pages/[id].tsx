import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
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
  address?: string;
  creator_details: {
    id: number;
    username: string;
  };
  follower_count: number;
  is_following: boolean;
  is_verified: boolean;
  user_role?: string;
  created_at: string;
}

export default function PageDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, logout, isAuthenticated, loading } = useAuth();
  const [page, setPage] = useState<Page | null>(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [activeTab, setActiveTab] = useState<'about' | 'posts'>('about');

  const categories = {
    business: 'Business or Brand',
    community: 'Community or Public Figure',
    entertainment: 'Entertainment',
    education: 'Education',
    nonprofit: 'Non-Profit Organization',
    personal: 'Personal Blog',
    other: 'Other',
  };

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (id && isAuthenticated) {
      loadPage();
    }
  }, [id, isAuthenticated]);

  const loadPage = async () => {
    setLoadingPage(true);
    try {
      const response = await api.get(`/pages/${id}/`);
      setPage(response.data);
    } catch (error) {
      console.error('Failed to load page:', error);
      alert('Failed to load page');
      router.push('/pages');
    } finally {
      setLoadingPage(false);
    }
  };

  const handleFollowPage = async () => {
    if (!page) return;
    try {
      await api.post(`/pages/${page.id}/follow/`);
      loadPage();
    } catch (error) {
      console.error('Failed to follow page:', error);
    }
  };

  const handleUnfollowPage = async () => {
    if (!page) return;
    try {
      await api.post(`/pages/${page.id}/unfollow/`);
      loadPage();
    } catch (error) {
      console.error('Failed to unfollow page:', error);
    }
  };

  if (loading || loadingPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!page) {
    return null;
  }

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
              <button onClick={() => router.push('/pages')} className="text-blue-600 font-semibold">
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

      {/* Cover Photo */}
      <div className="h-80 bg-gradient-to-r from-blue-500 to-purple-600">
        {page.cover_photo && (
          <img 
            src={page.cover_photo} 
            alt="" 
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
      </div>

      {/* Page Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-b-lg shadow-sm -mt-20 relative z-10 pb-6">
          <div className="px-6 pt-6">
            <div className="flex items-start space-x-6">
              {/* Profile Picture */}
              <div className="w-40 h-40 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-5xl border-4 border-white shadow-lg overflow-hidden">
                {page.profile_picture ? (
                  <img
                    src={page.profile_picture}
                    alt={page.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        e.currentTarget.style.display = 'none';
                        parent.innerHTML = page.name.charAt(0).toUpperCase();
                      }
                    }}
                  />
                ) : (
                  page.name.charAt(0).toUpperCase()
                )}
              </div>

              {/* Page Details */}
              <div className="flex-1 pt-8">
                <div className="flex items-center space-x-2 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{page.name}</h1>
                  {page.is_verified && (
                    <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <p className="text-gray-600 mb-4">{categories[page.category as keyof typeof categories] || page.category}</p>
                <div className="flex items-center space-x-6 text-sm text-gray-500 mb-4">
                  <span className="font-semibold">{page.follower_count} followers</span>
                  {page.user_role && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                      {page.user_role.toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  {page.is_following ? (
                    <button
                      onClick={handleUnfollowPage}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-lg font-semibold transition"
                    >
                      Following
                    </button>
                  ) : (
                    <button
                      onClick={handleFollowPage}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition"
                    >
                      Follow
                    </button>
                  )}
                  <button
                    onClick={() => router.push('/pages')}
                    className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-2 rounded-lg font-semibold transition"
                  >
                    Back to Pages
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-t border-gray-200 mt-6">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('about')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'about'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                About
              </button>
              <button
                onClick={() => setActiveTab('posts')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'posts'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Posts
              </button>
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="mt-6 pb-8">
          {activeTab === 'about' ? (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">About</h2>
              
              {page.description && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Description</h3>
                  <p className="text-gray-700">{page.description}</p>
                </div>
              )}

              <div className="space-y-4">
                {page.website && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Website</h3>
                    <a 
                      href={page.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      <span>{page.website}</span>
                    </a>
                  </div>
                )}

                {page.email && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Email</h3>
                    <a href={`mailto:${page.email}`} className="text-blue-600 hover:underline flex items-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>{page.email}</span>
                    </a>
                  </div>
                )}

                {page.phone && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Phone</h3>
                    <a href={`tel:${page.phone}`} className="text-blue-600 hover:underline flex items-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>{page.phone}</span>
                    </a>
                  </div>
                )}

                {page.address && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Address</h3>
                    <p className="text-gray-700 flex items-start space-x-2">
                      <svg className="w-5 h-5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{page.address}</span>
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Created By</h3>
                  <p className="text-gray-700">{page.creator_details.username}</p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Created At</h3>
                  <p className="text-gray-700">{new Date(page.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Posts</h2>
              <p className="text-gray-500 text-center py-12">No posts yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
