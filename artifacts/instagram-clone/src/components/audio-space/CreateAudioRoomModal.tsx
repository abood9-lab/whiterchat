import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Radio, Sparkles, Globe, Users, Loader2 } from "lucide-react";
import { useAudioRoom } from "./AudioRoomContext";
import { DEFAULT_AUDIO_ROOM_CONFIG, type AudioRoomCategory, type AudioRoomVisibility } from "@/types/audio-room";
import { cn } from "@/lib/utils";

interface CreateAudioRoomModalProps {
  open: boolean;
  onClose: () => void;
  groupId?: string;
  groupName?: string;
}

export function CreateAudioRoomModal({
  open,
  onClose,
  groupId,
  groupName,
}: CreateAudioRoomModalProps) {
  const { createAndStartRoom } = useAudioRoom();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<AudioRoomCategory>("general");
  const [visibility, setVisibility] = useState<AudioRoomVisibility>(groupId ? "group" : "public");
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter a room title");
      return;
    }

    setIsStarting(true);
    setError(null);
    try {
      await createAndStartRoom({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        visibility,
        groupId: visibility === "group" ? groupId : undefined,
        groupName: visibility === "group" ? groupName : undefined,
      });
      onClose();
      setTitle("");
      setDescription("");
    } catch (err: any) {
      setError(err?.message || "Failed to start audio space");
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md p-6 rounded-3xl bg-card border-border shadow-2xl">
        <DialogHeader className="space-y-1 text-left">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/20 mb-2">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            Start a Live Audio Space
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Host real-time discussions, podcast stages, or casual hangouts with high quality audio.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Title Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Space Title *</label>
            <Input
              placeholder="What's this space about?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              className="rounded-xl border-border bg-secondary/30 h-11"
              autoFocus
            />
          </div>

          {/* Description Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Description (Optional)</label>
            <Textarea
              placeholder="Add details, topics, or speaker guidelines..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              rows={2}
              className="rounded-xl border-border bg-secondary/30 resize-none text-xs"
            />
          </div>

          {/* Category Chips Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Category</label>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
              {DEFAULT_AUDIO_ROOM_CONFIG.allowedCategories.map((cat) => (
                <button
                  type="button"
                  key={cat.key}
                  onClick={() => setCategory(cat.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold transition-all border",
                    category === cat.key
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-secondary/40 text-muted-foreground border-border hover:bg-secondary"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Visibility Options (Public vs Group) */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-foreground">Visibility</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVisibility("public")}
                className={cn(
                  "p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all",
                  visibility === "public"
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-secondary/20 text-muted-foreground hover:bg-secondary/40"
                )}
              >
                <Globe className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs font-bold leading-tight">Public Space</p>
                  <p className="text-[10px] text-muted-foreground">Anyone can listen</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setVisibility("group")}
                disabled={!groupId}
                className={cn(
                  "p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all",
                  visibility === "group"
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-secondary/20 text-muted-foreground hover:bg-secondary/40",
                  !groupId && "opacity-50 cursor-not-allowed"
                )}
              >
                <Users className="w-4 h-4 text-violet-500" />
                <div>
                  <p className="text-xs font-bold leading-tight">Group Only</p>
                  <p className="text-[10px] text-muted-foreground">
                    {groupId ? groupName || "Members only" : "Start from group"}
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              className="rounded-full text-xs"
              onClick={onClose}
              disabled={isStarting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-full text-xs font-bold px-6 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25"
              disabled={isStarting}
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Starting...
                </>
              ) : (
                <>
                  <Radio className="w-3.5 h-3.5 mr-1.5" /> Start Live Space
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
