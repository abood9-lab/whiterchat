import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reelId: string;
  initialCaption?: string | null;
  initialAudience?: string;
  onSuccess: (updated: { caption: string; audience: string }) => void;
}

export function EditReelModal({
  open,
  onOpenChange,
  reelId,
  initialCaption,
  initialAudience = "everyone",
  onSuccess,
}: Props) {
  const [caption, setCaption] = useState(initialCaption || "");
  const [audience, setAudience] = useState(initialAudience);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem("whiterchat_token");
      const res = await fetch(apiUrl(`/api/reels/${reelId}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ caption, audience }),
      });

      if (!res.ok) throw new Error("Failed to update reel");

      toast({ title: "Reel updated successfully!" });
      onSuccess({ caption, audience });
      onOpenChange(false);
    } catch {
      toast({
        title: "Error updating reel",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Edit Reel</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-caption" className="text-xs">
              Caption
            </Label>
            <Textarea
              id="edit-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption with #hashtags and @mentions..."
              className="h-28 text-xs resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Audience</Label>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select audience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone" className="text-xs">
                  Everyone
                </SelectItem>
                <SelectItem value="close_friends" className="text-xs">
                  Close Friends Only
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="gap-1.5"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
