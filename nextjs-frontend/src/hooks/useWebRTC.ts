import { useState, useRef, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';

const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE || 'ws://localhost:8000/ws';

const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export interface CallData {
  id: string;
  room_id: string;
  caller_username: string;
  receiver_username: string;
  call_type: 'audio' | 'video';
  status: string;
}

export function useWebRTC() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callStatus, setCallStatus] = useState<string>('');
  const [isCallActive, setIsCallActive] = useState(false);
  const [currentCall, setCurrentCall] = useState<CallData | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pendingIceCandidates = useRef<RTCIceCandidateInit[]>([]);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Get local media stream
  const getLocalStream = useCallback(async (callType: 'audio' | 'video') => {
    try {
      const constraints = {
        video: callType === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        } : false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };

      console.log('📸 Requesting media with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      console.log('✅ Local stream obtained:');
      console.log('  - Video tracks:', videoTracks.map(t => `${t.label} (enabled: ${t.enabled})`));
      console.log('  - Audio tracks:', audioTracks.map(t => `${t.label} (enabled: ${t.enabled})`));

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw new Error('Could not access camera/microphone');
    }
  }, []);

  // Setup peer connection
  const setupPeerConnection = useCallback((stream: MediaStream) => {
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnectionRef.current = pc;

    // Add local tracks
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
      console.log('➕ Added local track:', track.kind, 'enabled:', track.enabled);

      // Set transceiver direction
      const transceivers = pc.getTransceivers();
      const transceiver = transceivers.find(t => t.sender.track === track);
      if (transceiver) {
        transceiver.direction = 'sendrecv';
        console.log(`  Set transceiver direction to sendrecv for ${track.kind}`);
      }
    });

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate,
        }));
        console.log('📤 Sent ICE candidate:', event.candidate.type);
      }
    };

    // Handle remote tracks
    pc.ontrack = (event) => {
      console.log('🎥 Remote track received:', event.track.kind);
      console.log('Track state:', event.track.readyState, 'enabled:', event.track.enabled);

      if (event.streams && event.streams[0]) {
        const stream = event.streams[0];
        
        if (!remoteVideoRef.current?.srcObject) {
          setRemoteStream(stream);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
            console.log('✅ Remote video srcObject set');

            // Event listeners
            remoteVideoRef.current.onloadeddata = () => {
              console.log('📹 Video data loaded!');
              remoteVideoRef.current?.play().catch(e => console.error('Play error:', e));
            };
          }
        }

        setCallStatus('Connected');
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setCallStatus('Connected');
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        endCall();
      }
    };

    return pc;
  }, []);

  // Start a call
  const startCall = useCallback(async (recipientUsername: string, callType: 'audio' | 'video') => {
    try {
      setIsCallActive(true);
      setCallStatus('Connecting...');

      const stream = await getLocalStream(callType);
      const pc = setupPeerConnection(stream);

      // Create call via API
      const token = Cookies.get('access_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/calls/start/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiver_username: recipientUsername,
          call_type: callType,
        }),
      });

      if (!response.ok) throw new Error('Failed to start call');

      const callData = await response.json();
      
      // Ensure usernames are set (fallback if not in API response)
      const currentUsername = Cookies.get('username');
      const enrichedCallData = {
        ...callData,
        caller_username: callData.caller_username || currentUsername,
        receiver_username: callData.receiver_username || recipientUsername,
      };
      
      setCurrentCall(enrichedCallData);

      // Create offer
      const offerOptions = {
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video',
      };
      const offer = await pc.createOffer(offerOptions);
      await pc.setLocalDescription(offer);
      console.log('📤 Created offer with video:', callType === 'video');

      // Connect to WebSocket
      const ws = new WebSocket(`${WS_BASE}/call/${callData.room_id}/?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Connected to call room');
        setCallStatus('Waiting for answer...');
      };

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log('📨 Received message:', data.type);

        switch (data.type) {
          case 'user-joined':
            console.log('👤 Receiver joined, sending offer...');
            ws.send(JSON.stringify({
              type: 'call-offer',
              offer: offer,
              call_type: callType,
            }));
            break;

          case 'call-answer':
            console.log('✅ Received answer');
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            
            // Process queued ICE candidates
            for (const candidate of pendingIceCandidates.current) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
            pendingIceCandidates.current = [];
            break;

          case 'ice-candidate':
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } else {
              pendingIceCandidates.current.push(data.candidate);
            }
            break;

          case 'call-end':
            endCall();
            break;
        }
      };

      ws.onerror = (error) => console.error('WebSocket error:', error);
      ws.onclose = () => console.log('WebSocket closed');

    } catch (error) {
      console.error('Error starting call:', error);
      endCall();
      throw error;
    }
  }, [getLocalStream, setupPeerConnection]);

  // Accept incoming call
  const acceptCall = useCallback(async (incomingCallData: CallData) => {
    try {
      setIsCallActive(true);
      setCallStatus('Connecting...');
      setCurrentCall(incomingCallData);

      const stream = await getLocalStream(incomingCallData.call_type);
      const pc = setupPeerConnection(stream);

      // Accept call via API
      const token = Cookies.get('access_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/calls/${incomingCallData.id}/accept/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to accept call');

      // Connect to WebSocket
      const ws = new WebSocket(`${WS_BASE}/call/${incomingCallData.room_id}/?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Receiver connected to call room');
      };

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log('📨 Receiver received message:', data.type);

        switch (data.type) {
          case 'call-offer':
            console.log('📥 Received offer, processing...');
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

            // Process queued ICE candidates
            for (const candidate of pendingIceCandidates.current) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
            pendingIceCandidates.current = [];

            // Create answer
            const answerOptions = {
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
            };
            const answer = await pc.createAnswer(answerOptions);
            await pc.setLocalDescription(answer);
            console.log('📤 Created answer with video support');

            ws.send(JSON.stringify({
              type: 'call-answer',
              answer: answer,
            }));
            console.log('✅ Answer sent');
            break;

          case 'ice-candidate':
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } else {
              pendingIceCandidates.current.push(data.candidate);
            }
            break;

          case 'call-end':
            endCall();
            break;
        }
      };

    } catch (error) {
      console.error('Error accepting call:', error);
      endCall();
      throw error;
    }
  }, [getLocalStream, setupPeerConnection]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const newState = !audioEnabled;
      localStream.getAudioTracks().forEach(track => {
        track.enabled = newState;
      });
      setAudioEnabled(newState);
    }
  }, [localStream, audioEnabled]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const newState = !videoEnabled;
      localStream.getVideoTracks().forEach(track => {
        track.enabled = newState;
      });
      setVideoEnabled(newState);
    }
  }, [localStream, videoEnabled]);

  // End call
  const endCall = useCallback(() => {
    // Send end signal
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'call-end' }));
      wsRef.current.close();
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    // Clear video elements
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    // Reset state
    setLocalStream(null);
    setRemoteStream(null);
    setIsCallActive(false);
    setCurrentCall(null);
    setCallStatus('');
    setAudioEnabled(true);
    setVideoEnabled(true);
    pendingIceCandidates.current = [];
  }, [localStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  return {
    localStream,
    remoteStream,
    callStatus,
    isCallActive,
    currentCall,
    audioEnabled,
    videoEnabled,
    localVideoRef,
    remoteVideoRef,
    startCall,
    acceptCall,
    endCall,
    toggleAudio,
    toggleVideo,
  };
}
