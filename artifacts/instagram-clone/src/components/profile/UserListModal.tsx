import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Search,
  X,
  Loader2,
  CheckCircle2,
  Sparkles,
  Lock,
  RefreshCw,
  UserX,
  UserMinus,
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api-url";
import { useFollowUser, useUnfollowUser } from "@workspace/api-client-react";

export interface UserSummaryItem {
  id: string;
  username: string;
  fullName: string;
  avatarUrl?: string | null;
  isFollowing?: boolean;
  isVerified?: boolean;
  role?: string;
}

interface UserListModalProps {
  open: boolean;
  onClose: () => void;
  username: string;
  type: "followers" | "following";
  onCountChange?: (newCount: number) => void;
}

export function UserListModal({
  open,
  onClose,
  username,
  type,
  onCountChange,
}: UserListModalProps) {
  const [, setLocation] = useLocation();
  const { user: me, token } = useAuth();
  const queryClient = useQueryClient();

  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [users, setUsers] = useState<UserSummaryItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [removeTargetUser, setRemoveTargetUser] = useState<UserSummaryItem | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const observerTargetRef = useRef<HTMLDivElement | null>(null);

  const isMe = me?.username === username;
  const isFollowersTab = type === "followers";

  // 1. Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 2. Main Fetch Function
  const fetchPage = useCallback(
    async (pageToFetch: number, query: string, isAppend: boolean) => {
      if (!username) return;

      if (isAppend) {
        setIsLoadingMore(true);
      } else {
        setIsLoadingInitial(true);
      }
      setIsError(false);
      setErrorMsg("");

      try {
        const authToken = token || localStorage.getItem("whiterchat_token") || "";
        const url = apiUrl(
          `/api/users/${username}/${type}?page=${pageToFetch}&limit=20&q=${encodeURIComponent(query)}`
        );
        const res = await fetch(url, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });

        if (res.status === 403) {
          const errData = await res.json().catch(() => ({}));
          setIsPrivate(true);
          setErrorMsg(errData.error || "This account is private.");
          setUsers([]);
          setHasMore(false);
          setIsLoadingInitial(false);
          setIsLoadingMore(false);
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to fetch user list.");
        }

        const data = await res.json();
        // Support both paginated object { users, totalCount, hasMore } and plain array
        const rawUsers: UserSummaryItem[] = Array.isArray(data) ? data : data.users || [];
        const fetchedTotal = typeof data.totalCount === "number" ? data.totalCount : rawUsers.length;
        const fetchedHasMore = typeof data.hasMore === "boolean" ? data.hasMore : rawUsers.length === 20;

        setIsPrivate(false);
        setTotalCount(fetchedTotal);
        if (onCountChange && !query) {
          onCountChange(fetchedTotal);
        }

        setUsers((prev) => {
          if (!isAppend) return rawUsers;
          // Deduplicate by user ID
          const existingIds = new Set(prev.map((u) => u.id));
          const filteredNew = rawUsers.filter((u) => !existingIds.has(u.id));
          return [...prev, ...filteredNew];
        });

        setHasMore(fetchedHasMore);
        setPage(pageToFetch);
      } catch (err: any) {
        setIsError(true);
        setErrorMsg(err?.message || "Something went wrong loading users.");
      } finally {
        setIsLoadingInitial(false);
        setIsLoadingMore(false);
      }
    },
    [username, type, token, onCountChange]
  );

  // Reset & load initial page when modal opens or username / type / debouncedQuery changes
  useEffect(() => {
    if (open) {
      setPage(1);
      setUsers([]);
      setHasMore(true);
      setIsPrivate(false);
      fetchPage(1, debouncedQuery, false);
    } else {
      setSearchQuery("");
      setDebouncedQuery("");
      setUsers([]);
    }
  }, [open, username, type, debouncedQuery, fetchPage]);

  // 3. Infinite Scroll with IntersectionObserver
  useEffect(() => {
    if (!open || isLoadingInitial || isLoadingMore || !hasMore || isError || isPrivate) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchPage(page + 1, debouncedQuery, true);
        }
      },
      { rootMargin: "200px" }
    );

    const target = observerTargetRef.current;
    if (target) observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
    };
  }, [open, isLoadingInitial, isLoadingMore, hasMore, isError, isPrivate, page, debouncedQuery, fetchPage]);

  // 4. Follow / Unfollow Handler
  const handleToggleFollow = async (targetUser: UserSummaryItem) => {
    const originalFollowingState = targetUser.isFollowing;
    const newFollowingState = !originalFollowingState;

    // Optimistic Update
    setUsers((prev) =>
      prev.map((u) => (u.id === targetUser.id ? { ...u, isFollowing: newFollowingState } : u))
    );

    try {
      if (originalFollowingState) {
        await unfollowMutation.mutateAsync({ username: targetUser.username });
      } else {
        await followMutation.mutateAsync({ username: targetUser.username });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    } catch (err) {
      // Rollback on failure
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, isFollowing: originalFollowingState } : u))
      );
    }
  };

  // 5. Remove Follower Handler (For Own Profile)
  const handleConfirmRemoveFollower = async () => {
    if (!removeTargetUser) return;
    setIsRemoving(true);
    try {
      const authToken = token || localStorage.getItem("whiterchat_token") || "";
      const res = await fetch(apiUrl(`/api/users/${username}/remove-follower`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ followerId: removeTargetUser.id }),
      });

      if (!res.ok) throw new Error("Failed to remove follower");

      const resData = await res.json();
      // Remove from state
      setUsers((prev) => prev.filter((u) => u.id !== removeTargetUser.id));
      if (typeof resData.followersCount === "number") {
        setTotalCount(resData.followersCount);
        if (onCountChange) onCountChange(resData.followersCount);
      } else if (totalCount !== null) {
        const updatedCount = Math.max(0, totalCount - 1);
        setTotalCount(updatedCount);
        if (onCountChange) onCountChange(updatedCount);
      }

      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    } catch (err) {
      console.error("Error removing follower:", err);
    } finally {
      setIsRemoving(false);
      setRemoveTargetUser(null);
    }
  };

  const titleText = isFollowersTab ? "Followers" : "Following";

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-md h-[85vh] sm:h-[75vh] flex flex-col p-0 overflow-hidden rounded-2xl border border-border shadow-2xl bg-background">
          {/* Header */}
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-border shrink-0 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold flex items-center gap-1.5">
                <span>{titleText}</span>
                {totalCount !== null && (
                  <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {totalCount.toLocaleString()}
                  </span>
                )}
              </DialogTitle>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder={`Search in ${titleText.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-secondary text-sm rounded-xl pl-9 pr-8 py-2 border border-transparent focus:outline-none focus:border-primary/40 text-foreground transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full hover:bg-muted"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </DialogHeader>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto px-1 py-2 divide-y divide-border/40">
            {/* Private Account State */}
            {isPrivate ? (
              <div className="flex flex-col items-center justify-center h-64 px-6 text-center space-y-3 text-muted-foreground">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center border border-border">
                  <Lock className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="font-semibold text-foreground text-sm">This Account is Private</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  {errorMsg || "Follow this account to see their followers and following lists."}
                </p>
              </div>
            ) : isError && users.length === 0 ? (
              /* Error State (Initial Page) */
              <div className="flex flex-col items-center justify-center h-64 px-6 text-center space-y-3">
                <UserX className="w-10 h-10 text-destructive/80" />
                <p className="font-medium text-sm text-foreground">{errorMsg}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 text-xs rounded-xl"
                  onClick={() => fetchPage(1, debouncedQuery, false)}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry
                </Button>
              </div>
            ) : isLoadingInitial ? (
              /* Skeleton Loading (Page 1) */
              <div className="space-y-3 p-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse p-2">
                    <div className="w-11 h-11 rounded-full bg-muted shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-3.5 bg-muted rounded w-28" />
                      <div className="h-3 bg-muted rounded w-20" />
                    </div>
                    <div className="w-20 h-8 bg-muted rounded-xl shrink-0" />
                  </div>
                ))}
              </div>
            ) : users.length === 0 ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center h-64 px-6 text-center space-y-2 text-muted-foreground">
                <p className="font-semibold text-sm text-foreground">
                  {debouncedQuery
                    ? `No matching users for "${debouncedQuery}"`
                    : isFollowersTab
                    ? "No followers yet"
                    : "Not following anyone yet"}
                </p>
                <p className="text-xs max-w-xs">
                  {debouncedQuery
                    ? "Try searching for a different username or display name."
                    : isFollowersTab
                    ? "When accounts follow this user, they will appear here."
                    : "When this user follows accounts, they will appear here."}
                </p>
              </div>
            ) : (
              /* User List */
              <>
                {users.map((u) => {
                  const isUserMe = me?.id === u.id;
                  return (
                    <div
                      key={u.id}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors rounded-xl"
                    >
                      {/* User Info & Avatar */}
                      <button
                        className="flex items-center gap-3 min-w-0 flex-1 text-left group"
                        onClick={() => {
                          onClose();
                          setLocation(`/profile/${u.username}`);
                        }}
                      >
                        <Avatar className="h-11 w-11 shrink-0 border border-border group-hover:scale-105 transition-transform">
                          <AvatarImage src={u.avatarUrl ?? undefined} />
                          <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                            {u.username[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-sm truncate flex items-center gap-1.5 text-foreground">
                            <span className="truncate">{u.username}</span>
                            {u.isVerified && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0 fill-blue-500/10" />
                            )}
                            {u.role === "admin" && (
                              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {u.fullName || `@${u.username}`}
                          </div>
                        </div>
                      </button>

                      {/* Action Button */}
                      {!isUserMe && (
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Own Profile -> Followers List -> Allow Removing Follower */}
                          {isMe && isFollowersTab ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8 px-3 text-xs font-semibold rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors gap-1.5"
                              onClick={() => setRemoveTargetUser(u)}
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </Button>
                          ) : (
                            /* Follow / Following Toggle */
                            <Button
                              size="sm"
                              variant={u.isFollowing ? "secondary" : "default"}
                              className="h-8 px-4 text-xs font-semibold rounded-xl shrink-0 transition-all"
                              onClick={() => handleToggleFollow(u)}
                            >
                              {u.isFollowing ? "Following" : "Follow"}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Next Page Sentinel & Loading Indicator */}
                <div ref={observerTargetRef} className="py-3 flex justify-center items-center min-h-[40px]">
                  {isLoadingMore && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span>Loading more...</span>
                    </div>
                  )}

                  {isError && users.length > 0 && (
                    <button
                      onClick={() => fetchPage(page + 1, debouncedQuery, true)}
                      className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Couldn't load more. Tap to retry.
                    </button>
                  )}

                  {!hasMore && users.length > 0 && !isLoadingMore && (
                    <span className="text-[11px] text-muted-foreground/60 tracking-wider uppercase font-medium">
                      End of list
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Follower Confirmation Modal */}
      {removeTargetUser && (
        <AlertDialog open={!!removeTargetUser} onOpenChange={(o) => !o && setRemoveTargetUser(null)}>
          <AlertDialogContent className="max-w-xs sm:max-w-sm rounded-2xl p-5">
            <AlertDialogHeader className="items-center text-center space-y-2">
              <Avatar className="w-16 h-16 border-2 border-border mb-1">
                <AvatarImage src={removeTargetUser.avatarUrl ?? undefined} />
                <AvatarFallback className="text-base font-bold bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                  {removeTargetUser.username[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <AlertDialogTitle className="text-base font-bold">
                Remove follower?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground">
                We won't tell <span className="font-semibold text-foreground">@{removeTargetUser.username}</span> that they were removed from your followers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
              <AlertDialogCancel disabled={isRemoving} className="rounded-xl text-xs h-9 sm:flex-1">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={isRemoving}
                onClick={(e) => {
                  e.preventDefault();
                  handleConfirmRemoveFollower();
                }}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl text-xs h-9 sm:flex-1 font-semibold"
              >
                {isRemoving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Remove"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
