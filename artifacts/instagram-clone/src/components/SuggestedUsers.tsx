import { useGetSuggestedUsers, useFollowUser, getGetSuggestedUsersQueryKey } from "@workspace/api-client-react";
import type { UserSummary } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

type SuggestedUser = UserSummary & { mutualCount?: number };

function SuggestedUserRow({ user, onFollowed }: { user: SuggestedUser; onFollowed: (id: string) => void }) {
  const followMutation = useFollowUser();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="flex items-center gap-3 py-2">
      <Link href={`/profile/${user.username}`} className="shrink-0">
        <Avatar className="h-9 w-9">
          <AvatarImage src={user.avatarUrl ?? undefined} />
          <AvatarFallback className="text-xs font-semibold">
            {user.username[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>

      <div className="flex-1 min-w-0">
        <Link href={`/profile/${user.username}`} className="block">
          <p className="text-sm font-semibold truncate hover:underline leading-tight">
            {user.username}
          </p>
          <p className="text-xs text-muted-foreground truncate leading-tight">
            {user.mutualCount && user.mutualCount > 0
              ? `${user.mutualCount} mutual${user.mutualCount > 1 ? "s" : ""}`
              : user.fullName}
          </p>
        </Link>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs font-semibold text-primary"
          disabled={followMutation.isPending}
          onClick={() => {
            followMutation.mutate(
              { username: user.username },
              { onSuccess: () => onFollowed(user.id) }
            );
          }}
        >
          Follow
        </Button>
        <span className="text-muted-foreground/50 text-xs">·</span>
        <button
          onClick={() => setDismissed(true)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export function SuggestedUsers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: suggestions, isLoading } = useGetSuggestedUsers();

  const handleFollowed = () => {
    queryClient.invalidateQueries({ queryKey: getGetSuggestedUsersQueryKey() });
  };

  const list = Array.isArray(suggestions) ? (suggestions as SuggestedUser[]) : [];
  if (isLoading || list.length === 0) return null;

  return (
    <div className="w-80 shrink-0 hidden xl:block">
      <div className="sticky top-8 space-y-6">
        {/* Current user */}
        {user && (
          <div className="flex items-center gap-3">
            <Link href={`/profile/${user.username}`}>
              <Avatar className="h-11 w-11">
                <AvatarImage src={user.avatarUrl ?? undefined} />
                <AvatarFallback className="font-semibold">
                  {user.username[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/profile/${user.username}`}>
                <p className="text-sm font-semibold truncate hover:underline">{user.username}</p>
              </Link>
              <p className="text-xs text-muted-foreground truncate">{user.fullName}</p>
            </div>
          </div>
        )}

        {/* Suggested users */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Suggested for you
            </span>
            <Link href="/explore" className="text-xs font-semibold hover:text-muted-foreground transition-colors">
              See all
            </Link>
          </div>

          <div className="space-y-1">
            {list.slice(0, 5).map(u => (
              <SuggestedUserRow key={u.id} user={u} onFollowed={handleFollowed} />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-muted-foreground/80 leading-relaxed pt-2 border-t border-border/50">
          <Link href="/about" className="hover:underline">About WhiterChat</Link>
          <span>·</span>
          <Link href="/about" className="hover:underline">The Story Behind WhiterChat</Link>
          <span>·</span>
          <Link href="/about" className="hover:underline">PIWAIC</Link>
          <span>·</span>
          <Link href="/careers" className="hover:underline">Careers</Link>
          <span>·</span>
          <Link href="/press" className="hover:underline">Press</Link>
          <span>·</span>
          <Link href="/contact" className="hover:underline">Contact</Link>
          <span>·</span>
          <Link href="/help" className="hover:underline">Help</Link>
          <span>·</span>
          <Link href="/faq" className="hover:underline">FAQ</Link>
          <span>·</span>
          <Link href="/feedback" className="hover:underline">Feedback</Link>
          <span>·</span>
          <Link href="/safety" className="hover:underline">Safety</Link>
          <span>·</span>
          <Link href="/security" className="hover:underline">Security</Link>
          <span>·</span>
          <Link href="/report-problem" className="hover:underline">Report</Link>
          <span>·</span>
          <Link href="/privacy" className="hover:underline">Privacy</Link>
          <span>·</span>
          <Link href="/terms" className="hover:underline">Terms</Link>
          <span>·</span>
          <Link href="/community-guidelines" className="hover:underline">Guidelines</Link>
          <span>·</span>
          <Link href="/cookies" className="hover:underline">Cookies</Link>
          <span>·</span>
          <Link href="/accessibility" className="hover:underline">Accessibility</Link>
        </div>

        <p className="text-[11px] text-muted-foreground font-medium pt-1">
          © {new Date().getFullYear()} WhiterChat. All rights reserved.
        </p>
      </div>
    </div>
  );
}
