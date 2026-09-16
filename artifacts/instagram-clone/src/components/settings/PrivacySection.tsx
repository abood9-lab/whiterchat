import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import { Lock, Eye, MessageSquare, AtSign, Users, Activity, Loader2, Sparkles } from "lucide-react";

export function PrivacySection() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();

  const userPrivacy = (user as any)?.privacySettings || {};

  const [isPrivate, setIsPrivate] = useState<boolean>((user as any)?.isPrivate ?? false);
  const [whoCanMessage, setWhoCanMessage] = useState<string>(userPrivacy.whoCanMessage || "everyone");
  const [whoCanComment, setWhoCanComment] = useState<string>(userPrivacy.whoCanComment || "everyone");
  const [whoCanMention, setWhoCanMention] = useState<string>(userPrivacy.whoCanMention || "everyone");
  const [whoCanTag, setWhoCanTag] = useState<string>(userPrivacy.whoCanTag || "everyone");
  const [whoCanReplyNotes, setWhoCanReplyNotes] = useState<string>(userPrivacy.whoCanReplyNotes || "followers");
  const [showActivityStatus, setShowActivityStatus] = useState<boolean>(
    userPrivacy.showActivityStatus !== false
  );
  const [showOnlineStatus, setShowOnlineStatus] = useState<boolean>(
    userPrivacy.showOnlineStatus !== false
  );
  const [showFollowLists, setShowFollowLists] = useState<boolean>(
    userPrivacy.showFollowLists !== false
  );

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const privacySettings = {
        privateAccount: isPrivate,
        whoCanMessage,
        whoCanComment,
        whoCanMention,
        whoCanTag,
        whoCanReplyNotes,
        showActivityStatus,
        showOnlineStatus,
        showFollowLists,
      };

      const res = await fetch(apiUrl("/api/users/me/settings"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          isPrivate,
          privacySettings,
        }),
      });

      if (res.ok) {
        if (user) {
          updateUser({
            ...user,
            isPrivate,
            privacySettings,
          } as any);
        }
        toast({ title: "Privacy settings updated!" });
      } else {
        toast({ title: "Failed to update privacy", variant: "destructive" });
      }
    } catch {
      toast({ title: "An error occurred", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Privacy & Interactions</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Control who can see your content, send messages, tag you, and view your activity.
        </p>
      </div>

      {/* Account Privacy Toggle */}
      <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-sm">Private Account</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                When your account is private, only people you approve can see your photos, reels, and followers.
              </p>
            </div>
          </div>
          <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
        </div>
      </div>

      {/* Granular Interaction Controls */}
      <div className="p-6 rounded-2xl border border-border bg-card space-y-6">
        <h3 className="font-semibold text-base flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" /> Interactions & Mentions
        </h3>

        <div className="space-y-5">
          {/* Who can message me */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Who can message you
              </Label>
              <p className="text-xs text-muted-foreground">Direct message requests permissions</p>
            </div>
            <select
              value={whoCanMessage}
              onChange={(e) => setWhoCanMessage(e.target.value)}
              className="h-9 px-3 rounded-md border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="everyone">Everyone</option>
              <option value="following">People you follow</option>
              <option value="none">No one</option>
            </select>
          </div>

          {/* Who can comment */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Who can comment on posts
              </Label>
              <p className="text-xs text-muted-foreground">Allow comments on your photos and reels</p>
            </div>
            <select
              value={whoCanComment}
              onChange={(e) => setWhoCanComment(e.target.value)}
              className="h-9 px-3 rounded-md border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="everyone">Everyone</option>
              <option value="following">People you follow</option>
              <option value="none">Off (No one)</option>
            </select>
          </div>

          {/* Mentions & Tags */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Who can tag & mention you
              </Label>
              <p className="text-xs text-muted-foreground">In post captions, stories, and comments</p>
            </div>
            <select
              value={whoCanMention}
              onChange={(e) => setWhoCanMention(e.target.value)}
              className="h-9 px-3 rounded-md border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="everyone">Everyone</option>
              <option value="following">People you follow</option>
              <option value="none">Don't allow</option>
            </select>
          </div>

          {/* Notes Replies */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Who can reply to your Notes
              </Label>
              <p className="text-xs text-muted-foreground">Permissions for replying to social bubbles</p>
            </div>
            <select
              value={whoCanReplyNotes}
              onChange={(e) => setWhoCanReplyNotes(e.target.value)}
              className="h-9 px-3 rounded-md border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="followers">Followers you follow back</option>
              <option value="close_friends">Close Friends Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Activity & Online Status */}
      <div className="p-6 rounded-2xl border border-border bg-card space-y-5">
        <h3 className="font-semibold text-base flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-500" /> Activity & Presence
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-sm">Show Activity Status</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Allow accounts you follow to see when you were last active on WhiterChat.
              </p>
            </div>
            <Switch checked={showActivityStatus} onCheckedChange={setShowActivityStatus} />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-sm">Show When You're Active Together (Online Dot)</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Displays green indicator in direct messages when both users are online.
              </p>
            </div>
            <Switch checked={showOnlineStatus} onCheckedChange={setShowOnlineStatus} />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-sm">Followers / Following Visibility</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Allow visitors to tap and view who you are following.
              </p>
            </div>
            <Switch checked={showFollowLists} onCheckedChange={setShowFollowLists} />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={isSaving} className="px-6 h-10 font-semibold bg-primary text-primary-foreground">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save Privacy Settings
        </Button>
      </div>
    </div>
  );
}
