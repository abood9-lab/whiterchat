import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import { MessageSquare, Eye, ShieldCheck, Download, Loader2 } from "lucide-react";

export function MessagesSection() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();

  const currentMessages = (user as any)?.messageSettings || {};

  const [readReceipts, setReadReceipts] = useState<boolean>(currentMessages.readReceipts !== false);
  const [typingIndicators, setTypingIndicators] = useState<boolean>(currentMessages.typingIndicators !== false);
  const [filterMessageRequests, setFilterMessageRequests] = useState<boolean>(currentMessages.filterMessageRequests !== false);
  const [mediaAutoDownload, setMediaAutoDownload] = useState<boolean>(currentMessages.mediaAutoDownload !== false);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const messageSettings = {
        readReceipts,
        typingIndicators,
        filterMessageRequests,
        mediaAutoDownload,
      };

      const res = await fetch(apiUrl("/api/users/me/settings"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messageSettings }),
      });

      if (res.ok) {
        if (user) updateUser({ ...user, messageSettings } as any);
        toast({ title: "Message preferences saved!" });
      } else {
        toast({ title: "Failed to save message settings", variant: "destructive" });
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
        <h2 className="text-xl font-bold tracking-tight">Messages & Chat Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Customize read receipts, typing indicators, and message filtering.
        </p>
      </div>

      <div className="p-6 rounded-2xl border border-border bg-card space-y-4 shadow-sm">
        <div className="divide-y divide-border">
          {/* Read Receipts */}
          <div className="py-3 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Eye className="w-4 h-4 text-primary mt-1" />
              <div>
                <div className="font-semibold text-sm">Read Receipts (Seen Status)</div>
                <div className="text-xs text-muted-foreground">
                  Let senders see when you've read their direct messages.
                </div>
              </div>
            </div>
            <Switch checked={readReceipts} onCheckedChange={setReadReceipts} />
          </div>

          {/* Typing Indicators */}
          <div className="py-3 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <MessageSquare className="w-4 h-4 text-emerald-500 mt-1" />
              <div>
                <div className="font-semibold text-sm">Typing Indicators</div>
                <div className="text-xs text-muted-foreground">
                  Show "typing..." status in conversations while you're drafting a response.
                </div>
              </div>
            </div>
            <Switch checked={typingIndicators} onCheckedChange={setTypingIndicators} />
          </div>

          {/* Filter Message Requests */}
          <div className="py-3 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-amber-500 mt-1" />
              <div>
                <div className="font-semibold text-sm">Hidden Message Requests Filter</div>
                <div className="text-xs text-muted-foreground">
                  Automatically move offensive or suspicious message requests to a hidden folder.
                </div>
              </div>
            </div>
            <Switch checked={filterMessageRequests} onCheckedChange={setFilterMessageRequests} />
          </div>

          {/* Media Auto-Download */}
          <div className="py-3 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Download className="w-4 h-4 text-blue-500 mt-1" />
              <div>
                <div className="font-semibold text-sm">Media Auto-Download</div>
                <div className="text-xs text-muted-foreground">
                  Automatically load photos and voice messages when opening chat threads.
                </div>
              </div>
            </div>
            <Switch checked={mediaAutoDownload} onCheckedChange={setMediaAutoDownload} />
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
