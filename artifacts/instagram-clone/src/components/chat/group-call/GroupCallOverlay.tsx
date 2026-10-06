import { useState, useEffect, useRef, useCallback } from "react";
import { getSocket } from "@/lib/socket";
import { DecoratedAvatar } from "@/components/DecoratedAvatar";
import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/api-url";
import {
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  SwitchCamera,
  Users,
  LayoutGrid,
  UserCheck,
  Shield,
  X,
  Wifi,
  Sparkles,
  ChevronRight,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  GroupCallConnectionManager,
  type RemotePeer,
} from "./GroupCallConnectionManager";

export interface GroupCallSessionState {
  active: boolean;
  roomId: string;
  conversationId: string;
  groupName: string;
  groupAvatarUrl?: string | null;
  callType: "voice" | "video";
  createdBy: string;
  status: "idle" | "joining" | "connected" | "ended" | "reconnecting" | "full" | "error";
  initialParticipants?: Array<{
    userId: string;
    username: string;
    fullName?: string;
    avatarUrl?: string;
    isMuted?: boolean;
    isCameraOff?: boolean;
  }>;
}

interface GroupCallOverlayProps {
  session: GroupCallSessionState | null;
  onClose: () => void;
  myUserId: string;
  myUser?: {
    username?: string;
    fullName?: string;
    avatarUrl?: string;
    activeDecorationId?: string;
  } | null;
  isGroupAdmin?: boolean;
  isMinimized?: boolean;
  onMinimizedChange?: (minimized: boolean) => void;
}

export function GroupCallOverlay({
  session,
  onClose,
  myUserId,
  myUser,
  isGroupAdmin = false,
  isMinimized: controlledMinimized,
  onMinimizedChange,
}: GroupCallOverlayProps) {
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(session?.callType === "voice");
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [localMinimized, setLocalMinimized] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "speaker">("grid");
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [showParticipantsDrawer, setShowParticipantsDrawer] = useState(false);
  const [duration, setDuration] = useState(0);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isLocallySpeaking, setIsLocallySpeaking] = useState(false);

  const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "reconnecting">("connecting");

  const isMinimized = controlledMinimized !== undefined ? controlledMinimized : localMinimized;
  const setIsMinimized = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof val === "function" ? val(isMinimized) : val;
    setLocalMinimized(nextVal);
    onMinimizedChange?.(nextVal);
  }, [isMinimized, onMinimizedChange]);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const managerRef = useRef<GroupCallConnectionManager | null>(null);
  const timerRef = useRef<any>(null);

  // Format call duration MM:SS
  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Timer lifecycle
  useEffect(() => {
    if (session?.active) {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session?.active]);

  // Handle local video element binding
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, cameraOff]);

  // Main WebRTC Mesh Setup & Socket Integration
  useEffect(() => {
    if (!session?.active || !session.roomId) {
      return;
    }

    const socket = getSocket();
    if (!socket) return;

    setConnectionStatus("connecting");
    const manager = new GroupCallConnectionManager(
      myUserId,
      session.roomId,
      session.callType,
      {
        onRemotePeerAdded: (peer) => {
          setRemotePeers(prev => {
            if (prev.some(p => p.userId === peer.userId)) return prev;
            return [...prev, peer];
          });
          setConnectionStatus("connected");
        },
        onRemotePeerUpdated: (userId, updates) => {
          setRemotePeers(prev => prev.map(p => {
            if (p.userId === userId) {
              return { ...p, ...updates };
            }
            return p;
          }));
        },
        onRemotePeerRemoved: (userId) => {
          setRemotePeers(prev => prev.filter(p => p.userId !== userId));
          if (activeSpeakerId === userId) {
            setActiveSpeakerId(null);
          }
        },
        onLocalStreamReady: (stream) => {
          setLocalStream(stream);
          setConnectionStatus("connected");
        },
        onLocalSpeaking: (isSpeaking) => {
          setIsLocallySpeaking(isSpeaking);
          if (isSpeaking) {
            setActiveSpeakerId(myUserId);
          }
        },
        onError: (err) => {
          console.warn("[GroupCall] Manager error:", err);
        },
        sendSignal: (targetUserId, signal) => {
          socket.emit("group_call_signal", {
            roomId: session.roomId,
            targetUserId,
            signal,
          });
        },
        sendMediaToggle: (mediaType, enabled) => {
          socket.emit("group_call_toggle_media", {
            roomId: session.roomId,
            mediaType,
            enabled,
          });
        },
        sendSpeaking: (isSpeaking) => {
          socket.emit("group_call_speaking", {
            roomId: session.roomId,
            isSpeaking,
          });
        },
      }
    );

    managerRef.current = manager;

    // Start local media stream
    manager.initializeLocalMedia(facingMode).then(() => {
      // Announce join to the socket room
      socket.emit("group_call_join_room", {
        roomId: session.roomId,
        conversationId: session.conversationId,
        user: {
          id: myUserId,
          username: myUser?.username || "User",
          fullName: myUser?.fullName,
          avatarUrl: myUser?.avatarUrl,
          activeDecorationId: myUser?.activeDecorationId,
        },
      });
    }).catch(() => {
      setConnectionStatus("connecting");
    });

    // Socket Event Listeners
    const onUserJoined = (data: any) => {
      if (data.userId && data.userId !== myUserId) {
        manager.handleUserJoined(data.user || { id: data.userId, username: "User" });
      }
    };

    const onSignalReceived = (data: any) => {
      if (data.senderId && data.signal) {
        manager.handleSignal(data.senderId, data.signal);
      }
    };

    const onPeerMediaToggled = (data: any) => {
      if (data.userId) {
        manager.handlePeerMediaToggled(data.userId, data.mediaType, data.enabled);
      }
    };

    const onPeerSpeaking = (data: any) => {
      if (data.userId) {
        manager.handlePeerSpeaking(data.userId, data.isSpeaking);
        if (data.isSpeaking) {
          setActiveSpeakerId(data.userId);
        }
      }
    };

    const onUserLeft = (data: any) => {
      if (data.userId) {
        manager.handleUserLeft(data.userId);
      }
    };

    const onCallEnded = () => {
      onClose();
    };

    socket.on("group_call_user_joined", onUserJoined);
    socket.on("group_call_signal_received", onSignalReceived);
    socket.on("group_call_peer_media_toggled", onPeerMediaToggled);
    socket.on("group_call_peer_speaking", onPeerSpeaking);
    socket.on("group_call_user_left", onUserLeft);
    socket.on("group_call_ended", onCallEnded);

    return () => {
      socket.emit("group_call_leave_room", { roomId: session.roomId, conversationId: session.conversationId });
      socket.off("group_call_user_joined", onUserJoined);
      socket.off("group_call_signal_received", onSignalReceived);
      socket.off("group_call_peer_media_toggled", onPeerMediaToggled);
      socket.off("group_call_peer_speaking", onPeerSpeaking);
      socket.off("group_call_user_left", onUserLeft);
      socket.off("group_call_ended", onCallEnded);

      manager.dispose();
      managerRef.current = null;
      setRemotePeers([]);
      setLocalStream(null);
    };
  }, [session?.active, session?.roomId, myUserId]);

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    managerRef.current?.toggleMute(next);
  };

  const handleToggleCamera = () => {
    if (session?.callType === "voice") return;
    const next = !cameraOff;
    setCameraOff(next);
    managerRef.current?.toggleCamera(next);
  };

  const handleSwitchCamera = () => {
    const nextFacing = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextFacing);
    managerRef.current?.switchCamera(nextFacing);
  };

  const handleLeaveCall = async () => {
    if (session?.roomId) {
      const tok = localStorage.getItem("pixlr_token") || localStorage.getItem("whiterchat_token") || "";
      fetch(apiUrl(`/api/group-calls/${session.roomId}/leave`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
      }).catch(() => {});
    }
    onClose();
  };

  const handleEndCallForEveryone = async () => {
    if (session?.roomId && (isGroupAdmin || session.createdBy === myUserId)) {
      const tok = localStorage.getItem("pixlr_token") || localStorage.getItem("whiterchat_token") || "";
      fetch(apiUrl(`/api/group-calls/${session.roomId}/end`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
      }).catch(() => {});
    }
    onClose();
  };

  if (!session?.active) return null;

  const totalParticipants = remotePeers.length + 1;
  const isHost = session.createdBy === myUserId || isGroupAdmin;

  // ── Floating Minimized PIP View ──────────────────────────────────────────
  if (isMinimized) {
    return (
      <div
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-20 right-4 z-50 w-72 bg-card/95 backdrop-blur-xl border border-border/80 rounded-2xl shadow-2xl overflow-hidden cursor-pointer hover:scale-102 transition-all group select-none animate-in fade-in slide-in-from-bottom-4"
      >
        <div className="p-3 flex items-center justify-between gap-3 border-b border-border/40 bg-secondary/30">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-bold text-xs truncate text-foreground">{session.groupName}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-mono text-muted-foreground">{formatDuration(duration)}</span>
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6 rounded-full hover:bg-secondary"
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(false);
              }}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="p-3 flex items-center justify-between">
          <div className="flex -space-x-2 overflow-hidden">
            <DecoratedAvatar
              avatarUrl={myUser?.avatarUrl}
              decorationId={myUser?.activeDecorationId}
              username={myUser?.username}
              size="sm"
              className="ring-2 ring-card"
            />
            {remotePeers.slice(0, 3).map(peer => (
              <DecoratedAvatar
                key={peer.userId}
                avatarUrl={peer.user.avatarUrl}
                decorationId={peer.user.activeDecorationId}
                username={peer.user.username}
                size="sm"
                className="ring-2 ring-card"
              />
            ))}
          </div>
          <span className="text-xs font-semibold text-primary">{totalParticipants} in call</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-2xl flex flex-col text-foreground overflow-hidden select-none animate-in fade-in duration-300">
      {/* ── Top Navigation / Room Header ── */}
      <header className="px-4 py-3 sm:px-6 flex items-center justify-between border-b border-border/60 bg-card/60 backdrop-blur-md z-30 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold overflow-hidden shadow-md">
              {session.groupAvatarUrl ? (
                <img src={session.groupAvatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <Users className="w-5 h-5" />
              )}
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-card" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base text-foreground truncate">{session.groupName}</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {session.callType === "video" ? "Video Room" : "Voice Room"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
              <span className="text-emerald-500 font-semibold">{totalParticipants} / 8 in room</span>
              <span>•</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {session.callType === "video" && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-full px-3 text-xs gap-1.5 hidden sm:flex border-border/80 hover:bg-secondary"
              onClick={() => setViewMode(prev => prev === "grid" ? "speaker" : "grid")}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{viewMode === "grid" ? "Speaker View" : "Grid View"}</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9 rounded-full hover:bg-secondary"
            onClick={() => setShowParticipantsDrawer(prev => !prev)}
            title="Participants List"
          >
            <Users className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9 rounded-full hover:bg-secondary"
            onClick={() => setIsMinimized(true)}
            title="Minimize call"
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* ── Main Media Stage (Voice / Video Grid) ── */}
      <main className="flex-1 min-h-0 relative p-2 sm:p-4 flex items-center justify-center overflow-hidden">
        {session.callType === "voice" ? (
          /* Voice Room Circular Podium Grid */
          <div className="w-full max-w-4xl h-full flex items-center justify-center">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6 p-4 w-full auto-rows-fr">
              {/* Local Participant */}
              <VoiceParticipantTile
                username={myUser?.username || "You"}
                displayName={myUser?.fullName || myUser?.username || "You"}
                avatarUrl={myUser?.avatarUrl}
                decorationId={myUser?.activeDecorationId}
                isMuted={muted}
                isSpeaking={isLocallySpeaking}
                isSelf={true}
              />

              {/* Remote Participants */}
              {remotePeers.map(peer => (
                <VoiceParticipantTile
                  key={peer.userId}
                  username={peer.user.username}
                  displayName={peer.user.fullName || peer.user.username}
                  avatarUrl={peer.user.avatarUrl}
                  decorationId={peer.user.activeDecorationId}
                  isMuted={peer.isMuted}
                  isSpeaking={peer.isSpeaking}
                  isSelf={false}
                  stream={peer.stream}
                />
              ))}
            </div>
          </div>
        ) : (
          /* Video Room Dynamic Responsive Grid */
          <div className="w-full h-full flex items-center justify-center">
            <div className={cn(
              "w-full h-full grid gap-2 sm:gap-3 p-1 sm:p-2",
              totalParticipants === 1 && "grid-cols-1",
              totalParticipants === 2 && "grid-cols-1 sm:grid-cols-2",
              totalParticipants === 3 && "grid-cols-2 sm:grid-cols-3",
              totalParticipants === 4 && "grid-cols-2 grid-rows-2",
              totalParticipants >= 5 && totalParticipants <= 6 && "grid-cols-2 sm:grid-cols-3 grid-rows-2",
              totalParticipants >= 7 && "grid-cols-2 sm:grid-cols-4 grid-rows-2",
            )}>
              {/* Local Video Tile */}
              <div className={cn(
                "relative rounded-2xl overflow-hidden bg-secondary/40 border border-border/80 flex items-center justify-center shadow-lg group transition-all",
                isLocallySpeaking && "ring-2 ring-emerald-500"
              )}>
                {cameraOff ? (
                  <div className="flex flex-col items-center gap-3">
                    <DecoratedAvatar
                      avatarUrl={myUser?.avatarUrl}
                      decorationId={myUser?.activeDecorationId}
                      username={myUser?.username}
                      size="2xl"
                      className="shadow-xl"
                    />
                    <span className="text-xs font-semibold text-muted-foreground">Camera is off</span>
                  </div>
                ) : (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                )}
                {/* Tile Info Bar */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-2.5 py-1 rounded-xl bg-background/80 backdrop-blur-md text-xs font-semibold">
                  <span className="truncate">{myUser?.username || "You"} (You)</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {muted && <MicOff className="w-3.5 h-3.5 text-red-500" />}
                  </div>
                </div>
              </div>

              {/* Remote Video Tiles */}
              {remotePeers.map(peer => (
                <RemoteVideoTile
                  key={peer.userId}
                  peer={peer}
                  isActiveSpeaker={activeSpeakerId === peer.userId}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Side Participants Drawer ── */}
        {showParticipantsDrawer && (
          <aside className="absolute right-0 top-0 bottom-0 w-80 max-w-[85%] bg-card/95 backdrop-blur-2xl border-l border-border/80 z-40 p-4 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Room Members ({totalParticipants}/8)</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 rounded-full"
                onClick={() => setShowParticipantsDrawer(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {/* Local user row */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-secondary/50">
                <div className="flex items-center gap-2.5 min-w-0">
                  <DecoratedAvatar
                    avatarUrl={myUser?.avatarUrl}
                    decorationId={myUser?.activeDecorationId}
                    username={myUser?.username}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate text-foreground">{myUser?.username || "You"} (You)</div>
                    <div className="text-[10px] text-emerald-500 font-medium">Connected</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {muted ? <MicOff className="w-3.5 h-3.5 text-red-500" /> : <Mic className="w-3.5 h-3.5 text-emerald-500" />}
                  {isHost && (
                    <span title="Host / Admin">
                      <Shield className="w-3.5 h-3.5 text-amber-500" />
                    </span>
                  )}
                </div>
              </div>

              {/* Remote peers rows */}
              {remotePeers.map(peer => (
                <div key={peer.userId} className="flex items-center justify-between p-2 rounded-xl hover:bg-secondary/40 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <DecoratedAvatar
                      avatarUrl={peer.user.avatarUrl}
                      decorationId={peer.user.activeDecorationId}
                      username={peer.user.username}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate text-foreground">{peer.user.username}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{peer.user.fullName || "Member"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {peer.isMuted ? <MicOff className="w-3.5 h-3.5 text-red-500" /> : <Mic className="w-3.5 h-3.5 text-emerald-500" />}
                    {session.createdBy === peer.userId && (
                      <span title="Host">
                        <Shield className="w-3.5 h-3.5 text-amber-500" />
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}
      </main>

      {/* ── Bottom Call Controls ── */}
      <footer className="p-3 sm:p-5 flex items-center justify-center gap-3 sm:gap-4 bg-card/80 backdrop-blur-xl border-t border-border/60 z-30 shrink-0">
        {/* Microphone Mute Toggle */}
        <Button
          variant={muted ? "destructive" : "secondary"}
          size="icon"
          className={cn(
            "w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg transition-transform active:scale-95",
            !muted && "hover:bg-secondary/90"
          )}
          onClick={handleToggleMute}
          title={muted ? "Unmute microphone" : "Mute microphone"}
        >
          {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </Button>

        {/* Camera Toggle (Video room only) */}
        {session.callType === "video" && (
          <Button
            variant={cameraOff ? "destructive" : "secondary"}
            size="icon"
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg transition-transform active:scale-95"
            onClick={handleToggleCamera}
            title={cameraOff ? "Turn camera on" : "Turn camera off"}
          >
            {cameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </Button>
        )}

        {/* Switch Camera (Mobile Video only) */}
        {session.callType === "video" && !cameraOff && (
          <Button
            variant="secondary"
            size="icon"
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg hover:bg-secondary/90 transition-transform active:scale-95"
            onClick={handleSwitchCamera}
            title="Switch front/back camera"
          >
            <SwitchCamera className="w-5 h-5" />
          </Button>
        )}

        {/* Audio Output Speaker Toggle */}
        <Button
          variant="secondary"
          size="icon"
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg hover:bg-secondary/90 transition-transform active:scale-95"
          onClick={() => setIsSpeakerOn(prev => !prev)}
          title={isSpeakerOn ? "Mute speaker output" : "Enable speaker output"}
        >
          {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </Button>

        {/* Leave Call Button */}
        <Button
          variant="destructive"
          className="h-12 sm:h-14 px-5 sm:px-7 rounded-full shadow-xl font-bold text-sm gap-2 transition-transform active:scale-95 bg-red-600 hover:bg-red-700 text-white"
          onClick={handleLeaveCall}
        >
          <PhoneOff className="w-5 h-5" />
          <span>Leave</span>
        </Button>

        {/* End Call for Everyone (Host / Admin only) */}
        {isHost && (
          <Button
            variant="outline"
            className="h-12 sm:h-14 px-4 rounded-full border-red-500/40 text-red-500 hover:bg-red-500/10 font-semibold text-xs hidden md:inline-flex"
            onClick={handleEndCallForEveryone}
          >
            End Room
          </Button>
        )}
      </footer>
    </div>
  );
}

// ── Voice Room Participant Podium ──────────────────────────────────────────
function VoiceParticipantTile({
  username,
  displayName,
  avatarUrl,
  decorationId,
  isMuted,
  isSpeaking,
  isSelf,
  stream,
}: {
  username: string;
  displayName: string;
  avatarUrl?: string;
  decorationId?: string;
  isMuted?: boolean;
  isSpeaking?: boolean;
  isSelf: boolean;
  stream?: MediaStream;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current && stream && !isSelf) {
      audioRef.current.srcObject = stream;
    }
  }, [stream, isSelf]);

  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-4 rounded-3xl bg-secondary/30 border border-border/80 relative shadow-lg transition-all duration-300",
      isSpeaking && "border-emerald-500 bg-emerald-500/[0.04] shadow-emerald-500/10 scale-102"
    )}>
      {/* Audio element for remote streams */}
      {!isSelf && <audio ref={audioRef} autoPlay playsInline />}

      <div className="relative mb-3">
        {/* Animated Speaking Ring Wave */}
        {isSpeaking && (
          <span className="absolute -inset-2 rounded-full border-2 border-emerald-500 animate-ping opacity-60 pointer-events-none" />
        )}
        <DecoratedAvatar
          avatarUrl={avatarUrl}
          decorationId={decorationId}
          username={username}
          size="2xl"
          className={cn(
            "transition-transform shadow-xl",
            isSpeaking && "ring-4 ring-emerald-500 ring-offset-2 ring-offset-card"
          )}
        />
        {isMuted && (
          <span className="absolute bottom-0 right-0 p-1.5 rounded-full bg-red-600 text-white shadow-md border-2 border-card">
            <MicOff className="w-3 h-3" />
          </span>
        )}
      </div>

      <div className="text-center w-full min-w-0">
        <p className="font-bold text-sm text-foreground truncate">{displayName} {isSelf && "(You)"}</p>
        <p className="text-xs text-muted-foreground truncate">@{username}</p>
      </div>

      {isSpeaking && (
        <span className="mt-2 text-[10px] font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1">
          <Radio className="w-3 h-3 animate-pulse" /> Speaking
        </span>
      )}
    </div>
  );
}

// ── Remote Video Tile with Stream Binding ───────────────────────────────────
function RemoteVideoTile({
  peer,
  isActiveSpeaker,
}: {
  peer: RemotePeer;
  isActiveSpeaker: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && peer.stream) {
      videoRef.current.srcObject = peer.stream;
    }
  }, [peer.stream, peer.isCameraOff]);

  return (
    <div className={cn(
      "relative rounded-2xl overflow-hidden bg-secondary/40 border border-border/80 flex items-center justify-center shadow-lg group transition-all",
      (isActiveSpeaker || peer.isSpeaking) && "ring-2 ring-emerald-500"
    )}>
      {peer.isCameraOff ? (
        <div className="flex flex-col items-center gap-3">
          <DecoratedAvatar
            avatarUrl={peer.user.avatarUrl}
            decorationId={peer.user.activeDecorationId}
            username={peer.user.username}
            size="2xl"
            className="shadow-xl"
          />
          <span className="text-xs font-semibold text-muted-foreground">Camera is off</span>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      )}

      {/* Tile Info Bar */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-2.5 py-1 rounded-xl bg-background/80 backdrop-blur-md text-xs font-semibold">
        <span className="truncate">{peer.user.username}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {peer.isMuted && <MicOff className="w-3.5 h-3.5 text-red-500" />}
          {peer.isSpeaking && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
        </div>
      </div>
    </div>
  );
}
