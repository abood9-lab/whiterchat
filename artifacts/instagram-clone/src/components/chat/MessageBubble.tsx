import { useState, useRef, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReactionPicker } from "./ReactionPicker";
import { MediaViewer } from "./MediaViewer";
import { VoicePlayer } from "./VoicePlayer";
import { LinkPreview, extractFirstUrl } from "./LinkPreview";
import { apiUrl } from "@/lib/api-url";
import {
  Check, CheckCheck, Pencil, Trash2, Pin, Star,
  Reply, Smile, Copy, Forward, CornerUpRight, Camera, Eye, EyeOff, FileText, Info,
  Languages, Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ReportModal } from "./ReportModal";
import { PollCard, type PollData } from "./PollCard";
import { GameCard, type GameData } from "./GameCard";
import { NoteAudioPlayer } from "@/components/notes/NoteAudioPlayer";
import { getNoteTheme } from "@/lib/note-themes";
import { MapPin, MessageSquareQuote, Phone, Video, PhoneOff, Music, Film, Image as ImageIcon } from "lucide-react";
import { SharedPostCard, SharedReelCard, type SharedPostPayload, type SharedReelPayload } from "./SharedMediaCard";
import { MusicCard, type SpotifyTrackPayload } from "./MusicCard";

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  fileName?: string | null;
  messageType?: string;
  postId?: string | null;
  reelId?: string | null;
  sharedPost?: SharedPostPayload | null;
  sharedReel?: SharedReelPayload | null;
  spotifyTrack?: SpotifyTrackPayload | null;
  callLog?: {
    callType: "voice" | "video";
    duration: number;
    status: "completed" | "missed" | "declined" | "failed";
  } | null;
  gifInfo?: {
    gifId: string;
    url: string;
    previewUrl?: string;
    width?: number;
    height?: number;
    title?: string;
  } | null;
  stickerInfo?: {
    stickerId: string;
    url: string;
    previewUrl?: string;
    title?: string;
  } | null;
  locationInfo?: {
    name: string;
    address?: string;
    lat: number;
    lng: number;
  } | null;
  isRead: boolean;
  isEdited: boolean;
  isDeleted: boolean;
  isForwarded?: boolean;
  reactions: Record<string, string[]>;
  isPinned: boolean;
  starredBy: string[];
  clientId: string | null;
  replyToId: string | null;
  replyTo: { id: string; senderId: string; text: string | null; mediaType: string | null } | null;
  replyToNote?: {
    noteId?: string;
    text?: string | null;
    emoji?: string | null;
    gifUrl?: string | null;
    sticker?: string | null;
    voiceUrl?: string | null;
    voiceDuration?: number | null;
    imageUrl?: string | null;
    location?: { name: string; lat?: number; lng?: number } | null;
    theme?: string | null;
    authorUsername?: string | null;
    isExpired?: boolean;
  } | null;
  createdAt: string;
  updatedAt: string;
  status?: "sending" | "sent" | "failed";
  // Snap fields
  isSnap?: boolean;
  viewOnce?: boolean;
  viewsLeft?: number | null;
  viewedBy?: string[];
  // Poll and Game fields
  pollId?: string | null;
  gameId?: string | null;
  poll?: PollData | null;
  game?: GameData | null;
}

interface Props {
  msg: ChatMessage;
  isMe: boolean;
  isLast: boolean;
  isLastMine: boolean;
  showAvatar: boolean;
  isGroupEnd: boolean;
  otherUserAvatarUrl?: string;
  otherUserUsername: string;
  myId: string;
  onReact: (msgId: string, emoji: string) => void;
  onReply: (msg: ChatMessage) => void;
  onEdit: (msg: ChatMessage) => void;
  onDelete: (msgId: string) => void;
  onPin: (msgId: string) => void;
  onStar: (msgId: string) => void;
  onForward: (msg: ChatMessage) => void;
  compactMode?: boolean;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (msg: ChatMessage) => void;
  onDetails?: (msg: ChatMessage) => void;
  onPollUpdated?: (updated: PollData) => void;
  onGameUpdated?: (updated: GameData) => void;
}

function fmt(dateStr: string) {
  return format(new Date(dateStr), "h:mm a");
}

const QUICK_REACTIONS = ["❤️", "👍", "😂", "🔥", "😮", "😢"];

export function MessageBubble({
  msg, isMe, isLast, isLastMine, showAvatar, isGroupEnd,
  otherUserAvatarUrl, otherUserUsername, myId,
  onReact, onReply, onEdit, onDelete, onPin, onStar, onForward,
  compactMode = false,
  selectionMode = false,
  selected = false,
  onToggleSelect,
  onDetails,
  onPollUpdated,
  onGameUpdated,
}: Props) {
  const [showReactions, setShowReactions] = useState(false);
  const [showMobileSheet, setShowMobileSheet] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [targetLang, setTargetLang] = useState<string>("ar");
  const [mediaViewer, setMediaViewer] = useState<{ url: string; type: string } | null>(null);

  const handleTranslate = useCallback(async () => {
    if (translatedText) {
      setShowTranslation(v => !v);
      return;
    }
    setIsTranslating(true);
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const res = await fetch(apiUrl(`/api/messages/${msg.id}/translate`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.translation) {
        setTranslatedText(data.translation);
        setTargetLang(data.targetLanguage || "ar");
        setShowTranslation(true);
      }
    } catch (e) {
      console.error("Translation error", e);
    } finally {
      setIsTranslating(false);
    }
  }, [msg.id, translatedText]);
  // Snap state
  const [snapRevealedUrl, setSnapRevealedUrl] = useState<string | null>(null);
  const [snapOpening, setSnapOpening] = useState(false);
  const [snapViewsLeft, setSnapViewsLeft] = useState<number | null>(msg.viewsLeft ?? null);
  const snapOpened = snapRevealedUrl !== null;

  const openSnap = useCallback(async () => {
    if (snapOpening || snapOpened) return;
    setSnapOpening(true);
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const r = await fetch(apiUrl(`/api/messages/${msg.id}/snap-viewed`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (r.ok) {
        const data = await r.json();
        setSnapRevealedUrl(data.mediaUrl ?? null);
        setSnapViewsLeft(data.viewsLeft ?? null);
      }
    } catch {}
    setSnapOpening(false);
  }, [msg.id, snapOpening, snapOpened]);
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeTriggered = useRef(false);

  const isStarredByMe = msg.starredBy.includes(myId);
  const reactionEntries = Object.entries(msg.reactions ?? {}).filter(([, users]) => users.length > 0);

  /* ── Touch: long-press → action sheet, swipe → reply ── */
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    swipeTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      if (!swipeTriggered.current) setShowMobileSheet(true);
    }, 480);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
    if (dy > 20) return;
    const swipeDir = isMe ? -1 : 1;
    const delta = dx * swipeDir;
    if (delta > 5) { setIsSwiping(true); setSwipeX(Math.min(delta, 80)); }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    if (swipeX >= 55) { swipeTriggered.current = true; onReply(msg); }
    setIsSwiping(false);
    setSwipeX(0);
  };

  if (msg.isDeleted) {
    return (
      <div className={cn("flex items-end gap-2 mb-1 min-w-0", isMe ? "justify-end" : "justify-start")}>
        {!isMe && <div className="w-7 shrink-0" />}
        <div className="px-4 py-2 text-xs text-muted-foreground italic bg-secondary/50 rounded-2xl border border-border/50">
          Message deleted
        </div>
      </div>
    );
  }

  const isVoice = msg.mediaType === "voice" || msg.mediaType?.startsWith("audio/");

  return (
    <>
      {mediaViewer && (
        <MediaViewer url={mediaViewer.url} type={mediaViewer.type} onClose={() => setMediaViewer(null)} />
      )}

      {/* Forwarded badge */}
      {msg.isForwarded && (
        <div className={cn("flex items-center gap-1 mb-0.5 px-1", isMe ? "justify-end" : "justify-start")}>
          {!isMe && <div className="w-7 shrink-0" />}
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Forward className="w-3 h-3" /> Forwarded
          </span>
        </div>
      )}

      {/* Note Reply context (WhiterChat-style note reply card) */}
      {msg.replyToNote && (() => {
        const noteTheme = getNoteTheme(msg.replyToNote.theme);
        const noteAuthor = msg.replyToNote.authorUsername || otherUserUsername;
        return (
          <div className={cn("flex mb-1", isMe ? "justify-end" : "justify-start")}>
            {!isMe && <div className="w-7 shrink-0" />}
            <div
              className={cn(
                "max-w-[75%] sm:max-w-[65%] p-2.5 rounded-2xl border shadow-xs text-xs transition-all",
                noteTheme.chatReplyClass,
                isMe ? "mr-2" : "ml-9"
              )}
            >
              <div className="flex items-center gap-1.5 font-bold text-[11px] mb-1 opacity-90">
                <MessageSquareQuote className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {isMe ? `Replied to ${noteAuthor}'s note` : `Replied to your note`}
                </span>
                {msg.replyToNote.isExpired && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-black/10 dark:bg-white/10 font-normal">
                    Expired
                  </span>
                )}
              </div>

              {/* Note Content Preview */}
              <div className="space-y-1">
                {(msg.replyToNote.text || msg.replyToNote.emoji) && (
                  <div className="flex items-start gap-1.5">
                    {msg.replyToNote.emoji && (
                      <span className="text-base leading-none shrink-0">{msg.replyToNote.emoji}</span>
                    )}
                    {msg.replyToNote.text && (
                      <p className="line-clamp-2 font-medium text-xs break-words">{msg.replyToNote.text}</p>
                    )}
                  </div>
                )}

                {msg.replyToNote.sticker && (
                  <div className="text-2xl py-0.5">{msg.replyToNote.sticker}</div>
                )}

                {msg.replyToNote.imageUrl && (
                  <div className="rounded-lg overflow-hidden max-h-24 max-w-xs border border-black/10">
                    <img
                      src={msg.replyToNote.imageUrl}
                      alt="Note attachment"
                      className="w-full h-24 object-cover"
                    />
                  </div>
                )}

                {msg.replyToNote.gifUrl && (
                  <div className="rounded-lg overflow-hidden max-h-24 max-w-xs border border-black/10">
                    <img
                      src={msg.replyToNote.gifUrl}
                      alt="Note GIF"
                      className="w-full h-24 object-cover"
                    />
                  </div>
                )}

                {msg.replyToNote.voiceUrl && (
                  <div className="py-0.5">
                    <NoteAudioPlayer
                      audioUrl={msg.replyToNote.voiceUrl}
                      duration={msg.replyToNote.voiceDuration}
                    />
                  </div>
                )}

                {msg.replyToNote.location?.name && (
                  <div className="flex items-center gap-1 text-[10px] opacity-85">
                    <MapPin className="w-3 h-3 shrink-0 text-red-500" />
                    <span className="truncate font-semibold">{msg.replyToNote.location.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Reply context */}
      {msg.replyTo && (
        <div className={cn("flex mb-0.5", isMe ? "justify-end" : "justify-start")}>
          {!isMe && <div className="w-7 shrink-0" />}
          <div className={cn(
            "max-w-[65%] px-3 py-1.5 rounded-xl border-l-2 border-primary bg-secondary/50 text-xs text-muted-foreground",
            isMe ? "mr-2" : "ml-9"
          )}>
            <div className="font-medium text-primary text-[10px] mb-0.5">
              {msg.replyTo.senderId === myId ? "You" : otherUserUsername}
            </div>
            {msg.replyTo.text && <p className="truncate">{msg.replyTo.text}</p>}
            {!msg.replyTo.text && msg.replyTo.mediaType && <p className="italic">[{msg.replyTo.mediaType}]</p>}
          </div>
        </div>
      )}

      {/* Row */}
      <div
        className={cn(
          "flex items-end gap-2 relative min-w-0 w-full",
          isMe ? "justify-end" : "justify-start",
          !isGroupEnd ? "mb-0.5" : compactMode ? "mb-1" : "mb-2"
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={event => {
          if (!selectionMode) return;
          event.stopPropagation();
          onToggleSelect?.(msg);
        }}
        role={selectionMode ? "checkbox" : undefined}
        aria-checked={selectionMode ? selected : undefined}
      >
        {selectionMode && (
          <span className={cn(
            "absolute top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border-2 bg-card shadow-sm",
            isMe ? "left-1" : "right-1",
            selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40 text-transparent",
          )}>
            <Check className="h-3 w-3" />
          </span>
        )}
        {/* Swipe indicator */}
        {isSwiping && swipeX > 10 && (
          <div className={cn(
            "absolute flex items-center justify-center w-7 h-7 rounded-full bg-secondary/80",
            isMe ? "left-1" : "right-1",
          )} style={{ transform: `scale(${0.8 + (swipeX / 80) * 0.4})` }}>
            <CornerUpRight className="w-3.5 h-3.5 text-foreground" />
          </div>
        )}

        {/* Avatar (other user) */}
        {!isMe && (
          <div className="w-7 shrink-0 self-end">
            {showAvatar && (
              <Avatar className="h-7 w-7">
                <AvatarImage src={otherUserAvatarUrl} />
                <AvatarFallback className="text-xs">{otherUserUsername[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
            )}
          </div>
        )}

        {/*
          ┌─────────────────────────────────────────────┐
          │  group/bub — hover zone that wraps BOTH     │
          │  the action bar AND the bubble so moving    │
          │  the mouse between them doesn't close it    │
          └─────────────────────────────────────────────┘
        */}
        <div
          className={cn(
            "group/bub relative flex flex-col gap-0.5 w-fit max-w-[72%] sm:max-w-[65%] min-w-0 transition-transform",
            isMe ? "items-end" : "items-start",
          )}
          style={isSwiping ? {
            transform: `translateX(${isMe ? -swipeX * 0.4 : swipeX * 0.4}px)`,
            transition: "none",
          } : { transition: "transform 0.2s ease" }}
        >
          {/* ── Desktop action bar — floats above bubble, stays inside group/bub ── */}
          <div className={cn(
            "absolute bottom-full mb-1 z-20 hidden sm:flex items-center gap-0.5",
            "bg-card border border-border shadow-lg rounded-full px-1.5 py-1",
            // Invisible until group-hover; stays mounted so mouse can move to it freely
            "opacity-0 pointer-events-none group-hover/bub:opacity-100 group-hover/bub:pointer-events-auto",
            selectionMode && "hidden",
            "transition-opacity duration-100",
            isMe ? "right-0" : "left-0",
          )}>
            {/* Emoji react */}
            <div className="relative">
              <button
                onClick={() => setShowReactions(v => !v)}
                className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <Smile className="w-3.5 h-3.5" />
              </button>
              {showReactions && (
                <ReactionPicker
                  align={isMe ? "right" : "left"}
                  onSelect={emoji => { onReact(msg.id, emoji); setShowReactions(false); }}
                  onClose={() => setShowReactions(false)}
                />
              )}
            </div>

            <ActionBtn title="Reply" onClick={() => onReply(msg)}><Reply className="w-3.5 h-3.5" /></ActionBtn>
            <ActionBtn title="Forward" onClick={() => onForward(msg)}><Forward className="w-3.5 h-3.5" /></ActionBtn>
            {msg.text && (
              <ActionBtn title="Copy" onClick={() => navigator.clipboard.writeText(msg.text!)}>
                <Copy className="w-3.5 h-3.5" />
              </ActionBtn>
            )}
            <ActionBtn
              title={isStarredByMe ? "Unstar" : "Star"}
              onClick={() => onStar(msg.id)}
              className={isStarredByMe ? "text-yellow-500" : ""}
            >
              <Star className={cn("w-3.5 h-3.5", isStarredByMe && "fill-yellow-500")} />
            </ActionBtn>
            <ActionBtn
              title={msg.isPinned ? "Unpin" : "Pin"}
              onClick={() => onPin(msg.id)}
              className={msg.isPinned ? "text-primary" : ""}
            >
              <Pin className={cn("w-3.5 h-3.5", msg.isPinned && "fill-primary")} />
            </ActionBtn>
            {isMe && msg.text && !msg.mediaUrl && (
              <ActionBtn title="Edit" onClick={() => onEdit(msg)}><Pencil className="w-3.5 h-3.5" /></ActionBtn>
            )}
            {isMe && (
              <ActionBtn title="Delete" onClick={() => onDelete(msg.id)} className="text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </ActionBtn>
            )}
            <ActionBtn title="Message details" onClick={() => onDetails?.(msg)}>
              <Info className="w-3.5 h-3.5" />
            </ActionBtn>
            {msg.text && (
              <ActionBtn
                title={isTranslating ? "Translating…" : showTranslation ? "Hide translation" : "Translate"}
                onClick={handleTranslate}
                className={showTranslation ? "text-primary" : ""}
              >
                <Languages className={cn("w-3.5 h-3.5", isTranslating && "animate-spin")} />
              </ActionBtn>
            )}
            {!isMe && (
              <ActionBtn
                title="Report message"
                onClick={() => setShowReportModal(true)}
                className="hover:text-destructive"
              >
                <Flag className="w-3.5 h-3.5" />
              </ActionBtn>
            )}
          </div>

          {/* ── Bubble content ── */}

          {/* Poll Card */}
          {msg.poll && (
            <div className="mb-1">
              <PollCard
                poll={msg.poll}
                myId={myId}
                isMe={isMe}
                onPollUpdated={onPollUpdated}
              />
            </div>
          )}

          {/* Game Card */}
          {msg.game && (
            <div className="mb-1">
              <GameCard
                game={msg.game}
                myId={myId}
                otherUserUsername={otherUserUsername}
                onGameUpdated={onGameUpdated}
              />
            </div>
          )}

          {/* Shared Post Card */}
          {msg.sharedPost && (
            <div className="mb-1">
              <SharedPostCard post={msg.sharedPost} />
            </div>
          )}

          {/* Shared Reel Card */}
          {msg.sharedReel && (
            <div className="mb-1">
              <SharedReelCard reel={msg.sharedReel} />
            </div>
          )}

          {/* Spotify Music Card */}
          {msg.spotifyTrack && (
            <div className="mb-1">
              <MusicCard track={msg.spotifyTrack} />
            </div>
          )}

          {/* Call Log Card */}
          {msg.callLog && (
            <div className={cn(
              "mb-1 px-3.5 py-2.5 rounded-2xl border flex items-center gap-3 select-none",
              msg.callLog.status === "missed" || msg.callLog.status === "declined"
                ? "bg-red-500/10 border-red-500/30 text-red-400"
                : "bg-neutral-900 border-neutral-800 text-neutral-200"
            )}>
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                msg.callLog.status === "missed" || msg.callLog.status === "declined"
                  ? "bg-red-500/20 text-red-400"
                  : "bg-emerald-500/20 text-emerald-400"
              )}>
                {msg.callLog.callType === "video" ? (
                  <Video className="w-4 h-4" />
                ) : msg.callLog.status === "missed" || msg.callLog.status === "declined" ? (
                  <PhoneOff className="w-4 h-4" />
                ) : (
                  <Phone className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold capitalize">
                  {msg.callLog.callType} Call {msg.callLog.status}
                </p>
                <p className="text-[10px] opacity-75 mt-0.5">
                  {msg.callLog.duration > 0
                    ? `${Math.floor(msg.callLog.duration / 60)}m ${msg.callLog.duration % 60}s`
                    : msg.callLog.status}
                </p>
              </div>
            </div>
          )}

          {/* GIF Card */}
          {msg.gifInfo && (
            <div className="my-1 rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950 max-w-[260px]">
              <img
                src={msg.gifInfo.url || msg.gifInfo.previewUrl}
                alt={msg.gifInfo.title || "GIF"}
                className="w-full h-auto object-cover max-h-[240px]"
              />
              <div className="px-2.5 py-1 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between text-[10px] font-semibold text-neutral-400">
                <span>GIPHY</span>
                <span>GIF</span>
              </div>
            </div>
          )}

          {/* Sticker Card */}
          {msg.stickerInfo && (
            <div className="my-1 p-1 max-w-[160px]">
              <img
                src={msg.stickerInfo.url || msg.stickerInfo.previewUrl}
                alt={msg.stickerInfo.title || "Sticker"}
                className="w-full h-auto object-contain max-h-[160px]"
              />
            </div>
          )}

          {/* Voice */}
          {isVoice && msg.mediaUrl && <VoicePlayer url={msg.mediaUrl} isMe={isMe} />}

          {/* Snap bubble */}
          {msg.isSnap && !isVoice && (
            <>
              {isMe ? (
                // Sender sees a compact "sent snap" indicator
                <div className="rounded-2xl overflow-hidden max-w-[200px] bg-gradient-to-br from-yellow-400/20 to-yellow-600/10 border border-yellow-400/30 px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-yellow-400/20 flex items-center justify-center shrink-0">
                    <Camera className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-yellow-400">Sent snap</p>
                    <p className="text-[10px] text-white/50 mt-0.5">
                      {msg.viewsLeft === 0 ? "Expired" :
                       msg.viewsLeft !== null ? `${msg.viewsLeft} view${msg.viewsLeft > 1 ? "s" : ""} left` :
                       msg.viewOnce ? "View once" : "Unlimited"}
                    </p>
                  </div>
                </div>
              ) : snapOpened && snapRevealedUrl ? (
                // Opened snap — show media
                <div className="rounded-2xl overflow-hidden max-w-[260px]">
                  <div
                    className="relative cursor-pointer"
                    onClick={() => setMediaViewer({ url: snapRevealedUrl, type: msg.mediaType ?? "image" })}
                  >
                    {msg.mediaType === "video" || msg.mediaType?.startsWith("video/") ? (
                      <video src={snapRevealedUrl} className="w-full max-h-[220px] object-cover" />
                    ) : (
                      <img src={snapRevealedUrl} alt="snap" className="w-full max-h-[220px] object-cover" />
                    )}
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/50 rounded-full px-2 py-0.5">
                      <Eye className="w-3 h-3 text-white/70" />
                      <span className="text-[10px] text-white/70">
                        {snapViewsLeft === 0 ? "Cannot replay" :
                         snapViewsLeft !== null ? `${snapViewsLeft} left` : ""}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                // Unopened snap — tap to open
                <button
                  onClick={openSnap}
                  disabled={snapOpening}
                  className="rounded-2xl overflow-hidden max-w-[200px] w-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30 px-4 py-4 flex items-center gap-3 hover:from-purple-500/30 hover:to-pink-500/30 transition-all active:scale-95"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                    {snapOpening ? (
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Camera className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-white">Snap 📸</p>
                    <p className="text-[10px] text-white/60 mt-0.5">
                      {snapOpening ? "Opening..." : "Tap to view"}
                    </p>
                    {msg.viewsLeft !== null && (
                      <p className="text-[10px] text-purple-300 mt-0.5">
                        {msg.viewOnce ? "View once" : `${msg.viewsLeft} views`}
                      </p>
                    )}
                  </div>
                </button>
              )}
            </>
          )}

          {/* File / Document attachment */}
          {!msg.isSnap && !isVoice && msg.mediaType === "file" && msg.mediaUrl && (
            <a
              href={msg.mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl max-w-[260px] transition-opacity hover:opacity-80",
                isMe ? "bg-primary/20" : "bg-secondary"
              )}
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", isMe ? "bg-primary/30" : "bg-muted")}>
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate max-w-[160px]">
                  {msg.fileName || "Attachment"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Tap to open</p>
              </div>
            </a>
          )}

          {/* Image / Video (regular, non-snap) */}
          {!msg.isSnap && !isVoice && msg.mediaType !== "file" && msg.mediaUrl && (
            <div
              className="rounded-2xl overflow-hidden max-w-[260px] cursor-pointer"
              onClick={() => setMediaViewer({ url: msg.mediaUrl!, type: msg.mediaType ?? "image" })}
            >
              {msg.mediaType === "video" || msg.mediaType?.startsWith("video/") ? (
                <video src={msg.mediaUrl} className="w-full max-h-[220px] object-cover" />
              ) : (
                <img src={msg.mediaUrl} alt="media" className="w-full max-h-[220px] object-cover" />
              )}
            </div>
          )}

          {/* Text */}
          {msg.text && (() => {
            const linkUrl = extractFirstUrl(msg.text);
            return (
              <div className="flex flex-col gap-0 min-w-0 max-w-full">
                <div
                  className={cn(
                    cn(
                      compactMode ? "px-3 py-2 text-[13px]" : "px-4 py-2.5 text-sm",
                      "leading-relaxed relative min-w-0 max-w-full",
                    ),
                    isMe
                      ? "bg-primary text-primary-foreground rounded-[22px] rounded-br-[6px]"
                      : "bg-secondary text-foreground rounded-[22px] rounded-bl-[6px]",
                    isGroupEnd && isMe && "rounded-br-[22px]",
                    isGroupEnd && !isMe && "rounded-bl-[22px]",
                    msg.isPinned && "ring-1 ring-primary/40",
                  )}
                  style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
                >
                  {msg.isPinned && (
                    <Pin className="w-2.5 h-2.5 absolute -top-1 -right-1 text-primary fill-primary" />
                  )}
                  {msg.text}
                  {msg.isEdited && (
                    <span className={cn(
                      "text-[9px] ml-1.5 opacity-60",
                      isMe ? "text-primary-foreground" : "text-muted-foreground"
                    )}>edited</span>
                  )}
                </div>
                {showTranslation && translatedText && (
                  <div className={cn(
                    "mt-1.5 p-2.5 rounded-2xl text-xs border animate-in fade-in duration-150 text-left",
                    isMe
                      ? "bg-primary-foreground/15 border-primary-foreground/25 text-primary-foreground"
                      : "bg-secondary/90 border-border text-foreground"
                  )}>
                    <div className="flex items-center justify-between text-[10px] opacity-80 mb-1 pb-1 border-b border-current/15">
                      <span className="flex items-center gap-1 font-semibold">
                        <Languages className="w-3 h-3" />
                        {targetLang === "ar" ? "Translation to Arabic" : "Translation to English"}
                      </span>
                      <button
                        onClick={() => setShowTranslation(false)}
                        className="hover:underline font-bold"
                      >
                        Hide
                      </button>
                    </div>
                    <p className="leading-relaxed break-words">{translatedText}</p>
                  </div>
                )}
                {linkUrl && (
                  <LinkPreview url={linkUrl} isMe={isMe} />
                )}
              </div>
            );
          })()}

          {/* Reactions */}
          {reactionEntries.length > 0 && (
            <div className={cn("flex flex-wrap gap-1 mt-0.5", isMe ? "justify-end" : "justify-start")}>
              {reactionEntries.map(([emoji, users]) => (
                <button
                  key={emoji}
                  onClick={() => onReact(msg.id, emoji)}
                  className={cn(
                    "text-xs flex items-center gap-1 px-2 py-0.5 rounded-full border transition-all",
                    users.includes(myId)
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-secondary border-border hover:border-primary/40"
                  )}
                >
                  {emoji} <span className="text-[10px] font-medium">{users.length}</span>
                </button>
              ))}
            </div>
          )}

          {/* Read receipt */}
          {isMe && isLastMine && (
            <div className="flex items-center gap-1 px-1">
              {msg.status === "sending" ? (
                <span className="text-[10px] text-muted-foreground">Sending…</span>
              ) : msg.status === "failed" ? (
                <span className="text-[10px] text-destructive">Failed</span>
              ) : (
                <>
                  <span className="text-[10px] text-muted-foreground">{fmt(msg.createdAt)}</span>
                  {msg.isRead
                    ? <CheckCheck className="w-3.5 h-3.5 text-primary" />
                    : <Check className="w-3.5 h-3.5 text-muted-foreground" />}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile action sheet ── */}
      {showMobileSheet && (
        <div
          className="fixed inset-0 z-40 sm:hidden flex items-end bg-black/40"
          onClick={() => setShowMobileSheet(false)}
        >
          <div
            className="w-full bg-card rounded-t-2xl p-4 space-y-0.5"
            style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Quick reactions */}
            <div className="flex justify-around py-3 border-b border-border mb-1">
              {QUICK_REACTIONS.map(emoji => (
                <button
                  key={emoji}
                  className="text-2xl active:scale-125 transition-transform"
                  onClick={() => { onReact(msg.id, emoji); setShowMobileSheet(false); }}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <SheetRow icon={<Reply className="w-5 h-5" />} label="Reply" onClick={() => { onReply(msg); setShowMobileSheet(false); }} />
            <SheetRow icon={<Forward className="w-5 h-5" />} label="Forward" onClick={() => { onForward(msg); setShowMobileSheet(false); }} />
            {msg.text && (
              <SheetRow icon={<Copy className="w-5 h-5" />} label="Copy" onClick={() => { navigator.clipboard.writeText(msg.text!); setShowMobileSheet(false); }} />
            )}
            <SheetRow
              icon={<Star className={cn("w-5 h-5", isStarredByMe && "fill-yellow-500 text-yellow-500")} />}
              label={isStarredByMe ? "Unstar" : "Star"}
              onClick={() => { onStar(msg.id); setShowMobileSheet(false); }}
            />
            <SheetRow
              icon={<Pin className={cn("w-5 h-5", msg.isPinned && "fill-primary text-primary")} />}
              label={msg.isPinned ? "Unpin" : "Pin"}
              onClick={() => { onPin(msg.id); setShowMobileSheet(false); }}
            />
            {isMe && msg.text && !msg.mediaUrl && (
              <SheetRow icon={<Pencil className="w-5 h-5" />} label="Edit" onClick={() => { onEdit(msg); setShowMobileSheet(false); }} />
            )}
            {isMe && (
              <SheetRow
                icon={<Trash2 className="w-5 h-5 text-destructive" />}
                label="Delete"
                labelClass="text-destructive"
                onClick={() => { onDelete(msg.id); setShowMobileSheet(false); }}
              />
            )}
            <SheetRow icon={<Info className="w-5 h-5" />} label="Message details" onClick={() => { onDetails?.(msg); setShowMobileSheet(false); }} />
            {msg.text && (
              <SheetRow
                icon={<Languages className="w-5 h-5 text-primary" />}
                label={showTranslation ? "Hide translation" : "Translate message"}
                onClick={() => { handleTranslate(); setShowMobileSheet(false); }}
              />
            )}
            {!isMe && (
              <SheetRow
                icon={<Flag className="w-5 h-5 text-destructive" />}
                label="Report message"
                labelClass="text-destructive"
                onClick={() => { setShowReportModal(true); setShowMobileSheet(false); }}
              />
            )}
            <button
              className="w-full py-3 text-sm text-muted-foreground font-medium text-center mt-1"
              onClick={() => setShowMobileSheet(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showReportModal && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          messageId={msg.id}
          messagePreview={msg.text || (msg.mediaType ? `[${msg.mediaType}]` : "")}
          senderUsername={otherUserUsername}
        />
      )}
    </>
  );
}

function ActionBtn({
  children, title, onClick, className,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={cn(
        "p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors",
        className,
      )}
    >
      {children}
    </button>
  );
}

function SheetRow({ icon, label, labelClass, onClick }: {
  icon: React.ReactNode;
  label: string;
  labelClass?: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex items-center gap-4 w-full px-2 py-3 rounded-xl hover:bg-secondary/60 transition-colors active:bg-secondary"
      onClick={onClick}
    >
      <span className="text-foreground">{icon}</span>
      <span className={cn("text-sm font-medium", labelClass)}>{label}</span>
    </button>
  );
}
