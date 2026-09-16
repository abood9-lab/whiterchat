import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Mic, X, Paperclip, FileText, Smile, BarChart2, Gamepad2, Plus, Music, Sparkles, Phone, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "./MessageBubble";
import { apiUrl } from "@/lib/api-url";
import EmojiPicker, { type EmojiClickData, Theme } from "emoji-picker-react";
import { GifPicker } from "./GifPicker";
import { CreatePollModal } from "./CreatePollModal";
import { GameInviteModal } from "./GameInviteModal";

interface Props {
  value: string;
  onChange: (val: string) => void;
  onSend: (opts?: {
    mediaUrl?: string;
    mediaType?: string;
    fileName?: string;
    messageType?: string;
    spotifyTrack?: any;
    gifInfo?: any;
    stickerInfo?: any;
  }) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  replyTo: ChatMessage | null;
  onCancelReply: () => void;
  editingMsg: ChatMessage | null;
  onCancelEdit: () => void;
  onEditSave: (text: string) => void;
  disabled?: boolean;
  otherUserUsername: string;
  myId: string;
  conversationId?: string;
  onPollCreated?: (poll: any) => void;
  onGameCreated?: (game: any) => void;
  onOpenMusicModal?: () => void;
  onOpenGiphyModal?: () => void;
  onStartVoiceCall?: () => void;
  onStartVideoCall?: () => void;
}

function mimeToMediaType(mime: string): "image" | "video" | "voice" | "file" {
  if (mime.startsWith("audio/")) return "voice";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("image/")) return "image";
  return "file";
}

async function uploadMedia(file: File): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(",")[1];
        const endpoint = file.type.startsWith("audio")
          ? "upload-voice"
          : (file.type.startsWith("image") || file.type.startsWith("video")) ? "upload" : "upload-file";
        const token = localStorage.getItem("whiterchat_token") ?? "";
        const resp = await fetch(apiUrl(`/api/messages/${endpoint}`), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ data: base64, mimeType: file.type }),
        });
        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          reject(new Error((body as any).error ?? `Upload failed (${resp.status})`));
        } else {
          resolve(await resp.json());
        }
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Upload failed"));
      }
    };
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

export function MessageInput({
  value, onChange, onSend, onTypingStart, onTypingStop,
  replyTo, onCancelReply,
  editingMsg, onCancelEdit, onEditSave,
  disabled = false,
  otherUserUsername, myId,
  conversationId,
  onPollCreated,
  onGameCreated,
  onOpenMusicModal,
  onOpenGiphyModal,
  onStartVoiceCall,
  onStartVideoCall,
}: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [mediaPreview, setMediaPreview] = useState<{ url: string; type: string; file: File; isFile: boolean } | null>(null);
  const [editText, setEditText] = useState("");
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showGameModal, setShowGameModal] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  // Always-current refs so async closures (recorder.onstop) never get stale props
  const onSendRef = useRef(onSend);
  const onTypingStopRef = useRef(onTypingStop);
  useEffect(() => { onSendRef.current = onSend; }, [onSend]);
  useEffect(() => { onTypingStopRef.current = onTypingStop; }, [onTypingStop]);

  // Track the current mediaPreview in a ref so the image handleSend closure is fresh
  const mediaPreviewRef = useRef(mediaPreview);
  useEffect(() => { mediaPreviewRef.current = mediaPreview; }, [mediaPreview]);

  /* ── Auto-resize textarea ── */
  const autoResize = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "40px";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  useEffect(() => {
    if (editingMsg) {
      setEditText(editingMsg.text ?? "");
      setTimeout(() => { inputRef.current?.focus(); autoResize(); }, 50);
    }
  }, [editingMsg]);

  useEffect(() => {
    if (replyTo) setTimeout(() => inputRef.current?.focus(), 50);
  }, [replyTo]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (editingMsg) onEditSave(editText);
      else handleSend();
    }
  };

  /* ── Emoji insertion at cursor ── */
  const insertEmoji = useCallback((emoji: string) => {
    const el = inputRef.current;
    if (!el) { onChange(value + emoji); return; }
    const start = el.selectionStart ?? value.length;
    const end   = el.selectionEnd   ?? value.length;
    const next  = value.slice(0, start) + emoji + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
      autoResize();
    });
  }, [value, onChange, autoResize]);

  const handleEmojiClick = useCallback((emojiData: EmojiClickData) => {
    insertEmoji(emojiData.emoji);
    setShowEmojiPicker(false);
  }, [insertEmoji]);

  /* ── GIF send ── */
  const handleGifSelect = useCallback((gifUrl: string) => {
    setShowGifPicker(false);
    onSendRef.current({ mediaUrl: gifUrl, mediaType: "gif" });
  }, []);

  /* ── Send ── */
  const handleSend = () => {
    const preview = mediaPreviewRef.current;
    if (preview) {
      setUploadProgress("Uploading…");
      uploadMedia(preview.file)
        .then(result => {
          setUploadProgress(null);
          setMediaPreview(null);
          const mediaType = mimeToMediaType(preview.type);
          onSendRef.current({
            mediaUrl: result.url,
            mediaType,
            fileName: mediaType === "file" ? preview.file.name : undefined,
          });
        })
        .catch(err => {
          console.error("Upload failed:", err);
          setUploadProgress("Upload failed – tap to retry");
          setTimeout(() => setUploadProgress(null), 3000);
        });
    } else {
      onSendRef.current();
    }
  };

  /* ── Voice recording ── */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      cancelledRef.current = false;
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (cancelledRef.current) return;
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size === 0) { setUploadProgress(null); return; }
        const file = new File([blob], "voice.webm", { type: "audio/webm" });
        setUploadProgress("Sending voice…");
        try {
          const result = await uploadMedia(file);
          setUploadProgress(null);
          // Use ref to always call the latest onSend (avoids stale closure bug)
          onSendRef.current({ mediaUrl: result.url, mediaType: "voice" });
        } catch (err) {
          console.error("Voice upload failed:", err);
          setUploadProgress("Failed to send voice");
          setTimeout(() => setUploadProgress(null), 2500);
        }
      };
      recorder.start(100); // timeslice 100ms so ondataavailable fires regularly
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
      onTypingStart();
    } catch {
      alert("Microphone access denied. Please allow microphone permission.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try { mediaRecorderRef.current.stop(); } catch {}
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      onTypingStopRef.current(); // use ref — never stale
    }
  };

  const cancelRecording = () => {
    cancelledRef.current = true;
    if (mediaRecorderRef.current && isRecording) {
      try { mediaRecorderRef.current.stop(); } catch {}
      setIsRecording(false);
      setUploadProgress(null);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      onTypingStopRef.current();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isFile = !file.type.startsWith("image/") && !file.type.startsWith("video/");
    setMediaPreview({ url: URL.createObjectURL(file), type: file.type, file, isFile });
    e.target.value = "";
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  /* ── Recording UI ── */
  if (isRecording) {
    return (
      <div
        className="px-3 py-3 border-t border-border bg-card shrink-0"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center gap-3">
          {/* Cancel */}
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center bg-destructive/10 text-destructive active:scale-95 transition-transform"
            onClick={cancelRecording}
            aria-label="Cancel"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Timer + waveform */}
          <div className="flex-1 flex items-center gap-2">
            <span className="w-2 h-2 bg-destructive rounded-full animate-pulse shrink-0" />
            <span className="text-sm font-bold text-destructive tabular-nums w-10 shrink-0">{fmt(recordingSeconds)}</span>
            <div className="flex items-end gap-[3px] flex-1 h-6 overflow-hidden">
              {Array.from({ length: 24 }, (_, i) => (
                <div
                  key={i}
                  className="w-[3px] bg-destructive/60 rounded-full"
                  style={{
                    height: `${30 + Math.abs(Math.sin(i * 0.8) * 70)}%`,
                    animation: `pulse 0.${6 + (i % 4)}s ease-in-out infinite alternate`,
                    animationDelay: `${i * 0.05}s`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Send */}
          <button
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center active:scale-95 transition-transform shadow-md shrink-0"
            onClick={stopRecording}
            aria-label="Send voice message"
          >
            <Send className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="border-t border-border bg-card shrink-0"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Edit banner */}
      {editingMsg && (
        <div className="flex items-center justify-between px-4 py-2 bg-primary/5 border-b border-border">
          <span className="text-xs text-primary font-medium">Editing message</span>
          <button onClick={onCancelEdit} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
        </div>
      )}

      {/* Reply banner */}
      {replyTo && !editingMsg && (
        <div className="flex items-center gap-2 px-4 py-2 bg-secondary/50 border-b border-border">
          <div className="w-0.5 h-8 bg-primary rounded-full shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold text-primary mb-0.5">
              Replying to {replyTo.senderId === myId ? "yourself" : otherUserUsername}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {replyTo.text ?? (replyTo.mediaType ? `[${replyTo.mediaType}]` : "")}
            </div>
          </div>
          <button onClick={onCancelReply} className="p-1 rounded-full hover:bg-secondary shrink-0">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Media preview */}
      {mediaPreview && (
        <div className="px-4 py-2 border-b border-border">
          {mediaPreview.isFile ? (
            <div className="relative inline-flex items-center gap-2 bg-secondary rounded-xl px-3 py-2 pr-7">
              <FileText className="w-5 h-5 text-primary shrink-0" />
              <span className="text-xs font-medium truncate max-w-[180px]">{mediaPreview.file.name}</span>
              <button
                onClick={() => setMediaPreview(null)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-foreground rounded-full flex items-center justify-center"
              >
                <X className="w-3 h-3 text-background" />
              </button>
            </div>
          ) : (
            <div className="relative inline-block">
              {mediaPreview.type.startsWith("video") ? (
                <video src={mediaPreview.url} className="h-20 rounded-xl object-cover" />
              ) : (
                <img src={mediaPreview.url} alt="preview" className="h-20 rounded-xl object-cover" />
              )}
              <button
                onClick={() => setMediaPreview(null)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-foreground rounded-full flex items-center justify-center"
              >
                <X className="w-3 h-3 text-background" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Upload progress */}
      {uploadProgress && (
        <div className="px-4 py-1.5 text-xs text-muted-foreground text-center border-b border-border bg-secondary/30">
          {uploadProgress}
        </div>
      )}

      <div className="px-3 py-2.5">
        {/* Edit mode */}
        {editingMsg ? (
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={editText}
              onChange={e => { setEditText(e.target.value); autoResize(); }}
              onKeyDown={handleKeyDown}
              className="flex-1 resize-none rounded-2xl bg-secondary border border-transparent focus:outline-none focus:border-primary/40 px-4 py-2.5 text-sm min-h-[40px] max-h-[120px] leading-relaxed"
              rows={1}
            />
            <Button
              onClick={() => onEditSave(editText)}
              disabled={!editText.trim()}
              className="rounded-full h-10 px-4 text-sm font-semibold shrink-0"
            >
              Save
            </Button>
          </div>
        ) : (
          <div className="relative flex items-end gap-1">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,application/zip"
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Expandable Attachment Menu Button */}
            <div className="relative shrink-0">
              <button
                type="button"
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors active:scale-90",
                  showAttachMenu && "bg-secondary text-primary"
                )}
                onClick={() => {
                  setShowAttachMenu((v) => !v);
                  setShowEmojiPicker(false);
                  setShowGifPicker(false);
                }}
                disabled={disabled}
                title="Attach or create"
                aria-label="Attach or create"
              >
                <Plus className={cn("w-4 h-4 transition-transform duration-200", showAttachMenu && "rotate-45")} />
              </button>

              {showAttachMenu && (
                <div className="absolute bottom-full mb-2 left-0 z-50 min-w-[170px] bg-card border border-border shadow-2xl rounded-2xl p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachMenu(false);
                      fileInputRef.current?.click();
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-secondary transition-colors text-left"
                  >
                    <Paperclip className="w-4 h-4 text-primary shrink-0" />
                    <span>Photo or Document</span>
                  </button>

                  {onOpenGiphyModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        onOpenGiphyModal();
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-secondary transition-colors text-left"
                    >
                      <Sparkles className="w-4 h-4 text-pink-500 shrink-0" />
                      <span>GIFs & Stickers</span>
                    </button>
                  )}

                  {onOpenMusicModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        onOpenMusicModal();
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-secondary transition-colors text-left"
                    >
                      <Music className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Share Spotify Music</span>
                    </button>
                  )}

                  {conversationId && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        setShowPollModal(true);
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-secondary transition-colors text-left"
                    >
                      <BarChart2 className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Create Poll</span>
                    </button>
                  )}

                  {conversationId && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        setShowGameModal(true);
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-secondary transition-colors text-left"
                    >
                      <Gamepad2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Play Game</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Emoji Picker Button */}
            <div className="relative shrink-0">
              <button
                type="button"
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors active:scale-90",
                  showEmojiPicker && "bg-secondary text-foreground"
                )}
                onClick={() => {
                  setShowEmojiPicker((v) => !v);
                  setShowAttachMenu(false);
                  setShowGifPicker(false);
                }}
                disabled={disabled}
                aria-label="Emoji"
              >
                <Smile className="w-4 h-4" />
              </button>
              {showEmojiPicker && (
                <div className="absolute bottom-full mb-2 left-0 z-50 shadow-2xl rounded-2xl overflow-hidden">
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    theme={Theme.AUTO}
                    width={280}
                    height={360}
                    searchPlaceholder="Search emoji…"
                    previewConfig={{ showPreview: false }}
                  />
                </div>
              )}
            </div>

            {/* Hidden GifPicker trigger container */}
            {showGifPicker && (
              <div className="relative shrink-0">
                <GifPicker
                  onSelect={handleGifSelect}
                  onClose={() => setShowGifPicker(false)}
                />
              </div>
            )}

            {/* Textarea */}
            <textarea
              ref={inputRef}
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                autoResize();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Message…"
              disabled={disabled}
              rows={1}
              className="flex-1 min-w-0 resize-none rounded-2xl bg-secondary border border-transparent focus:outline-none focus:border-primary/30 px-3 py-2 text-xs md:text-sm min-h-[36px] max-h-[120px] leading-normal overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            />

            {/* Send / Mic */}
            {value.trim() || mediaPreview ? (
              <button
                onClick={handleSend}
                disabled={disabled || !!uploadProgress}
                className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 active:scale-90 transition-transform disabled:opacity-50"
                aria-label="Send"
              >
                <Send className="w-3.5 h-3.5 text-primary-foreground" />
              </button>
            ) : (
              <button
                onClick={startRecording}
                disabled={disabled}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-secondary transition-colors shrink-0 active:scale-90"
                aria-label="Record voice"
              >
                <Mic className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {conversationId && showPollModal && (
        <CreatePollModal
          isOpen={showPollModal}
          onClose={() => setShowPollModal(false)}
          conversationId={conversationId}
          onCreated={poll => {
            onPollCreated?.(poll);
          }}
        />
      )}

      {conversationId && showGameModal && (
        <GameInviteModal
          isOpen={showGameModal}
          onClose={() => setShowGameModal(false)}
          conversationId={conversationId}
          otherUserUsername={otherUserUsername}
          onGameCreated={game => {
            onGameCreated?.(game);
          }}
        />
      )}
    </div>
  );
}
