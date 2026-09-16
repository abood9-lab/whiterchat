import { useState, useEffect, useRef } from "react";
import { useRoute, Link, useLocation } from "wouter";
import {
  useGetUserProfile,
  useGetUserPosts,
  useFollowUser,
  useUnfollowUser,
  useGetUserHighlights,
  useDeleteHighlight,
  useGetFollowers,
  useGetFollowing,
  useUploadAvatar,
  getGetUserProfileQueryKey,
} from "@workspace/api-client-react";
import type { Highlight, UserSummary } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Heart,
  MessageCircle,
  Settings,
  Grid3X3,
  Bookmark,
  Plus,
  X,
  Sparkles,
  Play,
  Images,
  Clapperboard,
  Tag,
  Camera,
  UserCheck,
  UserPlus,
  MapPin,
  Globe,
  ExternalLink,
  QrCode,
  Share2,
  CheckCircle2,
  Folder,
  Image as ImageIcon,
  Loader2,
  Lock,
  ChevronDown,
  Users,
  Check,
  Search,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { AnimatePresence, motion } from "framer-motion";
import { SEOHead } from "@/components/SEOHead";
import { StoryViewer } from "@/components/StoryViewer";
import { StoryCreator } from "@/components/StoryCreator";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ReportBlockMenu } from "@/components/ReportBlockMenu";
import { NoteBubble } from "@/components/notes/NoteBubble";
import { NoteDetailModal } from "@/components/notes/NoteDetailModal";
import { NoteComposerModal } from "@/components/notes/NoteComposerModal";
import { UserListModal } from "@/components/profile/UserListModal";
import { QRCodeModal } from "@/components/profile/QRCodeModal";
import type { SocialNote, NoteLocation, NoteTheme } from "@/types/note";
import { apiUrl } from "@/lib/api-url";
import { CoverUploadModal } from "@/components/profile/CoverUploadModal";

function PostGridMedia({ mediaUrl, mediaType, caption }: { mediaUrl?: string | null; mediaType?: string; caption?: string }) {
  if (!mediaUrl) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-purple-900/40 via-muted to-pink-900/40 flex items-center justify-center p-2">
        <span className="text-xs text-muted-foreground text-center line-clamp-3">{caption || "Post"}</span>
      </div>
    );
  }

  const isVideo =
    mediaType === "video" ||
    (typeof mediaUrl === "string" && (
      mediaUrl.endsWith(".mp4") ||
      mediaUrl.endsWith(".webm") ||
      mediaUrl.includes("/video/upload/") ||
      mediaUrl.includes(".mp4?")
    ));

  if (isVideo) {
    return (
      <video
        src={mediaUrl}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
        muted
        playsInline
        preload="metadata"
      />
    );
  }

  return (
    <img
      src={mediaUrl}
      alt={caption || "Post"}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      loading="lazy"
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.onerror = null;
        target.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80";
      }}
    />
  );
}



export default function Profile() {
  const [, params] = useRoute("/profile/:username");
  const username = params ? (params as { username?: string }).username ?? "" : "";
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user: me, updateUser, accounts, switchAccount } = useAuth();
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading: profileLoading } = useGetUserProfile(username);
  const { data: postsData, isLoading: postsLoading } = useGetUserPosts(username);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: highlights = [] } = useGetUserHighlights(username, {
    query: { enabled: !!username },
  } as any);

  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();
  const deleteHighlightMutation = useDeleteHighlight();
  const uploadAvatarMutation = useUploadAvatar();

  // Dialog & Modal states
  const [highlightViewer, setHighlightViewer] = useState<Highlight | null>(null);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState(false);

  // Notes state
  const [userNote, setUserNote] = useState<SocialNote | null>(null);
  const [noteComposerOpen, setNoteComposerOpen] = useState(false);
  const [noteDetailOpen, setNoteDetailOpen] = useState(false);

  // Tab specific data
  const [reelsData, setReelsData] = useState<any[]>([]);
  const [mediaData, setMediaData] = useState<any[]>([]);
  const [savedData, setSavedData] = useState<any[]>([]);
  const [likedData, setLikedData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("posts");
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const isMe = profile?.isMe;

  // Fetch Note
  useEffect(() => {
    if (!username) return;
    const fetchUserNote = async () => {
      try {
        const token = localStorage.getItem("whiterchat_token") ?? "";
        const resp = await fetch(
          apiUrl(`/api/notes/user/${encodeURIComponent(username)}`),
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (resp.ok) {
          const data = await resp.json();
          setUserNote(data?.note !== undefined ? data.note : data);
        } else {
          setUserNote(null);
        }
      } catch {
        setUserNote(null);
      }
    };
    fetchUserNote();
  }, [username]);

  // Fetch Tab Data (Reels, Media, Saved, Liked)
  useEffect(() => {
    if (!username) return;
    const fetchTabData = async () => {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const headers = { Authorization: `Bearer ${token}` };

      try {
        // Fetch Reels
        const reelsRes = await fetch(apiUrl(`/api/users/${encodeURIComponent(username)}/reels`), { headers });
        if (reelsRes.ok) {
          const resJson = await reelsRes.json();
          setReelsData(Array.isArray(resJson) ? resJson : (resJson?.reels || []));
        }

        // Fetch Media
        const mediaRes = await fetch(apiUrl(`/api/users/${encodeURIComponent(username)}/media`), { headers });
        if (mediaRes.ok) {
          const resJson = await mediaRes.json();
          setMediaData(Array.isArray(resJson) ? resJson : (resJson?.media || []));
        }

        // Fetch Saved (if isMe)
        if (isMe) {
          const savedRes = await fetch(apiUrl(`/api/users/${encodeURIComponent(username)}/saved`), { headers });
          if (savedRes.ok) {
            const resJson = await savedRes.json();
            setSavedData(Array.isArray(resJson) ? resJson : (resJson?.posts || resJson?.saved || []));
          }

          const likedRes = await fetch(apiUrl(`/api/users/${encodeURIComponent(username)}/liked`), { headers });
          if (likedRes.ok) {
            const resJson = await likedRes.json();
            setLikedData(Array.isArray(resJson) ? resJson : (resJson?.posts || resJson?.liked || []));
          }
        }
      } catch {
        // Ignore
      }
    };
    fetchTabData();
  }, [username, isMe]);

  const handleSaveNote = async (payload: {
    text?: string;
    emoji?: string | null;
    gifUrl?: string | null;
    sticker?: string | null;
    voiceUrl?: string | null;
    voiceDuration?: number | null;
    imageUrl?: string | null;
    location?: NoteLocation | null;
    audience?: "followers" | "close_friends";
    theme?: NoteTheme;
  }) => {
    const token = localStorage.getItem("whiterchat_token") ?? "";
    const resp = await fetch(apiUrl("/api/notes"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (resp.ok) {
      const saved = await resp.json();
      setUserNote(saved?.note !== undefined ? saved.note : saved);
      toast({ title: "Note shared!" });
    }
  };

  const handleReplyNote = async (text: string) => {
    if (!userNote) return;
    const token = localStorage.getItem("whiterchat_token") ?? "";
    const resp = await fetch(apiUrl(`/api/notes/${userNote.id}/reply`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text }),
    });
    if (resp.ok) {
      toast({ title: "Reply sent to direct messages" });
      setLocation("/messages");
    } else {
      const err = await resp.json().catch(() => ({}));
      toast({
        title: "Could not send reply",
        description: err.error || "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteNote = async () => {
    const token = localStorage.getItem("whiterchat_token") ?? "";
    await fetch(apiUrl("/api/notes/me"), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setUserNote(null);
    toast({ title: "Note removed" });
  };



  const allPosts = Array.isArray(postsData)
    ? postsData
    : (postsData as any)?.posts ?? [];
  const safeReels = Array.isArray(reelsData) ? reelsData : ((reelsData as any)?.reels || []);
  const safeMedia = Array.isArray(mediaData) ? mediaData : ((mediaData as any)?.media || []);
  const safeSaved = Array.isArray(savedData) ? savedData : ((savedData as any)?.posts || (savedData as any)?.saved || []);
  const safeLiked = Array.isArray(likedData) ? likedData : ((likedData as any)?.posts || (likedData as any)?.liked || []);
  const typedHighlights = highlights as Highlight[];

  const handleFollowToggle = async () => {
    if (!profile) return;
    try {
      if (profile.isFollowing) await unfollowMutation.mutateAsync({ username });
      else await followMutation.mutateAsync({ username });
      queryClient.invalidateQueries({
        queryKey: getGetUserProfileQueryKey(username),
      });
    } catch {
      /* ignore */
    }
  };

  const handleDeleteHighlight = async (id: string) => {
    try {
      await deleteHighlightMutation.mutateAsync({ id });
      queryClient.invalidateQueries({
        queryKey: [`/api/stories/highlights/user/${username}`],
      });
      toast({ title: "Highlight deleted" });
    } catch {
      toast({ title: "Failed", variant: "destructive" });
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Image too large",
        description: "Max 5MB",
        variant: "destructive",
      });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const res = await uploadAvatarMutation.mutateAsync({
          data: { data: reader.result as string, mimeType: file.type },
        });
        if (me) updateUser({ ...me, avatarUrl: res.url });
        queryClient.invalidateQueries({
          queryKey: getGetUserProfileQueryKey(username),
        });
        toast({ title: "Photo updated" });
      } catch {
        toast({ title: "Failed to update photo", variant: "destructive" });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: "Cover too large", description: "Max 8MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      setIsUploadingCover(true);
      try {
        const token = localStorage.getItem("whiterchat_token") ?? "";
        const res = await fetch(apiUrl("/api/users/me/cover"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ data: reader.result as string, mimeType: file.type }),
        });
        const resJson = await res.json().catch(() => ({}));
        if (res.ok && resJson.url) {
          if (me) updateUser({ ...me, coverUrl: resJson.url } as any);
          queryClient.invalidateQueries();
          toast({ title: "Cover banner updated!" });
        } else {
          toast({
            title: "Failed to upload banner",
            description: resJson.error || "Server error",
            variant: "destructive",
          });
        }
      } catch {
        toast({ title: "Failed to upload banner", variant: "destructive" });
      } finally {
        setIsUploadingCover(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (profileLoading) {
    return (
      <div className="max-w-4xl mx-auto w-full pt-16 flex flex-col items-center gap-4">
        <div className="w-24 h-24 rounded-full bg-muted animate-pulse" />
        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        <div className="h-3 w-48 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!profile) return <div className="text-center p-8">Profile not found</div>;

  const isVerified = (profile as any)?.isVerified;
  const coverUrl = (profile as any)?.coverUrl || (isMe ? (me as any)?.coverUrl : null);
  const customLinks = (profile as any)?.customLinks || [];
  const pronouns = (profile as any)?.pronouns;
  const location = (profile as any)?.location;
  const reelsCount = safeReels.length;

  return (
    <>
      <SEOHead
        title={`${profile.fullName || profile.username} (@${profile.username}) on WhiterChat`}
        description={profile.bio || `See posts, stories, and reels from ${profile.fullName || profile.username} (@${profile.username}) on WhiterChat.`}
        image={profile.avatarUrl || undefined}
        canonicalPath={`/profile/${profile.username}`}
        type="profile"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          "mainEntity": {
            "@type": "Person",
            "name": profile.fullName || profile.username,
            "alternateName": profile.username,
            "description": profile.bio,
            "image": profile.avatarUrl,
            "url": `https://whiterchat.app/profile/${profile.username}`,
            "interactionStatistic": [
              {
                "@type": "InteractionCounter",
                "interactionType": "https://schema.org/FollowAction",
                "userInteractionCount": profile.followersCount,
              },
            ],
          },
        }}
      />
      <div className="max-w-4xl mx-auto w-full pt-0 sm:pt-2 pb-20 md:pb-8 px-0 sm:px-4">
      {/* ── Cover Banner ────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-700/80 via-indigo-600/80 to-pink-600/80 h-32 sm:h-44 md:h-52 w-full sm:rounded-2xl border-b sm:border border-border shadow-sm">
        {coverUrl ? (
          <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-purple-900/30 via-indigo-900/30 to-pink-900/30 backdrop-blur-sm" />
        )}

        {isMe && (
          <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowCoverModal(true)}
              className="gap-1.5 h-7 sm:h-8 px-2.5 sm:px-3 text-xs font-semibold bg-background/85 backdrop-blur-md hover:bg-background shadow-sm rounded-lg"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span className="inline">{coverUrl ? "Change Banner" : "Add Banner"}</span>
            </Button>
          </div>
        )}
      </div>

      <CoverUploadModal
        open={showCoverModal}
        onOpenChange={setShowCoverModal}
        currentCoverUrl={coverUrl}
        onCoverUpdated={(newUrl) => {
          if (me) updateUser({ ...me, coverUrl: newUrl } as any);
          queryClient.invalidateQueries();
        }}
      />

      {/* ── Profile Header & Info ──────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-8 px-4 sm:px-6 py-4 sm:py-6 border-b border-border -mt-11 sm:-mt-16 relative">
        {/* Avatar with Floating Note Bubble */}
        <div className="relative group shrink-0 overflow-visible">
          <NoteBubble
            note={userNote}
            isMine={isMe}
            className="-top-4 sm:-top-5 scale-95 sm:scale-105 z-20"
            onClick={() => {
              if (userNote) setNoteDetailOpen(true);
              else if (isMe) setNoteComposerOpen(true);
            }}
          />
          <Avatar className="w-24 h-24 sm:w-32 sm:h-32 ring-4 ring-background shadow-xl bg-card">
            <AvatarImage src={profile.avatarUrl || undefined} />
            <AvatarFallback className="text-3xl sm:text-4xl font-bold bg-gradient-to-br from-purple-500 to-pink-500 text-white">
              {profile.username[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {isMe && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadAvatarMutation.isPending}
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer z-10 text-white"
            >
              {uploadAvatarMutation.isPending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="h-6 w-6 text-white" />
              )}
            </button>
          )}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleAvatarChange}
          />
        </div>

        {/* User Details & Action Controls */}
        <div className="flex-1 flex flex-col items-center sm:items-start gap-3.5 w-full pt-1 sm:pt-2">
          {/* Username, Badges & Desktop Action Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
              {isMe && accounts.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 hover:opacity-80 transition-opacity focus:outline-none group text-left"
                    >
                      <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{profile.username}</h1>
                      <ChevronDown className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 rounded-xl">
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-medium">
                      Switch Account ({accounts.length})
                    </DropdownMenuLabel>
                    {accounts.map((acc) => {
                      const isActive = acc.id === profile.id;
                      return (
                        <DropdownMenuItem
                          key={acc.id}
                          onClick={() => !isActive && switchAccount(acc.id)}
                          className={cn(
                            "flex items-center justify-between gap-2 cursor-pointer py-2",
                            isActive && "font-semibold"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar className="w-6 h-6 shrink-0">
                              <AvatarImage src={acc.avatarUrl || undefined} />
                              <AvatarFallback className="text-[10px] font-bold">
                                {acc.username[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs truncate">@{acc.username}</span>
                          </div>
                          {isActive && <Check className="w-4 h-4 text-primary shrink-0" />}
                        </DropdownMenuItem>
                      );
                    })}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link
                        href="/settings?tab=multi-account"
                        className="flex items-center gap-2 text-xs cursor-pointer py-2 text-primary font-medium"
                      >
                        <Users className="w-4 h-4" />
                        <span>Add & Manage Accounts</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{profile.username}</h1>
              )}
              {isVerified && (
                <span title="Verified Account">
                  <CheckCircle2 className="w-5 h-5 text-blue-500 fill-blue-500 text-white shrink-0" />
                </span>
              )}
              {pronouns && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                  {pronouns}
                </span>
              )}
            </div>

            {/* Desktop Action Buttons */}
            <div className="hidden sm:flex items-center gap-2">
              {isMe ? (
                <>
                  <Button variant="secondary" asChild className="h-9 px-4 font-semibold text-xs rounded-xl">
                    <Link href="/settings">Edit Profile</Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQrModalOpen(true)}
                    className="h-9 px-3 gap-1.5 font-semibold text-xs rounded-xl"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Share Profile</span>
                  </Button>
                  <Button variant="ghost" size="icon" asChild className="h-9 w-9 rounded-xl">
                    <Link href="/settings">
                      <Settings className="w-4 h-4" />
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={handleFollowToggle}
                    variant={profile.isFollowing ? "secondary" : "default"}
                    className="h-9 px-6 font-semibold text-xs bg-primary text-primary-foreground rounded-xl"
                    disabled={followMutation.isPending || unfollowMutation.isPending}
                  >
                    {profile.isFollowing ? "Following" : "Follow"}
                  </Button>
                  <Button variant="secondary" asChild className="h-9 px-4 font-semibold text-xs rounded-xl">
                    <Link href="/messages">Message</Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQrModalOpen(true)}
                    className="h-9 w-9 shrink-0 rounded-xl"
                    title="Share Profile QR"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                  <ReportBlockMenu username={profile.username} isBlocked={!!profile.isBlocked} />
                </>
              )}
            </div>
          </div>

          {/* Full Name & Bio & Location & Links */}
          <div className="text-sm text-center sm:text-left space-y-1.5 w-full">
            {profile.fullName && <div className="font-semibold text-foreground">{profile.fullName}</div>}
            {location && (
              <div className="flex items-center justify-center sm:justify-start gap-1 text-xs text-muted-foreground font-medium">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{location}</span>
              </div>
            )}
            {profile.bio && (
              <div className="whitespace-pre-wrap text-foreground/90 text-xs sm:text-sm leading-relaxed max-w-lg break-words">
                {profile.bio}
              </div>
            )}

            {/* Primary Website */}
            {profile.website && (
              <div className="pt-0.5">
                <a
                  href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[260px]">{profile.website.replace(/^https?:\/\//, "")}</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </div>
            )}

            {/* Custom Links Chips */}
            {customLinks.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1 justify-center sm:justify-start">
                {customLinks.map((link: { title: string; url: string }, idx: number) => (
                  <a
                    key={idx}
                    href={link.url.startsWith("http") ? link.url : `https://${link.url}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/70 hover:bg-muted text-[11px] font-semibold text-foreground transition-colors border border-border"
                  >
                    <span>{link.title}</span>
                    <ExternalLink className="w-2.5 h-2.5 text-muted-foreground" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Followers / Following / Posts Stats */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 w-full py-2.5 my-1 border-y border-border/70 sm:border-none sm:py-1">
            <div className="flex flex-col items-center sm:items-start">
              <span className="font-bold text-sm sm:text-base leading-tight">{profile.postsCount}</span>
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">posts</span>
            </div>
            {reelsCount > 0 && (
              <div className="flex flex-col items-center sm:items-start">
                <span className="font-bold text-sm sm:text-base leading-tight">{reelsCount}</span>
                <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">reels</span>
              </div>
            )}
            <button
              onClick={() => setFollowersOpen(true)}
              className="flex flex-col items-center sm:items-start hover:opacity-75 transition-opacity"
            >
              <span className="font-bold text-sm sm:text-base leading-tight">{profile.followersCount.toLocaleString()}</span>
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">followers</span>
            </button>
            <button
              onClick={() => setFollowingOpen(true)}
              className="flex flex-col items-center sm:items-start hover:opacity-75 transition-opacity"
            >
              <span className="font-bold text-sm sm:text-base leading-tight">{profile.followingCount.toLocaleString()}</span>
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">following</span>
            </button>
          </div>

          {/* Mobile Action Buttons (Full Width, Touch-First) */}
          <div className="flex sm:hidden items-center gap-2 w-full mt-1">
            {isMe ? (
              <>
                <Button variant="secondary" asChild className="flex-1 h-9 font-semibold text-xs rounded-xl shadow-xs">
                  <Link href="/settings">Edit Profile</Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQrModalOpen(true)}
                  className="flex-1 h-9 gap-1.5 font-semibold text-xs rounded-xl"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Share</span>
                </Button>
                <Button variant="outline" size="icon" asChild className="h-9 w-9 shrink-0 rounded-xl">
                  <Link href="/settings" aria-label="Settings">
                    <Settings className="w-4 h-4" />
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleFollowToggle}
                  variant={profile.isFollowing ? "secondary" : "default"}
                  className="flex-1 h-9 font-semibold text-xs bg-primary text-primary-foreground rounded-xl"
                  disabled={followMutation.isPending || unfollowMutation.isPending}
                >
                  {profile.isFollowing ? "Following" : "Follow"}
                </Button>
                <Button variant="secondary" asChild className="flex-1 h-9 font-semibold text-xs rounded-xl">
                  <Link href="/messages">Message</Link>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQrModalOpen(true)}
                  className="h-9 w-9 shrink-0 rounded-xl"
                  title="Share Profile QR"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
                <ReportBlockMenu username={profile.username} isBlocked={!!profile.isBlocked} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Story Highlights ───────────────────────────── */}
      {(typedHighlights.length > 0 || isMe) && (
        <div className="px-4 py-3 sm:py-4 border-b border-border overflow-x-auto scrollbar-none">
          <div className="flex gap-3.5 sm:gap-4 w-max items-center">
            {isMe && (
              <button
                onClick={() => setCreatorOpen(true)}
                className="flex flex-col items-center gap-1.5 cursor-pointer group shrink-0"
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-dashed border-border group-hover:border-primary transition-colors flex items-center justify-center">
                  <Plus size={20} className="text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <span className="text-[11px] sm:text-xs text-muted-foreground w-14 sm:w-16 text-center truncate">New</span>
              </button>
            )}
            {typedHighlights.map((h) => (
              <div
                key={h.id}
                className="flex flex-col items-center gap-1.5 cursor-pointer group relative shrink-0"
                onClick={() => setHighlightViewer(h)}
              >
                {isMe && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteHighlight(h.id);
                    }}
                    className="absolute -top-1 -right-1 z-10 w-5 h-5 bg-red-500 rounded-full items-center justify-center hidden group-hover:flex shadow text-white"
                  >
                    <X size={10} />
                  </button>
                )}
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 to-fuchsia-600">
                  <div className="w-full h-full rounded-full overflow-hidden border-2 border-background bg-muted">
                    {h.stories[0]?.mediaUrl ? (
                      <img src={h.stories[0].mediaUrl} alt={h.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-fuchsia-500 to-indigo-500 flex items-center justify-center">
                        <Sparkles size={18} className="text-white" />
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-[11px] sm:text-xs max-w-[60px] sm:max-w-[70px] truncate text-center">{h.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Highlight & Story Viewers ──────────────────── */}
      <AnimatePresence>
        {highlightViewer && highlightViewer.stories.length > 0 && (
          <StoryViewer
            userStories={[
              {
                user: {
                  id: profile.id,
                  username: profile.username,
                  fullName: profile.fullName,
                  avatarUrl: profile.avatarUrl ?? null,
                  isFollowing: profile.isFollowing,
                },
                stories: highlightViewer.stories,
                hasUnviewed: false,
              },
            ]}
            initialUserIndex={0}
            onClose={() => setHighlightViewer(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {creatorOpen && (
          <StoryCreator
            onClose={() => setCreatorOpen(false)}
            onSuccess={() => {
              queryClient.invalidateQueries({
                queryKey: [`/api/stories/highlights/user/${username}`],
              });
              queryClient.invalidateQueries({ queryKey: ["/api/stories/feed"] });
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Navigation Tabs ────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-0 sm:mt-1">
        <div className="w-full border-b border-border overflow-x-auto scrollbar-none">
          <TabsList className="w-full min-w-max justify-center h-11 sm:h-12 bg-transparent rounded-none p-0 gap-0">
            {[
              { value: "posts", icon: Grid3X3, label: "Posts" },
              { value: "reels", icon: Clapperboard, label: "Reels" },
              { value: "media", icon: Images, label: "Media" },
              ...(isMe ? [{ value: "saved", icon: Bookmark, label: "Saved" }] : []),
              ...(isMe ? [{ value: "liked", icon: Heart, label: "Liked" }] : []),
              { value: "tagged", icon: Tag, label: "Tagged" },
            ].map(({ value, icon: Icon, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex-1 min-w-[64px] sm:min-w-[90px] data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none px-3.5 sm:px-6 h-full font-semibold uppercase tracking-widest text-[11px] sm:text-xs gap-1.5 sm:gap-2 text-muted-foreground data-[state=active]:text-foreground transition-all"
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="inline sm:inline">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* 1. Posts Tab */}
        <TabsContent value="posts" className="mt-0">
          {postsLoading ? (
            <div className="grid grid-cols-3 gap-0.5 sm:gap-1 mt-0.5">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="aspect-square bg-muted animate-pulse" />
              ))}
            </div>
          ) : allPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <Grid3X3 className="w-12 h-12 opacity-30" />
              <p className="font-semibold text-sm">No posts yet</p>
              {isMe && (
                <Button size="sm" asChild className="text-xs font-semibold">
                  <Link href="/create">Share your first photo</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5 sm:gap-1 mt-0.5">
              {allPosts.map((post: any) => (
                <Link
                  key={post.id}
                  href={`/post/${post.id}`}
                  className="group relative aspect-square bg-muted block overflow-hidden"
                >
                  <PostGridMedia mediaUrl={post.mediaUrl} mediaType={post.mediaType} caption={post.caption} />
                  {post.mediaType === "video" && (
                    <div className="absolute top-2 right-2 text-white drop-shadow">
                      <Play className="w-4 h-4 fill-white" />
                    </div>
                  )}
                  {post.carouselMedia && post.carouselMedia.length > 1 && (
                    <div className="absolute top-2 right-2 text-white drop-shadow">
                      <Images className="w-4 h-4" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white font-semibold text-sm">
                    <div className="flex items-center gap-1.5">
                      <Heart className="w-4 h-4 fill-white" />
                      <span>{post.likesCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MessageCircle className="w-4 h-4 fill-white" />
                      <span>{post.commentsCount}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 2. Reels Tab */}
        <TabsContent value="reels" className="mt-0">
          {safeReels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <Clapperboard className="w-12 h-12 opacity-30" />
              <p className="font-semibold text-sm">No reels uploaded yet</p>
              {isMe && (
                <Button size="sm" asChild className="text-xs font-semibold">
                  <Link href="/reels">Create a Reel</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1 sm:gap-2 mt-2">
              {safeReels.map((reel: any) => (
                <Link
                  key={reel.id}
                  href="/reels"
                  className="group relative aspect-[9/16] rounded-xl overflow-hidden bg-muted block"
                >
                  <PostGridMedia
                    mediaUrl={reel.thumbnailUrl || reel.mediaUrl}
                    mediaType={reel.thumbnailUrl ? "image" : "video"}
                    caption={reel.caption}
                  />
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs font-semibold drop-shadow bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-xs z-10">
                    <Play className="w-3 h-3 fill-white" />
                    <span>{reel.viewsCount || reel.likesCount || 0}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 3. Media Tab (Photos + Videos combined gallery) */}
        <TabsContent value="media" className="mt-0">
          {safeMedia.length === 0 && allPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <Images className="w-12 h-12 opacity-30" />
              <p className="font-semibold text-sm">No media in gallery</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5 sm:gap-1 mt-0.5">
              {(safeMedia.length > 0 ? safeMedia : allPosts).map((item: any) => (
                <Link
                  key={item.id}
                  href={`/post/${item.id}`}
                  className="group relative aspect-square bg-muted block overflow-hidden"
                >
                  <PostGridMedia mediaUrl={item.mediaUrl} mediaType={item.mediaType} caption={item.caption} />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white text-xs font-semibold">
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4 fill-white" />
                      <span>{item.likesCount || 0}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 4. Saved Tab (Owner only) */}
        {isMe && (
          <TabsContent value="saved" className="mt-0">
            {safeSaved.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                <Bookmark className="w-12 h-12 opacity-30" />
                <p className="font-semibold text-sm">Save photos and reels</p>
                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  Save items you want to see again. No one is notified, and only you can see what you've saved.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-0.5 sm:gap-1 mt-0.5">
                {safeSaved.map((post: any) => (
                  <Link
                    key={post.id}
                    href={`/post/${post.id}`}
                    className="group relative aspect-square bg-muted block overflow-hidden"
                  >
                    <PostGridMedia mediaUrl={post.mediaUrl} mediaType={post.mediaType} caption={post.caption} />
                    <div className="absolute top-2 right-2 text-white drop-shadow">
                      <Bookmark className="w-4 h-4 fill-white" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* 5. Liked Tab (Owner only) */}
        {isMe && (
          <TabsContent value="liked" className="mt-0">
            {safeLiked.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                <Heart className="w-12 h-12 opacity-30" />
                <p className="font-semibold text-sm">No liked posts yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-0.5 sm:gap-1 mt-0.5">
                {safeLiked.map((post: any) => (
                  <Link
                    key={post.id}
                    href={`/post/${post.id}`}
                    className="group relative aspect-square bg-muted block overflow-hidden"
                  >
                    <PostGridMedia mediaUrl={post.mediaUrl} mediaType={post.mediaType} caption={post.caption} />
                    <div className="absolute top-2 right-2 text-rose-500 drop-shadow">
                      <Heart className="w-4 h-4 fill-rose-500" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* 6. Tagged Tab */}
        <TabsContent value="tagged" className="mt-0">
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <Tag className="w-12 h-12 opacity-30" />
            <p className="font-semibold text-sm">Photos of you</p>
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              When people tag you in photos and reels, they'll appear here.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Followers & Following Modals ─────────────────────── */}
      <UserListModal
        open={followersOpen}
        onClose={() => setFollowersOpen(false)}
        username={username}
        type="followers"
        onCountChange={() => {
          queryClient.invalidateQueries({ queryKey: [getGetUserProfileQueryKey(username)] });
        }}
      />
      <UserListModal
        open={followingOpen}
        onClose={() => setFollowingOpen(false)}
        username={username}
        type="following"
        onCountChange={() => {
          queryClient.invalidateQueries({ queryKey: [getGetUserProfileQueryKey(username)] });
        }}
      />

      {/* Note Detail Modal */}
      {noteDetailOpen && userNote && (
        <NoteDetailModal
          note={userNote}
          onClose={() => setNoteDetailOpen(false)}
          onReply={handleReplyNote}
          onDelete={isMe ? handleDeleteNote : undefined}
        />
      )}

      {/* Note Composer Modal */}
      {noteComposerOpen && (
        <NoteComposerModal
          existingNote={userNote}
          userAvatar={me?.avatarUrl}
          username={me?.username}
          onClose={() => setNoteComposerOpen(false)}
          onSave={handleSaveNote}
          onDelete={userNote ? handleDeleteNote : undefined}
        />
      )}

      {/* Profile QR Code & Share Modal */}
      <QRCodeModal
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        username={profile.username}
        fullName={profile.fullName || profile.username}
        avatarUrl={profile.avatarUrl}
      />
    </div>
    </>
  );
}
