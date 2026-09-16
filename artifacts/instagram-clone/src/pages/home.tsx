import { useState, useEffect, useRef } from "react";
import { useGetStoriesFeed } from "@workspace/api-client-react";
import type { Post } from "@workspace/api-client-react";
import { useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { PostCard } from "@/components/post-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { AnimatePresence } from "framer-motion";
import { StoryViewer } from "@/components/StoryViewer";
import { StoryCreator } from "@/components/StoryCreator";
import { SuggestedUsers } from "@/components/SuggestedUsers";
import { useAuth } from "@/lib/auth";
import { Plus, Play, Loader2, RefreshCw } from "lucide-react";
import { apiUrl } from "@/lib/api-url";
import { Button } from "@/components/ui/button";
import { InstallPwaModal } from "@/components/InstallPwaModal";

function PostSkeleton() {
  return (
    <div className="bg-card sm:border border-border sm:rounded-lg p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-muted" />
        <div className="space-y-1.5 flex-1">
          <div className="w-28 h-3.5 bg-muted rounded" />
          <div className="w-16 h-2.5 bg-muted rounded" />
        </div>
      </div>
      <div className="w-full aspect-square bg-muted rounded-md" />
      <div className="space-y-2">
        <div className="flex gap-4">
          <div className="w-6 h-6 rounded-full bg-muted" />
          <div className="w-6 h-6 rounded-full bg-muted" />
          <div className="w-6 h-6 rounded-full bg-muted" />
        </div>
        <div className="w-24 h-3 bg-muted rounded" />
        <div className="w-3/4 h-3 bg-muted rounded" />
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: storiesData, isLoading: storiesLoading } = useGetStoriesFeed();

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUserIdx, setViewerUserIdx] = useState(0);
  const [creatorOpen, setCreatorOpen] = useState(false);

  // Progressive Infinite Feed Query
  const {
    data: feedPages,
    isLoading: feedLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["/api/posts/feed/infinite"],
    queryFn: async ({ pageParam = 1 }) => {
      const token = localStorage.getItem("whiterchat_token");
      const res = await fetch(apiUrl(`/api/posts/feed?page=${pageParam}&limit=10`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load feed");
      return res.json();
    },
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    initialPageParam: 1,
  });

  const posts: Post[] = feedPages?.pages.flatMap((p) => p.posts ?? []) ?? [];

  // Sentinel IntersectionObserver for progressive scroll loading
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Separate own stories from others
  const myStories = storiesData?.find((s) => s.user.id === user?.id);
  const otherStories = storiesData?.filter((s) => s.user.id !== user?.id) ?? [];

  const openViewer = (globalIdx: number) => {
    setViewerUserIdx(globalIdx);
    setViewerOpen(true);
  };

  const openMyStoryViewer = () => {
    if (!storiesData) return;
    const myIdx = storiesData.findIndex((s) => s.user.id === user?.id);
    if (myIdx >= 0) {
      setViewerUserIdx(myIdx);
      setViewerOpen(true);
    }
  };

  const getGlobalIdx = (userId: string) => {
    return storiesData?.findIndex((s) => s.user.id === userId) ?? 0;
  };

  const handleStorySuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/stories/feed"] });
    queryClient.invalidateQueries({ queryKey: ["/api/stories/mine"] });
  };

  return (
    <>
      <div className="flex gap-8 xl:gap-12 max-w-5xl mx-auto w-full pt-4 pb-20 md:pb-8 px-0 xl:px-4">
        <div className="flex-1 min-w-0 max-w-2xl mx-auto xl:mx-0 w-full">
          {/* Stories row */}
          {!storiesLoading && (
            <div className="mb-6 bg-card border-b sm:border border-border sm:rounded-lg p-4">
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex w-max space-x-4">
                  {/* My Story */}
                  {myStories ? (
                    <button onClick={openMyStoryViewer} className="flex flex-col items-center gap-1 cursor-pointer group">
                      <div className="relative">
                        <div className="p-[2px] rounded-full bg-gradient-to-tr from-yellow-400 to-fuchsia-600">
                          <Avatar className="h-16 w-16 border-2 border-background">
                            <AvatarImage src={user?.avatarUrl ?? undefined} />
                            <AvatarFallback className="text-sm font-semibold">{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-background">
                          <Play size={9} className="text-white ml-0.5" fill="white" />
                        </div>
                      </div>
                      <span className="text-xs max-w-[70px] truncate text-muted-foreground">Your story</span>
                    </button>
                  ) : (
                    <button onClick={() => setCreatorOpen(true)} className="flex flex-col items-center gap-1 cursor-pointer group">
                      <div className="relative">
                        <Avatar className="h-16 w-16 border-2 border-dashed border-border group-hover:border-primary transition-colors">
                          <AvatarImage src={user?.avatarUrl ?? undefined} />
                          <AvatarFallback className="text-sm font-semibold">{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-background">
                          <Plus size={11} className="text-primary-foreground" strokeWidth={3} />
                        </div>
                      </div>
                      <span className="text-xs max-w-[70px] truncate text-muted-foreground">Add story</span>
                    </button>
                  )}

                  {/* Other users' stories */}
                  {otherStories.map((userStory) => (
                    <button key={userStory.user.id} onClick={() => openViewer(getGlobalIdx(userStory.user.id))}
                      className="flex flex-col items-center gap-1 cursor-pointer">
                      <div className={cn("p-[2px] rounded-full", userStory.hasUnviewed ? "bg-gradient-to-tr from-yellow-400 to-fuchsia-600" : "bg-border")}>
                        <Avatar className="h-16 w-16 border-2 border-background">
                          <AvatarImage src={userStory.user.avatarUrl ?? undefined} />
                          <AvatarFallback className="text-sm font-semibold">{userStory.user.username[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                      </div>
                      <span className="text-xs max-w-[70px] truncate">{userStory.user.username}</span>
                    </button>
                  ))}

                  {/* Add story button */}
                  {myStories && (
                    <button onClick={() => setCreatorOpen(true)} className="flex flex-col items-center gap-1 cursor-pointer group">
                      <div className="w-16 h-16 rounded-full border-2 border-dashed border-border group-hover:border-primary transition-colors flex items-center justify-center">
                        <Plus size={22} className="text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <span className="text-xs text-muted-foreground">Add more</span>
                    </button>
                  )}
                </div>
                <ScrollBar orientation="horizontal" className="hidden" />
              </ScrollArea>
            </div>
          )}

          {/* Progressive Feed */}
          <div className="space-y-4">
            {feedLoading ? (
              <div className="space-y-4">
                <PostSkeleton />
                <PostSkeleton />
              </div>
            ) : isError ? (
              <div className="text-center p-8 bg-card sm:rounded-lg border border-border">
                <p className="text-muted-foreground mb-3">Failed to load feed</p>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
                  <RefreshCw className="w-4 h-4" /> Try Again
                </Button>
              </div>
            ) : posts.length > 0 ? (
              <>
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}

                {/* Sentinel Element for Infinite Scroll */}
                <div ref={loadMoreRef} className="py-6 text-center">
                  {isFetchingNextPage ? (
                    <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <span>Loading more posts…</span>
                    </div>
                  ) : !hasNextPage ? (
                    <div className="p-6 text-center text-xs text-muted-foreground bg-card/50 sm:rounded-lg border border-border/60">
                      You're all caught up! You've seen all recent posts.
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="text-center p-12 bg-card sm:rounded-lg border border-border">
                <h3 className="text-xl font-semibold mb-2">Welcome to WhiterChat</h3>
                <p className="text-muted-foreground mb-4">Follow some users to see their posts here.</p>
                <Link href="/explore" className="text-primary font-semibold hover:underline">Explore users</Link>
              </div>
            )}
          </div>
        </div>

        {/* Suggested Users sidebar — desktop only */}
        <SuggestedUsers />
      </div>

      <AnimatePresence>
        {viewerOpen && storiesData && storiesData.length > 0 && (
          <StoryViewer userStories={storiesData} initialUserIndex={viewerUserIdx} onClose={() => setViewerOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {creatorOpen && (
          <StoryCreator onClose={() => setCreatorOpen(false)} onSuccess={handleStorySuccess} />
        )}
      </AnimatePresence>

      <InstallPwaModal />
    </>
  );
}
