export type AudioRoomRole = "host" | "co-host" | "speaker" | "listener";
export type AudioRoomStatus = "starting" | "live" | "ending" | "ended";
export type AudioRoomVisibility = "public" | "group";

export type AudioRoomCategory =
  | "general"
  | "tech"
  | "music"
  | "gaming"
  | "crypto"
  | "lifestyle"
  | "sports"
  | "education"
  | "entertainment";

export interface AudioRoomParticipant {
  userId: string;
  username: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  activeDecorationId?: string | null;
  role: AudioRoomRole;
  isMuted: boolean;
  isSpeaking: boolean;
  isHandRaised: boolean;
  joinedAt: string;
  connectionState?: "connecting" | "connected" | "reconnecting" | "disconnected";
}

export interface SpeakerRequest {
  id: string;
  userId: string;
  username: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  activeDecorationId?: string | null;
  requestedAt: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
}

export interface AudioRoomReaction {
  id: string;
  userId: string;
  username: string;
  emoji: string;
  timestamp: number;
}

export interface AudioRoomMetadata {
  id: string;
  title: string;
  description?: string | null;
  category: AudioRoomCategory;
  topic?: string | null;
  coverUrl?: string | null;
  visibility: AudioRoomVisibility;
  groupId?: string | null;
  groupName?: string | null;
  hostId: string;
  hostUser: {
    id: string;
    username: string;
    fullName?: string | null;
    avatarUrl?: string | null;
    activeDecorationId?: string | null;
    isVerified?: boolean;
  };
  coHostIds: string[];
  speakerIds: string[];
  maxSpeakers: number;
  maxListeners: number;
  listenerCount: number;
  status: AudioRoomStatus;
  createdAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
}

export interface AudioRoomSessionState {
  active: boolean;
  room: AudioRoomMetadata;
  myRole: AudioRoomRole;
  isMuted: boolean;
  isHandRaised: boolean;
  participants: AudioRoomParticipant[];
  speakerRequests: SpeakerRequest[];
  reactions: AudioRoomReaction[];
  connectionStatus: "connecting" | "connected" | "reconnecting" | "error";
  error?: string | null;
}

export interface AudioRoomConfig {
  maxSpeakersDefault: number;
  maxListenersDefault: number;
  allowedCategories: { key: AudioRoomCategory; label: string; icon: string }[];
  audioRoomsEnabled: boolean;
}

export const DEFAULT_AUDIO_ROOM_CONFIG: AudioRoomConfig = {
  maxSpeakersDefault: 8,
  maxListenersDefault: 500,
  audioRoomsEnabled: true,
  allowedCategories: [
    { key: "general", label: "General Chat", icon: "MessageSquare" },
    { key: "tech", label: "Tech & Coding", icon: "Code2" },
    { key: "music", label: "Music & Beats", icon: "Music" },
    { key: "gaming", label: "Gaming & Esports", icon: "Gamepad2" },
    { key: "crypto", label: "Crypto & Web3", icon: "Coins" },
    { key: "lifestyle", label: "Lifestyle & Chill", icon: "Coffee" },
    { key: "sports", label: "Sports & Fitness", icon: "Trophy" },
    { key: "education", label: "Learning & Science", icon: "GraduationCap" },
    { key: "entertainment", label: "Movies & Culture", icon: "Clapperboard" },
  ],
};
