import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { mobileApi } from "../../services/api/client";
import { useAuth } from "../../context/AuthContext";
import type { User } from "../../types";

interface EditProfileSheetProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated: (user: User) => void;
}

export const EditProfileSheet: React.FC<EditProfileSheetProps> = ({
  user,
  isOpen,
  onClose,
  onProfileUpdated,
}) => {
  const { updateUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [website, setWebsite] = useState(user?.website || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await mobileApi.updateProfile({
      displayName: displayName.trim(),
      bio: bio.trim(),
      website: website.trim(),
      avatarUrl: avatarUrl.trim(),
    });

    if (res.error) {
      setError(res.error);
    } else if (res.data?.user) {
      updateUser(res.data.user);
      onProfileUpdated(res.data.user);
      onClose();
    }
    setLoading(false);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Edit Profile">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        <Input
          label="Display Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />

        <Input
          label="Avatar URL"
          placeholder="https://..."
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Write something about yourself..."
            className="w-full p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <Input
          label="Website"
          placeholder="https://yourwebsite.com"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />

        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full mt-2"
          isLoading={loading}
        >
          Save Changes
        </Button>
      </form>
    </BottomSheet>
  );
};
