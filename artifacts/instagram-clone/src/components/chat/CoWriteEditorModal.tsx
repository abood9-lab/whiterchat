import { useState, useEffect, useRef, useCallback } from "react";
import { Users, Send, Check, X, Edit3, Lock, Clock, AlertCircle, Sparkles, MessageSquare, CornerDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { apiUrl, getAuthToken } from "@/lib/api-url";
import { useAuth } from "@/lib/auth";
import type { Socket } from "socket.io-client";

interface Participant {
  id: string;
  username: string;
  fullName?: string;
  avatarUrl?: string;
}

interface Approval {
  userId: string;
  status: "pending" | "approved" | "rejected";
  reason?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  draftId: string | null;
  conversationId: string;
  socket?: Socket | null;
  groupMembers?: { id: string; username: string; fullName?: string; avatarUrl?: string }[];
  isGroup?: boolean;
  onDraftSent?: () => void;
}

const PARTICIPANT_COLORS = [
  "border-violet-500 text-violet-400 bg-violet-500/15",
  "border-sky-500 text-sky-400 bg-sky-500/15",
  "border-emerald-500 text-emerald-400 bg-emerald-500/15",
  "border-amber-500 text-amber-400 bg-amber-500/15",
  "border-pink-500 text-pink-400 bg-pink-500/15",
  "border-rose-500 text-rose-400 bg-rose-500/15",
];

export function CoWriteEditorModal({
  open,
  onClose,
  draftId: initialDraftId,
  conversationId,
  socket,
  groupMembers = [],
  isGroup = false,
  onDraftSent,
}: Props) {
  const { user } = useAuth();
  const [draftId, setDraftId] = useState<string | null>(initialDraftId);
  const [content, setContent] = useState("");
  const [version, setVersion] = useState(1);
  const [status, setStatus] = useState<"drafting" | "review" | "locked" | "sent" | "cancelled" | "expired">("drafting");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [activeEditors, setActiveEditors] = useState<Record<string, { username: string; isTyping: boolean }>>({});
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState<string[]>([]);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Sync draft ID prop
  useEffect(() => {
    setDraftId(initialDraftId);
  }, [initialDraftId]);

  // Load or initialize draft
  const fetchDraft = useCallback(async (id: string) => {
    try {
      const token = getAuthToken();
      const resp = await fetch(apiUrl(`/api/co-write/${id}`), {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (resp.ok) {
        const data = await resp.json();
        setContent(data.content || "");
        setVersion(data.version || 1);
        setStatus(data.status || "drafting");
        setParticipants(data.participants || []);
        setApprovals(data.approvals || []);
      }
    } catch {
      // silently handle
    }
  }, []);

  useEffect(() => {
    if (open && draftId) {
      fetchDraft(draftId);
    }
  }, [open, draftId, fetchDraft]);

  // Socket event listeners for real-time collaborative sync
  useEffect(() => {
    if (!socket || !draftId || !open) return;

    socket.emit("co_write_join", {
      draftId,
      user: {
        id: user?.id,
        username: user?.username,
        avatarUrl: user?.avatarUrl,
      },
    });

    const onOperation = (data: any) => {
      if (data.draftId === draftId) {
        if (data.userId !== user?.id) {
          setContent(data.content);
          setVersion(data.version);
        }
      }
    };

    const onReview = (data: any) => {
      if (data.draftId === draftId) {
        setStatus("review");
        if (data.content !== undefined) setContent(data.content);
        if (data.approvals) setApprovals(data.approvals);
      }
    };

    const onDecision = (data: any) => {
      if (data.draftId === draftId) {
        setStatus(data.status);
        if (data.approvals) setApprovals(data.approvals);
        if (data.decision === "rejected") {
          setErrorMsg(`${data.userId === user?.id ? "You" : "A collaborator"} requested changes.`);
        }
      }
    };

    const onSent = (data: any) => {
      if (data.draftId === draftId) {
        setStatus("sent");
        if (onDraftSent) onDraftSent();
        setTimeout(() => onClose(), 1200);
      }
    };

    const onPeerTyping = (data: any) => {
      if (data.draftId === draftId && data.userId !== user?.id) {
        setActiveEditors((prev) => ({
          ...prev,
          [data.userId]: { username: data.username || "Collaborator", isTyping: data.isTyping },
        }));
      }
    };

    socket.on("co_write_operation", onOperation);
    socket.on("co_write_review", onReview);
    socket.on("co_write_decision", onDecision);
    socket.on("co_write_sent", onSent);
    socket.on("co_write_peer_typing", onPeerTyping);

    return () => {
      socket.emit("co_write_leave", { draftId });
      socket.off("co_write_operation", onOperation);
      socket.off("co_write_review", onReview);
      socket.off("co_write_decision", onDecision);
      socket.off("co_write_sent", onSent);
      socket.off("co_write_peer_typing", onPeerTyping);
    };
  }, [socket, draftId, open, user?.id, user?.username, user?.avatarUrl, onClose, onDraftSent]);

  // Create draft if opened without an ID
  const handleCreateDraft = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const token = getAuthToken();
      const resp = await fetch(apiUrl(`/api/conversations/${conversationId}/co-write`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          participantIds: isGroup ? selectedGroupMemberIds : undefined,
          initialContent: content,
        }),
      });

      if (resp.ok) {
        const newDraft = await resp.json();
        setDraftId(newDraft._id);
        fetchDraft(newDraft._id);
      } else {
        const err = await resp.json();
        setErrorMsg(err.error || "Failed to start collaborative draft");
      }
    } catch {
      setErrorMsg("Network error.");
    } finally {
      setLoading(false);
    }
  };

  // Broadcast text changes
  const handleContentChange = (newVal: string) => {
    setContent(newVal);
    if (!draftId) return;

    if (socket) {
      socket.emit("co_write_typing", { draftId, isTyping: true });
    }

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const token = getAuthToken();
        await fetch(apiUrl(`/api/co-write/${draftId}/op`), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ content: newVal }),
        });
        if (socket) {
          socket.emit("co_write_typing", { draftId, isTyping: false });
        }
      } catch {
        // error handling
      }
    }, 250);
  };

  // Submit for review
  const handleSubmitForReview = async () => {
    if (!draftId || !content.trim()) return;
    setLoading(true);
    try {
      const token = getAuthToken();
      const resp = await fetch(apiUrl(`/api/co-write/${draftId}/review`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (resp.ok) {
        const data = await resp.json();
        setStatus("review");
        if (data.approvals) setApprovals(data.approvals);
      }
    } catch {
      // error
    } finally {
      setLoading(false);
    }
  };

  // Approve or reject
  const handleDecision = async (decision: "approved" | "rejected") => {
    if (!draftId) return;
    setLoading(true);
    try {
      const token = getAuthToken();
      const resp = await fetch(apiUrl(`/api/co-write/${draftId}/decide`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ decision, reason: rejectReason || null }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setStatus(data.status);
        setShowRejectInput(false);
      }
    } catch {
      // error
    } finally {
      setLoading(false);
    }
  };

  // Send the approved message into chat
  const handleSendMessage = async () => {
    if (!draftId) return;
    setLoading(true);
    try {
      const token = getAuthToken();
      const resp = await fetch(apiUrl(`/api/co-write/${draftId}/send`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (resp.ok) {
        setStatus("sent");
        if (onDraftSent) onDraftSent();
        setTimeout(() => onClose(), 800);
      } else {
        const err = await resp.json();
        setErrorMsg(err.error || "Cannot send message until all participants approve");
      }
    } catch {
      setErrorMsg("Network error.");
    } finally {
      setLoading(false);
    }
  };

  const isAllApproved = approvals.length > 0 && approvals.every((a) => a.status === "approved");
  const myApproval = approvals.find((a) => a.userId === user?.id);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl bg-neutral-900 border-neutral-800 text-white rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
            <Users className="w-5 h-5 text-violet-400" /> Collaborative Message
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-400">
            Write together in real time. Everyone must approve before the message is sent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* If creating new draft in group, participant selector */}
          {!draftId && isGroup && (
            <div className="space-y-2 p-3 bg-neutral-800/80 rounded-2xl border border-neutral-700">
              <p className="text-xs font-semibold text-neutral-200">Invite Collaborators from Group:</p>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {groupMembers
                  .filter((m) => m.id !== user?.id)
                  .map((m) => {
                    const isSelected = selectedGroupMemberIds.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedGroupMemberIds((prev) =>
                            isSelected ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                          );
                        }}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer",
                          isSelected
                            ? "bg-violet-600 border-violet-500 text-white"
                            : "bg-neutral-700/60 border-neutral-600 text-neutral-300 hover:bg-neutral-700"
                        )}
                      >
                        <span>@{m.username}</span>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Active Collaborators Bar */}
          {draftId && participants.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-neutral-800/70 border border-neutral-700 rounded-2xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  Authors:
                </span>
                <div className="flex -space-x-2">
                  {participants.map((p, idx) => (
                    <Avatar
                      key={p.id}
                      className={cn(
                        "w-7 h-7 border-2",
                        PARTICIPANT_COLORS[idx % PARTICIPANT_COLORS.length].split(" ")[0]
                      )}
                    >
                      <AvatarImage src={p.avatarUrl} />
                      <AvatarFallback className="text-[10px] font-bold bg-neutral-700">
                        {p.username[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border",
                    status === "drafting"
                      ? "bg-violet-500/20 text-violet-300 border-violet-500/30"
                      : status === "review"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse"
                      : status === "sent"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : "bg-secondary text-muted-foreground border-border"
                  )}
                >
                  {status === "drafting" ? "Live Editing" : status === "review" ? "Under Review" : status}
                </span>
              </div>
            </div>
          )}

          {/* Typing Indicator */}
          {Object.values(activeEditors).some((e) => e.isTyping) && (
            <div className="flex items-center gap-1.5 text-xs text-violet-400 animate-pulse px-1">
              <Edit3 className="w-3.5 h-3.5" />
              <span>
                {Object.values(activeEditors)
                  .filter((e) => e.isTyping)
                  .map((e) => e.username)
                  .join(", ")}{" "}
                is typing...
              </span>
            </div>
          )}

          {/* Live Text Area */}
          <div className="space-y-1.5">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              disabled={status === "review" || status === "sent"}
              placeholder={draftId ? "Write your collaborative message together..." : "Type starting text..."}
              className={cn(
                "bg-neutral-800 border-neutral-700 text-white rounded-2xl min-h-[140px] text-sm leading-relaxed",
                status === "review" && "opacity-80 bg-neutral-800/60"
              )}
            />
          </div>

          {/* Review & Approval Panel */}
          {status === "review" && (
            <div className="p-4 bg-gradient-to-br from-amber-950/30 via-neutral-900 to-violet-950/30 border border-amber-500/30 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <Clock className="w-4 h-4" />
                  <span>Unanimous Approval Required</span>
                </div>
                <span className="text-[11px] text-neutral-400">
                  {approvals.filter((a) => a.status === "approved").length} of {approvals.length} approved
                </span>
              </div>

              {/* Approval status for each user */}
              <div className="grid grid-cols-2 gap-2">
                {approvals.map((a) => {
                  const part = participants.find((p) => p.id === a.userId);
                  const isApproved = a.status === "approved";
                  const isRejected = a.status === "rejected";
                  return (
                    <div
                      key={a.userId}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-xl border text-xs",
                        isApproved
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-semibold"
                          : isRejected
                          ? "bg-rose-500/10 border-rose-500/30 text-rose-300 font-semibold"
                          : "bg-neutral-800 border-neutral-700 text-neutral-300"
                      )}
                    >
                      <span>@{part?.username || "Collaborator"}</span>
                      {isApproved && <Check className="w-4 h-4 text-emerald-400" />}
                      {isRejected && <X className="w-4 h-4 text-rose-400" />}
                      {!isApproved && !isRejected && <span className="text-[10px] text-neutral-400">Pending</span>}
                    </div>
                  );
                })}
              </div>

              {/* My action buttons if I haven't decided yet */}
              {myApproval && myApproval.status !== "approved" && (
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => handleDecision("approved")}
                    disabled={loading}
                    className="flex-1 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-md"
                  >
                    <Check className="w-4 h-4" /> Approve Message
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowRejectInput(true)}
                    className="rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 gap-1"
                  >
                    <X className="w-4 h-4" /> Request Changes
                  </Button>
                </div>
              )}

              {showRejectInput && (
                <div className="space-y-2 pt-2 border-t border-neutral-800">
                  <Input
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Reason for change (e.g. Fix the last sentence)..."
                    className="bg-neutral-800 border-neutral-700 text-white rounded-xl h-9 text-xs"
                  />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setShowRejectInput(false)} className="h-7 text-xs">
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDecision("rejected")}
                      className="h-7 text-xs font-bold rounded-xl"
                    >
                      Submit Rejection
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold p-2 bg-rose-500/10 rounded-xl">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex justify-between items-center pt-3 border-t border-neutral-800">
            <Button variant="ghost" onClick={onClose} className="rounded-2xl text-neutral-400">
              Close
            </Button>

            <div className="flex gap-2">
              {!draftId ? (
                <Button
                  onClick={handleCreateDraft}
                  disabled={loading || !content.trim()}
                  className="rounded-2xl font-bold bg-violet-600 hover:bg-violet-700 text-white px-6 shadow-md"
                >
                  Start Co-Writing ✍️
                </Button>
              ) : status === "drafting" ? (
                <Button
                  onClick={handleSubmitForReview}
                  disabled={loading || !content.trim()}
                  className="rounded-2xl font-bold bg-violet-600 hover:bg-violet-700 text-white px-6 gap-1.5 shadow-md cursor-pointer"
                >
                  <Check className="w-4 h-4" /> Review & Send
                </Button>
              ) : isAllApproved ? (
                <Button
                  onClick={handleSendMessage}
                  disabled={loading}
                  className="rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-6 gap-1.5 shadow-lg animate-bounce cursor-pointer"
                >
                  <Send className="w-4 h-4" /> Send Collaborative Message 👥
                </Button>
              ) : (
                <Button disabled className="rounded-2xl font-semibold bg-neutral-800 text-neutral-500 px-5">
                  Waiting for All Approvals...
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
