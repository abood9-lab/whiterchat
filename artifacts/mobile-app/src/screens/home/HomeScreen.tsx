import React, { useState, useEffect, useCallback } from "react";
import { MobileHeader } from "../../components/ui/MobileHeader";
import { StoriesRail } from "../../components/feed/StoriesRail";
import { PostCard } from "../../components/feed/PostCard";
import { CommentSheet } from "../../components/feed/CommentSheet";
import { mobileApi } from "../../services/api/client";
import { useAuth } from "../../context/AuthContext";
import type { Post, Story } from "../../types";

interface HomeScreenProps {
  onNavigateToUser: (username: string) => void;
  onNavigateToCreateStory: () => void;
  onNavigateToMessages?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateToUser,
  onNavigateToCreateStory,
  onNavigateToMessages,
}) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCommentPost, setActiveCommentPost] = useState<Post | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [feedRes, storiesRes] = await Promise.all([
        mobileApi.getFeed({ page: 1, limit: 15 }),
        mobileApi.getStoriesFeed(),
      ]);

      if (feedRes.data?.posts) {
        setPosts(feedRes.data.posts);
      }
      if (storiesRes.data?.stories) {
        setStories(storiesRes.data.stories);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleLike = async (postId: string) => {
    await mobileApi.likePost(postId);
  };

  const handleSave = async (postId: string) => {
    await mobileApi.savePost(postId);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-20">
      <MobileHeader onMessagesClick={onNavigateToMessages} />

      {/* Stories Carousel */}
      <StoriesRail
        currentUser={user}
        stories={stories}
        onStoryClick={(story) => {
          const author = typeof story.authorId === "object" ? story.authorId : story.author;
          if (author?.username) onNavigateToUser(author.username);
        }}
        onAddStoryClick={onNavigateToCreateStory}
      />

      {/* Feed List */}
      <main className="max-w-lg mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-zinc-500 font-medium">Loading your feed...</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
              ✨
            </div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
              Welcome to WhiterChat
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs">
              Follow people or create your first post to start seeing moments in your feed.
            </p>
            <button
              onClick={handleRefresh}
              className="mt-4 px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-semibold active:scale-95"
            >
              Refresh Feed
            </button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {posts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                onLike={handleLike}
                onSave={handleSave}
                onCommentClick={(p) => setActiveCommentPost(p)}
                onUserClick={onNavigateToUser}
              />
            ))}
          </div>
        )}
      </main>

      {/* Comments Drawer */}
      <CommentSheet
        post={activeCommentPost}
        currentUser={user}
        isOpen={Boolean(activeCommentPost)}
        onClose={() => setActiveCommentPost(null)}
      />
    </div>
  );
};
