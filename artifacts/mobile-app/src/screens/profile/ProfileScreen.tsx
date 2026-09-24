import React, { useState, useEffect } from "react";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { EditProfileSheet } from "../../components/profile/EditProfileSheet";
import { mobileApi } from "../../services/api/client";
import { useAuth } from "../../context/AuthContext";
import { Grid, Film, Bookmark, Settings, LogOut, ShieldCheck, Crown } from "lucide-react";
import type { Post, User } from "../../types";

interface ProfileScreenProps {
  username?: string;
  onNavigateToSettings: () => void;
  onNavigateToPost: (postId: string) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  username,
  onNavigateToSettings,
  onNavigateToPost,
}) => {
  const { user: currentUser, logout } = useAuth();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "reels" | "saved">("posts");
  const [showEditSheet, setShowEditSheet] = useState(false);

  const isOwnProfile = !username || username === currentUser?.username;

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      try {
        const targetUsername = isOwnProfile ? currentUser?.username : username;
        if (!targetUsername) return;

        const res = await mobileApi.getUserProfile(targetUsername);
        if (res.data?.user) {
          setProfileUser(res.data.user);
          setIsFollowing(res.data.isFollowing || false);
          if (res.data.user._id) {
            const postsRes = await mobileApi.getUserPosts(res.data.user._id);
            if (postsRes.data?.posts) {
              setUserPosts(postsRes.data.posts);
            }
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [username, isOwnProfile, currentUser?.username]);

  const handleFollowToggle = async () => {
    if (!profileUser?._id) return;
    const nextState = !isFollowing;
    setIsFollowing(nextState);
    await mobileApi.followUser(profileUser._id);
  };

  const user = isOwnProfile ? currentUser : profileUser;

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">User Not Found</h2>
        <p className="text-xs text-zinc-500 mt-1">The user you're looking for doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-20 select-none">
      {/* Top Mobile Bar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold text-base text-zinc-900 dark:text-zinc-100">
            {user.username}
          </span>
          {user.plan && user.plan !== "free" && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-extrabold flex items-center gap-0.5 uppercase tracking-wide">
              <Crown className="w-3 h-3" /> {user.plan}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {isOwnProfile && (
            <>
              <button
                onClick={onNavigateToSettings}
                className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={logout}
                className="p-2 text-red-500 hover:text-red-600 rounded-full hover:bg-red-50 dark:hover:bg-red-950/40"
                title="Log Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Profile Overview Header */}
      <div className="p-4 bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-5 mb-4">
          <Avatar
            src={user.avatarUrl}
            name={user.displayName || user.username}
            size="lg"
            isVerified={user.isVerified}
          />

          <div className="flex-1 flex justify-around text-center">
            <div className="flex flex-col">
              <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                {userPosts.length || user.postsCount || 0}
              </span>
              <span className="text-[11px] text-zinc-500">Posts</span>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                {user.followersCount || 0}
              </span>
              <span className="text-[11px] text-zinc-500">Followers</span>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                {user.followingCount || 0}
              </span>
              <span className="text-[11px] text-zinc-500">Following</span>
            </div>
          </div>
        </div>

        {/* User Bio & Meta */}
        <div className="space-y-1 mb-4">
          <div className="flex items-center gap-1.5">
            <h2 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
              {user.displayName || user.username}
            </h2>
            {user.role && user.role !== "user" && (
              <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                {user.role}
              </span>
            )}
          </div>
          {user.bio && (
            <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {user.bio}
            </p>
          )}
          {user.website && (
            <a
              href={user.website.startsWith("http") ? user.website : `https://${user.website}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline block truncate"
            >
              {user.website.replace(/^https?:\/\//, "")}
            </a>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {isOwnProfile ? (
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 font-semibold"
              onClick={() => setShowEditSheet(true)}
            >
              Edit Profile
            </Button>
          ) : (
            <>
              <Button
                variant={isFollowing ? "outline" : "primary"}
                size="sm"
                className="flex-1 font-semibold"
                onClick={handleFollowToggle}
              >
                {isFollowing ? "Following" : "Follow"}
              </Button>
              <Button variant="secondary" size="sm" className="flex-1 font-semibold">
                Message
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-around bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-xs font-bold">
        <button
          onClick={() => setActiveTab("posts")}
          className={`flex-1 py-3 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeTab === "posts"
              ? "border-emerald-500 text-emerald-500"
              : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          }`}
        >
          <Grid className="w-4 h-4" /> Posts
        </button>
        <button
          onClick={() => setActiveTab("reels")}
          className={`flex-1 py-3 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeTab === "reels"
              ? "border-emerald-500 text-emerald-500"
              : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          }`}
        >
          <Film className="w-4 h-4" /> Reels
        </button>
        {isOwnProfile && (
          <button
            onClick={() => setActiveTab("saved")}
            className={`flex-1 py-3 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === "saved"
                ? "border-emerald-500 text-emerald-500"
                : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            }`}
          >
            <Bookmark className="w-4 h-4" /> Saved
          </button>
        )}
      </div>

      {/* Posts Media Grid */}
      <div className="grid grid-cols-3 gap-0.5 mt-0.5">
        {userPosts.length === 0 ? (
          <div className="col-span-3 py-16 text-center text-zinc-400 text-xs font-medium">
            No posts yet.
          </div>
        ) : (
          userPosts.map((post) => (
            <div
              key={post._id}
              onClick={() => onNavigateToPost(post._id)}
              className="relative aspect-square bg-zinc-200 dark:bg-zinc-900 cursor-pointer overflow-hidden active:opacity-90"
            >
              {post.mediaUrls?.[0] ? (
                <img
                  src={post.mediaUrls[0]}
                  alt="Post preview"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full p-2 flex items-center justify-center text-[10px] text-zinc-500 text-center">
                  {post.caption?.slice(0, 40)}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Edit Profile Sheet */}
      <EditProfileSheet
        user={currentUser}
        isOpen={showEditSheet}
        onClose={() => setShowEditSheet(false)}
        onProfileUpdated={(updated) => setProfileUser(updated)}
      />
    </div>
  );
};
