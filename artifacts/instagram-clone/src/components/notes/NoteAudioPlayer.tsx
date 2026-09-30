import { useState, useEffect, useRef } from "react";
import { Play, Pause, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  audioUrl: string;
  duration?: number | null;
  compact?: boolean;
  className?: string;
}

export function NoteAudioPlayer({ audioUrl, duration, compact = false, className }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const onLoadedMetadata = () => {
      if (!duration && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(Math.round(audio.duration));
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audioRef.current = null;
    };
  }, [audioUrl, duration]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn("Audio play failed:", err);
      });
    }
  };

  const formatSeconds = (sec: number) => {
    const s = Math.floor(sec);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem < 10 ? "0" : ""}${rem}`;
  };

  const progressPct = totalDuration > 0 ? Math.min(100, (currentTime / totalDuration) * 100) : 0;

  if (compact) {
    return (
      <button
        type="button"
        onClick={togglePlay}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors",
          className
        )}
      >
        {isPlaying ? <Pause className="w-2.5 h-2.5 fill-current" /> : <Play className="w-2.5 h-2.5 fill-current" />}
        <span>{isPlaying ? formatSeconds(currentTime) : formatSeconds(totalDuration || 5)}</span>
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 p-2 rounded-xl bg-secondary/60 border border-border/60 select-none",
        className
      )}
      onClick={e => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={togglePlay}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:scale-105 active:scale-95 transition-transform"
        aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
      >
        {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />}
      </button>

      <div className="flex-1 min-w-0">
        {/* Animated Sound Wave Bars */}
        <div className="flex items-center gap-0.5 h-4 mb-1">
          {[40, 70, 90, 60, 100, 50, 80, 45, 95, 65, 85, 30, 75, 55].map((height, idx) => {
            const barProgress = (idx / 14) * 100;
            const isFilled = barProgress <= progressPct;
            return (
              <div
                key={idx}
                className={cn(
                  "flex-1 rounded-full transition-all duration-150",
                  isFilled ? "bg-primary" : "bg-muted-foreground/30",
                  isPlaying && "animate-pulse"
                )}
                style={{
                  height: `${height}%`,
                  animationDelay: `${idx * 70}ms`,
                }}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground tabular-nums">
          <span>{isPlaying ? formatSeconds(currentTime) : "Voice note"}</span>
          <span>{formatSeconds(totalDuration || 5)}</span>
        </div>
      </div>

      <Volume2 className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
    </div>
  );
}
