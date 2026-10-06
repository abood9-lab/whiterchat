import { useState } from "react";
import { Lock, ShieldCheck, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onClose: () => void;
  onSendProtected: (payload: {
    text: string;
    permissionGated: {
      previewNote?: string | null;
      allowReopening: boolean;
      expiresAt?: string | null;
    };
  }) => void;
}

export function CreatePermissionGatedModal({ open, onClose, onSendProtected }: Props) {
  const [messageText, setMessageText] = useState("");
  const [previewNote, setPreviewNote] = useState("");
  const [allowReopening, setAllowReopening] = useState(true);
  const [expiration, setExpiration] = useState<string>("none");
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setMessageText("");
    setPreviewNote("");
    setAllowReopening(true);
    setExpiration("none");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSend = () => {
    if (!messageText.trim()) {
      setError("Please write the message you want to protect");
      return;
    }

    let expiresDate: string | null = null;
    if (expiration === "1h") expiresDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    else if (expiration === "6h") expiresDate = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
    else if (expiration === "24h") expiresDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    else if (expiration === "3d") expiresDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    onSendProtected({
      text: messageText.trim(),
      permissionGated: {
        previewNote: previewNote.trim() || null,
        allowReopening,
        expiresAt: expiresDate,
      },
    });

    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md bg-neutral-900 border-neutral-800 text-white rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
            <Lock className="w-5 h-5 text-indigo-400" /> Send Protected Message
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-400">
            Protected messages are encrypted. The recipient must request access before viewing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Message Text */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-200">
              Private Message Content <span className="text-indigo-400">*</span>
            </label>
            <Textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="e.g., I need to tell you something confidential..."
              className="bg-neutral-800 border-neutral-700 text-white rounded-2xl min-h-[90px] text-sm"
              autoFocus
            />
          </div>

          {/* Optional Preview Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-200">
              Optional Preview Note (Visible to recipient)
            </label>
            <Input
              value={previewNote}
              onChange={(e) => setPreviewNote(e.target.value)}
              placeholder="e.g., Project Proposal, Private Address, Budget..."
              className="bg-neutral-800 border-neutral-700 text-white rounded-2xl h-11 text-sm"
            />
          </div>

          {/* Expiration Settings */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300">Message Expiration</label>
            <select
              value={expiration}
              onChange={(e) => setExpiration(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 text-white rounded-2xl h-11 px-3 text-xs"
            >
              <option value="none">No Expiration</option>
              <option value="1h">1 Hour</option>
              <option value="6h">6 Hours</option>
              <option value="24h">24 Hours</option>
              <option value="3d">3 Days</option>
            </select>
          </div>

          {/* Allow Re-opening */}
          <label className="flex items-center gap-3 p-3 bg-neutral-800/60 border border-neutral-700 rounded-2xl cursor-pointer">
            <input
              type="checkbox"
              checked={allowReopening}
              onChange={(e) => setAllowReopening(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <p className="text-xs font-semibold text-white">Allow Re-requesting Access</p>
              <p className="text-[11px] text-neutral-400">
                If enabled, the recipient can ask for permission again after expiration.
              </p>
            </div>
          </label>

          {error && <p className="text-xs text-rose-400 font-semibold">{error}</p>}

          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
            <Button variant="ghost" onClick={handleClose} className="rounded-2xl text-neutral-400">
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              className="rounded-2xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-6 shadow-md"
            >
              Send Protected Message 🔐
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
