import { useState } from "react";
import { Shield, ShieldAlert, ShieldCheck, Key, Clock, Check, X, RefreshCw, Eye, EyeOff, Lock, Unlock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { apiUrl, getAuthToken } from "@/lib/api-url";

interface GrantSummary {
  userId: string;
  status: string;
  grantType: string;
  requestedAt?: string;
  expiresAt?: string | null;
  consumed: boolean;
}

interface PermissionGatedData {
  previewNote?: string | null;
  allowReopening: boolean;
  expiresAt?: string | null;
  status: "none" | "pending" | "approved" | "declined" | "revoked" | "expired" | "sender";
  grantType?: "one_time" | "1h" | "24h" | "permanent" | null;
  isAccessGranted: boolean;
  grantsSummary?: GrantSummary[];
}

interface Props {
  messageId: string;
  conversationId: string;
  permissionGated: PermissionGatedData;
  isMe: boolean;
  senderName: string;
  revealedText: string | null;
  onOpened?: (text: string) => void;
}

export function PermissionGatedCard({
  messageId,
  conversationId,
  permissionGated,
  isMe,
  senderName,
  revealedText,
  onOpened,
}: Props) {
  const [showManageModal, setShowManageModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(permissionGated.status);
  const [unlockedText, setUnlockedText] = useState<string | null>(revealedText);
  const [isDecrypted, setIsDecrypted] = useState(Boolean(revealedText));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sender Grant Options state
  const [selectedGrantType, setSelectedGrantType] = useState<"one_time" | "1h" | "24h" | "permanent">("one_time");

  // Recipient: Request Access
  const handleRequestAccess = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const token = getAuthToken();
      const resp = await fetch(apiUrl(`/api/messages/${messageId}/access/request`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await resp.json();
      if (resp.ok) {
        setCurrentStatus("pending");
      } else {
        setErrorMsg(data.error || "Failed to request access");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Recipient: Open & Read
  const handleOpenMessage = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const token = getAuthToken();
      const resp = await fetch(apiUrl(`/api/messages/${messageId}/access/open`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await resp.json();
      if (resp.ok && data.text) {
        setUnlockedText(data.text);
        setIsDecrypted(true);
        if (onOpened) onOpened(data.text);
      } else {
        setErrorMsg(data.error || "Could not decrypt message");
      }
    } catch {
      setErrorMsg("Network error.");
    } finally {
      setLoading(false);
    }
  };

  // Sender: Decide Grant
  const handleDecide = async (requesterId: string, decision: "approved" | "declined") => {
    try {
      const token = getAuthToken();
      await fetch(apiUrl(`/api/messages/${messageId}/access/decide`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          requesterId,
          decision,
          grantType: selectedGrantType,
        }),
      });
      setShowManageModal(false);
    } catch {
      // ignore
    }
  };

  // Sender: Revoke Grant
  const handleRevoke = async (requesterId: string) => {
    try {
      const token = getAuthToken();
      await fetch(apiUrl(`/api/messages/${messageId}/access/revoke`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ requesterId }),
      });
      setShowManageModal(false);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 my-1 select-none transition-all duration-300",
        isDecrypted || isMe
          ? "bg-gradient-to-br from-indigo-950/40 via-background to-blue-950/30 border-indigo-500/40 text-foreground"
          : "bg-gradient-to-br from-neutral-900 via-neutral-900 to-indigo-950/40 border-indigo-500/30 text-foreground shadow-lg"
      )}
      role="region"
      aria-label="Permission-gated protected message"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
            {isDecrypted ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <span>Protected Message 🔐</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold uppercase tracking-wider">
                Permission Gated
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isMe ? "You protected this message with access controls" : `From ${senderName}`}
            </p>
          </div>
        </div>

        {/* Status Pill */}
        {!isMe && (
          <span
            className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border",
              currentStatus === "approved"
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                : currentStatus === "pending"
                ? "bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse"
                : currentStatus === "declined"
                ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                : "bg-secondary text-muted-foreground border-border"
            )}
          >
            {currentStatus === "none"
              ? "Locked"
              : currentStatus === "pending"
              ? "Pending"
              : currentStatus === "approved"
              ? "Approved"
              : currentStatus}
          </span>
        )}
      </div>

      {/* Body Area */}
      <div className="py-3">
        {isDecrypted || (isMe && unlockedText) ? (
          <div className="space-y-2">
            <p className="text-sm font-medium leading-relaxed break-words whitespace-pre-wrap">
              {unlockedText}
            </p>
            {permissionGated.previewNote && (
              <p className="text-xs text-muted-foreground italic border-t border-border/40 pt-1.5">
                Note: {permissionGated.previewNote}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {permissionGated.previewNote ? (
              <div className="p-2.5 bg-secondary/70 border border-border/60 rounded-xl text-xs text-foreground font-medium">
                <span className="font-bold text-muted-foreground uppercase text-[10px] block mb-0.5">
                  Sender Note:
                </span>
                {permissionGated.previewNote}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                This message is locked by the sender. You must request permission before viewing.
              </p>
            )}

            {errorMsg && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold p-2 bg-rose-500/10 rounded-xl">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Recipient Actions */}
            {!isMe && (
              <div>
                {currentStatus === "none" && (
                  <Button
                    size="sm"
                    onClick={handleRequestAccess}
                    disabled={loading}
                    className="w-full rounded-xl gap-2 font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-md cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5" /> Request Access
                  </Button>
                )}

                {currentStatus === "pending" && (
                  <div className="flex items-center justify-between p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5" /> Request sent to sender. Waiting for approval...
                    </span>
                  </div>
                )}

                {currentStatus === "approved" && (
                  <Button
                    size="sm"
                    onClick={handleOpenMessage}
                    disabled={loading}
                    className="w-full rounded-xl gap-2 font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> Open & Read Protected Content
                  </Button>
                )}

                {currentStatus === "declined" && (
                  <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center gap-1.5">
                    <X className="w-3.5 h-3.5 text-rose-400" />
                    <span>Sender declined your access request.</span>
                  </div>
                )}

                {currentStatus === "revoked" && (
                  <div className="p-2 bg-neutral-800 border border-neutral-700 rounded-xl text-xs text-neutral-400">
                    Access was revoked by sender.
                  </div>
                )}
              </div>
            )}

            {/* Sender Actions */}
            {isMe && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowManageModal(true)}
                  className="rounded-xl text-xs font-semibold border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10 gap-1.5 cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5" /> Manage Access Grants
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sender Access Management Modal */}
      <Dialog open={showManageModal} onOpenChange={setShowManageModal}>
        <DialogContent className="sm:max-w-md bg-neutral-900 border-neutral-800 text-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400" /> Access Management
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Control which participants can unlock this protected message.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">Grant Permission Mode:</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "one_time", label: "One-Time Read" },
                  { id: "1h", label: "1 Hour Access" },
                  { id: "24h", label: "24 Hours Access" },
                  { id: "permanent", label: "Always Allowed" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedGrantType(opt.id as any)}
                    className={cn(
                      "p-2.5 rounded-xl border text-xs font-semibold transition-colors text-center cursor-pointer",
                      selectedGrantType === opt.id
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Requesters list */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-300">Active Requests & Grants:</label>
              {permissionGated.grantsSummary && permissionGated.grantsSummary.length > 0 ? (
                <div className="space-y-2">
                  {permissionGated.grantsSummary.map((g, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-neutral-800 rounded-2xl border border-neutral-700"
                    >
                      <div>
                        <p className="text-xs font-bold text-white">Recipient Access</p>
                        <p className="text-[11px] text-neutral-400">
                          Status: <span className="font-semibold text-indigo-300 uppercase">{g.status}</span>
                        </p>
                      </div>

                      <div className="flex gap-1.5">
                        {g.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleDecide(g.userId, "approved")}
                              className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                            >
                              Allow
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDecide(g.userId, "declined")}
                              className="h-8 text-xs text-rose-400 hover:bg-rose-500/10 rounded-xl"
                            >
                              Decline
                            </Button>
                          </>
                        )}
                        {g.status === "approved" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRevoke(g.userId)}
                            className="h-8 text-xs font-bold rounded-xl"
                          >
                            Revoke
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-400 p-3 bg-neutral-800/50 rounded-2xl border border-neutral-800 text-center">
                  No access requests received yet.
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setShowManageModal(false)} className="rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white">
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
