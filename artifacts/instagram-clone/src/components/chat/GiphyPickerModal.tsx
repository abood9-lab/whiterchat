import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Sparkles, Smile, Flame } from "lucide-react";
import { apiUrl } from "@/lib/api-url";
import { cn } from "@/lib/utils";

interface GiphyPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelectGif: (payload: { gifId: string; url: string; previewUrl: string; title: string }) => void;
  onSelectSticker: (payload: { stickerId: string; url: string; previewUrl: string; title: string }) => void;
}

export function GiphyPickerModal({ open, onClose, onSelectGif, onSelectSticker }: GiphyPickerModalProps) {
  const [activeTab, setActiveTab] = useState<"gifs" | "stickers">("gifs");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    const fetchGiphy = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("whiterchat_token") ?? "";
        const endpoint =
          activeTab === "gifs"
            ? query
              ? `/api/gifs/search?q=${encodeURIComponent(query)}`
              : `/api/gifs/trending`
            : query
              ? `/api/gifs/stickers/search?q=${encodeURIComponent(query)}`
              : `/api/gifs/stickers/trending`;

        const res = await fetch(apiUrl(endpoint), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.data) {
          setItems(data.data);
        }
      } catch (err) {
        console.error("Giphy fetch error", err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchGiphy, query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [open, activeTab, query]);

  const handleSelect = (item: any) => {
    const url = item.images?.original?.url || item.images?.fixed_width?.url;
    const previewUrl = item.images?.fixed_width_small?.url || item.images?.fixed_width?.url || url;
    const title = item.title || "GIF";

    if (activeTab === "gifs") {
      onSelectGif({ gifId: String(item.id), url, previewUrl, title });
    } else {
      onSelectSticker({ stickerId: String(item.id), url, previewUrl, title });
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md bg-neutral-900 border-neutral-800 text-white p-0 overflow-hidden rounded-3xl">
        <DialogHeader className="p-4 pb-2 border-b border-neutral-800 flex flex-row items-center justify-between">
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-primary">
            <Sparkles className="w-5 h-5 text-pink-500 fill-pink-500" /> GIPHY & Stickers
          </DialogTitle>
        </DialogHeader>

        {/* Tab Switcher */}
        <div className="flex border-b border-neutral-800 bg-neutral-950 px-4">
          <button
            onClick={() => setActiveTab("gifs")}
            className={cn(
              "flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1.5",
              activeTab === "gifs"
                ? "border-pink-500 text-pink-500"
                : "border-transparent text-neutral-400 hover:text-white"
            )}
          >
            <Flame className="w-4 h-4" /> GIFs
          </button>
          <button
            onClick={() => setActiveTab("stickers")}
            className={cn(
              "flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1.5",
              activeTab === "stickers"
                ? "border-pink-500 text-pink-500"
                : "border-transparent text-neutral-400 hover:text-white"
            )}
          >
            <Smile className="w-4 h-4" /> Stickers
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${activeTab === "gifs" ? "GIFs" : "Stickers"}...`}
              className="pl-9 bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-400 rounded-xl"
            />
          </div>
        </div>

        {/* Grid View */}
        <div className="max-h-80 overflow-y-auto p-4 pt-0">
          {loading ? (
            <div className="py-8 text-center text-sm text-neutral-400 animate-pulse">
              Loading {activeTab}...
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-sm text-neutral-400">
              No results found.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {items.map((item) => {
                const imgUrl = item.images?.fixed_width_small?.url || item.images?.fixed_width?.url;
                return (
                  <button
                    key={item.id || Math.random()}
                    onClick={() => handleSelect(item)}
                    className="relative aspect-square overflow-hidden rounded-xl bg-neutral-950 border border-neutral-800 hover:scale-105 transition-transform group"
                  >
                    <img
                      src={imgUrl}
                      alt={item.title || "GIF"}
                      className="w-full h-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
