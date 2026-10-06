import { useState } from "react";
import {
  X, Grid3x3, Pin, Star, Clock, Archive, BellOff, Bell,
  ExternalLink, ChevronRight, Ban, ShieldOff, Timer, CheckCircle2,
  Trash2, Mail, MailOpen, Eraser, AlertTriangle, Palette, Download, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useGetUserProfile } from "@workspace/api-client-react";
import { DecoratedAvatar } from "@/components/DecoratedAvatar";
import { ProfileEffectRenderer } from "@/components/effects/ProfileEffectRenderer";
import type { ChatMessage } from "./MessageBubble";

interface OtherUser {
  id?: string;
  username?: string;
  fullName?: string;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  activeDecorationId?: string | null;
  activeProfileEffectId?: string | null;
  bio?: string | null;
  isVerified?: boolean;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
}

interface Props {
  otherUser?: OtherUser | null;
  isOnline: boolean;
  disappearAfter: string | null;
  isMuted: boolean;
  isArchived: boolean;
  isPinned?: boolean;
  isUnread?: boolean;
  chatTheme?: string;
  sharedMedia: ChatMessage[];
  pinnedMessages: ChatMessage[];
  starredMessages: ChatMessage[];
  myId: string;
  isBlocked: boolean;
  isBlockedBy: boolean;
  myTimeoutUntil: string | null;
  otherTimeoutUntil: string | null;
  onClose: () => void;
  onDisappearChange: (value: string | null) => void;
  onToggleMute: () => void;
  onToggleArchive: () => void;
  onTogglePin?: () => void;
  onToggleMarkUnread?: () => void;
  onChangeTheme?: (theme: string) => void;
  onSearchInChat?: () => void;
  onExportChat?: () => void;
  onClearMessages?: () => void;
  onDeleteChat?: () => void;
  onNavigateToProfile: () => void;
  onViewMedia: (url: string, type: string) => void;
  onBlock: () => void;
  onUnblock: () => void;
  onTimeout: (duration: string | null) => void;
}

const DISAPPEAR_OPTIONS = [
  { label: "Off", value: null },
  { label: "1 hour", value: "1h" },
  { label: "24 hours", value: "24h" },
  { label: "7 days", value: "7d" },
];

const TIMEOUT_OPTIONS = [
  { label: "Off", value: null },
  { label: "15 minutes", value: "15m" },
  { label: "1 hour", value: "1h" },
  { label: "24 hours", value: "24h" },
  { label: "7 days", value: "7d" },
];

const THEME_OPTIONS = [
  { id: "default", name: "Modern Dark", colors: "from-zinc-800 to-zinc-950", accent: "#3b82f6" },
  { id: "violet", name: "Cosmic Violet", colors: "from-purple-900 via-indigo-900 to-black", accent: "#8b5cf6" },
  { id: "sunset", name: "Instagram Sunset", colors: "from-amber-600 via-pink-600 to-purple-900", accent: "#ec4899" },
  { id: "emerald", name: "Emerald Forest", colors: "from-emerald-900 via-teal-900 to-black", accent: "#10b981" },
  { id: "cyberpunk", name: "Cyberpunk Neon", colors: "from-fuchsia-900 via-cyan-900 to-black", accent: "#06b6d4" },
  { id: "rosegold", name: "Rose Gold", colors: "from-rose-900 via-pink-900 to-stone-950", accent: "#f43f5e" },
  { id: "midnight", name: "Midnight AMOLED", colors: "from-black to-zinc-950", accent: "#6366f1" },
  { id: "ocean", name: "Deep Ocean", colors: "from-blue-900 via-sky-950 to-black", accent: "#0284c7" },
];

export function ConversationInfoPanel({
  otherUser, isOnline, disappearAfter, isMuted, isArchived, isPinned, isUnread,
  chatTheme = "default",
  sharedMedia, pinnedMessages, starredMessages, myId,
  isBlocked, isBlockedBy, myTimeoutUntil, otherTimeoutUntil,
  onClose, onDisappearChange, onToggleMute, onToggleArchive, onTogglePin, onToggleMarkUnread,
  onChangeTheme, onSearchInChat, onExportChat, onClearMessages, onDeleteChat,
  onNavigateToProfile, onViewMedia, onBlock, onUnblock, onTimeout,
}: Props) {
  const [section, setSection] = useState<"main" | "media" | "pinned" | "starred" | "disappear" | "restrict" | "themes">("main");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch full user profile to retrieve customization identity (Banner, Decoration, Effect, Bio, Stats, Badges)
  const username = otherUser?.username;
  const { data: fullProfile } = useGetUserProfile(username ?? "", {
    query: { enabled: !!username },
  } as any);

  const profileData = fullProfile || otherUser;
  const displayName = profileData?.fullName || profileData?.username || otherUser?.fullName || otherUser?.username || "User";
  const displayUsername = profileData?.username || otherUser?.username || "user";
  const avatarUrl = profileData?.avatarUrl || otherUser?.avatarUrl;
  const coverUrl = (fullProfile as any)?.coverUrl || (otherUser as any)?.coverUrl;
  const activeEffectId = (fullProfile as any)?.activeProfileEffectId || (otherUser as any)?.activeProfileEffectId;
  const activeDecorationId = (fullProfile as any)?.activeDecorationId || (otherUser as any)?.activeDecorationId;
  const bio = (fullProfile as any)?.bio || (otherUser as any)?.bio;
  const isVerified = (fullProfile as any)?.isVerified ?? (otherUser as any)?.isVerified;
  const followersCount = (fullProfile as any)?.followersCount ?? (otherUser as any)?.followersCount;
  const followingCount = (fullProfile as any)?.followingCount ?? (otherUser as any)?.followingCount;
  const postsCount = (fullProfile as any)?.postsCount ?? (otherUser as any)?.postsCount;

  if (section === "media") {
    return (
      <PanelShell onBack={() => setSection("main")} onClose={onClose} title="Shared Media">
        {sharedMedia.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">No shared media yet</div>
        )}
        <div className="grid grid-cols-3 gap-1 p-1">
          {sharedMedia.map(m => (
            <button
              key={m.id}
              className="aspect-square rounded-lg overflow-hidden bg-secondary hover:opacity-90 transition-opacity"
              onClick={() => m.mediaUrl && onViewMedia(m.mediaUrl, m.mediaType ?? "image")}
            >
              {m.mediaType === "video" ? (
                <video src={m.mediaUrl ?? ""} className="w-full h-full object-cover" />
              ) : (
                <img src={m.mediaUrl ?? ""} alt="" className="w-full h-full object-cover" />
              )}
            </button>
          ))}
        </div>
      </PanelShell>
    );
  }

  if (section === "pinned") {
    return (
      <PanelShell onBack={() => setSection("main")} onClose={onClose} title="Pinned Messages">
        {pinnedMessages.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">No pinned messages</div>
        )}
        <div className="divide-y divide-border">
          {pinnedMessages.map(m => (
            <div key={m.id} className="px-4 py-3">
              <div className="text-[10px] text-muted-foreground mb-1">
                {m.senderId === myId ? "You" : (displayUsername || "User")} ·{" "}
                {format(new Date(m.createdAt), "MMM d, h:mm a")}
              </div>
              <p className="text-sm">{m.text ?? (m.mediaType ? `[${m.mediaType}]` : "")}</p>
            </div>
          ))}
        </div>
      </PanelShell>
    );
  }

  if (section === "starred") {
    return (
      <PanelShell onBack={() => setSection("main")} onClose={onClose} title="Starred Messages">
        {starredMessages.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">No starred messages</div>
        )}
        <div className="divide-y divide-border">
          {starredMessages.map(m => (
            <div key={m.id} className="px-4 py-3">
              <div className="text-[10px] text-muted-foreground mb-1">
                {m.senderId === myId ? "You" : (displayUsername || "User")} ·{" "}
                {format(new Date(m.createdAt), "MMM d, h:mm a")}
              </div>
              <p className="text-sm">{m.text ?? (m.mediaType ? `[${m.mediaType}]` : "")}</p>
            </div>
          ))}
        </div>
      </PanelShell>
    );
  }

  if (section === "themes") {
    return (
      <PanelShell onBack={() => setSection("main")} onClose={onClose} title="Chat Theme & Wallpaper">
        <div className="p-4 space-y-3">
          <p className="text-xs text-muted-foreground">Choose a visual atmosphere for this conversation.</p>
          <div className="grid grid-cols-2 gap-3">
            {THEME_OPTIONS.map(theme => (
              <button
                key={theme.id}
                onClick={() => {
                  onChangeTheme?.(theme.id);
                  setSection("main");
                }}
                className={cn(
                  "flex flex-col items-start p-3 rounded-2xl border text-left transition-all relative overflow-hidden group",
                  chatTheme === theme.id
                    ? "border-primary ring-2 ring-primary/30 bg-secondary/80"
                    : "border-border hover:border-border/80 bg-card hover:bg-secondary/40"
                )}
              >
                <div className={cn("w-full h-12 rounded-xl bg-gradient-to-br mb-2 shadow-inner", theme.colors)} />
                <span className="text-xs font-bold text-foreground">{theme.name}</span>
                {chatTheme === theme.id && (
                  <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[10px]">
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </PanelShell>
    );
  }

  if (section === "disappear") {
    return (
      <PanelShell onBack={() => setSection("main")} onClose={onClose} title="Disappearing Messages">
        <div className="px-4 py-2 text-xs text-muted-foreground mb-2">
          Messages will automatically disappear after the set time once sent.
        </div>
        <div className="divide-y divide-border">
          {DISAPPEAR_OPTIONS.map(opt => (
            <button
              key={String(opt.value)}
              className={cn(
                "flex items-center justify-between w-full px-4 py-3.5 text-sm transition-colors",
                disappearAfter === opt.value
                  ? "text-primary font-semibold"
                  : "hover:bg-secondary/60"
              )}
              onClick={() => { onDisappearChange(opt.value); setSection("main"); }}
            >
              <span>{opt.label}</span>
              {disappearAfter === opt.value && (
                <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground text-xs">✓</span>
                </span>
              )}
            </button>
          ))}
        </div>
      </PanelShell>
    );
  }

  if (section === "restrict") {
    return (
      <PanelShell onBack={() => setSection("main")} onClose={onClose} title="Restrict Messages">
        <div className="px-4 py-2 text-xs text-muted-foreground mb-2">
          @{displayUsername} won't be able to send you messages for the selected duration.
        </div>
        <div className="divide-y divide-border">
          {TIMEOUT_OPTIONS.map(opt => (
            <button
              key={String(opt.value)}
              className={cn(
                "flex items-center justify-between w-full px-4 py-3.5 text-sm transition-colors",
                (otherTimeoutUntil ? true : false) === (opt.value !== null) && opt.value !== null
                  ? "text-primary font-semibold"
                  : opt.value === null && !otherTimeoutUntil
                  ? "text-primary font-semibold"
                  : "hover:bg-secondary/60"
              )}
              onClick={() => { onTimeout(opt.value); setSection("main"); }}
            >
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </PanelShell>
    );
  }

  return (
    <PanelShell onBack={null} onClose={onClose} title="">
      {/* ── User Mini-Profile Hero Container (Banner + Effect + Avatar + Decoration) ── */}
      <div className="relative overflow-hidden w-full border-b border-border shadow-sm">
        {/* Banner Area */}
        <div className={cn(
          "relative overflow-hidden h-28 sm:h-36 w-full",
          coverUrl
            ? "bg-muted"
            : activeEffectId
              ? "bg-black/40 border-b border-border/40"
              : "bg-gradient-to-r from-purple-700/80 via-indigo-600/80 to-pink-600/80"
        )}>
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

          {activeEffectId && (
            <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
              <ProfileEffectRenderer
                effectId={activeEffectId}
                variant="full"
                interactive={true}
              />
            </div>
          )}
        </div>

        {/* User Identity & Avatar */}
        <div className="flex flex-col items-center px-4 pb-5 -mt-11 relative z-20">
          <div className="relative mb-2">
            <DecoratedAvatar
              avatarUrl={avatarUrl}
              decorationId={activeDecorationId}
              username={displayUsername}
              fullName={displayName}
              size="2xl"
              className="shadow-2xl"
            >
              {isOnline && (
                <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-card z-20 shadow-sm" />
              )}
            </DecoratedAvatar>
          </div>

          <div className="text-center space-y-1 mt-1 w-full px-2">
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              <h2 className="font-bold text-lg text-foreground leading-tight">{displayName}</h2>
              {isVerified && (
                <CheckCircle2 className="w-4.5 h-4.5 text-primary fill-primary/20 shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground font-semibold">@{displayUsername}</p>

            {bio && (
              <p className="text-xs text-foreground/90 max-w-xs mx-auto line-clamp-3 pt-1.5 px-2 leading-relaxed">
                {bio}
              </p>
            )}

            {isOnline && (
              <div className="pt-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-green-500/10 text-green-500 border border-green-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Active now
                </span>
              </div>
            )}
          </div>

          {(followersCount !== undefined || followingCount !== undefined || postsCount !== undefined) && (
            <div className="flex items-center justify-center gap-6 mt-3.5 pt-3 border-t border-border/60 w-full text-center">
              {postsCount !== undefined && (
                <div>
                  <div className="text-sm font-bold text-foreground">{postsCount}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Posts</div>
                </div>
              )}
              {followersCount !== undefined && (
                <div>
                  <div className="text-sm font-bold text-foreground">{followersCount}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Followers</div>
                </div>
              )}
              {followingCount !== undefined && (
                <div>
                  <div className="text-sm font-bold text-foreground">{followingCount}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Following</div>
                </div>
              )}
            </div>
          )}

          {displayUsername && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3.5 rounded-full gap-2 text-xs font-semibold px-4 hover:bg-primary/10 hover:text-primary transition-colors border-border/80"
              onClick={onNavigateToProfile}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View Full Profile
            </Button>
          )}
        </div>
      </div>

      {/* Quick action buttons row */}
      <div className="grid grid-cols-4 gap-2 p-4 border-b border-border">
        <button
          onClick={onToggleMute}
          className={cn(
            "flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl text-[11px] font-medium transition-colors text-center",
            isMuted ? "bg-primary/15 text-primary font-semibold" : "bg-secondary hover:bg-secondary/80 text-foreground"
          )}
        >
          {isMuted ? <Bell className="w-4 h-4 text-primary" /> : <BellOff className="w-4 h-4" />}
          <span className="truncate w-full">{isMuted ? "Unmute" : "Mute"}</span>
        </button>

        {onTogglePin && (
          <button
            onClick={onTogglePin}
            className={cn(
              "flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl text-[11px] font-medium transition-colors text-center",
              isPinned ? "bg-primary/15 text-primary font-semibold" : "bg-secondary hover:bg-secondary/80 text-foreground"
            )}
          >
            <Pin className={cn("w-4 h-4", isPinned && "fill-primary")} />
            <span className="truncate w-full">{isPinned ? "Pinned" : "Pin"}</span>
          </button>
        )}

        {onToggleMarkUnread && (
          <button
            onClick={onToggleMarkUnread}
            className="flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl text-[11px] font-medium bg-secondary hover:bg-secondary/80 text-foreground transition-colors text-center"
          >
            <Mail className="w-4 h-4 text-blue-400" />
            <span className="truncate w-full">{isUnread ? "Mark Read" : "Unread"}</span>
          </button>
        )}

        <button
          onClick={onToggleArchive}
          className={cn(
            "flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl text-[11px] font-medium transition-colors text-center",
            isArchived ? "bg-primary/15 text-primary font-semibold" : "bg-secondary hover:bg-secondary/80 text-foreground"
          )}
        >
          <Archive className="w-4 h-4" />
          <span className="truncate w-full">{isArchived ? "Unarchive" : "Archive"}</span>
        </button>
      </div>

      {/* Menu items */}
      <div className="divide-y divide-border">
        {onSearchInChat && (
          <InfoRow
            icon={<Search className="w-5 h-5 text-sky-400" />}
            label="Search in Conversation"
            onClick={onSearchInChat}
          />
        )}
        <InfoRow
          icon={<Palette className="w-5 h-5 text-pink-400" />}
          label="Chat Theme & Wallpaper"
          value={THEME_OPTIONS.find(t => t.id === chatTheme)?.name ?? "Theme"}
          onClick={() => setSection("themes")}
        />
        <InfoRow
          icon={<Grid3x3 className="w-5 h-5 text-purple-400" />}
          label="Shared Media"
          badge={sharedMedia.length > 0 ? String(sharedMedia.length) : undefined}
          onClick={() => setSection("media")}
        />
        <InfoRow
          icon={<Pin className="w-5 h-5 text-amber-400" />}
          label="Pinned Messages"
          badge={pinnedMessages.length > 0 ? String(pinnedMessages.length) : undefined}
          onClick={() => setSection("pinned")}
        />
        <InfoRow
          icon={<Star className="w-5 h-5 text-yellow-400" />}
          label="Starred Messages"
          badge={starredMessages.length > 0 ? String(starredMessages.length) : undefined}
          onClick={() => setSection("starred")}
        />
        <InfoRow
          icon={<Clock className="w-5 h-5 text-emerald-400" />}
          label="Disappearing Messages"
          value={DISAPPEAR_OPTIONS.find(o => o.value === disappearAfter)?.label ?? "Off"}
          onClick={() => setSection("disappear")}
        />
        <InfoRow
          icon={<Timer className="w-5 h-5 text-orange-400" />}
          label="Restrict Messages"
          value={otherTimeoutUntil ? "Active" : "Off"}
          onClick={() => setSection("restrict")}
        />
        {onExportChat && (
          <InfoRow
            icon={<Download className="w-5 h-5 text-indigo-400" />}
            label="Export Chat History"
            onClick={onExportChat}
          />
        )}
      </div>

      {/* Chat History & Deletion Actions */}
      <div className="divide-y divide-border border-t border-border mt-2">
        {onClearMessages && (
          <div className="px-4 py-2">
            {!showClearConfirm ? (
              <button
                className="flex items-center gap-3 w-full py-2.5 text-left text-sm font-medium text-rose-400 hover:text-rose-300 transition-colors"
                onClick={() => setShowClearConfirm(true)}
              >
                <Eraser className="w-4.5 h-4.5" />
                <span>Clear Chat History</span>
              </button>
            ) : (
              <div className="p-3 bg-rose-950/40 border border-rose-800/40 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Clear all messages for this chat?</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8 text-xs flex-1 font-bold"
                    onClick={() => {
                      onClearMessages();
                      setShowClearConfirm(false);
                    }}
                  >
                    Yes, Clear All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => setShowClearConfirm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {onDeleteChat && (
          <div className="px-4 py-2">
            {!showDeleteConfirm ? (
              <button
                className="flex items-center gap-3 w-full py-2.5 text-left text-sm font-bold text-red-500 hover:text-red-400 transition-colors"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-4.5 h-4.5" />
                <span>Delete Entire Chat</span>
              </button>
            ) : (
              <div className="p-3 bg-red-950/60 border border-red-800/60 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Delete entire conversation permanently?</span>
                </div>
                <p className="text-[11px] text-muted-foreground">This cannot be undone. All messages and media in this chat will be removed.</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8 text-xs flex-1 font-bold bg-red-600 hover:bg-red-700"
                    onClick={() => {
                      onDeleteChat();
                      setShowDeleteConfirm(false);
                    }}
                  >
                    Delete Chat Permanently
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Danger zone (Block / Unblock) */}
      <div className="divide-y divide-border border-t border-border">
        {isBlocked ? (
          <button
            className="flex items-center gap-3 px-4 py-3.5 w-full hover:bg-secondary/60 transition-colors text-left"
            onClick={onUnblock}
          >
            <ShieldOff className="w-5 h-5 text-muted-foreground shrink-0" />
            <span className="flex-1 text-sm font-medium">Unblock @{displayUsername}</span>
          </button>
        ) : (
          <button
            className="flex items-center gap-3 px-4 py-3.5 w-full hover:bg-destructive/10 transition-colors text-left"
            onClick={onBlock}
          >
            <Ban className="w-5 h-5 text-destructive shrink-0" />
            <span className="flex-1 text-sm font-medium text-destructive">Block @{displayUsername}</span>
          </button>
        )}
      </div>
      {isBlockedBy && (
        <div className="px-4 py-3 text-xs text-muted-foreground">
          You can't message this user right now.
        </div>
      )}
    </PanelShell>
  );
}

function PanelShell({
  children, title, onBack, onClose,
}: {
  children: React.ReactNode;
  title: string;
  onBack: (() => void) | null;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col h-full bg-card">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
        )}
        <h3 className={cn("font-semibold text-sm flex-1", !onBack && "text-center")}>
          {title || "User Details"}
        </h3>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

function InfoRow({
  icon, label, badge, value, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  value?: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex items-center gap-3 px-4 py-3.5 w-full hover:bg-secondary/60 transition-colors text-left"
      onClick={onClick}
    >
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      {badge && (
        <span className="text-xs bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      {value && (
        <span className="text-xs text-muted-foreground">{value}</span>
      )}
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );
}
