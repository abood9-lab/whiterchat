import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useGetUserProfile, useFollowUser, useUnfollowUser } from "@workspace/api-client-react";
import { DecoratedAvatar } from "@/components/DecoratedAvatar";
import { ProfileEffectRenderer } from "@/components/effects/ProfileEffectRenderer";
import { CheckCircle2, Sparkles, ExternalLink, MessageCircle, UserPlus, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export interface UnifiedUserDTO {
  id?: string;
  username: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  activeDecorationId?: string | null;
  activeProfileEffectId?: string | null;
  bio?: string | null;
  isVerified?: boolean;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  isFollowing?: boolean;
}

export interface UnifiedUserProfileCardProps {
  user?: UnifiedUserDTO | null;
  username?: string;
  mode?: "compact" | "default" | "expanded";
  showActions?: boolean;
  onNavigate?: () => void;
  className?: string;
}

export function UnifiedUserProfileCard({
  user,
  username: propUsername,
  mode = "default",
  showActions = true,
  onNavigate,
  className = "",
}: UnifiedUserProfileCardProps) {
  const { user: me } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();

  const effectiveUsername = propUsername || user?.username || "";
  const { data: fetchedProfile, isLoading } = useGetUserProfile(effectiveUsername, {
    query: { enabled: !!effectiveUsername },
  } as any);

  // Merge provided user object with query response
  const profileData = fetchedProfile || user;
  const isMe = me?.username === effectiveUsername;

  const [isFollowingState, setIsFollowingState] = useState<boolean>(() => {
    return Boolean((profileData as any)?.isFollowing ?? user?.isFollowing);
  });

  const displayName = profileData?.fullName || profileData?.username || user?.fullName || user?.username || "User";
  const displayUsername = profileData?.username || user?.username || "user";
  const avatarUrl = profileData?.avatarUrl || user?.avatarUrl;
  const coverUrl = (profileData as any)?.coverUrl || (user as any)?.coverUrl;
  const activeEffectId = (profileData as any)?.activeProfileEffectId || (user as any)?.activeProfileEffectId;
  const activeDecorationId = (profileData as any)?.activeDecorationId || (user as any)?.activeDecorationId;
  const bio = (profileData as any)?.bio || (user as any)?.bio;
  const isVerified = (profileData as any)?.isVerified ?? (user as any)?.isVerified;
  const followersCount = (profileData as any)?.followersCount ?? (user as any)?.followersCount;
  const followingCount = (profileData as any)?.followingCount ?? (user as any)?.followingCount;
  const postsCount = (profileData as any)?.postsCount ?? (user as any)?.postsCount;

  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const prev = isFollowingState;
    setIsFollowingState(!prev);
    try {
      if (prev) {
        await unfollowMutation.mutateAsync({ username: displayUsername });
      } else {
        await followMutation.mutateAsync({ username: displayUsername });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    } catch {
      setIsFollowingState(prev);
    }
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onNavigate) {
      onNavigate();
    } else {
      setLocation(`/profile/${displayUsername}`);
    }
  };

  if (!effectiveUsername && !user) return null;

  if (isLoading && !user) {
    return (
      <div className={cn("w-full bg-card rounded-2xl border border-border/80 overflow-hidden shadow-sm p-3 animate-pulse space-y-3", className)}>
        <div className="h-20 w-full bg-muted rounded-xl" />
        <div className="flex items-center gap-3 pt-1">
          <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="w-24 h-3 bg-muted rounded" />
            <div className="w-16 h-2 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  // ── 1. COMPACT MODE (Comments, Search Results, List Hover) ───────────────
  if (mode === "compact") {
    return (
      <div
        className={cn(
          "group/compact flex items-center justify-between gap-3 p-2 rounded-xl transition-colors hover:bg-secondary/60 cursor-pointer min-w-0 select-none",
          className
        )}
        onClick={handleProfileClick}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <DecoratedAvatar
            avatarUrl={avatarUrl}
            decorationId={activeDecorationId}
            username={displayUsername}
            fullName={displayName}
            size="md"
            className="shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 font-semibold text-xs text-foreground truncate leading-snug">
              <span className="truncate group-hover/compact:underline">{displayName}</span>
              {isVerified && (
                <CheckCircle2 className="w-3.5 h-3.5 text-primary fill-primary/20 shrink-0" />
              )}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">@{displayUsername}</div>
          </div>
        </div>

        {showActions && !isMe && (
          <Button
            size="sm"
            variant={isFollowingState ? "secondary" : "default"}
            className="h-7 px-3 text-[11px] font-semibold rounded-lg shrink-0"
            onClick={handleFollowToggle}
          >
            {isFollowingState ? "Following" : "Follow"}
          </Button>
        )}
      </div>
    );
  }

  // ── 2. DEFAULT & EXPANDED MODES (Feed Profile Card, Chat User Info, Popover) ─
  const isExpanded = mode === "expanded";

  return (
    <div
      className={cn(
        "w-full bg-card rounded-2xl border border-border/80 overflow-hidden shadow-sm transition-all",
        isExpanded ? "border-border shadow-md" : "hover:border-border",
        className
      )}
    >
      {/* ── Mini Hero Banner Container ── */}
      <div
        className="block relative group overflow-hidden cursor-pointer"
        onClick={handleProfileClick}
      >
        <div className={cn(
          "relative w-full overflow-hidden transition-transform duration-500 group-hover:scale-[1.01]",
          isExpanded ? "h-28 sm:h-36" : "h-24 sm:h-28",
          coverUrl
            ? "bg-muted"
            : activeEffectId
              ? "bg-black/40 border-b border-border/40"
              : "bg-gradient-to-r from-purple-700/80 via-indigo-600/80 to-pink-600/80"
        )}>
          {/* Layer 1: Cover Banner Image */}
          {coverUrl ? (
            <img
              src={coverUrl}
              alt="Profile Banner"
              className="w-full h-full object-cover relative z-0 opacity-100"
            />
          ) : (
            <div className={cn(
              "w-full h-full relative z-0",
              activeEffectId
                ? "bg-gradient-to-b from-transparent via-black/10 to-black/35"
                : "bg-gradient-to-r from-purple-900/30 via-indigo-900/30 to-pink-900/30 backdrop-blur-sm"
            )} />
          )}

          {/* Layer 2: Profile Effect Layer (Lightweight for card/default, full for expanded) */}
          {activeEffectId && (
            <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
              <ProfileEffectRenderer
                effectId={activeEffectId}
                variant={isExpanded ? "full" : "card"}
                performanceTier={isExpanded ? "auto" : "low"}
                interactive={true}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── User Identity & Details Content ── */}
      <div className={cn("px-4 pb-4 relative z-20", isExpanded ? "-mt-11" : "-mt-9")}>
        {/* Avatar overlapping Hero Banner */}
        <div className="flex items-end justify-between mb-2">
          <div onClick={handleProfileClick} className="block group cursor-pointer">
            <DecoratedAvatar
              avatarUrl={avatarUrl}
              decorationId={activeDecorationId}
              username={displayUsername}
              fullName={displayName}
              size={isExpanded ? "2xl" : "xl"}
              className="shadow-xl ring-2 ring-background transition-transform group-hover:scale-105"
            />
          </div>

          {/* Action buttons */}
          {showActions && (
            <div className="flex items-center gap-1.5 pt-8">
              {isMe ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-full px-3 text-xs font-semibold gap-1.5 hover:bg-primary/10 hover:text-primary transition-colors border-border/80"
                    onClick={handleProfileClick}
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>View</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 rounded-full px-3 text-xs font-semibold gap-1.5 hover:bg-secondary/80 transition-colors"
                    onClick={() => setLocation("/customize-profile")}
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Customize</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant={isFollowingState ? "secondary" : "default"}
                    className="h-8 rounded-full px-3.5 text-xs font-semibold gap-1.5 transition-all"
                    onClick={handleFollowToggle}
                  >
                    {isFollowingState ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Follow</span>
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-full px-3 text-xs font-semibold gap-1.5 border-border/80 hover:bg-secondary"
                    onClick={() => setLocation(`/messages?user=${displayUsername}`)}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Message</span>
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Name, Verification, @username */}
        <div className="space-y-0.5 mt-1">
          <div onClick={handleProfileClick} className="inline-flex items-center gap-1.5 group max-w-full cursor-pointer">
            <span className="font-bold text-base text-foreground leading-tight truncate group-hover:underline">
              {displayName}
            </span>
            {isVerified && (
              <CheckCircle2 className="w-4 h-4 text-primary fill-primary/20 shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground font-semibold">@{displayUsername}</p>
        </div>

        {/* Bio */}
        {bio && (
          <p className="text-xs text-foreground/85 line-clamp-3 mt-2 leading-relaxed">
            {bio}
          </p>
        )}

        {/* Real Stats Row (Followers, Following, Posts) */}
        {(followersCount !== undefined || followingCount !== undefined || postsCount !== undefined) && (
          <div className="flex items-center justify-around gap-2 mt-3 pt-3 border-t border-border/60 text-center">
            {postsCount !== undefined && (
              <div className="min-w-0">
                <div className="text-xs font-bold text-foreground tabular-nums">{postsCount}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Posts</div>
              </div>
            )}
            {followersCount !== undefined && (
              <div className="min-w-0">
                <div className="text-xs font-bold text-foreground tabular-nums">{followersCount}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Followers</div>
              </div>
            )}
            {followingCount !== undefined && (
              <div className="min-w-0">
                <div className="text-xs font-bold text-foreground tabular-nums">{followingCount}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Following</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
