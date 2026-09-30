import { useState, useRef, useEffect } from "react";
import {
  X,
  Plus,
  Image as ImageIcon,
  Film,
  Smile,
  Mic,
  MapPin,
  Clock3,
  Trash2,
  Square,
  Play,
  Pause,
  Users,
  Star,
  Check,
  Loader2,
  Palette,
  Music,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NoteBubble } from "./NoteBubble";
import { StickerPickerModal } from "./StickerPickerModal";
import { LocationPickerModal } from "./LocationPickerModal";
import { MusicPickerModal } from "@/components/chat/MusicPickerModal";
import { GifPicker } from "@/components/chat/GifPicker";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api-url";
import { NOTE_THEME_OPTIONS } from "@/lib/note-themes";
import type { SocialNote, NoteLocation, NoteTheme, SpotifyTrackPayload } from "@/types/note";
import { useNavigationState } from "@/lib/navigation-context";

interface Props {
  existingNote?: SocialNote | null;
  userAvatar?: string | null;
  username?: string;
  onSave: (payload: {
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
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

const NOTE_MOODS = ["😊", "🔥", "💭", "🎵", "🌙", "✨", "☕", "❤️", "⚡", "😴"];

export function NoteComposerModal({
  existingNote,
  userAvatar,
  username = "you",
  onSave,
  onDelete,
  onClose,
}: Props) {
  // Content states
  const [text, setText] = useState(existingNote?.text ?? "");
  const [emoji, setEmoji] = useState(existingNote?.emoji ?? "");
  const [gifUrl, setGifUrl] = useState<string | null>(existingNote?.gifUrl ?? null);
  const [sticker, setSticker] = useState<string | null>(existingNote?.sticker ?? null);
  const [imageUrl, setImageUrl] = useState<string | null>(existingNote?.imageUrl ?? null);
  const [spotifyTrack, setSpotifyTrack] = useState<SpotifyTrackPayload | null>(existingNote?.spotifyTrack ?? null);
  const [location, setLocation] = useState<NoteLocation | null>(existingNote?.location ?? null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(existingNote?.voiceUrl ?? null);
  const [voiceDuration, setVoiceDuration] = useState<number | null>(existingNote?.voiceDuration ?? null);
  const [audience, setAudience] = useState<"followers" | "close_friends">(existingNote?.audience ?? "followers");
  const [theme, setTheme] = useState<NoteTheme>(existingNote?.theme ?? "default");

  // Attachment menu popover state (single "+" button)
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [activePicker, setActivePicker] = useState<"gif" | "sticker" | "location" | "music" | null>(null);

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  // Upload and save states
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { setIsNoteComposerOpen } = useNavigationState();

  // Sync navigation context: hide mobile bottom nav while composer is mounted/open
  useEffect(() => {
    setIsNoteComposerOpen(true);
    return () => {
      setIsNoteComposerOpen(false);
    };
  }, [setIsNoteComposerOpen]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Cleanup audio preview on unmount
  useEffect(() => {
    return () => {
      if (previewAudio) {
        previewAudio.pause();
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [previewAudio]);

  // Upload file helper
  const uploadMediaFile = async (dataBase64: string, mimeType: string): Promise<string> => {
    const token = localStorage.getItem("whiterchat_token") ?? "";
    const resp = await fetch(apiUrl("/api/notes/upload"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ data: dataBase64, mimeType }),
    });
    if (!resp.ok) {
      throw new Error(`Upload failed (${resp.status})`);
    }
    const res = await resp.json();
    return res.url;
  };

  // Handle Photo selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(",")[1];
        const uploadedUrl = await uploadMediaFile(base64, file.type);
        setImageUrl(uploadedUrl);
        // Clear other visual items so it remains clean
        setGifUrl(null);
        setSticker(null);
      } catch (err) {
        console.error("Photo upload error:", err);
        // Fallback to data url for preview
        setImageUrl(reader.result as string);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Voice recording controls
  const startRecording = async () => {
    if (previewAudio) {
      previewAudio.pause();
      setPreviewAudio(null);
      setIsPreviewPlaying(false);
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size === 0) return;

        // Create preview audio element
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        setPreviewAudio(audio);
        audio.onended = () => setIsPreviewPlaying(false);

        // Upload to server
        setIsUploading(true);
        try {
          const reader = new FileReader();
          reader.onload = async () => {
            const base64 = (reader.result as string).split(",")[1];
            try {
              const uploadedUrl = await uploadMediaFile(base64, "audio/webm");
              setVoiceUrl(uploadedUrl);
            } catch {
              setVoiceUrl(audioUrl);
            } finally {
              setIsUploading(false);
            }
          };
          reader.readAsDataURL(blob);
        } catch {
          setVoiceUrl(audioUrl);
          setIsUploading(false);
        }
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds(s => {
          if (s >= 30) {
            stopRecording();
            return 30;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      alert("Microphone permission was denied. Please allow microphone access.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setVoiceDuration(recordingSeconds || 1);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
    if (previewAudio) {
      previewAudio.pause();
      setPreviewAudio(null);
      setIsPreviewPlaying(false);
    }
    setVoiceUrl(null);
    setVoiceDuration(null);
    setRecordingSeconds(0);
  };

  const toggleAudioPreview = () => {
    if (!previewAudio) return;
    if (isPreviewPlaying) {
      previewAudio.pause();
      setIsPreviewPlaying(false);
    } else {
      previewAudio.play().then(() => setIsPreviewPlaying(true)).catch(() => {});
    }
  };

  const handleSave = async () => {
    const hasContent = text.trim() || gifUrl || sticker || imageUrl || voiceUrl || spotifyTrack?.trackId || location?.name;
    if (!hasContent || isSaving) return;

    setIsSaving(true);
    try {
      await onSave({
        text: text.trim(),
        emoji: emoji || null,
        gifUrl,
        sticker,
        voiceUrl,
        voiceDuration,
        imageUrl,
        spotifyTrack,
        location,
        audience,
        theme,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  // Mock note object for live preview
  const previewNote: SocialNote = {
    id: "preview",
    text: text.trim(),
    emoji: emoji || null,
    gifUrl,
    sticker,
    imageUrl,
    voiceUrl,
    voiceDuration,
    spotifyTrack,
    location,
    audience,
    theme,
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    isMe: true,
    author: {
      id: "me",
      username,
      avatarUrl: userAvatar,
    },
  };

  const hasAnyContent = text.trim().length > 0 || !!gifUrl || !!sticker || !!imageUrl || !!voiceUrl || !!spotifyTrack?.trackId || !!location?.name;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs p-0 sm:items-center sm:p-4 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-h-[92vh] overflow-y-auto rounded-t-[28px] bg-card border-t sm:border border-border shadow-2xl sm:max-w-[420px] sm:rounded-[28px] flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        {/* Mobile handle */}
        <div className="mx-auto mt-2.5 -mb-1 h-1.5 w-12 rounded-full bg-muted-foreground/30 sm:hidden shrink-0 pointer-events-none" />

        {/* Hidden photo input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoSelect}
        />

        {/* Top Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-border/70 shrink-0">
          <div>
            <h2 className="text-base font-bold text-foreground">
              {existingNote ? "Edit Note" : "New Note"}
            </h2>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock3 className="w-3 h-3" /> Visible for 24 hours
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Note Bubble Preview */}
        <div className="pt-8 pb-4 flex flex-col items-center justify-center bg-secondary/30 border-b border-border/60 relative overflow-visible">
          <div className="relative flex flex-col items-center">
            {/* Note Speech Bubble hovering over avatar */}
            <NoteBubble
              note={hasAnyContent ? previewNote : null}
              isMine
              className="static transform-none mb-2"
            />

            {/* Avatar */}
            <div className="relative">
              <Avatar className="h-16 w-16 border-2 border-background shadow-md">
                <AvatarImage src={userAvatar ?? undefined} />
                <AvatarFallback className="bg-primary/20 text-primary font-bold text-base">
                  {username[0]?.toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              {audience === "close_friends" && (
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] shadow-xs">
                  ★
                </span>
              )}
            </div>
            <p className="mt-1.5 text-xs font-semibold text-muted-foreground">@{username}</p>
          </div>
        </div>

        {/* Composer Form */}
        <div className="p-5 flex-1 space-y-4">
          {/* Text input area */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="note-text-input" className="text-xs font-bold text-foreground">
                Your thought
              </label>
              <span
                className={cn(
                  "text-[10px] tabular-nums font-semibold",
                  text.length >= 90 ? "text-destructive" : "text-muted-foreground"
                )}
              >
                {text.length}/100
              </span>
            </div>
            <textarea
              id="note-text-input"
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value.slice(0, 100))}
              placeholder="Share a thought, mood, or update…"
              rows={2}
              className="w-full resize-none rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 text-sm leading-relaxed outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 placeholder:text-muted-foreground/60 transition-all"
            />
          </div>

          {/* Quick Moods Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[11px] font-medium text-muted-foreground mr-1">Mood:</span>
            {NOTE_MOODS.map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setEmoji(emoji === m ? "" : m)}
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm transition-transform hover:scale-115 active:scale-95",
                  emoji === m ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-secondary"
                )}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Attached items display (chips/previews with remove button) */}
          {(imageUrl || gifUrl || sticker || voiceUrl || spotifyTrack || location) && (
            <div className="space-y-2 p-3 rounded-xl bg-secondary/30 border border-border/80">
              <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                <span>Attachments</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Spotify Track Chip */}
                {spotifyTrack && (
                  <div className="relative flex items-center gap-2.5 p-1.5 pr-2 rounded-lg bg-card border border-border max-w-full">
                    {spotifyTrack.coverUrl ? (
                      <img src={spotifyTrack.coverUrl} alt={spotifyTrack.title} className="w-9 h-9 rounded-md object-cover shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-md bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                        <Music className="w-4 h-4" />
                      </div>
                    )}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-bold text-foreground truncate">{spotifyTrack.title}</span>
                      <span className="text-[10px] text-muted-foreground truncate">{spotifyTrack.artist}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSpotifyTrack(null)}
                      className="p-1 text-muted-foreground hover:text-destructive shrink-0"
                      aria-label="Remove Spotify track"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {/* Photo Chip */}
                {imageUrl && (
                  <div className="relative flex items-center gap-2 p-1.5 rounded-lg bg-card border border-border">
                    <img src={imageUrl} alt="Photo" className="w-8 h-8 rounded-md object-cover" />
                    <span className="text-xs font-semibold text-foreground">Photo</span>
                    <button
                      type="button"
                      onClick={() => setImageUrl(null)}
                      className="p-1 text-muted-foreground hover:text-destructive"
                      aria-label="Remove photo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* GIF Chip */}
                {gifUrl && (
                  <div className="relative flex items-center gap-2 p-1.5 rounded-lg bg-card border border-border">
                    <img src={gifUrl} alt="GIF" className="w-8 h-8 rounded-md object-cover" />
                    <span className="text-xs font-semibold text-foreground">GIF</span>
                    <button
                      type="button"
                      onClick={() => setGifUrl(null)}
                      className="p-1 text-muted-foreground hover:text-destructive"
                      aria-label="Remove GIF"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Sticker Chip */}
                {sticker && (
                  <div className="relative flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-card border border-border">
                    <span className="text-xl leading-none">{sticker}</span>
                    <span className="text-xs font-semibold text-foreground">Sticker</span>
                    <button
                      type="button"
                      onClick={() => setSticker(null)}
                      className="p-1 text-muted-foreground hover:text-destructive"
                      aria-label="Remove sticker"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Voice Note Chip */}
                {voiceUrl && (
                  <div className="relative flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-card border border-border">
                    <button
                      type="button"
                      onClick={toggleAudioPreview}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
                    >
                      {isPreviewPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
                    </button>
                    <span className="text-xs font-semibold text-foreground">
                      Voice (0:{voiceDuration ? (voiceDuration < 10 ? `0${voiceDuration}` : voiceDuration) : "05"})
                    </span>
                    <button
                      type="button"
                      onClick={cancelRecording}
                      className="p-1 text-muted-foreground hover:text-destructive"
                      aria-label="Remove voice note"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Location Chip */}
                {location && (
                  <div className="relative flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-card border border-border">
                    <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span className="text-xs font-semibold text-foreground truncate max-w-[140px]">
                      {location.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLocation(null)}
                      className="p-1 text-muted-foreground hover:text-destructive"
                      aria-label="Remove location"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Voice recording in progress view */}
          {isRecording && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-destructive/10 border border-destructive/30 animate-pulse">
              <div className="flex items-center gap-2.5 text-destructive font-bold text-xs">
                <span className="h-3 w-3 rounded-full bg-destructive animate-ping" />
                <span>Recording… 0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds} / 0:30</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="p-1.5 rounded-full text-muted-foreground hover:text-destructive transition-colors"
                  title="Cancel"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:opacity-90"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Done</span>
                </button>
              </div>
            </div>
          )}

          {/* Theme Color Selector */}
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-primary" />
                <span>Note Theme</span>
              </span>
              <span className="text-[10px] text-muted-foreground capitalize">
                {NOTE_THEME_OPTIONS.find(t => t.id === theme)?.label || "Default"}
              </span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
              {NOTE_THEME_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  title={t.label}
                  className={cn(
                    "w-6 h-6 rounded-full shrink-0 border transition-all duration-150 relative flex items-center justify-center",
                    t.swatchClass,
                    theme === t.id
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                      : "opacity-80 hover:opacity-100 hover:scale-105"
                  )}
                >
                  {theme === t.id && (
                    <Check className={cn("w-3 h-3 stroke-[3]", t.id === "default" ? "text-foreground" : "text-white")} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Single Attach Button + Popover Menu (Strict requirement: Single button that reveals options!) */}
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAttachMenu(v => !v)}
                  disabled={isRecording}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all",
                    showAttachMenu
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/80 bg-secondary/40 text-foreground hover:bg-secondary hover:border-primary/40"
                  )}
                >
                  <Plus className={cn("w-4 h-4 transition-transform", showAttachMenu && "rotate-45")} />
                  <span>Add attachment</span>
                </button>

                {/* Dropdown Menu for Attachment Options */}
                {showAttachMenu && (
                  <div
                    className="absolute left-0 bottom-full mb-2 w-48 rounded-2xl bg-card border border-border shadow-xl p-1.5 z-30 flex flex-col gap-0.5 select-none"
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        fileInputRef.current?.click();
                      }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                    >
                      <ImageIcon className="w-4 h-4 text-sky-500 shrink-0" />
                      <span>Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        setActivePicker("gif");
                      }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                    >
                      <Film className="w-4 h-4 text-purple-500 shrink-0" />
                      <span>GIF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        setActivePicker("sticker");
                      }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                    >
                      <Smile className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Sticker</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        void startRecording();
                      }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                    >
                      <Mic className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Voice Recording</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        setActivePicker("music");
                      }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                    >
                      <Music className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Spotify Music</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        setActivePicker("location");
                      }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                    >
                      <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                      <span>Location</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Audience Selector (Followers vs Close Friends) */}
              <div className="flex items-center gap-1 rounded-xl bg-secondary/50 p-1 border border-border/60">
                <button
                  type="button"
                  onClick={() => setAudience("followers")}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors",
                    audience === "followers"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Users className="w-3 h-3" />
                  <span>Followers</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAudience("close_friends")}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors",
                    audience === "close_friends"
                      ? "bg-emerald-500 text-white shadow-xs"
                      : "text-muted-foreground hover:text-emerald-500"
                  )}
                >
                  <Star className="w-3 h-3 fill-current" />
                  <span>Close Friends</span>
                </button>
              </div>
            </div>

            {/* Sub-Pickers (GIF, Sticker, Location) */}
            {activePicker === "gif" && (
              <div className="absolute left-0 bottom-full mb-2 z-40">
                <GifPicker
                  onSelect={(url) => {
                    setGifUrl(url);
                    setImageUrl(null);
                    setSticker(null);
                    setActivePicker(null);
                  }}
                  onClose={() => setActivePicker(null)}
                />
              </div>
            )}

            {activePicker === "sticker" && (
              <div className="absolute left-0 bottom-full mb-2 z-40">
                <StickerPickerModal
                  onSelect={(stk) => {
                    setSticker(stk);
                    setImageUrl(null);
                    setGifUrl(null);
                    setActivePicker(null);
                  }}
                  onClose={() => setActivePicker(null)}
                />
              </div>
            )}

            {activePicker === "location" && (
              <div className="absolute left-0 bottom-full mb-2 z-40">
                <LocationPickerModal
                  onSelect={(loc) => {
                    setLocation(loc);
                    setActivePicker(null);
                  }}
                  onClose={() => setActivePicker(null)}
                />
              </div>
            )}

            {activePicker === "music" && (
              <MusicPickerModal
                open={true}
                onSelectTrack={(track) => {
                  setSpotifyTrack({
                    trackId: track.trackId,
                    title: track.title,
                    artist: track.artist,
                    album: track.album,
                    coverUrl: track.coverUrl,
                    previewUrl: track.previewUrl,
                    spotifyUrl: track.spotifyUrl,
                  });
                  setActivePicker(null);
                }}
                onClose={() => setActivePicker(null)}
              />
            )}
          </div>

          {/* Delete confirmation if editing note */}
          {confirmDelete && onDelete && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
              <span className="flex-1 text-xs font-semibold text-destructive">
                Remove this note?
              </span>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-bold disabled:opacity-50"
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          )}

          {/* Bottom Action Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/70">
            {onDelete && !confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="mr-auto text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors"
              >
                Delete Note
              </button>
            ) : (
              <span className="mr-auto" />
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={!hasAnyContent || isSaving || isUploading || isRecording}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {(isSaving || isUploading) ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sharing…</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{existingNote ? "Update Note" : "Share Note"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
