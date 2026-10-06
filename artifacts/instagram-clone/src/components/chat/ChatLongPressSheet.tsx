import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  VolumeX,
  Volume2,
  ShieldAlert,
  Lock,
  Archive,
  Users,
  Trash2,
  Mail,
  MailOpen,
  Eraser,
  Pin,
} from "lucide-react";

export interface ChatTarget {
  id: string;
  name: string;
  username?: string;
  avatarUrl?: string;
  isGroup?: boolean;
  isMuted?: boolean;
  isArchived?: boolean;
  isPinned?: boolean;
  unreadCount?: number;
  otherUserId?: string;
}

interface ChatLongPressSheetProps {
  target: ChatTarget | null;
  open: boolean;
  onClose: () => void;
  onPinToggle?: (target: ChatTarget) => void;
  onMuteToggle: (target: ChatTarget) => void;
  onBlock: (target: ChatTarget) => void;
  onHideSecretVault: (target: ChatTarget) => void;
  onArchiveToggle: (target: ChatTarget) => void;
  onMarkReadToggle?: (target: ChatTarget) => void;
  onClearMessages?: (target: ChatTarget) => void;
  onDeleteChat?: (target: ChatTarget) => void;
}

export function ChatLongPressSheet({
  target,
  open,
  onClose,
  onPinToggle,
  onMuteToggle,
  onBlock,
  onHideSecretVault,
  onArchiveToggle,
  onMarkReadToggle,
  onClearMessages,
  onDeleteChat,
}: ChatLongPressSheetProps) {
  if (!target) return null;

  const isUnread = (target.unreadCount ?? 0) > 0;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="bg-neutral-900 border-neutral-800 text-white rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <SheetHeader className="pb-4 border-b border-neutral-800 flex flex-row items-center gap-3">
          {target.isGroup ? (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shrink-0 overflow-hidden">
              {target.avatarUrl ? (
                <img src={target.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <Users className="w-6 h-6 text-white" />
              )}
            </div>
          ) : (
            <Avatar className="w-12 h-12 border border-white/20">
              <AvatarImage src={target.avatarUrl} />
              <AvatarFallback className="bg-primary/20 text-primary font-bold">
                {target.name[0]?.toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
          )}

          <div className="text-left">
            <SheetTitle className="text-base font-bold text-white leading-snug">
              {target.name}
            </SheetTitle>
            {target.username && (
              <p className="text-xs text-neutral-400">@{target.username}</p>
            )}
          </div>
        </SheetHeader>

        {/* Options List */}
        <div className="py-4 space-y-1.5">
          {/* Pin / Unpin */}
          {onPinToggle && (
            <button
              onClick={() => {
                onPinToggle(target);
                onClose();
              }}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl hover:bg-neutral-800 text-sm font-semibold transition-colors text-white cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Pin className="w-5 h-5 text-amber-400" />
                <span>{target.isPinned ? "Unpin Conversation" : "Pin Conversation to Top"}</span>
              </div>
              <span className="text-xs text-amber-400/80">{target.isPinned ? "Pinned" : "Pin"}</span>
            </button>
          )}

          {/* Mark as Unread / Read */}
          {onMarkReadToggle && (
            <button
              onClick={() => {
                onMarkReadToggle(target);
                onClose();
              }}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl hover:bg-neutral-800 text-sm font-semibold transition-colors text-white cursor-pointer"
            >
              <div className="flex items-center gap-3">
                {isUnread ? (
                  <MailOpen className="w-5 h-5 text-blue-400" />
                ) : (
                  <Mail className="w-5 h-5 text-blue-400" />
                )}
                <span>{isUnread ? "Mark as Read" : "Mark as Unread"}</span>
              </div>
              <span className="text-xs text-blue-400/80">{isUnread ? "Read" : "Unread"}</span>
            </button>
          )}

          {/* Mute */}
          <button
            onClick={() => {
              onMuteToggle(target);
              onClose();
            }}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl hover:bg-neutral-800 text-sm font-semibold transition-colors text-white cursor-pointer"
          >
            <div className="flex items-center gap-3">
              {target.isMuted ? (
                <Volume2 className="w-5 h-5 text-amber-400" />
              ) : (
                <VolumeX className="w-5 h-5 text-neutral-400" />
              )}
              <span>{target.isMuted ? "Unmute Notifications" : "Mute Notifications"}</span>
            </div>
            <span className="text-xs text-neutral-400">Mute</span>
          </button>

          {/* Hide in Secret Vault */}
          <button
            onClick={() => {
              onHideSecretVault(target);
              onClose();
            }}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl hover:bg-neutral-800 text-sm font-semibold transition-colors text-cyan-400 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-cyan-400" />
              <span>Hide in Secret Vault</span>
            </div>
            <span className="text-xs text-cyan-400/80">Vault</span>
          </button>

          {/* Archive */}
          <button
            onClick={() => {
              onArchiveToggle(target);
              onClose();
            }}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl hover:bg-neutral-800 text-sm font-semibold transition-colors text-white cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Archive className="w-5 h-5 text-neutral-400" />
              <span>{target.isArchived ? "Unarchive Chat" : "Archive Chat"}</span>
            </div>
            <span className="text-xs text-neutral-400">Archive</span>
          </button>

          {/* Block */}
          {!target.isGroup && (
            <button
              onClick={() => {
                onBlock(target);
                onClose();
              }}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl hover:bg-neutral-800 text-sm font-semibold transition-colors text-amber-400 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <span>Block User</span>
              </div>
              <span className="text-xs text-amber-400/80">Block</span>
            </button>
          )}

          {/* Clear Messages */}
          {onClearMessages && (
            <button
              onClick={() => {
                onClearMessages(target);
                onClose();
              }}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl hover:bg-neutral-800 text-sm font-semibold transition-colors text-rose-300 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Eraser className="w-5 h-5 text-rose-400" />
                <span>Clear Chat History</span>
              </div>
              <span className="text-xs text-rose-400/80">Clear</span>
            </button>
          )}

          {/* Delete Entire Conversation */}
          {onDeleteChat && (
            <button
              onClick={() => {
                onDeleteChat(target);
                onClose();
              }}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl hover:bg-red-500/10 text-sm font-semibold transition-colors text-red-400 border border-red-500/20 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-red-500" />
                <span className="font-bold">Delete Entire Chat</span>
              </div>
              <span className="text-xs text-red-400 font-bold">Delete</span>
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
