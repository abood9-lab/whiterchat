import { useState, useRef, useEffect } from "react";
import { Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

// High frequency quick reaction emojis
export const QUICK_REACTIONS = ["❤️", "🔥", "😂", "😮", "😢", "👏", "🎉", "👍", "😍", "💯", "🚀", "🙏"];

// Categorized emojis for expanded picker
export const EMOJI_CATEGORIES = [
  {
    name: "Smileys & Mood",
    emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🥲", "🥹", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥸", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😮‍💨", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🫣", "🤭", "🫢", "🫡", "🤫", "🫠", "🤥", "😶", "🫥", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "😵‍💫", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕"],
  },
  {
    name: "Gestures & People",
    emojis: ["👋", "🤚", "🖐️", "✋", "🖖", "🫱", "🫲", "🫳", "🫴", "👌", "🤌", "🤏", "✌️", "🤞", "🫰", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "🫶", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👅", "👄", "🫦"],
  },
  {
    name: "Hearts & Sparkles",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "✨", "🌟", "⭐", "💫", "💥", "🔥", "⚡", "🌈", "☀️", "🌙"],
  },
  {
    name: "Celebration & Fun",
    emojis: ["🎉", "🎊", "🎈", "🎂", "🎁", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️", "👑", "💎", "💯", "🎯", "🚀", "🛸", "🍿", "🍕", "🍔", "🍟", "🍦", "🍩", "🍪", "🍫", "🧁", "🍾", "🥂", "🍻", "☕", "🧋"],
  },
];

interface Props {
  currentReaction?: string | null;
  onSelect: (emoji: string) => void;
  onClose: () => void;
  align?: "left" | "right" | "center";
  position?: "top" | "bottom";
  className?: string;
}

export function PostReactionPicker({
  currentReaction,
  onSelect,
  onClose,
  align = "left",
  position = "top",
  className,
}: Props) {
  const [showFullPicker, setShowFullPicker] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [onClose]);

  const handlePick = (emoji: string) => {
    onSelect(emoji);
    onClose();
  };

  const filteredCategories = EMOJI_CATEGORIES.map((cat) => ({
    ...cat,
    emojis: search.trim() ? cat.emojis.filter(() => true) : cat.emojis,
  }));

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute z-50 select-none animate-in fade-in-0 zoom-in-95 duration-150",
        position === "top" ? "bottom-full mb-2" : "top-full mt-2",
        align === "right" ? "right-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0",
        className
      )}
    >
      {!showFullPicker ? (
        /* Quick Floating Bar with responsive horizontal scroll / fit */
        <div className="bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-full p-1.5 flex items-center gap-0.5 sm:gap-1 max-w-[calc(100vw-24px)] overflow-x-auto scrollbar-none">
          {QUICK_REACTIONS.map((emoji) => {
            const isSelected = currentReaction === emoji;
            return (
              <button
                key={emoji}
                onClick={() => handlePick(emoji)}
                className={cn(
                  "text-lg sm:text-2xl w-8 h-8 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center rounded-full transition-all duration-150 hover:scale-125 active:scale-95",
                  isSelected ? "bg-primary/15 ring-2 ring-primary scale-105" : "hover:bg-secondary"
                )}
                title={emoji}
              >
                {emoji}
              </button>
            );
          })}

          <div className="w-[1px] h-5 bg-border mx-0.5 shrink-0" />

          {/* Expand Button */}
          <button
            onClick={() => setShowFullPicker(true)}
            className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center rounded-full bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all hover:scale-110 active:scale-95"
            title="More emojis"
          >
            <Plus className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          </button>
        </div>
      ) : (
        /* Expanded Full Emoji Picker */
        <div className="w-[min(320px,calc(100vw-24px))] bg-card border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
            <span className="text-xs font-bold">Choose a reaction</span>
            <button
              onClick={() => setShowFullPicker(false)}
              className="p-1 rounded-full hover:bg-secondary text-muted-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search emoji…"
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-secondary rounded-full border border-transparent focus:outline-none focus:border-primary/40"
              />
            </div>
          </div>

          {/* Emoji Grid Scroll */}
          <div className="h-60 overflow-y-auto p-2.5 space-y-3">
            {filteredCategories.map((cat) => (
              <div key={cat.name}>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
                  {cat.name}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {cat.emojis.map((emoji, idx) => (
                    <button
                      key={`${emoji}-${idx}`}
                      onClick={() => handlePick(emoji)}
                      className={cn(
                        "text-xl h-8 flex items-center justify-center rounded-lg hover:scale-125 transition-transform hover:bg-secondary active:scale-95",
                        currentReaction === emoji && "bg-primary/20 ring-1 ring-primary"
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
