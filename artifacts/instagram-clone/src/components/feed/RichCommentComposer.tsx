import { useState, useRef, useEffect } from "react";
import {
  Smile,
  Image as ImageIcon,
  Film,
  Sparkles,
  Mic,
  Square,
  Trash2,
  Send,
  X,
  Plus,
  Loader2,
  Check,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GifPicker } from "@/components/chat/GifPicker";
import { StickerPicker } from "@/components/feed/StickerPicker";
import { PostReactionPicker } from "@/components/feed/PostReactionPicker";
import { VoicePlayer } from "@/components/chat/VoicePlayer";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api-url";

interface MentionUser {
  id: string;
  username: string;
  fullName?: string | null;
  avatarUrl?: string | null;
}

export interface CommentSubmitData {
  text: string;
  mediaUrl?: string | null;
  mediaType?: "image" | "gif" | "sticker" | "voice" | null;
  voiceDuration?: number | null;
  replyToCommentId?: string | null;
}

interface Props {
  placeholder?: string;
  replyingTo?: { id: string; username: string } | null;
  onCancelReply?: () => void;
  onSubmit: (data: CommentSubmitData) => Promise<void> | void;
  autoFocus?: boolean;
  className?: string;
}

export function RichCommentComposer({
  placeholder = "Add a comment… (Use @ to mention)",
  replyingTo,
  onCancelReply,
  onSubmit,
  autoFocus = false,
  className,
}: Props) {
  const { token, user: currentUser } = useAuth();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Attached media
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "gif" | "sticker" | "voice" | null>(null);
  const [voiceDuration, setVoiceDuration] = useState<number | null>(null);

  // Pickers state
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [showSticker, setShowSticker] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionUsers, setMentionUsers] = useState<MentionUser[]>([]);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);
  const [cursorPos, setCursorPos] = useState<number>(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus, replyingTo]);

  // Handle @mention search
  useEffect(() => {
    if (mentionQuery === null) {
      setMentionUsers([]);
      return;
    }

    const timer = setTimeout(() => {
      fetch(apiUrl(`/api/users/mention-search?q=${encodeURIComponent(mentionQuery)}`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => res.json())
        .then((data) => {
          setMentionUsers(Array.isArray(data) ? data : []);
          setMentionSelectedIndex(0);
        })
        .catch(() => setMentionUsers([]));
    }, 150);

    return () => clearTimeout(timer);
  }, [mentionQuery, token]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart || 0;
    setText(val);
    setCursorPos(pos);

    // Check if user is typing a mention
    const textBeforeCursor = val.slice(0, pos);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_\.]*)$/);
    if (match) {
      setMentionQuery(match[1]);
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = (username: string) => {
    const textBeforeCursor = text.slice(0, cursorPos);
    const textAfterCursor = text.slice(cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      const newText = textBeforeCursor.slice(0, lastAtIndex) + `@${username} ` + textAfterCursor;
      setText(newText);
      setMentionQuery(null);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const newPos = lastAtIndex + username.length + 2;
          inputRef.current.setSelectionRange(newPos, newPos);
        }
      }, 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (mentionUsers.length > 0 && mentionQuery !== null) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionSelectedIndex((prev) => (prev + 1) % mentionUsers.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionSelectedIndex((prev) => (prev - 1 + mentionUsers.length) % mentionUsers.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const selected = mentionUsers[mentionSelectedIndex];
        if (selected) {
          insertMention(selected.username);
        }
        return;
      }
      if (e.key === "Escape") {
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Image Upload Handling
  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      setMediaUrl(base64);
      setMediaType("image");
      setVoiceDuration(null);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Voice Recording Handling
  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast({
        title: "Voice recording unavailable",
        description: "Your browser or device does not support audio recording.",
        variant: "destructive",
      });
      return;
    }
    // Close other open pickers
    setShowEmoji(false);
    setShowGif(false);
    setShowSticker(false);
    setAttachMenuOpen(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const supportedMimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
        "audio/aac",
      ].find((type) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) || "";

      const options = supportedMimeType ? { mimeType: supportedMimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const actualType = mediaRecorder.mimeType || supportedMimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: actualType });
        const reader = new FileReader();
        reader.onloadend = () => {
          setMediaUrl(reader.result as string);
          setMediaType("voice");
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordDuration(0);
      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      const isPermissionDenied =
        err?.name === "NotAllowedError" ||
        err?.name === "PermissionDeniedError" ||
        String(err).includes("Permission denied") ||
        String(err).includes("Permissions policy");
      toast({
        title: isPermissionDenied ? "Microphone access blocked" : "Recording failed",
        description: isPermissionDenied
          ? "Please grant microphone permissions in your browser bar or environment."
          : "Could not start audio recording. Please try again.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
      setVoiceDuration(recordDuration);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      audioChunksRef.current = [];
      setIsRecording(false);
      clearInterval(timerRef.current);
      setMediaUrl(null);
      setMediaType(null);
      setVoiceDuration(null);
    }
  };

  const clearAttachedMedia = () => {
    setMediaUrl(null);
    setMediaType(null);
    setVoiceDuration(null);
  };

  const handleSubmit = async () => {
    const hasContent = text.trim().length > 0 || !!mediaUrl;
    if (!hasContent || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        text: text.trim(),
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || null,
        voiceDuration: voiceDuration || null,
        replyToCommentId: replyingTo?.id || null,
      });
      setText("");
      clearAttachedMedia();
      if (onCancelReply) onCancelReply();
    } catch (err) {
      console.error("Error submitting comment:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = (text.trim().length > 0 || !!mediaUrl) && !isSubmitting;

  return (
    <div className={cn("relative flex flex-col gap-1.5 w-full max-w-full min-w-0 box-border", className)}>
      {/* Replying Banner */}
      {replyingTo && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-muted/70 text-xs rounded-lg border border-border/50 text-muted-foreground animate-in fade-in-50">
          <span className="flex items-center gap-1 truncate">
            <span className="shrink-0">Replying to</span>
            <span className="font-semibold text-foreground truncate">@{replyingTo.username}</span>
          </span>
          {onCancelReply && (
            <button
              onClick={onCancelReply}
              className="p-1 hover:bg-background rounded-full transition-colors shrink-0 ml-1"
              aria-label="Cancel reply"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Mention Autocomplete Dropdown */}
      {mentionUsers.length > 0 && mentionQuery !== null && (
        <div className="absolute bottom-full mb-2 left-0 right-0 max-w-sm bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in-50 slide-in-from-bottom-2">
          <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/30 border-b border-border">
            Matching users
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {mentionUsers.map((user, idx) => (
              <button
                key={user.id}
                onClick={() => insertMention(user.username)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors",
                  mentionSelectedIndex === idx ? "bg-primary/15 text-primary" : "hover:bg-secondary"
                )}
              >
                <Avatar className="w-6 h-6 shrink-0">
                  <AvatarImage src={user.avatarUrl || undefined} />
                  <AvatarFallback className="text-[10px] font-bold">
                    {user.username[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate leading-tight">@{user.username}</p>
                  {user.fullName && (
                    <p className="text-[10px] text-muted-foreground truncate leading-tight">
                      {user.fullName}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Attached Media Preview (Image / GIF / Sticker / Recorded Voice) */}
      {mediaUrl && (
        <div className="relative inline-flex items-center gap-2 p-1.5 bg-secondary/80 border border-border rounded-xl max-w-full overflow-hidden animate-in fade-in-50 zoom-in-95">
          {mediaType === "voice" ? (
            <div className="flex items-center gap-2 min-w-0">
              <VoicePlayer url={mediaUrl} />
            </div>
          ) : (
            <div className="relative h-14 w-14 rounded-lg overflow-hidden border border-border bg-background shrink-0 flex items-center justify-center">
              <img src={mediaUrl} alt="Attached media" className="w-full h-full object-cover" />
              <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] font-bold text-center uppercase py-0.5">
                {mediaType}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={clearAttachedMedia}
            className="p-1 rounded-full bg-background/80 hover:bg-background border border-border shadow-sm text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-1"
            title="Remove attachment"
            aria-label="Remove attachment"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Composer Bar */}
      <div className="flex items-center gap-1 sm:gap-1.5 bg-secondary/50 focus-within:bg-secondary/80 focus-within:ring-1 focus-within:ring-primary/40 border border-border rounded-2xl px-2 sm:px-3 py-1.5 transition-all w-full min-w-0 box-border">
        {/* User avatar on larger inputs */}
        {currentUser && (
          <Avatar className="w-7 h-7 shrink-0 hidden md:block">
            <AvatarImage src={currentUser.avatarUrl || undefined} />
            <AvatarFallback className="text-xs font-bold">
              {currentUser.username?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        )}

        {/* Live Audio Recording Bar */}
        {isRecording ? (
          <div className="flex-1 flex items-center justify-between px-1 sm:px-2 text-xs min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 text-red-500 font-semibold animate-pulse truncate">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
              <span className="truncate">
                Recording… {Math.floor(recordDuration / 60)}:
                {String(recordDuration % 60).padStart(2, "0")}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="sm"
                variant="ghost"
                onClick={cancelRecording}
                className="h-7 w-7 p-0 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                aria-label="Cancel recording"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                onClick={stopRecording}
                className="h-7 px-2.5 text-xs font-semibold rounded-full gap-1"
                aria-label="Done recording"
              >
                <Check className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Done</span>
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Attachment '+' Dropdown Button (Priority on Mobile & Compact layout) */}
            <DropdownMenu modal={false} open={attachMenuOpen} onOpenChange={setAttachMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "p-1.5 rounded-full hover:bg-background/80 hover:text-foreground text-muted-foreground transition-colors shrink-0",
                    attachMenuOpen && "text-primary bg-primary/10"
                  )}
                  title="Attach media (GIF, Sticker, Photo, Emoji, Voice)"
                  aria-label="Attach media"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" className="w-44 p-1 text-xs">
                <DropdownMenuItem
                  onClick={() => {
                    fileInputRef.current?.click();
                    setAttachMenuOpen(false);
                  }}
                  className="gap-2.5 cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-emerald-500" />
                  <span>Photo / Image</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setShowGif(true);
                    setShowEmoji(false);
                    setShowSticker(false);
                    setAttachMenuOpen(false);
                  }}
                  className="gap-2.5 cursor-pointer"
                >
                  <Film className="w-4 h-4 text-amber-500" />
                  <span>GIF</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setShowSticker(true);
                    setShowEmoji(false);
                    setShowGif(false);
                    setAttachMenuOpen(false);
                  }}
                  className="gap-2.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span>Sticker</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setShowEmoji(true);
                    setShowGif(false);
                    setShowSticker(false);
                    setAttachMenuOpen(false);
                  }}
                  className="gap-2.5 cursor-pointer"
                >
                  <Smile className="w-4 h-4 text-yellow-500" />
                  <span>Emoji</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    startRecording();
                    setAttachMenuOpen(false);
                  }}
                  className="gap-2.5 cursor-pointer text-red-500 focus:text-red-500"
                >
                  <Mic className="w-4 h-4" />
                  <span>Voice Note</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Hidden Native File Input for Photo Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageFile}
            />

            {/* Normal Text Input (flex-1 min-w-0 prevents any horizontal expansion) */}
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1 min-w-0 bg-transparent border-0 text-xs sm:text-sm focus:outline-none placeholder:text-muted-foreground py-1 px-1"
            />

            {/* Quick Desktop-only Direct Tools (hidden on mobile to guarantee 0 overflow) */}
            <div className="hidden sm:flex items-center gap-0.5 text-muted-foreground shrink-0">
              {/* Emoji Picker Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowEmoji(!showEmoji);
                    setShowGif(false);
                    setShowSticker(false);
                  }}
                  className={cn(
                    "p-1.5 rounded-full hover:bg-background/80 hover:text-foreground transition-colors",
                    showEmoji && "text-primary bg-primary/10"
                  )}
                  title="Add emoji"
                  aria-label="Add emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>
              </div>

              {/* Photo Upload Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded-full hover:bg-background/80 hover:text-foreground transition-colors"
                title="Attach photo"
                aria-label="Attach photo"
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              {/* GIF Button */}
              <button
                type="button"
                onClick={() => {
                  setShowGif(!showGif);
                  setShowEmoji(false);
                  setShowSticker(false);
                }}
                className={cn(
                  "p-1.5 rounded-full hover:bg-background/80 hover:text-foreground transition-colors",
                  showGif && "text-primary bg-primary/10"
                )}
                title="Search GIFs"
                aria-label="Search GIFs"
              >
                <Film className="w-4 h-4" />
              </button>

              {/* Sticker Button */}
              <button
                type="button"
                onClick={() => {
                  setShowSticker(!showSticker);
                  setShowEmoji(false);
                  setShowGif(false);
                }}
                className={cn(
                  "p-1.5 rounded-full hover:bg-background/80 hover:text-foreground transition-colors",
                  showSticker && "text-primary bg-primary/10"
                )}
                title="Stickers"
                aria-label="Stickers"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Voice Record Button on Mobile when no text is typed */}
            {!text.trim() && !mediaUrl && (
              <button
                type="button"
                onClick={startRecording}
                className="p-1.5 rounded-full hover:bg-background/80 hover:text-foreground text-muted-foreground transition-colors shrink-0"
                title="Record voice note"
                aria-label="Record voice note"
              >
                <Mic className="w-4 h-4" />
              </button>
            )}

            {/* Send / Post Button */}
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={cn(
                "h-7 sm:h-8 px-2 sm:px-3 rounded-full text-xs font-semibold shrink-0 transition-all gap-1",
                canSubmit
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  : "bg-muted text-muted-foreground/60 hover:bg-muted opacity-60"
              )}
              aria-label="Post comment"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Post</span>
                </>
              )}
            </Button>
          </>
        )}
      </div>

      {/* Pickers Popovers positioned cleanly above composer */}
      {showEmoji && (
        <PostReactionPicker
          onSelect={(emoji) => {
            setText((prev) => prev + emoji);
            setShowEmoji(false);
          }}
          onClose={() => setShowEmoji(false)}
          align="left"
          position="top"
        />
      )}

      {showGif && (
        <GifPicker
          onSelect={(url) => {
            setMediaUrl(url);
            setMediaType("gif");
            setShowGif(false);
          }}
          onClose={() => setShowGif(false)}
          align="left"
        />
      )}

      {showSticker && (
        <StickerPicker
          onSelect={(url) => {
            setMediaUrl(url);
            setMediaType("sticker");
            setShowSticker(false);
          }}
          onClose={() => setShowSticker(false)}
          align="left"
        />
      )}
    </div>
  );
}
