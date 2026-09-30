import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Music, Play, Pause, Check } from "lucide-react";
import { apiUrl } from "@/lib/api-url";
import { type SpotifyTrackPayload } from "./MusicCard";

interface MusicPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelectTrack: (track: SpotifyTrackPayload) => void;
}

export function MusicPickerModal({ open, onClose, onSelectTrack }: MusicPickerModalProps) {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<SpotifyTrackPayload[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [audioObj, setAudioObj] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!open) {
      if (audioObj) {
        audioObj.pause();
        setAudioObj(null);
      }
      setPlayingTrackId(null);
      return;
    }

    const fetchTracks = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("whiterchat_token") ?? "";
        const res = await fetch(
          apiUrl(`/api/spotify/search${query ? `?q=${encodeURIComponent(query)}` : ""}`),
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (data.tracks) {
          setTracks(data.tracks);
        }
      } catch (err) {
        console.error("Failed to load tracks", err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchTracks, query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [open, query]);

  const togglePreview = (track: SpotifyTrackPayload, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!track.previewUrl) return;

    if (playingTrackId === track.trackId) {
      if (audioObj) audioObj.pause();
      setPlayingTrackId(null);
      setAudioObj(null);
    } else {
      if (audioObj) audioObj.pause();
      const a = new Audio(track.previewUrl);
      a.onended = () => setPlayingTrackId(null);
      a.play().catch(() => {});
      setAudioObj(a);
      setPlayingTrackId(track.trackId);
    }
  };

  const handleSelect = (track: SpotifyTrackPayload) => {
    if (audioObj) audioObj.pause();
    onSelectTrack(track);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md bg-neutral-900 border-neutral-800 text-white p-0 overflow-hidden rounded-3xl">
        <DialogHeader className="p-4 pb-2 border-b border-neutral-800">
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-emerald-400">
            <Music className="w-5 h-5 fill-emerald-400" /> Share Spotify Music
          </DialogTitle>
        </DialogHeader>

        {/* Search Bar */}
        <div className="p-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search songs or artists..."
              className="pl-9 bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-400 rounded-xl"
            />
          </div>
        </div>

        {/* Tracks List */}
        <div className="max-h-80 overflow-y-auto p-4 pt-0 space-y-2">
          {loading ? (
            <div className="py-8 text-center text-sm text-neutral-400 animate-pulse">
              Searching tracks...
            </div>
          ) : tracks.length === 0 ? (
            <div className="py-8 text-center text-sm text-neutral-400">
              No tracks found.
            </div>
          ) : (
            tracks.map((track) => (
              <div
                key={track.trackId}
                onClick={() => handleSelect(track)}
                className="group flex items-center justify-between p-2.5 rounded-2xl bg-neutral-850 hover:bg-neutral-800 border border-neutral-800/60 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-neutral-950 flex-shrink-0 border border-neutral-800">
                    <img
                      src={track.coverUrl || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100&h=100&fit=crop"}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                    {track.previewUrl && (
                      <button
                        onClick={(e) => togglePreview(track, e)}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {playingTrackId === track.trackId ? (
                          <Pause className="w-4 h-4 text-white fill-white" />
                        ) : (
                          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                        )}
                      </button>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">
                      {track.title}
                    </p>
                    <p className="text-[11px] text-neutral-400 truncate">
                      {track.artist}
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-xl"
                  onClick={() => handleSelect(track)}
                >
                  Send
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
