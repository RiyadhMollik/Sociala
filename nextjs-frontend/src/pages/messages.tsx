import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { usePresence } from '@/hooks/usePresence';
import api from '@/lib/api';
import IncomingCallModal from '@/components/IncomingCallModal';
import VideoCallModal from '@/components/VideoCallModal';
import { useWebRTC } from '@/hooks/useWebRTC';
import Cookies from 'js-cookie';
import { NotificationBell } from '@/components/NotificationBell';

interface User {
  id: number;
  username: string;
  is_online: boolean;
}

interface Message {
  id: number;
  sender: {
    id: number;
    username: string;
  } | string;
  receiver: {
    id: number;
    username: string;
  } | string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export default function MessagesPage() {
  const router = useRouter();
  const { user, logout, isAuthenticated, loading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageContent, setMessageContent] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Helper function to get username from sender/receiver
  const getUsername = (person: any): string => {
    if (typeof person === 'string') return person;
    return person?.username || 'Unknown';
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
    startCall,
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
      loadUsers();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedUser) {
      loadMessages(selectedUser.id);
      connectWebSocket(selectedUser.id);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [selectedUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadUsers = async () => {
    try {
      const response = await api.get('/users/friends/');
      setUsers(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadMessages = async (userId: number) => {
    setLoadingMessages(true);
    try {
      const response = await api.get(`/messages/?other_user=${userId}`);
      setMessages(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const connectWebSocket = (userId: number) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const token = Cookies.get('access_token');
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_BASE || 'ws://localhost:8000/ws'}/chat/${userId}/?token=${token}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'chat_message') {
        setMessages((prev) => [...prev, data.message]);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    wsRef.current = ws;
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim() || !selectedUser) return;

    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'chat_message',
          message: messageContent,
        }));
        setMessageContent('');
      } else {
        // Fallback to REST API
        const response = await api.post('/messages/', {
          receiver: selectedUser.id,
          content: messageContent,
        });
        setMessages((prev) => [...prev, response.data]);
        setMessageContent('');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (hours < 24) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString();
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
                  className="text-blue-600 border-b-2 border-blue-600 px-3 py-2 font-medium"
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
        <div className="bg-white rounded-lg shadow-md overflow-hidden" style={{ height: 'calc(100vh - 160px)' }}>
          <div className="flex h-full">
            {/* Users List */}
            <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-800">Messages</h2>
              </div>
              <div>
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className={`w-full p-4 flex items-center space-x-3 hover:bg-gray-50 transition ${
                      selectedUser?.id === u.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="relative">
                      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      {u.is_online && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-gray-800">{u.username}</h3>
                      <p className="text-sm text-gray-500">{u.is_online ? 'Online' : 'Offline'}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {selectedUser ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                          {selectedUser.username.charAt(0).toUpperCase()}
                        </div>
                        {selectedUser.is_online && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{selectedUser.username}</h3>
                        <p className="text-sm text-gray-500">{selectedUser.is_online ? 'Online' : 'Offline'}</p>
                      </div>
                    </div>
                    
                    {/* Call Buttons */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => startCall(selectedUser.username, 'audio')}
                        disabled={isCallActive}
                        className="p-2 hover:bg-gray-100 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Audio Call"
                      >
                        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => startCall(selectedUser.username, 'video')}
                        disabled={isCallActive}
                        className="p-2 hover:bg-gray-100 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Video Call"
                      >
                        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {loadingMessages ? (
                      <div className="text-center text-gray-500">Loading messages...</div>
                    ) : messages.length === 0 ? (
                      <div className="text-center text-gray-500">No messages yet. Start the conversation!</div>
                    ) : (
                      messages.map((message) => {
                        const senderUsername = getUsername(message.sender);
                        const isOwn = senderUsername === user?.username;
                        return (
                          <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
                              <div
                                className={`px-4 py-2 rounded-lg ${
                                  isOwn
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-800'
                                }`}
                              >
                                <p>{message.content}</p>
                              </div>
                              <p className={`text-xs text-gray-500 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                                {formatDate(message.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <form onSubmit={sendMessage} className="p-4 border-t border-gray-200">
                    <div className="flex items-center space-x-3">
                      <input
                        type="text"
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="submit"
                        disabled={!messageContent.trim()}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white p-3 rounded-full transition"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <svg className="w-24 h-24 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
                    <p>Choose a user from the list to start messaging</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
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
