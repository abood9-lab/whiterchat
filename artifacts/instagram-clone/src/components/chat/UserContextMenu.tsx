import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User, MessageSquare, VolumeX, ShieldAlert, Flag, Copy, Trash2, ExternalLink,
} from "lucide-react";
import { useLocation } from "wouter";

export interface UserMenuTarget {
  userId: string;
  username: string;
  fullName?: string;
  avatarUrl?: string;
  conversationId?: string;
  isMuted?: boolean;
}

interface UserContextMenuProps {
  target: UserMenuTarget | null;
  open: boolean;
  onClose: () => void;
  onMuteToggle?: (target: UserMenuTarget) => void;
  onBlock?: (target: UserMenuTarget) => void;
  onReport?: (target: UserMenuTarget) => void;
  onDeleteConversation?: (target: UserMenuTarget) => void;
}

export function UserContextMenu({
  target,
  open,
  onClose,
  onMuteToggle,
  onBlock,
  onReport,
  onDeleteConversation,
}: UserContextMenuProps) {
  const [, setLocation] = useLocation();

  if (!target) return null;

  const handleProfile = () => {
    setLocation(`/profile/${target.username}`);
    onClose();
  };

  const handleMessage = () => {
    if (target.conversationId) {
      setLocation(`/messages?id=${target.conversationId}`);
    } else {
      setLocation(`/messages?new=${target.username}`);
    }
    onClose();
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/profile/${target.username}`;
    navigator.clipboard.writeText(url);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="bg-neutral-900 border-neutral-800 text-white rounded-t-3xl p-6">
        <SheetHeader className="pb-4 border-b border-neutral-800 flex flex-row items-center gap-3">
          <Avatar className="w-12 h-12 border border-white/20">
            <AvatarImage src={target.avatarUrl} />
            <AvatarFallback className="bg-primary/20 text-primary font-bold">
              {target.username[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="text-left">
            <SheetTitle className="text-base font-bold text-white leading-snug">
              {target.fullName || target.username}
            </SheetTitle>
            <p className="text-xs text-neutral-400">@{target.username}</p>
          </div>
        </SheetHeader>

        <div className="py-4 space-y-1">
          <button
            onClick={handleProfile}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-neutral-800 text-sm font-semibold transition-colors text-white"
          >
            <User className="w-5 h-5 text-neutral-400" /> View Profile
          </button>

          <button
            onClick={handleMessage}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-neutral-800 text-sm font-semibold transition-colors text-white"
          >
            <MessageSquare className="w-5 h-5 text-neutral-400" /> Send Message
          </button>

          <button
            onClick={handleCopyLink}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-neutral-800 text-sm font-semibold transition-colors text-white"
          >
            <Copy className="w-5 h-5 text-neutral-400" /> Copy Profile Link
          </button>

          {onMuteToggle && (
            <button
              onClick={() => {
                onMuteToggle(target);
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-neutral-800 text-sm font-semibold transition-colors text-white"
            >
              <VolumeX className="w-5 h-5 text-neutral-400" />{" "}
              {target.isMuted ? "Unmute Notifications" : "Mute Notifications"}
            </button>
          )}

          {onReport && (
            <button
              onClick={() => {
                onReport(target);
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-neutral-800 text-sm font-semibold transition-colors text-amber-400"
            >
              <Flag className="w-5 h-5 text-amber-400" /> Report User
            </button>
          )}

          {onBlock && (
            <button
              onClick={() => {
                onBlock(target);
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-neutral-800 text-sm font-semibold transition-colors text-red-400"
            >
              <ShieldAlert className="w-5 h-5 text-red-400" /> Block User
            </button>
          )}

          {onDeleteConversation && target.conversationId && (
            <button
              onClick={() => {
                onDeleteConversation(target);
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-neutral-800 text-sm font-semibold transition-colors text-red-500"
            >
              <Trash2 className="w-5 h-5 text-red-500" /> Delete Chat
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
