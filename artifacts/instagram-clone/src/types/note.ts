export interface NoteAuthor {
  id: string;
  username: string;
  fullName?: string;
  avatarUrl?: string | null;
}

export interface NoteLocation {
  name: string;
  lat?: number;
  lng?: number;
}

export type NoteTheme =
  | "default"
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "orange"
  | "red"
  | "dark";

export interface SpotifyTrackPayload {
  trackId: string;
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  previewUrl?: string;
  spotifyUrl?: string;
}

export interface SocialNote {
  id: string;
  text?: string;
  emoji?: string | null;
  gifUrl?: string | null;
  sticker?: string | null;
  voiceUrl?: string | null;
  voiceDuration?: number | null;
  imageUrl?: string | null;
  spotifyTrack?: SpotifyTrackPayload | null;
  location?: NoteLocation | null;
  audience?: "followers" | "close_friends";
  theme?: NoteTheme;
  expiresAt: string;
  createdAt?: string;
  isMe: boolean;
  isExpired?: boolean;
  author: NoteAuthor;
}
