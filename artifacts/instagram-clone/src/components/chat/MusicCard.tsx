import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Music, ExternalLink } from "lucide-react";

export interface SpotifyTrackPayload {
  trackId: string;
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  previewUrl?: string;
  spotifyUrl?: string;
}

export function MusicCard({ track }: { track: SpotifyTrackPayload }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current && track.previewUrl) {
      const a = new Audio(track.previewUrl);
      a.onended = () => setIsPlaying(false);
      audioRef.current = a;
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  };

  return (
    <div className="my-1.5 w-72 overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-900 text-white shadow-lg select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-neutral-950/80 border-b border-neutral-800 text-[10px] font-semibold text-emerald-400">
        <span className="flex items-center gap-1.5">
          <Music className="w-3.5 h-3.5 fill-emerald-400" /> Spotify Track
        </span>
        <span className="text-neutral-400">30s Preview</span>
      </div>

      <div className="p-3.5 flex items-center gap-3 bg-neutral-900">
        {/* Album Artwork */}
        <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-neutral-950 flex-shrink-0 border border-neutral-800 group">
          {track.coverUrl ? (
            <img
              src={track.coverUrl}
              alt={track.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-emerald-950/40 text-emerald-400">
              <Music className="w-8 h-8 opacity-60" />
            </div>
          )}

          {/* Audio Play Overlay if preview exists */}
          {track.previewUrl && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 bg-black/40 flex items-center justify-center hover:bg-black/50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-md">
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-black" />
                ) : (
                  <Play className="w-4 h-4 fill-black ml-0.5" />
                )}
              </div>
            </button>
          )}
        </div>

        {/* Track Title & Artist */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-white truncate leading-tight">
            {track.title}
          </h4>
          <p className="text-xs text-neutral-400 truncate mt-0.5">
            {track.artist}
          </p>
          {track.album && (
            <p className="text-[10px] text-neutral-500 truncate mt-0.5">
              {track.album}
            </p>
          )}
        </div>
      </div>

      {/* Footer Spotify Link */}
      <div className="px-3 py-2 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between">
        <span className="text-[10px] font-medium text-neutral-400">Listen on Spotify</span>
        <a
          href={track.spotifyUrl || `https://open.spotify.com/search/${encodeURIComponent(track.title + " " + track.artist)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Open <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
