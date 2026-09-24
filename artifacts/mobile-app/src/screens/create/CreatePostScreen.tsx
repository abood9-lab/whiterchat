import React, { useState } from "react";
import { Image, X } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { mobileApi } from "../../services/api/client";
import { useAuth } from "../../context/AuthContext";
import { Avatar } from "../../components/ui/Avatar";

interface CreatePostScreenProps {
  onPostCreated: () => void;
  onCancel: () => void;
}

export const CreatePostScreen: React.FC<CreatePostScreenProps> = ({
  onPostCreated,
  onCancel,
}) => {
  const { user } = useAuth();
  const [caption, setCaption] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim() && !mediaUrl.trim()) return;

    setLoading(true);
    setError(null);

    const res = await mobileApi.createPost({
      caption: caption.trim(),
      mediaUrls: mediaUrl.trim() ? [mediaUrl.trim()] : [],
      mediaType: "image",
    });

    if (res.error) {
      setError(res.error);
    } else {
      onPostCreated();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md h-14 flex items-center justify-between px-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <button
          onClick={onCancel}
          className="p-1.5 rounded-full text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          <X className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
          New Post
        </h1>
        <Button
          onClick={handleSubmit}
          variant="primary"
          size="sm"
          isLoading={loading}
          disabled={!caption.trim() && !mediaUrl.trim()}
        >
          Share
        </Button>
      </header>

      {/* Editor Body */}
      <form onSubmit={handleSubmit} className="p-4 space-y-4 flex-1">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        <div className="flex items-start gap-3">
          <Avatar
            src={user?.avatarUrl}
            name={user?.displayName || user?.username || "You"}
            size="sm"
          />
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="What's on your mind? Share your story..."
            rows={5}
            className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none resize-none pt-1"
            autoFocus
          />
        </div>

        {/* Media URL Input */}
        <div className="space-y-1.5 pt-4 border-t border-zinc-200/80 dark:border-zinc-800/80">
          <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
            <Image className="w-4 h-4 text-emerald-500" /> Image or Media URL
          </label>
          <input
            type="url"
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="https://images.unsplash.com/..."
            className="w-full h-11 px-3.5 bg-zinc-100 dark:bg-zinc-900 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Media Preview */}
        {mediaUrl.trim() && (
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <img
              src={mediaUrl}
              alt="Post preview"
              className="w-full h-full object-cover"
              onError={(e) => ((e.currentTarget as HTMLElement).style.display = "none")}
            />
          </div>
        )}
      </form>
    </div>
  );
};
