import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { mobileApi } from "../../services/api/client";
import type { Post } from "../../types";

interface ExploreScreenProps {
  onNavigateToPost: (postId: string) => void;
}

export const ExploreScreen: React.FC<ExploreScreenProps> = ({ onNavigateToPost }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    mobileApi
      .getExplorePosts({ page: 1, limit: 21 })
      .then((res) => {
        if (res.data?.posts) {
          setPosts(res.data.posts);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-20 select-none">
      {/* Search Header */}
      <div className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md p-3 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="relative flex items-center max-w-md mx-auto">
          <Search className="absolute left-3.5 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tags, places, people..."
            className="w-full h-10 pl-10 pr-4 bg-zinc-100 dark:bg-zinc-900 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-lg mx-auto">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5 mt-0.5">
            {posts.map((post) => (
              <div
                key={post._id}
                onClick={() => onNavigateToPost(post._id)}
                className="relative aspect-square bg-zinc-200 dark:bg-zinc-900 cursor-pointer overflow-hidden active:opacity-80"
              >
                {post.mediaUrls?.[0] ? (
                  <img
                    src={post.mediaUrls[0]}
                    alt="Explore"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full p-2 flex items-center justify-center text-[10px] text-zinc-500 text-center">
                    {post.caption?.slice(0, 30)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
