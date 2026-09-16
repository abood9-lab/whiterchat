import { useState, useRef, useEffect } from "react";
import { X, Search, Sparkles, Heart, Smile, Flame, Star, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StickerItem {
  id: string;
  name: string;
  url: string;
  category: "trending" | "love" | "mood" | "reactions" | "fun";
}

// Built-in curated high-quality stickers
export const CURATED_STICKERS: StickerItem[] = [
  { id: "s1", name: "Fire Heart", category: "love", url: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=160&auto=format&fit=crop&q=80" },
  { id: "s2", name: "Sparkles Star", category: "trending", url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=160&auto=format&fit=crop&q=80" },
  { id: "s3", name: "Neon Vibes", category: "mood", url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=160&auto=format&fit=crop&q=80" },
  { id: "s4", name: "Happy Coffee", category: "fun", url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=160&auto=format&fit=crop&q=80" },
  { id: "s5", name: "Golden Crown", category: "reactions", url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=160&auto=format&fit=crop&q=80" },
  { id: "s6", name: "Thumbs Up Glow", category: "reactions", url: "https://images.unsplash.com/photo-1563089145-599997674d42?w=160&auto=format&fit=crop&q=80" },
  { id: "s7", name: "Cute Puppy", category: "fun", url: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=160&auto=format&fit=crop&q=80" },
  { id: "s8", name: "Sunset Cloud", category: "mood", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=160&auto=format&fit=crop&q=80" },
  { id: "s9", name: "Party Confetti", category: "trending", url: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=160&auto=format&fit=crop&q=80" },
  { id: "s10", name: "Pink Heart", category: "love", url: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=160&auto=format&fit=crop&q=80" },
  { id: "s11", name: "Victory Hand", category: "reactions", url: "https://images.unsplash.com/photo-1528716321680-815a8cdb8cbe?w=160&auto=format&fit=crop&q=80" },
  { id: "s12", name: "Cool Cat", category: "fun", url: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=160&auto=format&fit=crop&q=80" },
];

interface Props {
  onSelect: (stickerUrl: string) => void;
  onClose: () => void;
  align?: "left" | "right";
}

export function StickerPicker({ onSelect, onClose, align = "left" }: Props) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const filteredStickers = CURATED_STICKERS.filter((s) => {
    const matchCategory = activeCategory === "all" || s.category === activeCategory;
    const matchSearch = !search.trim() || s.name.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute bottom-full mb-2 w-[min(300px,calc(100vw-32px))] max-w-[calc(100vw-32px)] bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in-50 zoom-in-95",
        align === "right" ? "right-0" : "left-0"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold">Stickers</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-secondary text-muted-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stickers…"
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-secondary rounded-full border border-transparent focus:outline-none focus:border-primary/40"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border overflow-x-auto no-scrollbar shrink-0 text-[11px]">
        {[
          { id: "all", label: "All" },
          { id: "trending", label: "Trending" },
          { id: "love", label: "Love" },
          { id: "reactions", label: "Reactions" },
          { id: "fun", label: "Fun" },
          { id: "mood", label: "Mood" },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "px-2.5 py-1 rounded-full whitespace-nowrap transition-colors font-medium",
              activeCategory === cat.id
                ? "bg-primary text-primary-foreground font-semibold"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="h-52 overflow-y-auto p-2">
        {filteredStickers.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground">No stickers found</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {filteredStickers.map((sticker) => (
              <button
                key={sticker.id}
                onClick={() => {
                  onSelect(sticker.url);
                  onClose();
                }}
                className="group relative rounded-xl overflow-hidden aspect-square border border-border/50 hover:border-primary/50 hover:scale-105 transition-all bg-secondary/40 p-1 flex flex-col items-center justify-center active:scale-95"
              >
                <img
                  src={sticker.url}
                  alt={sticker.name}
                  className="w-full h-full object-cover rounded-lg shadow-sm"
                  loading="lazy"
                />
                <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] font-medium py-0.5 px-1 truncate text-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {sticker.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
