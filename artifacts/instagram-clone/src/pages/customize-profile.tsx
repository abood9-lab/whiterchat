import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { ProfileAppearanceModal } from "@/components/profile/ProfileAppearanceModal";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function CustomizeProfilePage() {
  const [, setLocation] = useLocation();
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (!user) {
      // If not logged in, redirect to login
      setLocation("/login");
    }
  }, [user, setLocation]);

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  const handleClose = () => {
    setIsOpen(false);
    setLocation(`/profile/${encodeURIComponent(user.username)}`);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <ProfileAppearanceModal
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
        currentUser={{
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          bio: user.bio,
          avatarUrl: user.avatarUrl,
          coverUrl: (user as any)?.coverUrl || null,
          postsCount: (user as any).postsCount,
          followersCount: (user as any).followersCount,
          followingCount: (user as any).followingCount,
          isVerified: (user as any).isVerified,
          activeDecorationId: user.activeDecorationId,
          unlockedDecorations: user.unlockedDecorations,
          activeProfileEffectId: (user as any).activeProfileEffectId,
          unlockedProfileEffects: (user as any).unlockedProfileEffects,
          subscriptionPlan: (user as any).subscriptionPlan,
          role: (user as any).role,
        }}
        initialTab="effects"
        onAppearanceUpdated={(updates) => {
          updateUser({
            ...user,
            ...updates,
          });
          queryClient.invalidateQueries({ queryKey: [`/api/users/${user.username}`] });
        }}
      />
    </div>
  );
}
