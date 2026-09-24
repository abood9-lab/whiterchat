import { useState, useEffect, useCallback, useRef } from "react";
import { X, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Use env-provided key or the Giphy public beta key for development
const GIPHY_KEY = (import.meta as any).env?.VITE_GIPHY_API_KEY || "dc6zaTOxFJmzC";
const GIPHY_BASE = "https://api.giphy.com/v1/gifs";

interface GifImage {
  url:  string;
  webp?: string;
}
interface GifResult {
  id: string;
  title: string;
  images: {
    fixed_width_small: GifImage;
    fixed_width:       GifImage;
    original:          GifImage;
  };
}

interface Props {
  onSelect: (gifUrl: string) => void;
  onClose:  () => void;
  align?:   "left" | "right";
}

export function GifPicker({ onSelect, onClose, align = "left" }: Props) {
  const [query, setQuery]   = useState("");
  const [gifs, setGifs]     = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchGifs = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const endpoint = q.trim()
        ? `/api/gifs/search?q=${encodeURIComponent(q)}`
        : `/api/gifs/trending`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Giphy error");
      const data = (await res.json()) as { data: GifResult[] };
      setGifs(data.data ?? []);
    } catch {
      setGifs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load trending on mount
  useEffect(() => { fetchGifs(""); }, [fetchGifs]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => fetchGifs(query), 400);
    return () => clearTimeout(timer);
  }, [query, fetchGifs]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute bottom-full mb-2 w-[min(300px,calc(100vw-32px))] max-w-[calc(100vw-32px)] bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col",
        align === "right" ? "right-0" : "left-0"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-sm font-bold">GIFs</span>
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
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search GIFs…"
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-secondary rounded-full border border-transparent focus:outline-none focus:border-primary/40"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="h-52 overflow-y-auto overscroll-contain">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : gifs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground">No GIFs found</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 p-1.5">
            {gifs.map(gif => (
              <button
                key={gif.id}
                onClick={() => { onSelect(gif.images.original.url); onClose(); }}
                className="rounded-lg overflow-hidden aspect-square hover:ring-2 hover:ring-primary transition-all active:scale-95 bg-secondary"
              >
                <img
                  src={gif.images.fixed_width_small?.webp || gif.images.fixed_width_small?.url}
                  alt={gif.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-border flex items-center justify-end shrink-0">
        <span className="text-[10px] text-muted-foreground/60">Powered by GIPHY</span>
      </div>
    </div>
  );
}
