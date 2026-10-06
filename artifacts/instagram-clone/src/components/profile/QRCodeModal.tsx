import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Copy, Check, Share2, Download, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QRCodeModalProps {
  open: boolean;
  onClose: () => void;
  username: string;
  fullName: string;
  avatarUrl?: string | null;
}

const GRADIENT_THEMES = [
  { id: "purple-pink", bg: "from-purple-600 via-pink-600 to-rose-500", text: "#a855f7" },
  { id: "blue-cyan", bg: "from-blue-600 via-indigo-600 to-cyan-500", text: "#3b82f6" },
  { id: "amber-orange", bg: "from-amber-500 via-orange-600 to-red-500", text: "#f59e0b" },
  { id: "emerald-teal", bg: "from-emerald-500 via-teal-600 to-cyan-600", text: "#10b981" },
  { id: "dark-minimal", bg: "from-zinc-900 via-zinc-800 to-zinc-950", text: "#27272a" },
];

export function QRCodeModal({ open, onClose, username, fullName, avatarUrl }: QRCodeModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(GRADIENT_THEMES[0]);

  const profileUrl = typeof window !== "undefined"
    ? `${window.location.origin}/profile/${username}`
    : `https://whiterchat.app/profile/${username}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast({ title: "Profile link copied to clipboard!" });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({ title: "Failed to copy link", variant: "destructive" });
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${fullName} (@${username}) on WhiterChat`,
          text: `Check out @${username}'s profile on WhiterChat`,
          url: profileUrl,
        });
      } catch {
        // Ignored or cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  // Generate QR code SVG dots dynamically from hash of username for clean visual
  const generateQRDots = () => {
    const size = 21;
    const dots: { x: number; y: number }[] = [];
    const hashStr = username + profileUrl + "whiterchat_qr_seed";
    
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        // Corner squares (standard QR markers)
        const inTopLeft = r < 7 && c < 7;
        const inTopRight = r < 7 && c >= size - 7;
        const inBottomLeft = r >= size - 7 && c < 7;
        const inCenterLogo = r >= 8 && r <= 12 && c >= 8 && c <= 12;

        if (inTopLeft || inTopRight || inBottomLeft || inCenterLogo) continue;

        const charCode = hashStr.charCodeAt((r * size + c) % hashStr.length);
        if ((charCode + r * 3 + c * 7) % 3 !== 0) {
          dots.push({ x: c * 10 + 10, y: r * 10 + 10 });
        }
      }
    }
    return dots;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border bg-card">
        <DialogHeader className="p-4 pb-2 border-b border-border flex flex-row items-center justify-between">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            Profile QR Code & Share
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 flex flex-col items-center gap-6">
          {/* QR Card Container */}
          <div
            id="qr-profile-card"
            className={`w-full max-w-[300px] rounded-3xl p-6 bg-gradient-to-br ${selectedTheme.bg} shadow-2xl text-white flex flex-col items-center gap-5 transition-all duration-300`}
          >
            <div className="flex flex-col items-center gap-1.5 text-center">
              <Avatar className="w-14 h-14 ring-4 ring-white/30 shadow-lg">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="bg-white/20 text-white font-bold text-lg">
                  {username[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="font-bold text-base mt-1 text-white tracking-wide">@{username}</div>
              <div className="text-xs text-white/80 line-clamp-1">{fullName}</div>
            </div>

            {/* Simulated QR Visual */}
            <div className="p-4 bg-white rounded-2xl shadow-inner relative flex items-center justify-center">
              <svg width="180" height="180" viewBox="0 0 230 230" className="w-full h-full text-zinc-900 fill-current">
                {/* Top-Left Finder */}
                <rect x="10" y="10" width="60" height="60" rx="10" fill="none" stroke="currentColor" strokeWidth="8" />
                <rect x="25" y="25" width="30" height="30" rx="6" />

                {/* Top-Right Finder */}
                <rect x="160" y="10" width="60" height="60" rx="10" fill="none" stroke="currentColor" strokeWidth="8" />
                <rect x="175" y="25" width="30" height="30" rx="6" />

                {/* Bottom-Left Finder */}
                <rect x="10" y="160" width="60" height="60" rx="10" fill="none" stroke="currentColor" strokeWidth="8" />
                <rect x="25" y="175" width="30" height="30" rx="6" />

                {/* Data Dots */}
                {generateQRDots().map((dot, idx) => (
                  <rect key={idx} x={dot.x} y={dot.y} width="7" height="7" rx="2" />
                ))}

                {/* Center Badge */}
                <circle cx="115" cy="115" r="22" fill="white" />
                <circle cx="115" cy="115" r="16" fill="currentColor" />
              </svg>
            </div>

            <div className="text-xs font-semibold uppercase tracking-widest text-white/90">
              Scan to view on WhiterChat
            </div>
          </div>

          {/* Color Palettes */}
          <div className="flex items-center gap-2.5">
            {GRADIENT_THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setSelectedTheme(theme)}
                className={`w-7 h-7 rounded-full bg-gradient-to-br ${theme.bg} ring-2 transition-transform hover:scale-110 ${
                  selectedTheme.id === theme.id ? "ring-primary scale-110 ring-offset-2 ring-offset-card" : "ring-transparent"
                }`}
                aria-label={theme.id}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 w-full">
            <Button
              onClick={handleCopyLink}
              variant="outline"
              className="flex-1 gap-2 h-10 font-semibold"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
            <Button
              onClick={handleNativeShare}
              className="flex-1 gap-2 h-10 font-semibold bg-primary text-primary-foreground"
            >
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
