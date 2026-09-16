import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import { Bell, Mail, Smartphone, MessageCircle, Heart, UserPlus, ShieldAlert, Sparkles, Loader2 } from "lucide-react";

export function NotificationsSection() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();

  const currentNotifs = (user as any)?.notificationSettings || {};

  const [pushEnabled, setPushEnabled] = useState<boolean>(currentNotifs.pushEnabled !== false);
  const [emailEnabled, setEmailEnabled] = useState<boolean>(currentNotifs.emailEnabled !== false);
  const [inAppEnabled, setInAppEnabled] = useState<boolean>(currentNotifs.inAppEnabled !== false);

  const [likes, setLikes] = useState<boolean>(currentNotifs.likes !== false);
  const [reactions, setReactions] = useState<boolean>(currentNotifs.reactions !== false);
  const [comments, setComments] = useState<boolean>(currentNotifs.comments !== false);
  const [replies, setReplies] = useState<boolean>(currentNotifs.replies !== false);
  const [mentions, setMentions] = useState<boolean>(currentNotifs.mentions !== false);
  const [followers, setFollowers] = useState<boolean>(currentNotifs.followers !== false);
  const [messages, setMessages] = useState<boolean>(currentNotifs.messages !== false);
  const [notes, setNotes] = useState<boolean>(currentNotifs.notes !== false);
  const [reels, setReels] = useState<boolean>(currentNotifs.reels !== false);
  const [securityAlerts, setSecurityAlerts] = useState<boolean>(currentNotifs.securityAlerts !== false);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const notificationSettings = {
        pushEnabled,
        emailEnabled,
        inAppEnabled,
        likes,
        reactions,
        comments,
        replies,
        mentions,
        followers,
        messages,
        notes,
        reels,
        securityAlerts,
      };

      const res = await fetch(apiUrl("/api/users/me/settings"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notificationSettings }),
      });

      if (res.ok) {
        if (user) updateUser({ ...user, notificationSettings } as any);
        toast({ title: "Notification preferences saved!" });
      } else {
        toast({ title: "Failed to save notifications", variant: "destructive" });
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
        <h2 className="text-xl font-bold tracking-tight">Notification Preferences</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose what alerts you receive across push, email, and inside the app.
        </p>
      </div>

      {/* Delivery Channels */}
      <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
        <h3 className="font-semibold text-base flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" /> Delivery Channels
        </h3>

        <div className="divide-y divide-border">
          <div className="py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Smartphone className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="font-semibold text-sm">Push Notifications</div>
                <div className="text-xs text-muted-foreground">Receive instant alerts on your devices</div>
              </div>
            </div>
            <Switch checked={pushEnabled} onCheckedChange={setPushEnabled} />
          </div>

          <div className="py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="font-semibold text-sm">Email Summaries</div>
                <div className="text-xs text-muted-foreground">Weekly digests and security confirmations</div>
              </div>
            </div>
            <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
          </div>

          <div className="py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="font-semibold text-sm">In-App Notification Center</div>
                <div className="text-xs text-muted-foreground">Bell icon badge and notification tab list</div>
              </div>
            </div>
            <Switch checked={inAppEnabled} onCheckedChange={setInAppEnabled} />
          </div>
        </div>
      </div>

      {/* Activity Notifications */}
      <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
        <h3 className="font-semibold text-base flex items-center gap-2">
          <Heart className="w-4 h-4 text-rose-500" /> Interactions & Activity
        </h3>

        <div className="divide-y divide-border">
          <div className="py-3 flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-sm">Likes & Reactions</div>
              <div className="text-xs text-muted-foreground">When someone likes your photos or reels</div>
            </div>
            <Switch checked={likes} onCheckedChange={setLikes} />
          </div>

          <div className="py-3 flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-sm">Comments & Replies</div>
              <div className="text-xs text-muted-foreground">When someone comments on your post or replies to your thread</div>
            </div>
            <Switch checked={comments} onCheckedChange={setComments} />
          </div>

          <div className="py-3 flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-sm">Mentions & Tags</div>
              <div className="text-xs text-muted-foreground">When someone mentions @{user?.username} in a post or comment</div>
            </div>
            <Switch checked={mentions} onCheckedChange={setMentions} />
          </div>

          <div className="py-3 flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-sm">New Followers</div>
              <div className="text-xs text-muted-foreground">When someone starts following your profile</div>
            </div>
            <Switch checked={followers} onCheckedChange={setFollowers} />
          </div>

          <div className="py-3 flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-sm">Direct Messages</div>
              <div className="text-xs text-muted-foreground">When someone sends you a message in chat</div>
            </div>
            <Switch checked={messages} onCheckedChange={setMessages} />
          </div>

          <div className="py-3 flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-sm">Notes & Status Updates</div>
              <div className="text-xs text-muted-foreground">Replies to your social bubbles</div>
            </div>
            <Switch checked={notes} onCheckedChange={setNotes} />
          </div>

          <div className="py-3 flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-sm">Security Alerts</div>
              <div className="text-xs text-muted-foreground">Unrecognized logins or password changes</div>
            </div>
            <Switch checked={securityAlerts} onCheckedChange={setSecurityAlerts} />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={isSaving} className="px-6 h-10 font-semibold bg-primary text-primary-foreground">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save Notifications
        </Button>
      </div>
    </div>
  );
}
