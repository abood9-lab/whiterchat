import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  url: string;
  isMe?: boolean;
}

// Deterministic fake waveform from URL hash
function getWaveBars(url: string, count = 28): number[] {
  let hash = 0;
  for (let i = 0; i < url.length; i++) hash = ((hash << 5) - hash + url.charCodeAt(i)) | 0;
  return Array.from({ length: count }, (_, i) => {
    const v = Math.abs(Math.sin(hash + i * 1.3) * 60 + Math.sin(i * 0.7 + hash * 0.01) * 30);
    return Math.max(15, Math.min(95, v));
  });
}

const PLAYBACK_SPEEDS = [1, 1.5, 2];

export function VoicePlayer({ url, isMe }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const bars = getWaveBars(url);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onMeta = () => setDuration(isFinite(audio.duration) ? audio.duration : 0);
    const onTime = () => setCurrentTime(audio.currentTime);
    const onEnd = () => { setIsPlaying(false); setCurrentTime(0); };
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
    };
  }, [url]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play().then(() => setIsPlaying(true)).catch(() => {}); }
  };

  const handleBarClick = (i: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    audio.currentTime = (i / bars.length) * duration;
  };

  const handleToggleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextIdx = (speedIndex + 1) % PLAYBACK_SPEEDS.length;
    setSpeedIndex(nextIdx);
    if (audioRef.current) {
      audioRef.current.playbackRate = PLAYBACK_SPEEDS[nextIdx];
    }
  };

  const fmt = (s: number) => {
    if (!isFinite(s) || s <= 0) return "0:00";
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? currentTime / duration : 0;
  const currentSpeed = PLAYBACK_SPEEDS[speedIndex];

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2.5 rounded-2xl select-none shadow-xs",
      isMe ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground",
      "min-w-[210px] max-w-[280px]"
    )}>
      <audio ref={audioRef} src={url} preload="metadata" />

      {/* Play / Pause */}
      <button
        type="button"
        onClick={togglePlay}
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90 shadow-sm cursor-pointer",
          isMe
            ? "bg-white/20 hover:bg-white/30 text-white"
            : "bg-foreground/10 hover:bg-foreground/20 text-foreground"
        )}
        title={isPlaying ? "Pause" : "Play voice note"}
      >
        {isPlaying
          ? <Pause className="w-3.5 h-3.5" />
          : <Play className="w-3.5 h-3.5 ml-0.5" />}
      </button>

      {/* Waveform bars */}
      <div className="flex items-center gap-[2px] flex-1 h-7 cursor-pointer">
        {bars.map((h, i) => {
          const isPast = i / bars.length <= progress;
          return (
            <div
              key={i}
              onClick={() => handleBarClick(i)}
              className={cn(
                "rounded-full transition-colors duration-75",
                "w-[3px]",
                isPast
                  ? isMe ? "bg-white" : "bg-primary"
                  : isMe ? "bg-white/35" : "bg-foreground/20"
              )}
              style={{ height: `${h}%` }}
            />
          );
        })}
      </div>

      {/* Time & Speed Toggle */}
      <div className="flex items-center gap-1 shrink-0">
        <span className={cn(
          "text-[10px] font-semibold tabular-nums",
          isMe ? "text-white/85" : "text-muted-foreground"
        )}>
          {fmt(isPlaying ? currentTime : duration)}
        </span>

        <button
          type="button"
          onClick={handleToggleSpeed}
          className={cn(
            "text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-transform active:scale-95 cursor-pointer",
            isMe
              ? "bg-white/20 text-white hover:bg-white/30"
              : "bg-foreground/10 text-foreground hover:bg-foreground/20",
            currentSpeed > 1 && (isMe ? "bg-white text-primary" : "bg-primary text-primary-foreground")
          )}
          title="Change playback speed (1x, 1.5x, 2x)"
        >
          {currentSpeed}x
        </button>
      </div>
    </div>
  );
}
