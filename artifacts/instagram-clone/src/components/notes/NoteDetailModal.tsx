import { useState, useEffect } from "react";
import {
  X,
  Clock3,
  Send,
  Trash2,
  Plus,
  MapPin,
  Sparkles,
  Users,
  ShieldCheck,
  Music,
  Play,
  Pause,
  ExternalLink,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NoteAudioPlayer } from "./NoteAudioPlayer";
import { getNoteTheme } from "@/lib/note-themes";
import { cn } from "@/lib/utils";
import type { SocialNote } from "@/types/note";

interface Props {
  note: SocialNote;
  onClose: () => void;
  onReply?: (text: string) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  onNewNote?: () => void;
}

function timeLeft(expiresAt: string, now: number) {
  const diff = Math.max(0, new Date(expiresAt).getTime() - now);
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ${minutes}m left`;
  if (minutes > 0) return `${minutes}m left`;
  return "Expiring soon";
}

export function NoteDetailModal({
  note,
  onClose,
  onReply,
  onDelete,
  onNewNote,
}: Props) {
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSending || !onReply) return;
    setIsSending(true);
    try {
      await onReply(replyText.trim());
      setReplyText("");
      onClose();
    } finally {
      setIsSending(false);
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

  const author = note.author;
  const isCloseFriends = note.audience === "close_friends";
  const themeConfig = getNoteTheme(note.theme);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-xs p-0 sm:items-center sm:p-4 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-h-[90vh] overflow-y-auto rounded-t-[28px] bg-card border-t sm:border border-border shadow-2xl sm:max-w-md sm:rounded-[28px] flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        {/* Mobile handle */}
        <div className="mx-auto mt-2.5 -mb-1 h-1.5 w-12 rounded-full bg-muted-foreground/30 sm:hidden shrink-0 pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3.5 pb-3 border-b border-border/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className={cn("h-10 w-10 border-2", isCloseFriends ? "border-emerald-500" : "border-border")}>
                <AvatarImage src={author.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-secondary font-bold text-xs">
                  {author.username[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              {isCloseFriends && (
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white text-[9px]">
                  ★
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-foreground">
                  {author.fullName || author.username}
                </span>
                {isCloseFriends && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    Close Friends
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <span>@{author.username}</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="w-3 h-3" />
                  {timeLeft(note.expiresAt, now)}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Note Body */}
        <div className="p-5 flex-1 space-y-4">
          {/* Main Bubble Card */}
          <div
            className={cn(
              "relative rounded-2xl p-4 border shadow-xs space-y-3",
              themeConfig.detailCardClass,
              isCloseFriends && "ring-1 ring-emerald-500/30"
            )}
          >
            {/* Note text and emoji */}
            {(note.text || note.emoji) && (
              <div className="flex items-start gap-2.5">
                {note.emoji && (
                  <span className="text-3xl leading-none shrink-0">{note.emoji}</span>
                )}
                {note.text && (
                  <p className={cn("flex-1 text-base sm:text-lg font-semibold break-words leading-snug", themeConfig.textClass)}>
                    {note.text}
                  </p>
                )}
              </div>
            )}

            {/* Sticker if present */}
            {note.sticker && (
              <div className="flex justify-center py-1">
                <span className="text-5xl">{note.sticker}</span>
              </div>
            )}

            {/* Photo preview */}
            {note.imageUrl && (
              <div className="relative rounded-xl overflow-hidden border border-border/60 bg-black/5 max-h-64 flex items-center justify-center">
                <img
                  src={note.imageUrl}
                  alt="Photo attachment"
                  className="w-full max-h-64 object-cover rounded-xl"
                  loading="lazy"
                />
              </div>
            )}

            {/* GIF preview */}
            {note.gifUrl && (
              <div className="relative rounded-xl overflow-hidden border border-border/60 bg-black/5 max-h-64 flex items-center justify-center">
                <img
                  src={note.gifUrl}
                  alt="GIF attachment"
                  className="w-full max-h-64 object-cover rounded-xl"
                  loading="lazy"
                />
              </div>
            )}

            {/* Voice player */}
            {note.voiceUrl && (
              <div className="pt-1">
                <NoteAudioPlayer audioUrl={note.voiceUrl} duration={note.voiceDuration} />
              </div>
            )}

            {/* Spotify track card */}
            {note.spotifyTrack && (
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border/80 text-xs font-semibold text-foreground">
                {note.spotifyTrack.coverUrl ? (
                  <img
                    src={note.spotifyTrack.coverUrl}
                    alt={note.spotifyTrack.title}
                    className="w-11 h-11 rounded-lg object-cover shrink-0 shadow-xs"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500 shrink-0">
                    <Music className="w-5 h-5" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <Music className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Spotify</span>
                  </div>
                  <p className="truncate text-xs font-bold text-foreground mt-0.5">{note.spotifyTrack.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{note.spotifyTrack.artist}</p>
                </div>
                {note.spotifyTrack.spotifyUrl && (
                  <a
                    href={note.spotifyTrack.spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-colors shrink-0"
                    title="Open in Spotify"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}

            {/* Location card */}
            {note.location?.name && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border/80 text-xs font-semibold text-foreground">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 text-red-500 shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-bold">{note.location.name}</p>
                  {note.location.lat && note.location.lng && (
                    <p className="text-[10px] text-muted-foreground">
                      {note.location.lat.toFixed(3)}°, {note.location.lng.toFixed(3)}°
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Privacy note */}
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground px-1">
            {isCloseFriends ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Shared only with Close Friends</span>
              </>
            ) : (
              <>
                <Users className="w-3.5 h-3.5" />
                <span>Shared with followers</span>
              </>
            )}
          </div>

          {/* Actions for my note */}
          {note.isMe ? (
            <div className="pt-2 space-y-2">
              {confirmDelete ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                  <span className="flex-1 text-xs font-semibold text-destructive">
                    Delete your note?
                  </span>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Cancel
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
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNewNote?.();
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-95 transition-opacity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Share new note</span>
                  </button>
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-destructive/30 text-destructive text-xs font-bold hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Reply input for friend's note */
            onReply && (
              <form onSubmit={handleSendReply} className="pt-2">
                <div className="relative flex items-center">
                  <input
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder={`Reply to ${author.username}…`}
                    className="w-full pl-4 pr-11 py-2.5 text-xs bg-secondary rounded-full border border-border focus:outline-none focus:border-primary/50"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim() || isSending}
                    className="absolute right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"
                    aria-label="Send reply"
                  >
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              </form>
            )
          )}
        </div>
      </div>
    </div>
  );
}
