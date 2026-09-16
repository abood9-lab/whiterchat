import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Film, Image as ImageIcon, ExternalLink, Play } from "lucide-react";
import { useLocation } from "wouter";

export interface SharedPostPayload {
  id: string;
  mediaUrl?: string;
  mediaType?: string;
  caption?: string;
  creatorUsername?: string;
  creatorAvatar?: string;
}

export interface SharedReelPayload {
  id: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  caption?: string;
  creatorUsername?: string;
  creatorAvatar?: string;
}

export function SharedPostCard({ post }: { post: SharedPostPayload }) {
  const [, setLocation] = useLocation();

  const handleOpen = () => {
    if (post.id) {
      setLocation(`/post/${post.id}`);
    }
  };

  return (
    <div
      onClick={handleOpen}
      className="group relative my-1.5 w-64 overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-900 text-white shadow-md cursor-pointer hover:shadow-xl transition-all duration-200 select-none"
    >
      {/* Header with Creator Info */}
      <div className="flex items-center gap-2.5 p-3 bg-neutral-950/80 backdrop-blur-sm border-b border-neutral-800">
        <Avatar className="w-7 h-7 border border-white/20">
          <AvatarImage src={post.creatorAvatar} />
          <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
            {post.creatorUsername?.[0]?.toUpperCase() || "P"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">
            @{post.creatorUsername || "user"}
          </p>
          <p className="text-[10px] text-neutral-400">Post</p>
        </div>
        <ImageIcon className="w-4 h-4 text-neutral-400" />
      </div>

      {/* Media Image Thumbnail */}
      {post.mediaUrl ? (
        <div className="relative aspect-square w-full bg-neutral-950 overflow-hidden">
          <img
            src={post.mediaUrl}
            alt="Shared Post"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="aspect-square w-full bg-neutral-950 flex items-center justify-center text-neutral-500">
          <ImageIcon className="w-10 h-10 opacity-40" />
        </div>
      )}

      {/* Caption & Action Button */}
      <div className="p-3 bg-neutral-900 flex flex-col gap-2">
        {post.caption && (
          <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed">
            {post.caption}
          </p>
        )}
        <Button
          variant="secondary"
          size="sm"
          className="w-full h-8 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700/50 rounded-xl flex items-center justify-center gap-1.5"
        >
          View Post <ExternalLink className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function SharedReelCard({ reel }: { reel: SharedReelPayload }) {
  const [, setLocation] = useLocation();

  const handleOpen = () => {
    if (reel.id) {
      setLocation(`/reels?id=${reel.id}`);
    }
  };

  return (
    <div
      onClick={handleOpen}
      className="group relative my-1.5 w-60 overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-950 text-white shadow-md cursor-pointer hover:shadow-xl transition-all duration-200 select-none"
    >
      {/* Reel Media Preview */}
      <div className="relative aspect-[9/16] w-full bg-neutral-950 overflow-hidden flex items-center justify-center">
        {reel.thumbnailUrl || reel.videoUrl ? (
          <img
            src={reel.thumbnailUrl || reel.videoUrl}
            alt="Shared Reel"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <Film className="w-12 h-12 opacity-40 text-neutral-400" />
        )}

        {/* Play Icon Badge */}
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 flex items-center justify-center transition-colors">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform">
            <Play className="w-6 h-6 text-white fill-white ml-0.5" />
          </div>
        </div>

        {/* Top Header Badge */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white flex items-center gap-1">
            <Film className="w-3 h-3 text-red-500" /> Reel
          </span>
        </div>

        {/* Bottom Info Overlay */}
        <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6 border border-white/30">
              <AvatarImage src={reel.creatorAvatar} />
              <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                {reel.creatorUsername?.[0]?.toUpperCase() || "R"}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-semibold text-white truncate">
              @{reel.creatorUsername || "creator"}
            </span>
          </div>
          {reel.caption && (
            <p className="text-[11px] text-neutral-200 line-clamp-2">
              {reel.caption}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
