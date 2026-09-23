import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import {
  Search,
  Heart,
  MessageCircle,
  Loader2,
  X,
  Hash,
  User as UserIcon,
  Film,
  Image as ImageIcon,
  Clock,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useInfiniteQuery } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api-url";
import { SEOHead } from "@/components/SEOHead";
import { cn } from "@/lib/utils";

function GridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-1 sm:gap-2">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="aspect-square bg-muted animate-pulse rounded-sm sm:rounded" />
      ))}
    </div>
  );
}

type SearchTab = "all" | "users" | "hashtags" | "posts" | "reels";

export default function Explore() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTab>("all");
  const [searchData, setSearchData] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [autocompleteItems, setAutocompleteItems] = useState<any[]>([]);
  const [historyItems, setHistoryItems] = useState<{ query: string; timestamp: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Debounce search query by 250ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch search history on mount
  useEffect(() => {
    const token = localStorage.getItem("pixlr_token");
    if (token) {
      fetch(apiUrl("/api/search/history"), {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setHistoryItems(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, []);

  // Autocomplete suggestions
  useEffect(() => {
    if (searchQuery.trim().length > 0 && searchQuery.trim().length < 3) {
      const token = localStorage.getItem("pixlr_token");
      fetch(apiUrl(`/api/search/autocomplete?q=${encodeURIComponent(searchQuery.trim())}`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setAutocompleteItems(Array.isArray(data) ? data : []))
        .catch(() => {});
    } else {
      setAutocompleteItems([]);
    }
  }, [searchQuery]);

  // Unified Search API
  useEffect(() => {
    if (!debouncedQuery) {
      setSearchData(null);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const token = localStorage.getItem("pixlr_token");
    fetch(apiUrl(`/api/search/unified?q=${encodeURIComponent(debouncedQuery)}&limit=30`), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setSearchData(data);
      })
      .catch(() => {
        setSearchData(null);
      })
      .finally(() => {
        setSearchLoading(false);
      });
  }, [debouncedQuery]);

  // Progressive Infinite Explore Posts
  const {
    data: explorePages,
    isLoading: exploreLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["/api/explore/posts/infinite"],
    queryFn: async ({ pageParam = 1 }) => {
      const token = localStorage.getItem("pixlr_token");
      const res = await fetch(apiUrl(`/api/explore/posts?page=${pageParam}&limit=18`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load explore");
      return res.json();
    },
    getNextPageParam: (lastPage) => (lastPage.hasMore ? (lastPage.page ?? 1) + 1 : undefined),
    initialPageParam: 1,
  });

  const posts = explorePages?.pages.flatMap((p) => p.posts ?? []) ?? [];
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

  const clearAllHistory = async () => {
    const token = localStorage.getItem("pixlr_token");
    if (!token) return;
    setHistoryItems([]);
    try {
      await fetch(apiUrl("/api/search/history"), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // ignore
    }
  };

  const deleteHistoryQuery = async (queryToDelete: string) => {
    setHistoryItems((prev) => prev.filter((item) => item.query !== queryToDelete));
    const token = localStorage.getItem("pixlr_token");
    if (!token) return;
    try {
      await fetch(apiUrl(`/api/search/history/${encodeURIComponent(queryToDelete)}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // ignore
    }
  };

  return (
    <>
      <SEOHead
        title="Explore Trending Posts, Creators & Viral Reels – WhiterChat"
        description="Discover viral videos, trending hashtags, top creators, and creative visual photography on WhiterChat."
        canonicalPath="/explore"
      />

      <div className="max-w-4xl mx-auto w-full pt-4 pb-20 md:pb-8 px-2 sm:px-4">
        {/* Search Bar */}
        <div className="mb-4 relative max-w-lg mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search creators, hashtags (#art), posts, reels..."
            className="pl-10 pr-9 bg-secondary border-none h-11 rounded-xl text-sm"
            value={searchQuery}
            onFocus={() => setShowHistory(true)}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSearchData(null);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Autocomplete Dropdown */}
          {autocompleteItems.length > 0 && !searchData && (
            <div className="absolute top-12 left-0 right-0 z-30 bg-card border border-border rounded-xl shadow-lg p-2 space-y-1">
              {autocompleteItems.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setSearchQuery(item.text)}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-secondary text-left text-sm"
                >
                  <div className="flex items-center gap-2">
                    {item.type === "hashtag" ? (
                      <Hash className="w-4 h-4 text-primary" />
                    ) : (
                      <UserIcon className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="font-medium">{item.text}</span>
                  </div>
                  {item.subtitle && <span className="text-xs text-muted-foreground">{item.subtitle}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search History Chips (when query is empty) */}
        {!searchQuery && historyItems.length > 0 && showHistory && (
          <div className="max-w-lg mx-auto mb-6 p-3 rounded-xl border border-border/60 bg-card/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Recent Searches
              </span>
              <button
                onClick={clearAllHistory}
                className="text-[11px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {historyItems.slice(0, 8).map((item, i) => (
                <div
                  key={i}
                  className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                >
                  <button onClick={() => setSearchQuery(item.query)} className="font-medium">
                    {item.query}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteHistoryQuery(item.query);
                    }}
                    className="text-muted-foreground hover:text-destructive opacity-70 group-hover:opacity-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Search Results */}
        {searchQuery ? (
          <div className="max-w-xl mx-auto space-y-4">
            {/* Search Tabs */}
            <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
              {(
                [
                  { id: "all", label: "Top Results" },
                  { id: "users", label: "Creators" },
                  { id: "hashtags", label: "Tags" },
                  { id: "posts", label: "Posts" },
                  { id: "reels", label: "Reels" },
                ] as const
              ).map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "ghost"}
                  size="sm"
                  className={cn("rounded-full text-xs font-semibold h-8 px-3.5", activeTab !== tab.id && "text-muted-foreground")}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            {searchLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-sm font-medium">Searching for "{debouncedQuery}"...</span>
              </div>
            ) : searchData ? (
              <div className="space-y-4">
                {/* Users section */}
                {(activeTab === "all" || activeTab === "users") && searchData.users?.length > 0 && (
                  <div className="space-y-2">
                    {activeTab === "all" && <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Creators</h3>}
                    <div className="space-y-1">
                      {searchData.users.map((user: any) => (
                        <Link
                          key={user.id}
                          href={`/profile/${user.username}`}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-secondary transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.avatarUrl || undefined} />
                              <AvatarFallback className="font-semibold bg-primary/10 text-primary">
                                {user.username[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold text-sm flex items-center gap-1">
                                {user.fullName || user.username}
                                {user.isVerified && <span className="text-[10px] text-primary">✓</span>}
                              </div>
                              <div className="text-xs text-muted-foreground">@{user.username}</div>
                            </div>
                          </div>
                          {user.followersCount !== undefined && (
                            <span className="text-xs text-muted-foreground">{user.followersCount} followers</span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hashtags section */}
                {(activeTab === "all" || activeTab === "hashtags") && searchData.hashtags?.length > 0 && (
                  <div className="space-y-2">
                    {activeTab === "all" && <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Hashtags</h3>}
                    <div className="space-y-1">
                      {searchData.hashtags.map((tag: any) => (
                        <Link
                          key={tag.tag}
                          href={`/explore?q=%23${encodeURIComponent(tag.tag)}`}
                          onClick={() => setSearchQuery(`#${tag.tag}`)}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-secondary transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                              #
                            </div>
                            <div>
                              <div className="font-semibold text-sm">#{tag.tag}</div>
                              <div className="text-xs text-muted-foreground">{tag.postsCount} posts</div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Posts Grid section */}
                {(activeTab === "all" || activeTab === "posts") && searchData.posts?.length > 0 && (
                  <div className="space-y-2">
                    {activeTab === "all" && <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Photos & Posts</h3>}
                    <div className="grid grid-cols-3 gap-1 sm:gap-2">
                      {searchData.posts.map((post: any) => (
                        <Link key={post.id} href={`/post/${post.id}`}>
                          <div className="relative aspect-square group bg-secondary rounded-sm overflow-hidden cursor-pointer">
                            <img src={post.mediaUrl} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 text-white text-xs font-semibold">
                              <Heart className="w-4 h-4 fill-white" /> {post.likesCount}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reels Grid section */}
                {(activeTab === "all" || activeTab === "reels") && searchData.reels?.length > 0 && (
                  <div className="space-y-2">
                    {activeTab === "all" && <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reels</h3>}
                    <div className="grid grid-cols-3 gap-1 sm:gap-2">
                      {searchData.reels.map((reel: any) => (
                        <Link key={reel.id} href={`/reel/${reel.id}`}>
                          <div className="relative aspect-[9/16] group bg-black rounded-lg overflow-hidden cursor-pointer">
                            {reel.thumbnailUrl ? (
                              <img src={reel.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <video src={reel.mediaUrl} className="w-full h-full object-cover" />
                            )}
                            <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs font-medium drop-shadow">
                              <Film className="w-3.5 h-3.5" />
                              <span>{reel.viewsCount || 0}</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {(!searchData.users || searchData.users.length === 0) &&
                  (!searchData.hashtags || searchData.hashtags.length === 0) &&
                  (!searchData.posts || searchData.posts.length === 0) &&
                  (!searchData.reels || searchData.reels.length === 0) && (
                    <div className="text-center py-16 text-muted-foreground text-sm">
                      No results found for "{searchQuery}". Try another keyword or hashtag.
                    </div>
                  )}
              </div>
            ) : null}
          </div>
        ) : (
          /* Default Explore Grid */
          <div>
            {exploreLoading ? (
              <GridSkeleton />
            ) : (
              <>
                <div className="grid grid-cols-3 gap-1 sm:gap-2">
                  {posts.map((post) => (
                    <Link key={post.id} href={`/post/${post.id}`}>
                      <div className="relative aspect-square group cursor-pointer bg-secondary overflow-hidden rounded-sm sm:rounded">
                        {post.mediaType === "video" ? (
                          <video src={post.mediaUrl} className="w-full h-full object-cover" />
                        ) : (
                          <img src={post.mediaUrl} alt="" className="w-full h-full object-cover" />
                        )}

                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 sm:gap-6 text-white font-semibold text-xs sm:text-sm">
                          <div className="flex items-center gap-1.5">
                            <Heart className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
                            <span>{post.likesCount}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
                            <span>{post.commentsCount}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Sentinel for Explore Infinite Load */}
                <div ref={loadMoreRef} className="py-8 text-center">
                  {isFetchingNextPage ? (
                    <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span>Loading more posts…</span>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
