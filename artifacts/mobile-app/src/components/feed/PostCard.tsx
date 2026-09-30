import React, { useState } from "react";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import type { Post, User } from "../../types";

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onSave: (postId: string) => void;
  onCommentClick: (post: Post) => void;
  onUserClick: (username: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onLike,
  onSave,
  onCommentClick,
  onUserClick,
}) => {
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [isSaved, setIsSaved] = useState(post.isSaved || false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [currentMediaIdx, setCurrentMediaIdx] = useState(0);

  const author: User = typeof post.authorId === "object" ? (post.authorId as User) : post.author || {
    _id: "unknown",
    username: "anonymous",
    displayName: "Anonymous",
  };

  const handleDoubleTap = () => {
    if (!isLiked) {
      setIsLiked(true);
      setLikesCount((prev) => prev + 1);
      onLike(post._id);
    }
    setShowHeartAnim(true);
    setTimeout(() => setShowHeartAnim(false), 700);
  };

  const handleLikeToggle = () => {
    const nextState = !isLiked;
    setIsLiked(nextState);
    setLikesCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));
    onLike(post._id);
  };

  const handleSaveToggle = () => {
    setIsSaved(!isSaved);
    onSave(post._id);
  };

  const timeAgo = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60));
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <article className="w-full bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800/80 mb-2">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-3">
        <div
          onClick={() => onUserClick(author.username)}
          className="flex items-center gap-2.5 cursor-pointer active:opacity-80 transition-opacity"
        >
          <Avatar
            src={author.avatarUrl}
            name={author.displayName || author.username}
            size="sm"
            isVerified={author.isVerified}
          />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
              {author.username}
            </span>
            {post.location && (
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                {post.location}
              </span>
            )}
          </div>
        </div>

        <button className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Media Carousel */}
      <div
        className="relative w-full aspect-square bg-zinc-100 dark:bg-zinc-900 overflow-hidden select-none"
        onDoubleClick={handleDoubleTap}
      >
        {post.mediaUrls && post.mediaUrls.length > 0 ? (
          <img
            src={post.mediaUrls[currentMediaIdx] || post.mediaUrls[0]}
            alt={post.caption || "Post media"}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-6 text-center text-zinc-600 dark:text-zinc-300 font-medium text-base">
            {post.caption}
          </div>
        )}

        {/* Double-tap big floating heart */}
        {showHeartAnim && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-in zoom-in-50 fade-in duration-200">
            <Heart className="w-24 h-24 fill-red-500 text-red-500 drop-shadow-xl animate-bounce" />
          </div>
        )}

        {/* Carousel indicator dots */}
        {post.mediaUrls && post.mediaUrls.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/40 backdrop-blur-xs px-2 py-1 rounded-full">
            {post.mediaUrls.map((_, idx) => (
              <div
                key={idx}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  idx === currentMediaIdx ? "bg-white w-3" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Actions Toolbar */}
      <div className="flex items-center justify-between px-3.5 pt-3 pb-1">
        <div className="flex items-center gap-4">
          <button
            onClick={handleLikeToggle}
            className="text-zinc-800 dark:text-zinc-200 active:scale-125 transition-transform"
          >
            <Heart
              className={`w-6 h-6 ${
                isLiked ? "fill-red-500 text-red-500" : ""
              }`}
            />
          </button>
          <button
            onClick={() => onCommentClick(post)}
            className="text-zinc-800 dark:text-zinc-200 active:scale-110 transition-transform"
          >
            <MessageCircle className="w-6 h-6" />
          </button>
          <button className="text-zinc-800 dark:text-zinc-200 active:scale-110 transition-transform">
            <Send className="w-6 h-6" />
          </button>
        </div>

        <button
          onClick={handleSaveToggle}
          className="text-zinc-800 dark:text-zinc-200 active:scale-110 transition-transform"
        >
          <Bookmark
            className={`w-6 h-6 ${isSaved ? "fill-current" : ""}`}
          />
        </button>
      </div>

      {/* Likes & Captions */}
      <div className="px-3.5 pb-3 pt-1 space-y-1">
        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
          {likesCount.toLocaleString()} {likesCount === 1 ? "like" : "likes"}
        </span>

        {post.caption && (
          <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed">
            <span
              onClick={() => onUserClick(author.username)}
              className="font-bold mr-1.5 cursor-pointer hover:underline"
            >
              {author.username}
            </span>
            {post.caption}
          </p>
        )}

        {post.commentsCount > 0 && (
          <button
            onClick={() => onCommentClick(post)}
            className="text-xs text-zinc-500 dark:text-zinc-400 block hover:underline pt-0.5"
          >
            View all {post.commentsCount} comments
          </button>
        )}

        <time className="text-[10px] text-zinc-400 dark:text-zinc-500 block uppercase tracking-wider">
          {timeAgo(post.createdAt)}
        </time>
      </div>
    </article>
  );
};
