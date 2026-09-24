import { useCallback, useEffect, useState } from "react";
import {
  Clock3,
  Plus,
  RefreshCw,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NoteBubble } from "@/components/notes/NoteBubble";
import { NoteComposerModal } from "@/components/notes/NoteComposerModal";
import { NoteDetailModal } from "@/components/notes/NoteDetailModal";
import { cn } from "@/lib/utils";
import { apiUrl, getAuthToken } from "@/lib/api-url";
import type { SocialNote, NoteLocation } from "@/types/note";

interface Props {
  myId: string;
  onOpenConversation: (username: string) => void;
}

async function apiRequest(path: string, opts: RequestInit = {}) {
  const token = getAuthToken();
  const r = await fetch(apiUrl(`/api/${path}`), {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(opts.headers ?? {}),
    },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  if (r.status === 204) return null;
  return r.json();
}

function timeLeft(expiresAt: string, now: number) {
  const diff = Math.max(0, new Date(expiresAt).getTime() - now);
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h left`;
  if (minutes > 0) return `${minutes}m left`;
  return "Expiring";
}

export function NotesTray({ myId, onOpenConversation }: Props) {
  const [notes, setNotes] = useState<SocialNote[]>([]);
  const [showComposer, setShowComposer] = useState(false);
  const [selectedNote, setSelectedNote] = useState<SocialNote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const feed = await apiRequest("notes/feed");
      setNotes(Array.isArray(feed) ? feed : []);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const myNote = notes.find(n => n.isMe) ?? null;
  const friendNotes = notes.filter(n => !n.isMe);

  const handleSaveNote = async (payload: {
    text?: string;
    emoji?: string | null;
    gifUrl?: string | null;
    sticker?: string | null;
    voiceUrl?: string | null;
    voiceDuration?: number | null;
    imageUrl?: string | null;
    location?: NoteLocation | null;
    audience?: "followers" | "close_friends";
  }) => {
    await apiRequest("notes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    await loadNotes();
  };

  const handleDeleteMyNote = async () => {
    await apiRequest("notes/me", { method: "DELETE" });
    await loadNotes();
  };

  const handleReplyToNote = async (note: SocialNote, replyText: string) => {
    try {
      const res = await apiRequest(`notes/${note.id}/reply`, {
        method: "POST",
        body: JSON.stringify({ text: replyText }),
      });
      if (res?.authorUsername) {
        onOpenConversation(res.authorUsername);
        return;
      }
    } catch (err) {
      console.warn("Failed to send automatic DM note reply, falling back to routing:", err);
    }
    onOpenConversation(note.author.username);
  };

  if (isLoading) {
    return (
      <section className="shrink-0 border-b border-border bg-card px-4 py-3" aria-label="Social Notes">
        <div className="flex items-center justify-between mb-3">
          <div className="h-3.5 w-24 animate-pulse rounded-full bg-secondary" />
          <div className="h-3 w-16 animate-pulse rounded-full bg-secondary" />
        </div>
        <div className="flex gap-4 overflow-hidden pt-3">
          {[0, 1, 2, 3].map(item => (
            <div key={item} className="flex flex-col items-center gap-2 shrink-0">
              <div className="h-14 w-14 animate-pulse rounded-full bg-secondary" />
              <div className="h-2.5 w-12 animate-pulse rounded-full bg-secondary" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="relative shrink-0 overflow-hidden border-b border-border bg-card select-none" aria-label="Social Notes">
        <div className="flex items-center justify-between px-5 pt-3 pb-1">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold tracking-tight text-foreground">Notes</span>
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="text-[10px] text-muted-foreground">Share thoughts &amp; moments</p>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
            <Clock3 className="h-3 w-3" />
            <span>24h</span>
          </div>
        </div>

        {hasError && (
          <div className="mx-4 my-2 flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1">Notes could not be loaded.</span>
            <button
              type="button"
              onClick={() => void loadNotes()}
              className="inline-flex items-center gap-1 font-semibold hover:underline"
            >
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          </div>
        )}

        {/* Horizontal Tray of Avatars with WhiterChat Speech Bubbles */}
        <div className="relative flex items-end gap-5 overflow-x-auto px-5 pt-7 pb-3 no-scrollbar">
          {/* User's Own Note Avatar */}
          <div className="relative flex flex-col items-center shrink-0 w-[72px]">
            {/* Speech Bubble hovering over user's avatar */}
            <NoteBubble
              note={myNote}
              isMine
              onClick={() => {
                if (myNote) setSelectedNote(myNote);
                else setShowComposer(true);
              }}
            />

            {/* User Avatar */}
            <button
              type="button"
              onClick={() => {
                if (myNote) setSelectedNote(myNote);
                else setShowComposer(true);
              }}
              className="group relative cursor-pointer focus:outline-none"
              title={myNote ? "View your note" : "Share a note"}
            >
              <Avatar className={cn(
                "h-14 w-14 ring-2 ring-offset-2 ring-offset-card transition-transform duration-200 group-hover:scale-105",
                myNote?.audience === "close_friends"
                  ? "ring-emerald-500"
                  : myNote
                  ? "ring-primary"
                  : "ring-border"
              )}>
                <AvatarImage src={myNote?.author.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-secondary text-xs font-bold">
                  {myNote?.author.username?.[0]?.toUpperCase() ?? "ME"}
                </AvatarFallback>
              </Avatar>

              {/* Plus Badge if no note or edit */}
              {!myNote && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-xs">
                  <Plus className="h-3 w-3 stroke-[3]" />
                </span>
              )}
            </button>

            <p className="mt-1.5 max-w-[72px] truncate text-[11px] font-semibold text-foreground text-center">
              Your note
            </p>
            {myNote ? (
              <p className="text-[9px] text-muted-foreground text-center">
                {timeLeft(myNote.expiresAt, now)}
              </p>
            ) : (
              <p className="text-[9px] text-muted-foreground text-center">
                Tap to share
              </p>
            )}
          </div>

          {/* Friends' Notes */}
          {friendNotes.map((note) => {
            const author = note.author;
            const isCloseFriends = note.audience === "close_friends";

            return (
              <div key={note.id} className="relative flex flex-col items-center shrink-0 w-[72px]">
                {/* Speech Bubble hovering over friend's avatar */}
                <NoteBubble
                  note={note}
                  onClick={() => setSelectedNote(note)}
                />

                {/* Friend Avatar */}
                <button
                  type="button"
                  onClick={() => setSelectedNote(note)}
                  className="group relative cursor-pointer focus:outline-none"
                  title={`View ${author.username}'s note`}
                >
                  <Avatar className={cn(
                    "h-14 w-14 ring-2 ring-offset-2 ring-offset-card transition-transform duration-200 group-hover:scale-105",
                    isCloseFriends ? "ring-emerald-500" : "ring-border"
                  )}>
                    <AvatarImage src={author.avatarUrl ?? undefined} />
                    <AvatarFallback className="bg-secondary text-xs font-bold">
                      {author.username[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>

                  {isCloseFriends && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] shadow-xs">
                      ★
                    </span>
                  )}
                </button>

                <p className="mt-1.5 max-w-[72px] truncate text-[11px] font-semibold text-foreground text-center">
                  {author.username}
                </p>
                <p className="text-[9px] text-muted-foreground text-center">
                  {timeLeft(note.expiresAt, now)}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Note Composer Modal */}
      {showComposer && (
        <NoteComposerModal
          existingNote={myNote}
          userAvatar={myNote?.author.avatarUrl ?? null}
          username={myNote?.author.username ?? "you"}
          onSave={handleSaveNote}
          onDelete={myNote ? handleDeleteMyNote : undefined}
          onClose={() => setShowComposer(false)}
        />
      )}

      {/* Note Detail Modal */}
      {selectedNote && (
        <NoteDetailModal
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
          onReply={
            !selectedNote.isMe
              ? (text) => handleReplyToNote(selectedNote, text)
              : undefined
          }
          onDelete={selectedNote.isMe ? handleDeleteMyNote : undefined}
          onNewNote={
            selectedNote.isMe
              ? () => {
                  setSelectedNote(null);
                  setShowComposer(true);
                }
              : undefined
          }
        />
      )}
    </>
  );
}
