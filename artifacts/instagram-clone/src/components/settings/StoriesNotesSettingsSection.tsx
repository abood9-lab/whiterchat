import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import { Sparkles, MessageCircle, Share2, Archive, Star, Loader2 } from "lucide-react";

export function StoriesNotesSettingsSection() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();

  const currentStorySettings = (user as any)?.storySettings || {};

  const [saveToArchive, setSaveToArchive] = useState<boolean>(currentStorySettings.saveToArchive !== false);
  const [allowStorySharing, setAllowStorySharing] = useState<boolean>(currentStorySettings.allowStorySharing !== false);
  const [allowReplies, setAllowReplies] = useState<string>(currentStorySettings.allowReplies || "everyone");
  const [allowNotesAudio, setAllowNotesAudio] = useState<boolean>(currentStorySettings.allowNotesAudio !== false);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem("pixlr_token") ?? "";
      const storySettings = {
        saveToArchive,
        allowStorySharing,
        allowReplies,
        allowNotesAudio,
      };

      const res = await fetch(apiUrl("/api/users/me/settings"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ storySettings }),
      });

      if (res.ok) {
        if (user) updateUser({ ...user, storySettings } as any);
        toast({ title: "Story & Notes preferences saved!" });
      } else {
        toast({ title: "Failed to save settings", variant: "destructive" });
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
        <h2 className="text-xl font-bold tracking-tight">Stories & Social Notes</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure audience replies, story archiving, and interactive note bubble features.
        </p>
      </div>

      <div className="p-6 rounded-2xl border border-border bg-card space-y-4 shadow-sm">
        <h3 className="font-semibold text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" /> Story Controls
        </h3>

        <div className="divide-y divide-border">
          {/* Save to Archive */}
          <div className="py-3 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Archive className="w-4 h-4 text-muted-foreground mt-1" />
              <div>
                <div className="font-semibold text-sm">Save Stories to Archive</div>
                <div className="text-xs text-muted-foreground">
                  Automatically save your stories after 24 hours so you can revisit them or add to Highlights.
                </div>
              </div>
            </div>
            <Switch checked={saveToArchive} onCheckedChange={setSaveToArchive} />
          </div>

          {/* Allow Resharing */}
          <div className="py-3 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Share2 className="w-4 h-4 text-muted-foreground mt-1" />
              <div>
                <div className="font-semibold text-sm">Allow Sharing to Stories</div>
                <div className="text-xs text-muted-foreground">
                  Let other users share your public posts and reels to their stories.
                </div>
              </div>
            </div>
            <Switch checked={allowStorySharing} onCheckedChange={setAllowStorySharing} />
          </div>

          {/* Who can reply to stories */}
          <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="font-semibold text-sm">Allow Story Replies</div>
              <div className="text-xs text-muted-foreground">Choose who can send direct replies to your stories</div>
            </div>
            <select
              value={allowReplies}
              onChange={(e) => setAllowReplies(e.target.value)}
              className="h-9 px-3 rounded-md border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="everyone">Everyone</option>
              <option value="following">People You Follow</option>
              <option value="none">Off (No Replies)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Social Notes Controls */}
      <div className="p-6 rounded-2xl border border-border bg-card space-y-4 shadow-sm">
        <h3 className="font-semibold text-base flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-emerald-500" /> Notes & Audio Bubbles
        </h3>

        <div className="divide-y divide-border">
          <div className="py-3 flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-sm">Enable Voice Note Bubbles</div>
              <div className="text-xs text-muted-foreground">
                Allow recording and playing voice notes on your profile bubble and direct messages header.
              </div>
            </div>
            <Switch checked={allowNotesAudio} onCheckedChange={setAllowNotesAudio} />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={isSaving} className="px-6 h-10 font-semibold bg-primary text-primary-foreground">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save Story Settings
        </Button>
      </div>
    </div>
  );
}
