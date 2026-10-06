import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import { Clapperboard, Wifi, Play, UploadCloud, Loader2 } from "lucide-react";

export function ReelsMediaSection() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();

  const currentMedia = (user as any)?.mediaSettings || {};

  const [autoplayVideos, setAutoplayVideos] = useState<boolean>(currentMedia.autoplayVideos !== false);
  const [highQualityUploads, setHighQualityUploads] = useState<boolean>(currentMedia.highQualityUploads !== false);
  const [dataSaver, setDataSaver] = useState<boolean>(currentMedia.dataSaver || false);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem("pixlr_token") ?? "";
      const mediaSettings = {
        autoplayVideos,
        highQualityUploads,
        dataSaver,
      };

      const res = await fetch(apiUrl("/api/users/me/settings"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mediaSettings }),
      });

      if (res.ok) {
        if (user) updateUser({ ...user, mediaSettings } as any);
        toast({ title: "Media & Reels preferences saved!" });
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
        <h2 className="text-xl font-bold tracking-tight">Reels & Media Playback</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Adjust video playback quality, cellular data usage, and upload resolution.
        </p>
      </div>

      <div className="p-6 rounded-2xl border border-border bg-card space-y-4 shadow-sm">
        <div className="divide-y divide-border">
          {/* Autoplay */}
          <div className="py-3 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Play className="w-4 h-4 text-primary mt-1" />
              <div>
                <div className="font-semibold text-sm">Autoplay Videos & Reels</div>
                <div className="text-xs text-muted-foreground">
                  Play videos automatically in the feed and Reels stream.
                </div>
              </div>
            </div>
            <Switch checked={autoplayVideos} onCheckedChange={setAutoplayVideos} />
          </div>

          {/* High Quality Uploads */}
          <div className="py-3 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <UploadCloud className="w-4 h-4 text-emerald-500 mt-1" />
              <div>
                <div className="font-semibold text-sm">Upload at Highest Quality</div>
                <div className="text-xs text-muted-foreground">
                  Always upload original high-res photos and 1080p/4K 60fps Reels, even on mobile data.
                </div>
              </div>
            </div>
            <Switch checked={highQualityUploads} onCheckedChange={setHighQualityUploads} />
          </div>

          {/* Data Saver */}
          <div className="py-3 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Wifi className="w-4 h-4 text-amber-500 mt-1" />
              <div>
                <div className="font-semibold text-sm">Use Less Cellular Data (Data Saver)</div>
                <div className="text-xs text-muted-foreground">
                  Lower resolution stream and disable advance video preloading on mobile data.
                </div>
              </div>
            </div>
            <Switch checked={dataSaver} onCheckedChange={setDataSaver} />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={isSaving} className="px-6 h-10 font-semibold bg-primary text-primary-foreground">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save Preferences
        </Button>
      </div>
    </div>
  );
}
