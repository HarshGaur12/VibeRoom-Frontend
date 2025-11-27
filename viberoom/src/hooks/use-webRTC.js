import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL, ICE_SERVERS } from '@/config/webrtc.config';

const config = ICE_SERVERS;

export const useWebRTC = (roomId, username) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  
  const socketRef = useRef(null);
  const peersRef = useRef({});
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    if (!roomId) return;

    console.log('Initializing socket connection to:', SOCKET_URL);
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
      extraHeaders: {
        'ngrok-skip-browser-warning': 'true'
      }
    });

    socketRef.current.on('connect', () => {
      console.log('Socket connected:', socketRef.current.id);
      setIsConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      console.error('Make sure signalling server is running and ngrok URL is correct');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [roomId]);

  // Setup WebRTC peer connections
  const createPeerConnection = useCallback((peerId) => {
    console.log("Creating PeerConnection for:", peerId);

    const pc = new RTCPeerConnection(config);

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("ice-candidate", {
          targetId: peerId,
          candidate: event.candidate
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(peerId, "ICE:", pc.iceConnectionState);
    };

    pc.onconnectionstatechange = () => {
      console.log(peerId, "CONNECTION:", pc.connectionState);
    };

    pc.ontrack = (event) => {
      console.log("Received remote stream from:", peerId);
      setRemoteStreams((prev) => ({
        ...prev,
        [peerId]: {
          stream: event.streams[0],
          isVideoEnabled: prev[peerId]?.isVideoEnabled !== false,
          isAudioEnabled: prev[peerId]?.isAudioEnabled !== false,
          username: prev[peerId]?.username || 'Anonymous'
        }
      }));
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    return pc;
  }, []);

  // Setup socket event listeners
  useEffect(() => {
    if (!socketRef.current) return;

    const socket = socketRef.current;

    socket.on("existing-participants", async (participants) => {
      console.log("Existing participants:", participants);

      for (let id of participants) {
        const pc = createPeerConnection(id);
        peersRef.current[id] = pc;

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("offer", { targetId: id, offer });
      }
    });

    socket.on("new-participant", (id) => {
      console.log("New participant joined:", id);
      peersRef.current[id] = createPeerConnection(id);
    });

    socket.on("offer", async ({ from, offer }) => {
      console.log("Received offer from:", from);

      let pc = peersRef.current[from];
      if (!pc) {
        pc = createPeerConnection(from);
        peersRef.current[from] = pc;
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("answer", { targetId: from, answer });
    });

    socket.on("answer", async ({ from, answer }) => {
      console.log("Received answer from:", from);

      const pc = peersRef.current[from];
      if (!pc) return;

      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("ice-candidate", async ({ from, candidate }) => {
      const pc = peersRef.current[from];
      if (pc && candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socket.on("peer-disconnected", (id) => {
      console.log("Peer disconnected:", id);

      if (peersRef.current[id]) {
        peersRef.current[id].close();
        delete peersRef.current[id];
      }

      setRemoteStreams((prev) => {
        const newStreams = { ...prev };
        delete newStreams[id];
        return newStreams;
      });
    });

    socket.on("media-state-changed", ({ peerId, isVideoEnabled, isAudioEnabled }) => {
      setRemoteStreams((prev) => ({
        ...prev,
        [peerId]: {
          ...prev[peerId],
          isVideoEnabled,
          isAudioEnabled
        }
      }));
    });

    socket.on("chat-message", (data) => {
      console.log("Received chat message:", data);
      // Extract message from the data object
      const message = data.message || data;
      // Add only if message doesn't already exist (check by id)
      setMessages((prev) => {
        const exists = prev.some(m => m.id === message.id);
        return exists ? prev : [...prev, message];
      });
    });

    return () => {
      socket.off("existing-participants");
      socket.off("new-participant");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("peer-disconnected");
      socket.off("media-state-changed");
      socket.off("chat-message");
    };
  }, [createPeerConnection]);

  // Start local media stream
  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      setLocalStream(stream);
      localStreamRef.current = stream;

      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      throw error;
    }
  };

  // Join room
  const joinRoom = async () => {
    try {
      await startLocalStream();
      
      if (socketRef.current && roomId) {
        console.log("Joining room:", roomId, "as", username);
        socketRef.current.emit("join-room", { roomId, username });
      }
    } catch (error) {
      console.error("Error joining room:", error);
      throw error;
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);

        if (socketRef.current) {
          socketRef.current.emit("media-state-change", {
            isVideoEnabled: videoTrack.enabled,
            isAudioEnabled: isAudioEnabled
          });
        }
      }
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);

        if (socketRef.current) {
          socketRef.current.emit("media-state-change", {
            isVideoEnabled: isVideoEnabled,
            isAudioEnabled: audioTrack.enabled
          });
        }
      }
    }
  };

  // Start screen share
  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always"
        },
        audio: false
      });

      screenStreamRef.current = stream;
      setIsScreenSharing(true);

      const screenTrack = stream.getVideoTracks()[0];
      
      // Replace video track in all peer connections
      Object.values(peersRef.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
      });

      // Handle screen share stop
      screenTrack.onended = () => {
        stopScreenShare();
      };

      return stream;
    } catch (error) {
      console.error("Error starting screen share:", error);
      throw error;
    }
  };

  // Stop screen share
  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
      setIsScreenSharing(false);

      // Restore camera video track
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        
        Object.values(peersRef.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });
      }
    }
  };

  // Send chat message
  const sendChatMessage = (messageText) => {
    if (!messageText.trim() || !socketRef.current) return;

    const message = {
      id: Date.now().toString(),
      sender: username || 'Anonymous',
      text: messageText,
      timestamp: new Date().toISOString()
    };

    // Add to local messages immediately
    setMessages((prev) => [...prev, message]);
    
    // Send to server
    socketRef.current.emit("chat-message", message);
  };

  // Leave room
  const leaveRoom = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    Object.values(peersRef.current).forEach((pc) => pc.close());
    peersRef.current = {};

    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveRoom();
    };
  }, []);

  return {
    localStream,
    remoteStreams,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    messages,
    isConnected,
    joinRoom,
    toggleVideo,
    toggleAudio,
    startScreenShare,
    stopScreenShare,
    sendChatMessage,
    leaveRoom
  };
};
