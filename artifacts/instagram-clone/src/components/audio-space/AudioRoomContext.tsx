import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth";
import { getSocket } from "@/lib/socket";
import { apiUrl } from "@/lib/api-url";
import type {
  AudioRoomMetadata,
  AudioRoomParticipant,
  AudioRoomRole,
  AudioRoomSessionState,
  SpeakerRequest,
  AudioRoomReaction,
  AudioRoomCategory,
  AudioRoomVisibility,
} from "@/types/audio-room";
import {
  AudioRoomConnectionManager,
  type RemoteAudioPeer,
} from "./AudioRoomConnectionManager";

export interface AudioRoomContextValue {
  session: AudioRoomSessionState | null;
  isMinimized: boolean;
  setIsMinimized: (val: boolean | ((prev: boolean) => boolean)) => void;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  activePeerList: RemoteAudioPeer[];
  
  // Actions
  createAndStartRoom: (data: {
    title: string;
    description?: string;
    category: AudioRoomCategory;
    topic?: string;
    visibility: AudioRoomVisibility;
    groupId?: string;
    groupName?: string;
  }) => Promise<AudioRoomMetadata>;
  joinRoom: (room: AudioRoomMetadata | string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  endRoom: () => Promise<void>;
  toggleMute: () => void;
  raiseHand: () => void;
  cancelRaiseHand: () => void;
  acceptSpeakerRequest: (requestId: string, targetUserId: string) => void;
  rejectSpeakerRequest: (requestId: string) => void;
  demoteSpeakerToListener: (targetUserId: string) => void;
  muteRemoteSpeaker: (targetUserId: string) => void;
  assignCoHost: (targetUserId: string) => void;
  removeCoHost: (targetUserId: string) => void;
  kickParticipant: (targetUserId: string) => void;
  sendReaction: (emoji: string) => void;
}

const AudioRoomContext = createContext<AudioRoomContextValue | null>(null);

export function AudioRoomProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [session, setSession] = useState<AudioRoomSessionState | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activePeers, setActivePeers] = useState<RemoteAudioPeer[]>([]);

  const managerRef = useRef<AudioRoomConnectionManager | null>(null);
  const sessionRef = useRef<AudioRoomSessionState | null>(null);
  sessionRef.current = session;

  const currentUserId = user?.id || "";

  // ── Cleanup Manager ──────────────────────────────────────────────────────────
  const cleanupManager = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.dispose();
      managerRef.current = null;
    }
    setActivePeers([]);
  }, []);

  // ── Create & Start Room (Host) ───────────────────────────────────────────────
  const createAndStartRoom = useCallback(
    async (data: {
      title: string;
      description?: string;
      category: AudioRoomCategory;
      topic?: string;
      visibility: AudioRoomVisibility;
      groupId?: string;
      groupName?: string;
    }): Promise<AudioRoomMetadata> => {
      if (!user) throw new Error("Authentication required");

      const roomId = `space-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const newRoom: AudioRoomMetadata = {
        id: roomId,
        title: data.title,
        description: data.description || null,
        category: data.category,
        topic: data.topic || null,
        visibility: data.visibility,
        groupId: data.groupId || null,
        groupName: data.groupName || null,
        hostId: user.id,
        hostUser: {
          id: user.id,
          username: user.username,
          fullName: user.fullName || user.username,
          avatarUrl: user.avatarUrl,
          activeDecorationId: user.activeDecorationId,
          isVerified: (user as any).isVerified,
        },
        coHostIds: [],
        speakerIds: [user.id],
        maxSpeakers: 8,
        maxListeners: 500,
        listenerCount: 0,
        status: "live",
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
      };

      // Notify backend / API
      const token = localStorage.getItem("pixlr_token") || localStorage.getItem("whiterchat_token") || "";
      fetch(apiUrl("/api/audio-rooms"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(newRoom),
      }).catch(() => {
        // Fallback gracefully
      });

      // Socket Emit
      const socket = getSocket();
      if (socket) {
        socket.emit("audio_room_create", {
          room: newRoom,
          user: {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl,
            activeDecorationId: user.activeDecorationId,
          },
        });
      }

      const initialParticipant: AudioRoomParticipant = {
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        activeDecorationId: user.activeDecorationId,
        role: "host",
        isMuted: false,
        isSpeaking: false,
        isHandRaised: false,
        joinedAt: new Date().toISOString(),
        connectionState: "connected",
      };

      const newSession: AudioRoomSessionState = {
        active: true,
        room: newRoom,
        myRole: "host",
        isMuted: false,
        isHandRaised: false,
        participants: [initialParticipant],
        speakerRequests: [],
        reactions: [],
        connectionStatus: "connected",
      };

      setSession(newSession);
      setIsMinimized(false);

      // Initialize WebRTC Mesh Manager
      cleanupManager();
      const manager = new AudioRoomConnectionManager(user.id, roomId, true, {
        onRemotePeerAdded: (peer) => {
          setActivePeers((prev) => [...prev.filter((p) => p.userId !== peer.userId), peer]);
        },
        onRemotePeerUpdated: (userId, updates) => {
          setActivePeers((prev) =>
            prev.map((p) => (p.userId === userId ? { ...p, ...updates } : p))
          );
          setSession((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              participants: prev.participants.map((part) =>
                part.userId === userId
                  ? {
                      ...part,
                      isMuted: updates.isMuted !== undefined ? updates.isMuted : part.isMuted,
                      isSpeaking: updates.isSpeaking !== undefined ? updates.isSpeaking : part.isSpeaking,
                    }
                  : part
              ),
            };
          });
        },
        onRemotePeerRemoved: (userId) => {
          setActivePeers((prev) => prev.filter((p) => p.userId !== userId));
        },
        onLocalStreamReady: () => {
          setSession((prev) => (prev ? { ...prev, connectionStatus: "connected" } : null));
        },
        onLocalSpeaking: (isSpeaking) => {
          setSession((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              participants: prev.participants.map((part) =>
                part.userId === user.id ? { ...part, isSpeaking } : part
              ),
            };
          });
        },
        onError: (err) => {
          console.warn("[AudioRoomManager] Error:", err);
        },
        sendSignal: (targetUserId, signal) => {
          socket?.emit("audio_room_signal", {
            roomId,
            targetUserId,
            signal,
          });
        },
        sendMediaToggle: (_type, enabled) => {
          socket?.emit("audio_room_toggle_mic", {
            roomId,
            enabled,
          });
        },
        sendSpeaking: (isSpeaking) => {
          socket?.emit("audio_room_speaking", {
            roomId,
            isSpeaking,
          });
        },
      });

      managerRef.current = manager;
      manager.initializeLocalAudio().catch(() => {
        // Fallback
      });

      return newRoom;
    },
    [user, cleanupManager]
  );

  // ── Join Room (Listener or Returning Speaker) ────────────────────────────────
  const joinRoom = useCallback(
    async (roomInput: AudioRoomMetadata | string) => {
      if (!user) throw new Error("Authentication required");

      let targetRoom: AudioRoomMetadata;
      if (typeof roomInput === "string") {
        const token = localStorage.getItem("pixlr_token") || localStorage.getItem("whiterchat_token") || "";
        try {
          const res = await fetch(apiUrl(`/api/audio-rooms/${roomInput}`), {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (!res.ok) throw new Error("Room not found");
          targetRoom = await res.json();
        } catch {
          throw new Error("Unable to join space");
        }
      } else {
        targetRoom = roomInput;
      }

      const isHost = targetRoom.hostId === user.id;
      const isCoHost = targetRoom.coHostIds?.includes(user.id);
      const isSpeaker = isHost || isCoHost || targetRoom.speakerIds?.includes(user.id);
      const role: AudioRoomRole = isHost ? "host" : isCoHost ? "co-host" : isSpeaker ? "speaker" : "listener";

      const selfParticipant: AudioRoomParticipant = {
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        activeDecorationId: user.activeDecorationId,
        role,
        isMuted: false,
        isSpeaking: false,
        isHandRaised: false,
        joinedAt: new Date().toISOString(),
        connectionState: "connected",
      };

      const socket = getSocket();
      if (socket) {
        socket.emit("audio_room_join", {
          roomId: targetRoom.id,
          user: {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl,
            activeDecorationId: user.activeDecorationId,
            role,
          },
        });
      }

      const newSession: AudioRoomSessionState = {
        active: true,
        room: targetRoom,
        myRole: role,
        isMuted: false,
        isHandRaised: false,
        participants: [selfParticipant],
        speakerRequests: [],
        reactions: [],
        connectionStatus: "connected",
      };

      setSession(newSession);
      setIsMinimized(false);

      // Initialize WebRTC Mesh
      cleanupManager();
      const manager = new AudioRoomConnectionManager(user.id, targetRoom.id, isSpeaker, {
        onRemotePeerAdded: (peer) => {
          setActivePeers((prev) => [...prev.filter((p) => p.userId !== peer.userId), peer]);
        },
        onRemotePeerUpdated: (userId, updates) => {
          setActivePeers((prev) =>
            prev.map((p) => (p.userId === userId ? { ...p, ...updates } : p))
          );
          setSession((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              participants: prev.participants.map((part) =>
                part.userId === userId
                  ? {
                      ...part,
                      isMuted: updates.isMuted !== undefined ? updates.isMuted : part.isMuted,
                      isSpeaking: updates.isSpeaking !== undefined ? updates.isSpeaking : part.isSpeaking,
                    }
                  : part
              ),
            };
          });
        },
        onRemotePeerRemoved: (userId) => {
          setActivePeers((prev) => prev.filter((p) => p.userId !== userId));
        },
        onLocalStreamReady: () => {},
        onLocalSpeaking: (isSpeaking) => {
          setSession((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              participants: prev.participants.map((part) =>
                part.userId === user.id ? { ...part, isSpeaking } : part
              ),
            };
          });
        },
        onError: (err) => console.warn("[AudioRoomManager] Error:", err),
        sendSignal: (targetUserId, signal) => {
          socket?.emit("audio_room_signal", {
            roomId: targetRoom.id,
            targetUserId,
            signal,
          });
        },
        sendMediaToggle: (_type, enabled) => {
          socket?.emit("audio_room_toggle_mic", {
            roomId: targetRoom.id,
            enabled,
          });
        },
        sendSpeaking: (isSpeaking) => {
          socket?.emit("audio_room_speaking", {
            roomId: targetRoom.id,
            isSpeaking,
          });
        },
      });

      managerRef.current = manager;

      // If joined as Host/Speaker, initialize local audio track
      if (isSpeaker) {
        manager.initializeLocalAudio().catch(() => {});
      }
    },
    [user, cleanupManager]
  );

  // ── End Room (Host/Admin) ────────────────────────────────────────────────────
  const endRoom = useCallback(async () => {
    const currentSession = sessionRef.current;
    if (currentSession?.room?.id) {
      const socket = getSocket();
      socket?.emit("audio_room_end", {
        roomId: currentSession.room.id,
        userId: currentUserId,
      });

      const token = localStorage.getItem("pixlr_token") || localStorage.getItem("whiterchat_token") || "";
      fetch(apiUrl(`/api/audio-rooms/${currentSession.room.id}/end`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }).catch(() => {});
    }

    cleanupManager();
    setSession(null);
    setIsMinimized(false);
  }, [currentUserId, cleanupManager]);

  // ── Leave Room ───────────────────────────────────────────────────────────────
  const leaveRoom = useCallback(async () => {
    const currentSession = sessionRef.current;
    if (currentSession?.room?.id) {
      const isHost = currentSession.room.hostId === currentUserId;
      if (isHost) {
        await endRoom();
        return;
      }

      const socket = getSocket();
      socket?.emit("audio_room_leave", {
        roomId: currentSession.room.id,
        userId: currentUserId,
      });

      const token = localStorage.getItem("pixlr_token") || localStorage.getItem("whiterchat_token") || "";
      fetch(apiUrl(`/api/audio-rooms/${currentSession.room.id}/leave`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }).catch(() => {});
    }

    cleanupManager();
    setSession(null);
    setIsMinimized(false);
  }, [currentUserId, cleanupManager, endRoom]);

  // ── Toggle Microphone (Speaker/Host) ─────────────────────────────────────────
  const toggleMute = useCallback(() => {
    setSession((prev) => {
      if (!prev) return null;
      const nextMuted = !prev.isMuted;
      managerRef.current?.toggleMute(nextMuted);
      return {
        ...prev,
        isMuted: nextMuted,
        participants: prev.participants.map((p) =>
          p.userId === currentUserId ? { ...p, isMuted: nextMuted } : p
        ),
      };
    });
  }, [currentUserId]);

  // ── Raise Hand (Listener) ────────────────────────────────────────────────────
  const raiseHand = useCallback(() => {
    if (!session?.room?.id || !user) return;
    const socket = getSocket();
    const request: SpeakerRequest = {
      id: `req-${Date.now()}-${user.id}`,
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      activeDecorationId: user.activeDecorationId,
      requestedAt: new Date().toISOString(),
      status: "pending",
    };

    socket?.emit("audio_room_raise_hand", {
      roomId: session.room.id,
      request,
    });

    setSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        isHandRaised: true,
        participants: prev.participants.map((p) =>
          p.userId === user.id ? { ...p, isHandRaised: true } : p
        ),
      };
    });
  }, [session?.room?.id, user]);

  // ── Cancel Raise Hand ────────────────────────────────────────────────────────
  const cancelRaiseHand = useCallback(() => {
    if (!session?.room?.id || !user) return;
    const socket = getSocket();
    socket?.emit("audio_room_cancel_raise_hand", {
      roomId: session.room.id,
      userId: user.id,
    });

    setSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        isHandRaised: false,
        participants: prev.participants.map((p) =>
          p.userId === user.id ? { ...p, isHandRaised: false } : p
        ),
      };
    });
  }, [session?.room?.id, user]);

  // ── Accept Speaker Request (Host/Co-host) ────────────────────────────────────
  const acceptSpeakerRequest = useCallback(
    (requestId: string, targetUserId: string) => {
      if (!session?.room?.id) return;
      const socket = getSocket();
      socket?.emit("audio_room_accept_speaker", {
        roomId: session.room.id,
        requestId,
        targetUserId,
      });

      setSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          speakerRequests: prev.speakerRequests.filter((r) => r.id !== requestId),
          participants: prev.participants.map((p) =>
            p.userId === targetUserId ? { ...p, role: "speaker", isHandRaised: false } : p
          ),
        };
      });
    },
    [session?.room?.id]
  );

  // ── Reject Speaker Request (Host/Co-host) ────────────────────────────────────
  const rejectSpeakerRequest = useCallback(
    (requestId: string) => {
      if (!session?.room?.id) return;
      const socket = getSocket();
      socket?.emit("audio_room_reject_speaker", {
        roomId: session.room.id,
        requestId,
      });

      setSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          speakerRequests: prev.speakerRequests.filter((r) => r.id !== requestId),
        };
      });
    },
    [session?.room?.id]
  );

  // ── Demote Speaker to Listener ───────────────────────────────────────────────
  const demoteSpeakerToListener = useCallback(
    (targetUserId: string) => {
      if (!session?.room?.id) return;
      const socket = getSocket();
      socket?.emit("audio_room_demote_speaker", {
        roomId: session.room.id,
        targetUserId,
      });

      if (targetUserId === currentUserId) {
        managerRef.current?.stepDownToListener();
      }

      setSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          myRole: targetUserId === currentUserId ? "listener" : prev.myRole,
          participants: prev.participants.map((p) =>
            p.userId === targetUserId ? { ...p, role: "listener", isSpeaking: false } : p
          ),
        };
      });
    },
    [session?.room?.id, currentUserId]
  );

  // ── Mute Remote Speaker (Host/Co-host) ────────────────────────────────────────
  const muteRemoteSpeaker = useCallback(
    (targetUserId: string) => {
      if (!session?.room?.id) return;
      const socket = getSocket();
      socket?.emit("audio_room_mute_speaker", {
        roomId: session.room.id,
        targetUserId,
      });
    },
    [session?.room?.id]
  );

  // ── Assign Co-Host ───────────────────────────────────────────────────────────
  const assignCoHost = useCallback(
    (targetUserId: string) => {
      if (!session?.room?.id) return;
      const socket = getSocket();
      socket?.emit("audio_room_assign_cohost", {
        roomId: session.room.id,
        targetUserId,
      });

      setSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          room: {
            ...prev.room,
            coHostIds: [...new Set([...prev.room.coHostIds, targetUserId])],
          },
          participants: prev.participants.map((p) =>
            p.userId === targetUserId ? { ...p, role: "co-host" } : p
          ),
        };
      });
    },
    [session?.room?.id]
  );

  // ── Remove Co-Host ───────────────────────────────────────────────────────────
  const removeCoHost = useCallback(
    (targetUserId: string) => {
      if (!session?.room?.id) return;
      const socket = getSocket();
      socket?.emit("audio_room_remove_cohost", {
        roomId: session.room.id,
        targetUserId,
      });

      setSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          room: {
            ...prev.room,
            coHostIds: prev.room.coHostIds.filter((id) => id !== targetUserId),
          },
          participants: prev.participants.map((p) =>
            p.userId === targetUserId ? { ...p, role: "speaker" } : p
          ),
        };
      });
    },
    [session?.room?.id]
  );

  // ── Kick Participant ─────────────────────────────────────────────────────────
  const kickParticipant = useCallback(
    (targetUserId: string) => {
      if (!session?.room?.id) return;
      const socket = getSocket();
      socket?.emit("audio_room_kick_user", {
        roomId: session.room.id,
        targetUserId,
      });

      setSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          participants: prev.participants.filter((p) => p.userId !== targetUserId),
        };
      });
    },
    [session?.room?.id]
  );

  // ── Live Reactions ───────────────────────────────────────────────────────────
  const sendReaction = useCallback(
    (emoji: string) => {
      if (!session?.room?.id || !user) return;
      const socket = getSocket();
      const reaction: AudioRoomReaction = {
        id: `react-${Date.now()}-${Math.random()}`,
        userId: user.id,
        username: user.username,
        emoji,
        timestamp: Date.now(),
      };

      socket?.emit("audio_room_reaction", {
        roomId: session.room.id,
        reaction,
      });

      setSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          reactions: [...prev.reactions.slice(-15), reaction],
        };
      });
    },
    [session?.room?.id, user]
  );

  // ── Real-Time Socket Event Listeners ─────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !session?.active) return;

    const onUserJoined = (data: any) => {
      if (!data?.user?.id || data.user.id === currentUserId) return;
      setSession((prev) => {
        if (!prev) return null;
        const exists = prev.participants.some((p) => p.userId === data.user.id);
        if (exists) return prev;
        const newPart: AudioRoomParticipant = {
          userId: data.user.id,
          username: data.user.username,
          fullName: data.user.fullName,
          avatarUrl: data.user.avatarUrl,
          activeDecorationId: data.user.activeDecorationId,
          role: data.user.role || "listener",
          isMuted: false,
          isSpeaking: false,
          isHandRaised: false,
          joinedAt: new Date().toISOString(),
          connectionState: "connected",
        };
        return {
          ...prev,
          participants: [...prev.participants, newPart],
          room: {
            ...prev.room,
            listenerCount: (prev.room.listenerCount || 0) + (data.user.role === "listener" ? 1 : 0),
          },
        };
      });

      managerRef.current?.handleUserJoined(data.user, data.user.role || "listener");
    };

    const onUserLeft = (data: any) => {
      if (!data?.userId) return;
      setSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          participants: prev.participants.filter((p) => p.userId !== data.userId),
          speakerRequests: prev.speakerRequests.filter((r) => r.userId !== data.userId),
        };
      });
      managerRef.current?.handleUserLeft(data.userId);
    };

    const onSignalReceived = (data: any) => {
      if (data?.senderId && data?.signal) {
        managerRef.current?.handleSignal(data.senderId, data.signal, data.senderUser);
      }
    };

    const onHandRaised = (data: any) => {
      if (!data?.request) return;
      setSession((prev) => {
        if (!prev) return null;
        if (prev.speakerRequests.some((r) => r.id === data.request.id)) return prev;
        return {
          ...prev,
          speakerRequests: [...prev.speakerRequests, data.request],
          participants: prev.participants.map((p) =>
            p.userId === data.request.userId ? { ...p, isHandRaised: true } : p
          ),
        };
      });
    };

    const onHandCancelled = (data: any) => {
      if (!data?.userId) return;
      setSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          speakerRequests: prev.speakerRequests.filter((r) => r.userId !== data.userId),
          participants: prev.participants.map((p) =>
            p.userId === data.userId ? { ...p, isHandRaised: false } : p
          ),
        };
      });
    };

    const onSpeakerPromoted = (data: any) => {
      if (!data?.targetUserId) return;
      const isMe = data.targetUserId === currentUserId;

      if (isMe) {
        managerRef.current?.initializeLocalAudio().catch(() => {});
      }

      setSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          myRole: isMe ? "speaker" : prev.myRole,
          isHandRaised: isMe ? false : prev.isHandRaised,
          speakerRequests: prev.speakerRequests.filter((r) => r.userId !== data.targetUserId),
          participants: prev.participants.map((p) =>
            p.userId === data.targetUserId ? { ...p, role: "speaker", isHandRaised: false } : p
          ),
        };
      });
    };

    const onSpeakerDemoted = (data: any) => {
      if (!data?.targetUserId) return;
      const isMe = data.targetUserId === currentUserId;

      if (isMe) {
        managerRef.current?.stepDownToListener();
      }

      setSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          myRole: isMe ? "listener" : prev.myRole,
          participants: prev.participants.map((p) =>
            p.userId === data.targetUserId ? { ...p, role: "listener", isSpeaking: false } : p
          ),
        };
      });
    };

    const onSpeakerMuted = (data: any) => {
      if (data?.targetUserId === currentUserId) {
        setSession((prev) => {
          if (!prev) return null;
          managerRef.current?.toggleMute(true);
          return { ...prev, isMuted: true };
        });
      }
    };

    const onUserKicked = (data: any) => {
      if (data?.targetUserId === currentUserId) {
        leaveRoom();
      }
    };

    const onRoomEnded = () => {
      cleanupManager();
      setSession(null);
      setIsMinimized(false);
    };

    const onReactionReceived = (data: any) => {
      if (!data?.reaction) return;
      setSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          reactions: [...prev.reactions.slice(-15), data.reaction],
        };
      });
    };

    const onPeerMicToggled = (data: any) => {
      if (data?.userId) {
        managerRef.current?.handlePeerMediaToggled(data.userId, "audio", data.enabled);
      }
    };

    const onPeerSpeaking = (data: any) => {
      if (data?.userId) {
        managerRef.current?.handlePeerSpeaking(data.userId, data.isSpeaking);
      }
    };

    socket.on("audio_room_user_joined", onUserJoined);
    socket.on("audio_room_user_left", onUserLeft);
    socket.on("audio_room_signal_received", onSignalReceived);
    socket.on("audio_room_hand_raised", onHandRaised);
    socket.on("audio_room_hand_cancelled", onHandCancelled);
    socket.on("audio_room_speaker_promoted", onSpeakerPromoted);
    socket.on("audio_room_speaker_demoted", onSpeakerDemoted);
    socket.on("audio_room_speaker_muted", onSpeakerMuted);
    socket.on("audio_room_user_kicked", onUserKicked);
    socket.on("audio_room_ended", onRoomEnded);
    socket.on("audio_room_reaction_received", onReactionReceived);
    socket.on("audio_room_peer_mic_toggled", onPeerMicToggled);
    socket.on("audio_room_peer_speaking", onPeerSpeaking);

    return () => {
      socket.off("audio_room_user_joined", onUserJoined);
      socket.off("audio_room_user_left", onUserLeft);
      socket.off("audio_room_signal_received", onSignalReceived);
      socket.off("audio_room_hand_raised", onHandRaised);
      socket.off("audio_room_hand_cancelled", onHandCancelled);
      socket.off("audio_room_speaker_promoted", onSpeakerPromoted);
      socket.off("audio_room_speaker_demoted", onSpeakerDemoted);
      socket.off("audio_room_speaker_muted", onSpeakerMuted);
      socket.off("audio_room_user_kicked", onUserKicked);
      socket.off("audio_room_ended", onRoomEnded);
      socket.off("audio_room_reaction_received", onReactionReceived);
      socket.off("audio_room_peer_mic_toggled", onPeerMicToggled);
      socket.off("audio_room_peer_speaking", onPeerSpeaking);
    };
  }, [session?.active, currentUserId, leaveRoom, cleanupManager]);

  const value: AudioRoomContextValue = {
    session,
    isMinimized,
    setIsMinimized,
    isCreateModalOpen,
    setIsCreateModalOpen,
    activePeerList: activePeers,
    createAndStartRoom,
    joinRoom,
    leaveRoom,
    endRoom,
    toggleMute,
    raiseHand,
    cancelRaiseHand,
    acceptSpeakerRequest,
    rejectSpeakerRequest,
    demoteSpeakerToListener,
    muteRemoteSpeaker,
    assignCoHost,
    removeCoHost,
    kickParticipant,
    sendReaction,
  };

  return (
    <AudioRoomContext.Provider value={value}>
      {children}
    </AudioRoomContext.Provider>
  );
}

export function useAudioRoom() {
  const ctx = useContext(AudioRoomContext);
  if (!ctx) {
    throw new Error("useAudioRoom must be used within AudioRoomProvider");
  }
  return ctx;
}
