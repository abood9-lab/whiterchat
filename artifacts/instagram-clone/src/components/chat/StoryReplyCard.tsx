import { useState } from "react";
import { Sparkles, Eye, Play, Film, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StoryReplyContext {
  storyId?: string;
  mediaUrl?: string | null;
  caption?: string | null;
  authorUsername?: string | null;
}

interface Props {
  replyToStory: StoryReplyContext;
  text?: string | null;
  isMe: boolean;
  messageType?: string;
  onOpenStory?: (storyId: string, username: string) => void;
}

export function StoryReplyCard({
  replyToStory,
  text,
  isMe,
  messageType,
  onOpenStory,
}: Props) {
  const [imgError, setImgError] = useState(false);
  const isEmojiReaction =
    messageType === "story_reaction" ||
    (text && text.length <= 4 && /\p{Emoji}/u.test(text.trim()));

  const handleCardClick = () => {
    if (replyToStory.storyId && onOpenStory) {
      onOpenStory(replyToStory.storyId, replyToStory.authorUsername || "");
    }
  };

  const isVideo =
    replyToStory.mediaUrl?.includes(".mp4") ||
    replyToStory.mediaUrl?.includes("video") ||
    false;

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 max-w-[280px] sm:max-w-[300px] w-full select-none",
        isMe ? "items-end text-end" : "items-start text-start"
      )}
    >
      {/* ── Story Reference Card (Thumbnail & Context) ── */}
      <div
        onClick={handleCardClick}
        className={cn(
          "group relative overflow-hidden rounded-2xl border transition-all duration-200 cursor-pointer shadow-md",
          "bg-slate-900/90 hover:border-rose-500/50 hover:shadow-rose-500/10",
          isMe
            ? "border-purple-500/30 bg-gradient-to-br from-purple-950/40 via-slate-900/90 to-slate-900"
            : "border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-950"
        )}
      >
        {/* Story Subheader Info */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-950/60 backdrop-blur-md border-b border-white/5 gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-fuchsia-600 p-[1px] shrink-0">
              <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
                <Sparkles className="w-2.5 h-2.5 text-rose-400" />
              </div>
            </div>
            <span className="text-[11px] font-semibold text-slate-300 truncate">
              {replyToStory.authorUsername
                ? `@${replyToStory.authorUsername}'s Story`
                : "Story"}
            </span>
          </div>

          <span className="text-[10px] font-medium text-rose-400 opacity-90 flex items-center gap-0.5 shrink-0 group-hover:underline">
            <Eye className="w-3 h-3" /> View
          </span>
        </div>

        {/* Story Media Thumbnail */}
        <div className="relative w-full h-36 sm:h-40 bg-slate-950 overflow-hidden flex items-center justify-center">
          {replyToStory.mediaUrl && !imgError ? (
            isVideo ? (
              <div className="relative w-full h-full">
                <video
                  src={replyToStory.mediaUrl}
                  className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                  </div>
                </div>
              </div>
            ) : (
              <img
                src={replyToStory.mediaUrl}
                alt="Story thumbnail"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-300"
              />
            )
          ) : (
            <div className="w-full h-full p-4 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900/60 via-purple-900/50 to-pink-900/60 text-center">
              <Film className="w-8 h-8 text-white/50 mb-1" />
              <span className="text-xs font-semibold text-white/80">Story shared</span>
            </div>
          )}

          {/* Caption banner overlay if available */}
          {replyToStory.caption && (
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2.5 pt-6">
              <p className="text-[11px] text-white font-medium line-clamp-2 leading-snug drop-shadow-sm">
                {replyToStory.caption}
              </p>
            </div>
          )}

          {/* Floating Hover Badge */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
            <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-[11px] font-semibold text-white border border-white/20 shadow-lg flex items-center gap-1.5 transform translate-y-1 group-hover:translate-y-0 transition-transform">
              <Eye className="w-3 h-3 text-rose-400" /> Watch Story
            </span>
          </div>
        </div>
      </div>

      {/* ── User's Reply / Reaction Content ── */}
      {isEmojiReaction && text ? (
        <div className="flex items-center gap-2 px-1 py-0.5">
          <div className="text-3xl sm:text-4xl animate-in zoom-in-50 duration-200 drop-shadow-md select-text">
            {text}
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
            Reacted
          </span>
        </div>
      ) : text ? (
        <div
          className={cn(
            "px-4 py-2.5 text-sm leading-relaxed rounded-[20px] shadow-sm max-w-full select-text",
            isMe
              ? "bg-primary text-primary-foreground rounded-br-[6px]"
              : "bg-secondary text-foreground rounded-bl-[6px]"
          )}
          style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
        >
          <div className="flex items-center gap-1 text-[10px] opacity-75 font-semibold mb-0.5">
            <MessageCircle className="w-3 h-3" />
            <span>Story Reply</span>
          </div>
          {text}
        </div>
      ) : null}
    </div>
  );
}
