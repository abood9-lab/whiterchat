import React, { useState, useEffect } from "react";
import { Heart, MessageCircle, Send, Music } from "lucide-react";
import { Avatar } from "../../components/ui/Avatar";
import { mobileApi } from "../../services/api/client";
import type { Post } from "../../types";

export const ReelsScreen: React.FC = () => {
  const [reels, setReels] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    mobileApi
      .getExplorePosts({ page: 1, limit: 10 })
      .then((res) => {
        if (res.data?.posts) {
          setReels(res.data.posts);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentReel = reels[currentIndex];

  if (!currentReel) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center text-white">
        <h3 className="font-bold text-sm">No Reels Available</h3>
        <p className="text-xs text-zinc-400 mt-1">Check back soon for new video moments.</p>
      </div>
    );
  }

  const author = typeof currentReel.authorId === "object" ? currentReel.authorId : currentReel.author;

  return (
    <div className="relative h-screen w-full bg-black overflow-hidden flex flex-col justify-between select-none pb-16">
      {/* Background Media */}
      <div className="absolute inset-0 z-0">
        {currentReel.mediaUrls?.[0] ? (
          <img
            src={currentReel.mediaUrls[0]}
            alt="Reel"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-zinc-900 to-black flex items-center justify-center p-8 text-center text-white text-lg font-bold">
            {currentReel.caption}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80 pointer-events-none" />
      </div>

      {/* Top Header */}
      <div className="relative z-10 p-4 flex items-center justify-between text-white">
        <span className="font-extrabold text-lg tracking-tight">Reels</span>
      </div>

      {/* Bottom Information & Actions Sidebar */}
      <div className="relative z-10 p-4 flex items-end justify-between">
        {/* Author Details & Caption */}
        <div className="flex-1 mr-4 space-y-2 text-white">
          <div className="flex items-center gap-2">
            <Avatar
              src={author?.avatarUrl}
              name={author?.displayName || author?.username}
              size="sm"
              isVerified={author?.isVerified}
            />
            <span className="text-xs font-bold">{author?.username}</span>
            <button className="px-2.5 py-1 bg-white/20 backdrop-blur-xs rounded-full text-[10px] font-bold active:scale-95">
              Follow
            </button>
          </div>

          {currentReel.caption && (
            <p className="text-xs text-zinc-100 line-clamp-2 leading-relaxed">
              {currentReel.caption}
            </p>
          )}

          <div className="flex items-center gap-1.5 text-[11px] text-zinc-300">
            <Music className="w-3.5 h-3.5 animate-spin" />
            <span className="truncate">Original Audio — {author?.username}</span>
          </div>
        </div>

        {/* Right Floating Actions Toolbar */}
        <div className="flex flex-col items-center gap-5 text-white">
          <button className="flex flex-col items-center gap-1 active:scale-125 transition-transform">
            <div className="p-2.5 bg-black/40 backdrop-blur-md rounded-full">
              <Heart className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold">{currentReel.likesCount || 0}</span>
          </button>

          <button className="flex flex-col items-center gap-1 active:scale-125 transition-transform">
            <div className="p-2.5 bg-black/40 backdrop-blur-md rounded-full">
              <MessageCircle className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold">{currentReel.commentsCount || 0}</span>
          </button>

          <button className="flex flex-col items-center gap-1 active:scale-125 transition-transform">
            <div className="p-2.5 bg-black/40 backdrop-blur-md rounded-full">
              <Send className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold">{currentReel.sharesCount || 0}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
