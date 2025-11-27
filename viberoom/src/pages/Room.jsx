import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { toast } from "sonner";
import { useUser } from '@/hooks/use-user.js';
import { useWebRTC } from '@/hooks/use-webRTC';
import { useIsMobile } from '@/hooks/use-mobile.js';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MessageSquare,
  Copy,
  Phone,
  Crown,
  MoreVertical,
  Pin,
  PinOff,
  X,
  MonitorOff,
  MonitorUp
} from 'lucide-react';
import { api } from '@/lib/axios.js';

const Room = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const isMobile = useIsMobile();
  
  const [showChat, setShowChat] = useState(false);
  const [message, setMessage] = useState('');
  const [roomDetails, setRoomDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pinnedParticipants, setPinnedParticipants] = useState(new Set());
  const [hasJoined, setHasJoined] = useState(false);
  
  const chatEndRef = useRef(null);
  const localVideoRef = useRef(null);
  const localScreenRef = useRef(null);
  const remoteVideoRefs = useRef({});

  // Initialize WebRTC hook
  const {
    localStream,
    remoteStreams,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    messages: rtcMessages,
    isConnected,
    joinRoom,
    toggleVideo,
    toggleAudio,
    startScreenShare,
    stopScreenShare,
    sendChatMessage,
    leaveRoom: leaveWebRTC
  } = useWebRTC(roomId, user?.username || 'Anonymous');

  // Fetch room data from backend
  useEffect(() => {
    const fetchRoomData = async () => {
      try {
        const res = await api.get(`/api/v1/rooms/${roomId}/details`);
        const roomData = res.data.data;
        
        setRoomDetails(roomData);
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to fetch room data");
        navigate('/landing');
      } finally {
        setLoading(false);
      }
    };

    fetchRoomData();
  }, [roomId, navigate]);

  // Auto-join room when component mounts
  useEffect(() => {
    if (!loading && !hasJoined) {
      joinRoom()
        .then(() => {
          setHasJoined(true);
          toast.success("Connected to room");
        })
        .catch((err) => {
          console.error("Failed to join:", err);
          toast.error("Failed to access camera/microphone");
        });
    }
  }, [loading, hasJoined, joinRoom]);

  // Attach local stream to video element
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoEnabled]); // Re-attach when video is toggled

  // Attach remote streams to video elements
  console.log('remoteStreams', remoteStreams);
  useEffect(() => {
    Object.entries(remoteStreams).forEach(([peerId, streamData]) => {
      if (remoteVideoRefs.current[peerId] && streamData.stream) {
        remoteVideoRefs.current[peerId].srcObject = streamData.stream;
      }
    });
  }, [remoteStreams]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [rtcMessages]);

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId || '');
    toast.success("Room ID copied!");
  };

  const leaveRoom = async () => {
    try {
      leaveWebRTC();
      await api.delete(`/api/v1/rooms/${roomId}/leave`);
      toast.success("You have left the room");
      navigate('/landing');
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to leave room");
      navigate('/landing');
    }
  };

  const endRoom = async () => {
    try {
      leaveWebRTC();
      await api.patch(`/api/v1/rooms/${roomId}/end`);
      toast.success("Room has been ended");
      navigate('/landing');
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to end room");
    }
  };

  const togglePin = (participantId) => {
    setPinnedParticipants((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(participantId)) {
        newSet.delete(participantId);
      } else {
        newSet.add(participantId);
      }
      return newSet;
    });
  };

  const handleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        stopScreenShare();
        toast.success("Screen sharing stopped");
      } else {
        const screenStream = await startScreenShare();
        // Attach screen stream to video element
        if (screenStream && localScreenRef.current) {
          localScreenRef.current.srcObject = screenStream;
        }
        toast.success("Screen sharing started");
      }
    } catch (err) {
      console.error("Screen share error:", err);
      toast.error("Failed to share screen");
    }
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    sendChatMessage(message);
    setMessage('');
  };

  // Get participant details from roomDetails
  const getParticipantDetails = (peerId) => {
    if (!roomDetails) return null;

    console.log('Getting details for peerId:', peerId); 
    console.log('roomDetails participants:', roomDetails.participants);
    
    // Check if it's the local user
    if (peerId === 'local') {
      const currentUserParticipant = roomDetails.participants.find(
        p => p.user._id === user?._id
      );
      return {
        name: user?.username || 'You',
        avatar: user?.avatar,
        isHost: currentUserParticipant?.role === 'host'
      };
    }
    
    // For remote peers, get username from remoteStreams
    const streamData = remoteStreams[peerId];
    return {
      name: streamData?.username || 'Anonymous',
      avatar: '👤',
      isHost: false
    };
  };

  // Create participant list - LOCAL USER CAMERA
  const localParticipant = {
    id: 'local',
    type: 'camera',
    stream: localStream,
    isLocal: true,
    isVideoEnabled,
    isAudioEnabled,
    isPinned: pinnedParticipants.has('local'),
    ...getParticipantDetails('local')
  };

  // Create screen share card if active
  const localScreenParticipant = isScreenSharing ? {
    id: 'local-screen',
    type: 'screen',
    stream: null, // Will be set via ref
    isLocal: true,
    isVideoEnabled: true,
    isAudioEnabled: false,
    isPinned: pinnedParticipants.has('local-screen'),
    name: `${user?.username || 'You'} (Screen)`,
    avatar: '🖥️',
    isHost: localParticipant.isHost
  } : null;

  // Create remote participants list
  const remoteParticipants = Object.entries(remoteStreams).map(([peerId, streamData]) => ({
    id: peerId,
    type: 'camera',
    stream: streamData.stream,
    isLocal: false,
    isVideoEnabled: streamData.isVideoEnabled !== false,
    isAudioEnabled: streamData.isAudioEnabled !== false,
    isPinned: pinnedParticipants.has(peerId),
    ...getParticipantDetails(peerId)
  }));

  // Combine all participants
  const allParticipants = [
    localParticipant,
    ...(localScreenParticipant ? [localScreenParticipant] : []),
    ...remoteParticipants
  ];

  // Sort participants: pinned first, then host, then others
  const sortedParticipants = [...allParticipants].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    if (a.isHost !== b.isHost) return a.isHost ? -1 : 1;
    if (a.type !== b.type) return a.type === 'screen' ? -1 : 1;
    return 0;
  });

  // Get pinned participants for maximize view
  const pinnedList = sortedParticipants.filter(p => p.isPinned);
  const unpinnedList = sortedParticipants.filter(p => !p.isPinned);

  // Calculate total participants count
  const totalParticipants = 1 + Object.keys(remoteStreams).length;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-card">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-background via-background to-card flex flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="bg-card/70 backdrop-blur-glass border-b border-border p-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3 shrink-0">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Room ID:</span>
            <code className="bg-muted px-3 py-1 rounded-lg font-mono text-sm">{roomId}</code>
            <Button
              onClick={copyRoomId}
              size="sm"
              variant="outline"
              className="bg-background/50 border-border"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-xs text-muted-foreground">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="h-4 w-px bg-border" />
            <span className="text-xs text-muted-foreground">
              {totalParticipants} {totalParticipants === 1 ? 'Participant' : 'Participants'}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={leaveRoom}
            variant="destructive"
            className="bg-destructive hover:opacity-90"
          >
            <Phone className="w-4 h-4 mr-2 rotate-[135deg]" />
            Leave Room
          </Button>

          {roomDetails && user?._id === roomDetails.host && (
            <Button
              onClick={endRoom}
              variant="destructive"
              className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900"
            >
              <Phone className="w-4 h-4 mr-2 rotate-[135deg]" />
              End Room
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Participants Grid */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto">
          {pinnedList.length > 0 ? (
            /* Google Meet Style: Large pinned view + small grid */
            <div className="flex flex-col gap-4 h-full">
              {/* Main Large View - Pinned Participant(s) */}
              <div className="flex-1 min-h-0">
                <div className={`grid gap-3 md:gap-4 h-full ${
                  pinnedList.length === 1 ? 'grid-cols-1' : 
                  pinnedList.length === 2 ? 'grid-cols-1 lg:grid-cols-2' :
                  pinnedList.length === 3 ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3' :
                  'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
                }`}>
                  {pinnedList.map((participant) => (
                    <div
                      key={participant.id}
                      className={`bg-card/70 backdrop-blur-glass border-2 border-blue-500 rounded-2xl overflow-hidden shadow-glass hover:shadow-glow transition-all relative h-full ${
                        participant.type === 'screen' ? 'ring-2 ring-purple-500' : ''
                      }`}
                    >
                {/* Three Dots Menu */}
                <div className="absolute top-3 right-3 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="focus:outline-none bg-black/30 backdrop-blur-sm rounded-full p-1.5 hover:bg-black/50">
                      <MoreVertical className="w-5 h-5 text-white cursor-pointer" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => togglePin(participant.id)}>
                        {participant.isPinned ? (
                          <>
                            <PinOff className="mr-2 h-4 w-4" />
                            <span>Unpin</span>
                          </>
                        ) : (
                          <>
                            <Pin className="mr-2 h-4 w-4" />
                            <span>Pin</span>
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Screen Share Badge */}
                {participant.type === 'screen' && (
                  <div className="absolute top-3 left-3 z-10 bg-purple-600 px-3 py-1 rounded-lg flex items-center gap-1 shadow-glow">
                    <MonitorUp className="w-3 h-3 text-white" />
                    <span className="text-xs font-semibold text-white">Screen Share</span>
                  </div>
                )}

                {/* Host Badge */}
                {participant.isHost && participant.type !== 'screen' && (
                  <div className="absolute top-3 left-3 z-10 bg-gradient-primary px-3 py-1 rounded-lg flex items-center gap-1 shadow-glow">
                    <Crown className="w-3 h-3 text-primary-foreground" />
                    <span className="text-xs font-semibold text-primary-foreground">Host</span>
                  </div>
                )}

                {/* Video Container */}
                <div className="relative w-full h-full bg-gradient-to-br from-slate-900 to-slate-800">
                  {participant.type === 'screen' ? (
                    // Screen Share Video
                    <video
                      ref={(el) => {
                        if (el && isScreenSharing) {
                          localScreenRef.current = el;
                          // Get screen track from local stream
                          const screenTrack = localStream?.getVideoTracks()[0];
                          if (screenTrack && el.srcObject !== localStream) {
                            const screenStream = new MediaStream([screenTrack]);
                            el.srcObject = screenStream;
                          }
                        }
                      }}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-contain bg-black"
                    />
                  ) : participant.isVideoEnabled && participant.stream ? (
                    // Camera Video
                    <video
                      ref={(el) => {
                        if (el) {
                          if (participant.isLocal) {
                            localVideoRef.current = el;
                            if (localStream) el.srcObject = localStream;
                          } else {
                            remoteVideoRefs.current[participant.id] = el;
                            if (participant.stream) el.srcObject = participant.stream;
                          }
                        }
                      }}
                      autoPlay
                      playsInline
                      muted={participant.isLocal}
                      className={`w-full h-full object-cover ${participant.isLocal ? 'scale-x-[-1]' : ''}`}
                    />
                  ) : (
                    // Avatar when video is off
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-secondary flex items-center justify-center text-4xl shadow-glow">
                        {participant.avatar?.startsWith('http') ? (
                          <img 
                            src={participant.avatar}
                            alt={participant.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{participant.avatar || '👤'}</span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Video Off Overlay */}
                  {!participant.isVideoEnabled && participant.stream && participant.type !== 'screen' && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <VideoOff className="w-12 h-12 text-white/70" />
                    </div>
                  )}
                </div>

                {/* Name and Status Bar */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm truncate max-w-[150px]">
                        {participant.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!participant.isAudioEnabled && participant.type !== 'screen' && (
                        <div className="bg-red-500/80 p-1.5 rounded-full">
                          <MicOff className="w-3 h-3 text-white" />
                        </div>
                      )}
                      {participant.isPinned && (
                        <div className="bg-blue-500/80 p-1.5 rounded-full">
                          <Pin className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Small Grid Below - Other Participants */}
              {unpinnedList.length > 0 && (
                <div className="h-32 md:h-40 shrink-0">
                  <div className="flex gap-2 md:gap-4 overflow-x-auto pb-2 h-full">
                    {unpinnedList.map((participant) => (
                      <div
                        key={participant.id}
                        className={`bg-card/70 backdrop-blur-glass border-2 border-border rounded-xl overflow-hidden shadow-glass hover:shadow-glow transition-all relative h-full aspect-video shrink-0 ${
                          participant.type === 'screen' ? 'ring-2 ring-purple-500' : ''
                        }`}
                        style={{ minWidth: '180px' }}
                      >
                        {/* Three Dots Menu */}
                        <div className="absolute top-2 right-2 z-10">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="focus:outline-none bg-black/30 backdrop-blur-sm rounded-full p-1 hover:bg-black/50">
                              <MoreVertical className="w-4 h-4 text-white cursor-pointer" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => togglePin(participant.id)}>
                                <Pin className="mr-2 h-4 w-4" />
                                <span>Pin</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Screen Share Badge */}
                        {participant.type === 'screen' && (
                          <div className="absolute top-2 left-2 z-10 bg-purple-600 px-2 py-0.5 rounded flex items-center gap-1">
                            <MonitorUp className="w-3 h-3 text-white" />
                            <span className="text-xs font-semibold text-white">Screen</span>
                          </div>
                        )}

                        {/* Host Badge */}
                        {participant.isHost && participant.type !== 'screen' && (
                          <div className="absolute top-2 left-2 z-10 bg-gradient-primary px-2 py-0.5 rounded flex items-center gap-1">
                            <Crown className="w-3 h-3 text-primary-foreground" />
                            <span className="text-xs font-semibold text-primary-foreground">Host</span>
                          </div>
                        )}

                        {/* Video Container */}
                        <div className="relative w-full h-full bg-gradient-to-br from-slate-900 to-slate-800">
                          {participant.type === 'screen' ? (
                            <video
                              ref={(el) => {
                                if (el && isScreenSharing) {
                                  localScreenRef.current = el;
                                  const screenTrack = localStream?.getVideoTracks()[0];
                                  if (screenTrack && el.srcObject !== localStream) {
                                    const screenStream = new MediaStream([screenTrack]);
                                    el.srcObject = screenStream;
                                  }
                                }
                              }}
                              autoPlay
                              playsInline
                              muted
                              className="w-full h-full object-contain bg-black"
                            />
                          ) : participant.isVideoEnabled && participant.stream ? (
                            <video
                              ref={(el) => {
                                if (el) {
                                  if (participant.isLocal) {
                                    localVideoRef.current = el;
                                    if (localStream) el.srcObject = localStream;
                                  } else {
                                    remoteVideoRefs.current[participant.id] = el;
                                    if (participant.stream) el.srcObject = participant.stream;
                                  }
                                }
                              }}
                              autoPlay
                              playsInline
                              muted={participant.isLocal}
                              className={`w-full h-full object-cover ${participant.isLocal ? 'scale-x-[-1]' : ''}`}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-secondary flex items-center justify-center text-2xl shadow-glow">
                                {participant.avatar?.startsWith('http') ? (
                                  <img 
                                    src={participant.avatar}
                                    alt={participant.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span>{participant.avatar || '👤'}</span>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {!participant.isVideoEnabled && participant.stream && participant.type !== 'screen' && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <VideoOff className="w-8 h-8 text-white/70" />
                            </div>
                          )}
                        </div>

                        {/* Name and Status Bar */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-white text-xs truncate max-w-[100px]">
                              {participant.name}
                            </span>
                            <div className="flex items-center gap-1">
                              {!participant.isAudioEnabled && participant.type !== 'screen' && (
                                <div className="bg-red-500/80 p-1 rounded-full">
                                  <MicOff className="w-2 h-2 text-white" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Original Grid View - When nothing is pinned */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4 w-full max-w-[2000px] mx-auto px-2">
              {sortedParticipants.map((participant) => (
                <div
                  key={participant.id}
                  className={`bg-card/70 backdrop-blur-glass border-2 border-border rounded-2xl overflow-hidden shadow-glass hover:shadow-glow transition-all relative aspect-video ${
                    participant.type === 'screen' ? 'ring-2 ring-purple-500' : ''
                  }`}
                >
                  {/* Three Dots Menu */}
                  <div className="absolute top-3 right-3 z-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="focus:outline-none bg-black/30 backdrop-blur-sm rounded-full p-1.5 hover:bg-black/50">
                        <MoreVertical className="w-5 h-5 text-white cursor-pointer" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => togglePin(participant.id)}>
                          {participant.isPinned ? (
                            <>
                              <PinOff className="mr-2 h-4 w-4" />
                              <span>Unpin</span>
                            </>
                          ) : (
                            <>
                              <Pin className="mr-2 h-4 w-4" />
                              <span>Pin</span>
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Screen Share Badge */}
                  {participant.type === 'screen' && (
                    <div className="absolute top-3 left-3 z-10 bg-purple-600 px-3 py-1 rounded-lg flex items-center gap-1 shadow-glow">
                      <MonitorUp className="w-3 h-3 text-white" />
                      <span className="text-xs font-semibold text-white">Screen Share</span>
                    </div>
                  )}

                  {/* Host Badge */}
                  {participant.isHost && participant.type !== 'screen' && (
                    <div className="absolute top-3 left-3 z-10 bg-gradient-primary px-3 py-1 rounded-lg flex items-center gap-1 shadow-glow">
                      <Crown className="w-3 h-3 text-primary-foreground" />
                      <span className="text-xs font-semibold text-primary-foreground">Host</span>
                    </div>
                  )}

                  {/* Video Container */}
                  <div className="relative w-full h-full bg-gradient-to-br from-slate-900 to-slate-800">
                    {participant.type === 'screen' ? (
                      <video
                        ref={(el) => {
                          if (el && isScreenSharing) {
                            localScreenRef.current = el;
                            const screenTrack = localStream?.getVideoTracks()[0];
                            if (screenTrack && el.srcObject !== localStream) {
                              const screenStream = new MediaStream([screenTrack]);
                              el.srcObject = screenStream;
                            }
                          }
                        }}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-contain bg-black"
                      />
                    ) : participant.isVideoEnabled && participant.stream ? (
                      <video
                        ref={(el) => {
                          if (el) {
                            if (participant.isLocal) {
                              localVideoRef.current = el;
                              if (localStream) el.srcObject = localStream;
                            } else {
                              remoteVideoRefs.current[participant.id] = el;
                              if (participant.stream) el.srcObject = participant.stream;
                            }
                          }
                        }}
                        autoPlay
                        playsInline
                        muted={participant.isLocal}
                        className={`w-full h-full object-cover ${participant.isLocal ? 'scale-x-[-1]' : ''}`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-secondary flex items-center justify-center text-4xl shadow-glow">
                          {participant.avatar?.startsWith('http') ? (
                            <img 
                              src={participant.avatar}
                              alt={participant.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{participant.avatar || '👤'}</span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {!participant.isVideoEnabled && participant.stream && participant.type !== 'screen' && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <VideoOff className="w-12 h-12 text-white/70" />
                      </div>
                    )}
                  </div>

                  {/* Name and Status Bar */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm truncate max-w-[150px]">
                          {participant.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {!participant.isAudioEnabled && participant.type !== 'screen' && (
                          <div className="bg-red-500/80 p-1.5 rounded-full">
                            <MicOff className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {sortedParticipants.length === 1 && (
            <div className="text-center mt-8 text-muted-foreground">
              <p>Waiting for others to join...</p>
              <p className="text-sm mt-2">Share the room ID with others to start the meeting</p>
            </div>
          )}
        </div>

        {/* Chat Panel - Overlay on mobile, sidebar on desktop */}
        {showChat && (
          <div className={`${
            isMobile 
              ? 'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm'
              : 'w-80 border-l'
          } flex items-end md:items-stretch`}>
            <div className={`${
              isMobile
                ? 'w-full h-2/3 rounded-t-3xl'
                : 'w-full h-full'
            } bg-card/95 backdrop-blur-glass border-border flex flex-col`}>
              <div className="p-4 border-b border-border flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Chat</h3>
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                    {rtcMessages.length}
                  </span>
                </div>
                <Button
                  onClick={() => setShowChat(false)}
                  size="sm"
                  variant="ghost"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Messages - Scrollable */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {rtcMessages.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm mt-8">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No messages yet</p>
                    <p className="text-xs mt-1">Start the conversation!</p>
                  </div>
                ) : (
                  rtcMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`${
                        msg.sender === (user?.username || 'Anonymous')
                          ? 'ml-auto bg-gradient-primary text-primary-foreground'
                          : 'mr-auto bg-muted'
                      } max-w-[80%] p-3 rounded-xl`}
                    >
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <span className="text-xs font-semibold">{msg.sender}</span>
                        <span className="text-xs opacity-70">
                          {new Date(msg.timestamp).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                      <p className="text-sm break-words">{msg.text}</p>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>
              
              {/* Message Input */}
              <div className="p-4 border-t border-border shrink-0">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    className="bg-background/50 border-border"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!message.trim()}
                    className="bg-gradient-primary hover:opacity-90 text-primary-foreground disabled:opacity-50"
                  >
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="bg-card/70 backdrop-blur-glass border-t border-border p-4">
        <div className="max-w-2xl mx-auto flex justify-center items-center gap-3">
          <Button
            onClick={toggleVideo}
            size="lg"
            disabled={!localStream}
            className={`rounded-full w-14 h-14 ${
              isVideoEnabled
                ? 'bg-muted hover:bg-muted/80'
                : 'bg-destructive hover:bg-destructive/90'}`}
          >
            {isVideoEnabled ? (
              <Video className="w-6 h-6" />
            ) : (
              <VideoOff className="w-6 h-6" />
            )}
          </Button>
          
          <Button
            onClick={toggleAudio}
            size="lg"
            disabled={!localStream}
            className={`rounded-full w-14 h-14 ${
              isAudioEnabled
                ? 'bg-muted hover:bg-muted/80'
                : 'bg-destructive hover:bg-destructive/90'}`}
          >
            {isAudioEnabled ? (
              <Mic className="w-6 h-6" />
            ) : (
              <MicOff className="w-6 h-6" />
            )}
          </Button>
          
          <Button
            onClick={handleScreenShare}
            size="lg"
            disabled={!localStream}
            className={`rounded-full w-14 h-14 ${
              isScreenSharing
                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-glow'
                : 'bg-muted hover:bg-muted/80'}`}
          >
            {isScreenSharing ? (
              <MonitorOff className="w-6 h-6" />
            ) : (
              <Monitor className="w-6 h-6" />
            )}
          </Button>
          
          <Button
            onClick={() => setShowChat(!showChat)}
            size="lg"
            className={`rounded-full w-14 h-14 relative ${
              showChat
                ? 'bg-gradient-primary text-primary-foreground shadow-glow'
                : 'bg-muted hover:bg-muted/80'}`}
          >
            <MessageSquare className="w-6 h-6" />
            {rtcMessages.length > 0 && !showChat && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                {rtcMessages.length > 9 ? '9+' : rtcMessages.length}
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Room;