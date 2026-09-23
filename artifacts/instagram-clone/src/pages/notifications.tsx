import { useEffect, useRef } from "react";
import { useMarkAllNotificationsRead, getGetNotificationsQueryKey } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Heart, BellRing, MessageSquareQuote, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { usePushNotifications } from "@/lib/push-notifications";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";

function PushNotificationBanner() {
  const { isSupported, permission, isSubscribed, isBusy, subscribe } = usePushNotifications();
  const { toast } = useToast();

  if (!isSupported || permission === "denied" || isSubscribed) return null;

  return (
    <div className="flex items-center gap-3 p-4 mb-4 rounded-xl border border-border bg-card sm:mx-0 mx-4">
      <BellRing className="w-8 h-8 shrink-0 text-primary" />
      <div className="flex-1 text-sm">
        <p className="font-semibold">Enable browser notifications</p>
        <p className="text-muted-foreground">Get notified about messages, likes, and followers even when you're away.</p>
      </div>
      <Button
        size="sm"
        disabled={isBusy}
        onClick={async () => {
          const ok = await subscribe();
          toast({
            title: ok ? "Notifications enabled" : "Could not enable",
            description: ok
              ? "You will now receive notifications."
              : "Please allow notifications in your browser settings.",
            variant: ok ? "default" : "destructive",
          });
        }}
      >
        Enable
      </Button>
    </div>
  );
}

function NotificationSkeleton() {
  return (
    <div className="space-y-2 p-4 bg-card sm:border border-border sm:rounded-xl">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="w-3/4 h-3.5 bg-muted rounded" />
            <div className="w-1/4 h-2.5 bg-muted rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Notifications() {
  const markReadMutation = useMarkAllNotificationsRead();
  const queryClient = useQueryClient();

  const {
    data: notifPages,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["/api/notifications/infinite"],
    queryFn: async ({ pageParam = 1 }) => {
      const token = localStorage.getItem("pixlr_token");
      const res = await fetch(apiUrl(`/api/notifications?page=${pageParam}&limit=20`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load notifications");
      return res.json();
    },
    getNextPageParam: (lastPage) => (lastPage.hasMore ? (lastPage.page ?? 1) + 1 : undefined),
    initialPageParam: 1,
  });

  const notifications = notifPages?.pages.flatMap((p) => p.notifications ?? []) ?? [];

  useEffect(() => {
    if (notifications.some((n: any) => !n.isRead)) {
      markReadMutation.mutateAsync().then(() => {
        queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
      });
    }
  }, [notifications]);

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

  return (
    <div className="max-w-2xl mx-auto w-full pt-4 pb-20 md:pb-8 sm:px-4">
      <h1 className="font-semibold text-2xl mb-6 px-4 sm:px-0">Notifications</h1>

      <PushNotificationBanner />

      {isLoading ? (
        <NotificationSkeleton />
      ) : notifications.length === 0 ? (
        <div className="text-center p-12 text-muted-foreground">
          <Heart className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-1 bg-card sm:border border-border sm:rounded-xl overflow-hidden">
          {notifications.map((notif: any) => (
            <div key={notif.id} className="flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors">
              <Link href={`/profile/${notif.actor.username}`} className="shrink-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={notif.actor.avatarUrl || undefined} />
                  <AvatarFallback>{notif.actor.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
              </Link>

              <div className="flex-1 text-sm">
                <Link href={`/profile/${notif.actor.username}`} className="font-semibold hover:underline mr-1">
                  {notif.actor.username}
                </Link>
                <span className="text-muted-foreground">
                  {notif.type === "like" && "liked your post."}
                  {notif.type === "post_reaction" && (
                    <span>
                      reacted {notif.reactionEmoji || "❤️"} to your post.
                    </span>
                  )}
                  {notif.type === "comment" && `commented: "${notif.commentText || (notif.mediaType ? `[${notif.mediaType}]` : "")}"`}
                  {notif.type === "comment_reply" && `replied to your comment: "${notif.commentText || (notif.mediaType ? `[${notif.mediaType}]` : "")}"`}
                  {notif.type === "comment_reaction" && (
                    <span>
                      reacted {notif.reactionEmoji || "❤️"} to your comment: "{notif.commentText}"
                    </span>
                  )}
                  {notif.type === "mention" && `mentioned you in a comment: "${notif.commentText}"`}
                  {notif.type === "follow" && "started following you."}
                  {notif.type === "message" && "sent you a message."}
                  {notif.type === "note_reply" && (
                    <span>
                      replied to your note
                      {notif.noteText ? `: "${notif.noteText}"` : "."}
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground block mt-1">
                  {formatDistanceToNow(new Date(notif.createdAt))} ago
                </span>
              </div>

              {notif.type === "note_reply" && (
                <Link href="/messages" className="shrink-0">
                  <Button size="sm" variant="secondary" className="h-8 gap-1.5 text-xs font-semibold">
                    <MessageSquareQuote className="w-3.5 h-3.5 text-primary" />
                    <span>View</span>
                  </Button>
                </Link>
              )}

              {notif.postMediaUrl && (
                <Link href={`/post/${notif.postId}`} className="shrink-0 block w-10 h-10 bg-secondary rounded-sm overflow-hidden">
                  <img src={notif.postMediaUrl} alt="" className="w-full h-full object-cover" />
                </Link>
              )}

              {notif.type === "follow" && (
                <Button size="sm" variant={notif.actor.isFollowing ? "secondary" : "default"} className="h-8 shrink-0">
                  {notif.actor.isFollowing ? "Following" : "Follow"}
                </Button>
              )}
            </div>
          ))}

          {/* Sentinel for Infinite Notifications Scroll */}
          <div ref={loadMoreRef} className="py-4 text-center">
            {isFetchingNextPage ? (
              <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs py-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Loading more notifications…</span>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
