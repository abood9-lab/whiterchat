import { useState } from "react";
import { X, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onSelect: (sticker: string) => void;
  onClose: () => void;
}

const STICKER_PACKS = [
  {
    id: "vibes",
    name: "Vibes",
    stickers: [
      "🔥", "✨", "💯", "⚡", "🚀", "💎", "🌈", "👑", "🎯", "🔮",
      "🍀", "⭐", "💫", "🌟", "🪐", "🏆", "🥇", "🎨", "🎭", "🪄"
    ],
  },
  {
    id: "moods",
    name: "Moods",
    stickers: [
      "😎", "🤪", "🥳", "😴", "💀", "🫠", "🥹", "🤫", "🤯", "🤩",
      "🤓", "😇", "🤠", "🤖", "👻", "👾", "🥱", "🤤", "🤐", "🫣"
    ],
  },
  {
    id: "cute",
    name: "Cute",
    stickers: [
      "🐱", "🐶", "🐼", "🦊", "🐰", "🐨", "🦄", "🐸", "🌸", "🥑",
      "🍓", "🧸", "🐣", "🦋", "🌻", "🧋", "🍰", "🍩", "🧁", "🍄"
    ],
  },
  {
    id: "love",
    name: "Love",
    stickers: [
      "💖", "💘", "💌", "❤️‍🔥", "🫶", "💕", "💓", "💝", "🌹", "🍫",
      "😍", "🥰", "😘", "💐", "💍", "🕊️", "🫂", "✨", "💋", "❤️"
    ],
  },
  {
    id: "daily",
    name: "Daily",
    stickers: [
      "☕", "🍕", "🎧", "🎮", "🏖️", "✈️", "🎬", "🥂", "🎂", "🍿",
      "📚", "🏋️", "🚗", "💻", "🍔", "🌮", "🍦", "🌙", "☀️", "🌴"
    ],
  },
];

export function StickerPickerModal({ onSelect, onClose }: Props) {
  const [activePack, setActivePack] = useState(STICKER_PACKS[0].id);
  const [query, setQuery] = useState("");

  const currentPack = STICKER_PACKS.find(p => p.id === activePack) ?? STICKER_PACKS[0];

  const filteredStickers = query.trim()
    ? STICKER_PACKS.flatMap(p => p.stickers).filter(s => s.includes(query.trim()))
    : currentPack.stickers;

  return (
    <div className="p-3 bg-card border border-border rounded-2xl shadow-xl w-72 flex flex-col gap-2.5 select-none" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between pb-1 border-b border-border/70">
        <span className="text-xs font-bold text-foreground">Choose Sticker</span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search stickers…"
          className="w-full pl-8 pr-3 py-1 text-xs bg-secondary rounded-lg border border-transparent focus:outline-none focus:border-primary/40"
        />
      </div>

      {!query && (
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
          {STICKER_PACKS.map(pack => (
            <button
              key={pack.id}
              type="button"
              onClick={() => setActivePack(pack.id)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors",
                activePack === pack.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground"
              )}
            >
              {pack.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-5 gap-1.5 max-h-44 overflow-y-auto p-1 rounded-lg bg-secondary/20">
        {filteredStickers.map((sticker, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              onSelect(sticker);
              onClose();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-2xl hover:bg-secondary hover:scale-115 active:scale-95 transition-all"
          >
            {sticker}
          </button>
        ))}
      </div>
    </div>
  );
}
