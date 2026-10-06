import { useState } from "react";
import { Globe, Users, EyeOff, Search, Check, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface GroupMember {
  id: string;
  username: string;
  fullName?: string;
  avatarUrl?: string;
}

export interface SelectiveVisibilityConfig {
  mode: "all" | "allow_list" | "deny_list";
  allowedUserIds?: string[];
  deniedUserIds?: string[];
  isSilent?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  members: GroupMember[];
  myId: string;
  currentConfig?: SelectiveVisibilityConfig | null;
  onApply: (config: SelectiveVisibilityConfig) => void;
}

export function SelectiveVisibilityModal({
  open,
  onClose,
  members,
  myId,
  currentConfig,
  onApply,
}: Props) {
  const otherMembers = members.filter((m) => m.id !== myId);
  const [mode, setMode] = useState<"all" | "allow_list" | "deny_list">(
    currentConfig?.mode || "all"
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(
    currentConfig?.mode === "allow_list"
      ? currentConfig.allowedUserIds || []
      : currentConfig?.mode === "deny_list"
      ? currentConfig.deniedUserIds || []
      : []
  );
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMembers = otherMembers.filter((m) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      m.username.toLowerCase().includes(q) ||
      (m.fullName && m.fullName.toLowerCase().includes(q))
    );
  });

  const handleToggleMember = (userId: string) => {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(otherMembers.map((m) => m.id));
  };

  const handleClear = () => {
    setSelectedIds([]);
  };

  const handleApply = () => {
    if (mode === "all") {
      onApply({ mode: "all" });
    } else if (mode === "allow_list") {
      onApply({
        mode: "allow_list",
        allowedUserIds: selectedIds,
        isSilent: true,
      });
    } else if (mode === "deny_list") {
      onApply({
        mode: "deny_list",
        deniedUserIds: selectedIds,
        isSilent: true,
      });
    }
    onClose();
  };

  const visibleCount =
    mode === "all"
      ? otherMembers.length
      : mode === "allow_list"
      ? selectedIds.length
      : Math.max(0, otherMembers.length - selectedIds.length);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md bg-neutral-900 border-neutral-800 text-white rounded-3xl p-6 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-white">
            <Shield className="w-5 h-5 text-indigo-400" /> Message Visibility
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-400">
            Control which members in this group can see your message. Excluded members receive nothing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Mode Selector */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "all", label: "Everyone", icon: Globe, desc: "All members" },
              { id: "allow_list", label: "Selected", icon: Users, desc: "Only chosen" },
              { id: "deny_list", label: "Hide From", icon: EyeOff, desc: "Exclude some" },
            ].map((item) => {
              const Icon = item.icon;
              const active = mode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMode(item.id as any)}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer",
                    active
                      ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold shadow-sm"
                      : "bg-neutral-800/60 border-neutral-700 hover:bg-neutral-800 text-neutral-300"
                  )}
                >
                  <Icon className={cn("w-4 h-4 mb-1", active ? "text-indigo-400" : "text-neutral-400")} />
                  <span className="text-xs">{item.label}</span>
                  <span className="text-[10px] text-neutral-400 font-normal">{item.desc}</span>
                </button>
              );
            })}
          </div>

          {/* Member List (for allow_list or deny_list) */}
          {mode !== "all" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-300">
                  {mode === "allow_list" ? "Select Allowed Recipients:" : "Select Members to Hide From:"}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-[11px] text-indigo-400 hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-neutral-600">•</span>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-[11px] text-neutral-400 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search group members..."
                  className="bg-neutral-800 border-neutral-700 text-white rounded-xl h-9 pl-9 text-xs"
                />
              </div>

              {/* Members Scroll List */}
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {filteredMembers.map((m) => {
                  const isSelected = selectedIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleToggleMember(m.id)}
                      className={cn(
                        "w-full flex items-center justify-between p-2 rounded-xl transition-colors text-left cursor-pointer",
                        isSelected ? "bg-neutral-800 text-white" : "hover:bg-neutral-800/60 text-neutral-300"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="w-7 h-7 border border-neutral-700">
                          <AvatarImage src={m.avatarUrl} />
                          <AvatarFallback className="text-[10px] bg-neutral-700 font-bold">
                            {m.username[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xs font-semibold leading-tight">{m.fullName || m.username}</p>
                          <p className="text-[10px] text-neutral-400">@{m.username}</p>
                        </div>
                      </div>

                      <div
                        className={cn(
                          "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                          isSelected
                            ? "bg-indigo-600 border-indigo-500 text-white"
                            : "border-neutral-600 bg-neutral-800"
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary Indicator */}
          <div className="p-3 bg-neutral-800/80 rounded-2xl border border-neutral-700 flex items-center justify-between text-xs">
            <span className="text-neutral-300 font-medium">Message Audience:</span>
            <span className="font-bold text-indigo-400">
              {mode === "all"
                ? "All group members"
                : `Visible to ${visibleCount} of ${otherMembers.length} members`}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
            <Button variant="ghost" onClick={onClose} className="rounded-2xl text-neutral-400">
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              className="rounded-2xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-6 shadow-md cursor-pointer"
            >
              Apply Visibility
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
