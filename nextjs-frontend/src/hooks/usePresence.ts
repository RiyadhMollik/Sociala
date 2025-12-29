import { useState, useEffect, useRef, useCallback } from 'react';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import { CallData } from './useWebRTC';

const PRESENCE_WS_URL = process.env.NEXT_PUBLIC_WS_BASE + '/presence/' || 'ws://localhost:8000/ws/presence/';

export interface OnlineUser {
  id: number;
  username: string;
  is_online: boolean;
}
export function usePresence() {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [incomingCall, setIncomingCall] = useState<CallData | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);

  // Load online users
  const loadOnlineUsers = useCallback(async () => {
    try {
      const response = await api.get<OnlineUser[]>('/users/online/');
      const currentUsername = Cookies.get('username');
      setOnlineUsers(response.data.filter(user => user.username !== currentUsername));
    } catch (error) {
      console.error('Error loading online users:', error);
    }
  }, []);

  // Setup presence WebSocket
  const setupPresenceWebSocket = useCallback(() => {
    const token = Cookies.get('access_token');
    if (!token || !shouldReconnectRef.current) return;

    // Clean up existing connection
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        return; // Already connected or connecting
      }
    }

    const wsUrl = `${PRESENCE_WS_URL}?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    let pingInterval: NodeJS.Timeout;

    const handleOpen = () => {
      console.log('✅ Presence WebSocket connected');
      // Keepalive ping
      pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
    };

    const handleMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      console.log('📨 Presence message:', data.type);

      switch (data.type) {
        case 'incoming-call':
          console.log('🔔 INCOMING CALL!', data);
          // Map call_id to id for CallData interface
          const incomingCallData: CallData = {
            id: data.call_id,
            room_id: data.room_id,
            caller_username: data.caller_username,
            receiver_username: '', // Will be current user
            call_type: data.call_type,
            status: 'ringing'
          };
          setIncomingCall(incomingCallData);
          break;
        case 'call-cancelled':
          setIncomingCall(null);
          break;
        case 'call-ended':
          setIncomingCall(null);
          break;
      }
    };

    const handleError = () => {
      // Silently handle errors - they're expected during React StrictMode
    };

    const handleClose = () => {
      if (pingInterval) clearInterval(pingInterval);
      
      // Only reconnect if we should (not during cleanup)
      if (shouldReconnectRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          setupPresenceWebSocket();
        }, 3000);
      }
    };

    ws.addEventListener('open', handleOpen);
    ws.addEventListener('message', handleMessage);
    ws.addEventListener('error', handleError);
    ws.addEventListener('close', handleClose);
  }, []);

  const rejectCall = useCallback(async (callId: string) => {
    try {
      await api.post(`/calls/${callId}/reject/`);
      setIncomingCall(null);
    } catch (error) {
      console.error('Error rejecting call:', error);
      setIncomingCall(null);
    }
  }, []);

  const clearIncomingCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  useEffect(() => {
    shouldReconnectRef.current = true;
    loadOnlineUsers();
    setupPresenceWebSocket();

    // Refresh online users periodically
    const interval = setInterval(loadOnlineUsers, 5000);

    return () => {
      // Cleanup: prevent reconnection
      shouldReconnectRef.current = false;
      clearInterval(interval);
      
      // Clear any pending reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      // Close WebSocket connection gracefully
      if (wsRef.current) {
        const ws = wsRef.current;
        // Only close if not already closing or closed
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close(1000, 'Component unmounting'); // 1000 = normal closure
        }
        wsRef.current = null;
      }
    };
  }, [loadOnlineUsers, setupPresenceWebSocket]);

  return {
    onlineUsers,
    incomingCall,
    rejectCall,
    clearIncomingCall,
    refreshOnlineUsers: loadOnlineUsers,
  };
}
