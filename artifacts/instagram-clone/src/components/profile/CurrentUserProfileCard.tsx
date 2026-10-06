import { UnifiedUserProfileCard } from "./UnifiedUserProfileCard";
import { useAuth } from "@/lib/auth";

export function CurrentUserProfileCard({ className = "" }: { className?: string }) {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <UnifiedUserProfileCard
      username={user.username}
      mode="default"
      className={className}
    />
  );
}
