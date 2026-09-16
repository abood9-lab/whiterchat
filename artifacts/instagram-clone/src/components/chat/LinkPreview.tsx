import { useState, useEffect } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api-url";

interface Preview {
  title:       string | null;
  description: string | null;
  image:       string | null;
  siteName:    string | null;
  url:         string;
}

// Module-level cache — survives re-renders but resets on page reload
const previewCache = new Map<string, Preview | null>();

// Detect the first URL in a string (http/https only)
const URL_RE = /https?:\/\/[^\s<>"',]+/i;

export function extractFirstUrl(text: string): string | null {
  return text.match(URL_RE)?.[0] ?? null;
}

interface Props {
  url:   string;
  isMe:  boolean;
}

export function LinkPreview({ url, isMe }: Props) {
  const [preview, setPreview] = useState<Preview | null | "loading">(
    previewCache.has(url) ? previewCache.get(url)! : "loading"
  );

  useEffect(() => {
    if (previewCache.has(url)) {
      setPreview(previewCache.get(url)!);
      return;
    }
    const token = localStorage.getItem("whiterchat_token") ?? "";
    let cancelled = false;
    fetch(apiUrl(`/api/link-preview?url=${encodeURIComponent(url)}`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => (r.ok ? r.json() : null))
      .then((data: Preview | null) => {
        if (!cancelled) {
          previewCache.set(url, data);
          setPreview(data);
        }
      })
      .catch(() => {
        if (!cancelled) { previewCache.set(url, null); setPreview(null); }
      });
    return () => { cancelled = true; };
  }, [url]);

  if (preview === "loading") {
    return (
      <div className={cn(
        "mt-1.5 h-9 flex items-center px-3 rounded-xl border",
        isMe ? "border-primary/20 bg-primary/5" : "border-border bg-secondary/30"
      )}>
        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!preview || (!preview.title && !preview.image)) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "mt-1.5 block max-w-full rounded-xl border overflow-hidden",
        "transition-opacity hover:opacity-85 active:opacity-70",
        isMe
          ? "border-white/20 bg-white/10"
          : "border-border bg-card"
      )}
      onClick={e => e.stopPropagation()}
    >
      {/* OG image */}
      {preview.image && (
        <div className="w-full h-32 overflow-hidden bg-secondary">
          <img
            src={preview.image}
            alt=""
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}

      {/* Text block */}
      <div className="px-3 py-2">
        {preview.siteName && (
          <p className={cn(
            "text-[10px] font-medium uppercase tracking-wide mb-0.5",
            isMe ? "text-primary-foreground/60" : "text-muted-foreground"
          )}>
            {preview.siteName}
          </p>
        )}
        {preview.title && (
          <p className={cn(
            "text-xs font-semibold leading-snug line-clamp-2",
            isMe ? "text-primary-foreground" : "text-foreground"
          )}>
            {preview.title}
          </p>
        )}
        {preview.description && (
          <p className={cn(
            "text-[11px] mt-0.5 line-clamp-2",
            isMe ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            {preview.description}
          </p>
        )}
        <div className="flex items-center gap-1 mt-1.5">
          <ExternalLink className={cn("w-2.5 h-2.5 shrink-0", isMe ? "text-primary-foreground/50" : "text-muted-foreground")} />
          <span className={cn("text-[10px] truncate", isMe ? "text-primary-foreground/50" : "text-muted-foreground")}>
            {(() => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } })()}
          </span>
        </div>
      </div>
    </a>
  );
}
