import { Mic, MapPin, Music } from "lucide-react";
import { cn } from "@/lib/utils";
import { getNoteTheme } from "@/lib/note-themes";
import type { SocialNote, NoteTheme } from "@/types/note";

interface Props {
  note: SocialNote | null;
  isMine?: boolean;
  className?: string;
  previewTheme?: NoteTheme;
  onClick?: () => void;
}

export function NoteBubble({ note, isMine = false, className, previewTheme, onClick }: Props) {
  if (!note) {
    if (!isMine) return null;
    return (
      <div
        onClick={onClick}
        className={cn(
          "absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 cursor-pointer select-none",
          "px-2 py-0.5 rounded-full bg-card/95 backdrop-blur-sm border border-border/80 shadow-sm",
          "text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all",
          "after:content-[''] after:absolute after:-bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-card/95 after:border-r after:border-b after:border-border/80 after:rotate-45",
          className
        )}
      >
        <span className="whitespace-nowrap">Note…</span>
      </div>
    );
  }

  const themeConfig = getNoteTheme(previewTheme ?? note.theme);
  const hasPhoto = !!note.imageUrl;
  const hasGif = !!note.gifUrl;
  const hasSticker = !!note.sticker;
  const hasVoice = !!note.voiceUrl;
  const hasMusic = !!note.spotifyTrack;
  const hasLocation = !!note.location?.name;
  const hasText = !!note.text?.trim();
  const isCloseFriends = note.audience === "close_friends";

  const formatSec = (sec?: number | null) => {
    if (!sec) return "0:05";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "absolute -top-4 left-1/2 -translate-x-1/2 z-10 cursor-pointer select-none",
        "flex flex-col items-center justify-center p-1.5 rounded-2xl border transition-all duration-200 hover:scale-105 active:scale-95",
        "max-w-[105px] min-w-[50px]",
        themeConfig.bubbleClass,
        isCloseFriends && "ring-1 ring-emerald-500/40",
        // Authentic WhiterChat bubble tail pointing down to the avatar
        "after:content-[''] after:absolute after:-bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:w-2 after:h-2 after:border-r after:border-b after:rotate-45",
        themeConfig.tailClass,
        className
      )}
    >
      {/* Top row: Media thumbnail, sticker, or music cover */}
      {(hasPhoto || hasGif || hasSticker || hasMusic) && (
        <div className="flex items-center justify-center mb-0.5 max-w-[95px] overflow-hidden">
          {hasPhoto && (
            <img
              src={note.imageUrl!}
              alt="Photo Note"
              className="w-7 h-7 rounded-lg object-cover border border-black/10 dark:border-white/10 shadow-xs"
              loading="lazy"
            />
          )}
          {hasGif && !hasPhoto && (
            <img
              src={note.gifUrl!}
              alt="GIF Note"
              className="w-7 h-7 rounded-lg object-cover border border-black/10 dark:border-white/10 shadow-xs"
              loading="lazy"
            />
          )}
          {hasSticker && !hasPhoto && !hasGif && (
            <span className="text-xl leading-none">{note.sticker}</span>
          )}
          {hasMusic && !hasPhoto && !hasGif && !hasSticker && (
            <div className="flex items-center gap-1.5 px-1 py-0.5 rounded-lg bg-black/10 dark:bg-white/10 max-w-[92px]">
              {note.spotifyTrack!.coverUrl ? (
                <img
                  src={note.spotifyTrack!.coverUrl}
                  alt={note.spotifyTrack!.title}
                  className="w-5 h-5 rounded-md object-cover shrink-0"
                  loading="lazy"
                />
              ) : (
                <Music className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              )}
              <div className="flex flex-col min-w-0 flex-1">
                <span className={cn("text-[9px] font-bold truncate leading-none", themeConfig.textClass)}>
                  {note.spotifyTrack!.title}
                </span>
                <span className={cn("text-[7.5px] opacity-80 truncate leading-none mt-0.5", themeConfig.textClass)}>
                  {note.spotifyTrack!.artist}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Middle row: Text content with guaranteed readability contrast */}
      {hasText && (
        <p className={cn("text-[11px] font-semibold leading-tight text-center line-clamp-2 px-1 break-words max-w-[95px]", themeConfig.textClass)}>
          {note.emoji && <span className="mr-0.5">{note.emoji}</span>}
          {note.text}
        </p>
      )}

      {/* Bottom badges: Voice pill or Location pill */}
      {(hasVoice || hasLocation) && (
        <div className={cn("flex items-center gap-1 mt-0.5 text-[9px] font-medium max-w-[92px] overflow-hidden opacity-90", themeConfig.textClass)}>
          {hasVoice && (
            <span className="inline-flex items-center gap-0.5 font-bold">
              <Mic className="w-2.5 h-2.5 shrink-0" />
              <span>{formatSec(note.voiceDuration)}</span>
            </span>
          )}
          {hasLocation && (
            <span className="inline-flex items-center gap-0.5 truncate text-[9px]">
              <MapPin className="w-2.5 h-2.5 text-red-500 shrink-0" />
              <span className="truncate">{note.location!.name.split(",")[0]}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
