import { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import { DECORATIONS_CATALOG, type DecorationMetadata, getDecorationById } from "../decorations/ProfileDecorations";
import { PROFILE_EFFECTS_CATALOG, type ProfileEffectMetadata, getProfileEffectById } from "../effects/ProfileEffects";
import { ProfileEffectRenderer } from "../effects/ProfileEffectRenderer";
import { DecoratedAvatar } from "../DecoratedAvatar";
import { 
  Sparkles, 
  Check, 
  X, 
  Camera, 
  Trash2, 
  Layers, 
  Palette, 
  Loader2, 
  Waves, 
  CheckCircle2, 
  Search, 
  RotateCcw, 
  RotateCw,
  ZoomIn,
  ZoomOut,
  Upload,
  Move,
  Maximize2,
  ChevronRight,
  Smartphone,
  Monitor,
  Info,
  RefreshCw,
  SlidersHorizontal,
  Flame,
  Globe,
  Sliders,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProfileAppearanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: {
    id: string;
    username: string;
    fullName?: string;
    bio?: string;
    avatarUrl?: string | null;
    coverUrl?: string | null;
    postsCount?: number;
    followersCount?: number;
    followingCount?: number;
    isVerified?: boolean;
    activeDecorationId?: string | null;
    unlockedDecorations?: string[];
    activeProfileEffectId?: string | null;
    unlockedProfileEffects?: string[];
    subscriptionPlan?: string;
    role?: string;
  };
  initialTab?: "effects" | "decorations" | "avatar" | "themes";
  onAppearanceUpdated: (updates: {
    activeDecorationId?: string | null;
    activeProfileEffectId?: string | null;
    avatarUrl?: string | null;
  }) => void;
  onPreviewEffectChange?: (effectId: string | null) => void;
}

const RARITY_COLORS: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  common: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/30", glow: "rgba(148, 163, 184, 0.15)" },
  rare: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30", glow: "rgba(59, 130, 246, 0.25)" },
  epic: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30", glow: "rgba(168, 85, 247, 0.25)" },
  legendary: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", glow: "rgba(245, 158, 11, 0.3)" },
  limited: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", glow: "rgba(16, 185, 129, 0.3)" },
};

const EFFECT_CATEGORIES = [
  { id: "all", label: "All Effects", labelAr: "الكل" },
  { id: "dragon", label: "Dragons 🐉", labelAr: "تنانين" },
  { id: "animal", label: "Animals 🦁", labelAr: "حيوانات" },
  { id: "mythical", label: "Mythical 🦅", labelAr: "أساطير" },
  { id: "dark", label: "Cosmic & Dark 🌌", labelAr: "فضاء وظلال" },
  { id: "aurora", label: "Aurora", labelAr: "شفق" },
  { id: "cyber", label: "Cyber", labelAr: "سايبر" },
  { id: "cosmic", label: "Cosmic", labelAr: "كوني" },
  { id: "luxury", label: "Luxury", labelAr: "فاخر" },
  { id: "holographic", label: "Holographic", labelAr: "هولوغرام" },
  { id: "animated", label: "Animated", labelAr: "متحرك" },
  { id: "minimal", label: "Minimal", labelAr: "مينيمال" },
];

const DECORATION_CATEGORIES = [
  { id: "all", label: "All Frames", labelAr: "الكل" },
  { id: "neon", label: "Neon", labelAr: "نيون" },
  { id: "cyber", label: "Cyber", labelAr: "سايبر" },
  { id: "luxury", label: "Luxury", labelAr: "فاخر" },
  { id: "holographic", label: "Holographic", labelAr: "هولوغرام" },
  { id: "cosmic", label: "Cosmic", labelAr: "كوني" },
  { id: "animated", label: "Animated", labelAr: "متحرك" },
  { id: "minimal", label: "Minimal", labelAr: "مينيمال" },
];

export function ProfileAppearanceModal({
  open,
  onOpenChange,
  currentUser,
  initialTab = "effects",
  onAppearanceUpdated,
  onPreviewEffectChange,
}: ProfileAppearanceModalProps) {
  const { toast } = useToast();

  // Active Category in Navigation
  const [activeSection, setActiveSection] = useState<"effects" | "decorations" | "avatar" | "themes">(initialTab);

  // Staged Preview States (Updated immediately without saving)
  const [stagedDecorationId, setStagedDecorationId] = useState<string | null>(currentUser.activeDecorationId || null);
  const [stagedEffectId, setStagedEffectId] = useState<string | null>(currentUser.activeProfileEffectId || null);
  const [stagedAvatarUrl, setStagedAvatarUrl] = useState<string | null>(currentUser.avatarUrl || null);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedEffectCat, setSelectedEffectCat] = useState<string>("all");
  const [selectedDecCat, setSelectedDecCat] = useState<string>("all");
  const [selectedRarity, setSelectedRarity] = useState<string>("all");

  // Preview options
  const [previewMode, setPreviewMode] = useState<"card" | "feed">("card");
  const [inspectingEffect, setInspectingEffect] = useState<ProfileEffectMetadata | null>(null);

  // Avatar Editor State inside Studio
  const [rawAvatarSrc, setRawAvatarSrc] = useState<string | null>(null);
  const [avatarZoom, setAvatarZoom] = useState<number>(1);
  const [avatarRotation, setAvatarRotation] = useState<number>(0);
  const [avatarPan, setAvatarPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isAvatarDragging, setIsAvatarDragging] = useState<boolean>(false);
  const [avatarDragStart, setAvatarDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isProcessingAvatar, setIsProcessingAvatar] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live Real Profile Stats
  const [liveStats, setLiveStats] = useState<{
    postsCount: number;
    followersCount: number;
    followingCount: number;
    bio: string;
    isVerified: boolean;
  }>({
    postsCount: currentUser.postsCount ?? 0,
    followersCount: currentUser.followersCount ?? 0,
    followingCount: currentUser.followingCount ?? 0,
    bio: currentUser.bio ?? "",
    isVerified: currentUser.isVerified ?? false,
  });

  // API Loading States
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Fetch real profile stats from backend if username available
  useEffect(() => {
    let isMounted = true;
    if (currentUser.username) {
      const token = localStorage.getItem("pixlr_token") || localStorage.getItem("whiterchat_token") || "";
      fetch(apiUrl(`/api/users/${currentUser.username}`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && isMounted) {
            setLiveStats({
              postsCount: data.postsCount ?? data.posts?.length ?? currentUser.postsCount ?? 0,
              followersCount: data.followersCount ?? currentUser.followersCount ?? 0,
              followingCount: data.followingCount ?? currentUser.followingCount ?? 0,
              bio: data.bio ?? currentUser.bio ?? "",
              isVerified: Boolean(data.isVerified ?? currentUser.isVerified),
            });
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [currentUser.username, currentUser.postsCount, currentUser.followersCount, currentUser.followingCount, currentUser.bio, currentUser.isVerified]);

  // Synchronize on modal open
  useEffect(() => {
    if (open) {
      setActiveSection(initialTab);
      setStagedDecorationId(currentUser.activeDecorationId || null);
      setStagedEffectId(currentUser.activeProfileEffectId || null);
      setStagedAvatarUrl(currentUser.avatarUrl || null);
      setRawAvatarSrc(null);
      setAvatarZoom(1);
      setAvatarRotation(0);
      setAvatarPan({ x: 0, y: 0 });
      onPreviewEffectChange?.(currentUser.activeProfileEffectId || null);
    } else {
      onPreviewEffectChange?.(currentUser.activeProfileEffectId || null);
    }
  }, [open, currentUser.activeDecorationId, currentUser.activeProfileEffectId, currentUser.avatarUrl, initialTab]);

  // Format stat numbers
  const formatStatNumber = (num: number) => {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (num >= 10_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
    return num.toLocaleString();
  };

  // Check for unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    return (
      (stagedDecorationId ?? null) !== (currentUser.activeDecorationId ?? null) ||
      (stagedEffectId ?? null) !== (currentUser.activeProfileEffectId ?? null) ||
      (stagedAvatarUrl ?? null) !== (currentUser.avatarUrl ?? null) ||
      rawAvatarSrc !== null
    );
  }, [stagedDecorationId, stagedEffectId, stagedAvatarUrl, rawAvatarSrc, currentUser]);

  // When user clicks an effect in the gallery
  const handleSelectEffect = (id: string | null) => {
    setStagedEffectId(id);
    onPreviewEffectChange?.(id);
  };

  // Filtered Effects
  const filteredEffects = useMemo(() => {
    return PROFILE_EFFECTS_CATALOG.filter((eff) => {
      const matchCat = selectedEffectCat === "all" || eff.category === selectedEffectCat;
      const matchRarity = selectedRarity === "all" || eff.rarity === selectedRarity;
      const matchSearch = !searchQuery.trim() || 
        eff.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        eff.nameAr?.includes(searchQuery) ||
        eff.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        eff.descriptionAr?.includes(searchQuery);
      return matchCat && matchRarity && matchSearch;
    });
  }, [selectedEffectCat, selectedRarity, searchQuery]);

  // Filtered Decorations
  const filteredDecorations = useMemo(() => {
    return DECORATIONS_CATALOG.filter((dec) => {
      const matchCat = selectedDecCat === "all" || dec.category === selectedDecCat;
      const matchRarity = selectedRarity === "all" || dec.rarity === selectedRarity;
      const matchSearch = !searchQuery.trim() || 
        dec.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        dec.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchRarity && matchSearch;
    });
  }, [selectedDecCat, selectedRarity, searchQuery]);

  // Handle Photo selection for crop
  const handlePhotoSelected = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid format", description: "Please upload an image file (PNG, JPG, WEBP)", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum image size is 10MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setRawAvatarSrc(reader.result as string);
      setAvatarZoom(1);
      setAvatarRotation(0);
      setAvatarPan({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  };

  // Crop and apply to staged preview
  const handleApplyCroppedAvatar = async () => {
    if (!rawAvatarSrc) return;
    setIsProcessingAvatar(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context failed");

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = rawAvatarSrc;
      });

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.translate(256, 256);
      ctx.rotate((avatarRotation * Math.PI) / 180);
      ctx.translate((avatarPan.x / 280) * 512, (avatarPan.y / 280) * 512);
      ctx.scale(avatarZoom, avatarZoom);

      const aspect = img.width / img.height;
      let drawW = 512;
      let drawH = 512;
      if (aspect > 1) {
        drawW = 512 * aspect;
      } else {
        drawH = 512 / aspect;
      }
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

      const base64Data = canvas.toDataURL("image/webp", 0.92);
      setStagedAvatarUrl(base64Data);
      setRawAvatarSrc(null);
      toast({ title: "Photo adjusted", description: "Avatar updated in preview. Click 'Save Changes' to publish." });
    } catch (err: any) {
      toast({ title: "Failed to process photo", description: err.message || "Error", variant: "destructive" });
    } finally {
      setIsProcessingAvatar(false);
    }
  };

  // ── SAVE AND PUBLISH ALL STAGED CHANGES ─────────────────────────────
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem("pixlr_token") || localStorage.getItem("whiterchat_token") || "";

      // 1. Upload avatar if changed and is new dataURL
      let finalAvatarUrl = stagedAvatarUrl;
      if (stagedAvatarUrl && stagedAvatarUrl.startsWith("data:")) {
        const res = await fetch(apiUrl("/api/users/me/avatar"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ data: stagedAvatarUrl, mimeType: "image/webp" }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Failed to upload avatar");
        finalAvatarUrl = d.url;
      } else if (stagedAvatarUrl === null && currentUser.avatarUrl !== null) {
        await fetch(apiUrl("/api/users/me/avatar"), {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      // 2. Update decoration
      if ((stagedDecorationId ?? null) !== (currentUser.activeDecorationId ?? null)) {
        if (stagedDecorationId) {
          await fetch(apiUrl(`/api/profile/decorations/${stagedDecorationId}/apply`), {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          });
        } else {
          await fetch(apiUrl("/api/profile/decorations/active"), {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      }

      // 3. Update profile effect
      if ((stagedEffectId ?? null) !== (currentUser.activeProfileEffectId ?? null)) {
        if (stagedEffectId) {
          await fetch(apiUrl(`/api/profile/effects/${stagedEffectId}/apply`), {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          });
        } else {
          await fetch(apiUrl("/api/profile/effects/active"), {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      }

      toast({
        title: "Appearance Published!",
        description: "Your custom profile identity is now live across WhiterChat.",
      });

      onAppearanceUpdated({
        activeDecorationId: stagedDecorationId,
        activeProfileEffectId: stagedEffectId,
        avatarUrl: finalAvatarUrl,
      });
      onPreviewEffectChange?.(stagedEffectId);
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Could not save appearance",
        description: err.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Discard staging
  const handleDiscard = () => {
    setStagedDecorationId(currentUser.activeDecorationId || null);
    setStagedEffectId(currentUser.activeProfileEffectId || null);
    setStagedAvatarUrl(currentUser.avatarUrl || null);
    setRawAvatarSrc(null);
    onPreviewEffectChange?.(currentUser.activeProfileEffectId || null);
    toast({ title: "Changes reverted", description: "Restored to your currently active profile styling." });
  };

  // Reset to default
  const handleResetDefaults = async () => {
    setIsResetting(true);
    try {
      const token = localStorage.getItem("pixlr_token") || localStorage.getItem("whiterchat_token") || "";
      await Promise.all([
        fetch(apiUrl("/api/profile/decorations/active"), { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }),
        fetch(apiUrl("/api/profile/effects/active"), { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setStagedDecorationId(null);
      setStagedEffectId(null);
      onAppearanceUpdated({ activeDecorationId: null, activeProfileEffectId: null });
      onPreviewEffectChange?.(null);
      toast({ title: "Reset Complete", description: "Profile returned to standard default appearance." });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Reset failed", description: err.message || "Server error", variant: "destructive" });
    } finally {
      setIsResetting(false);
    }
  };

  const stagedDecoration = getDecorationById(stagedDecorationId);
  const stagedEffect = getProfileEffectById(stagedEffectId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        hideHandle={true}
        className="p-0 gap-0 border-0 bg-[#0a0e1a] text-slate-100 shadow-2xl overflow-hidden fixed z-50 inset-0 w-full h-full max-w-none max-h-none rounded-none sm:top-1/2 sm:left-1/2 sm:bottom-auto sm:right-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[96vw] sm:max-w-[1460px] sm:h-[92vh] sm:max-h-[920px] sm:rounded-3xl sm:border sm:border-[#1e2d4a] flex flex-col"
      >
        
        {/* ═════════════════════════════════════════════════════════════ */}
        {/* TOP STUDIO HEADER BAR                                         */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <header className="h-16 px-4 sm:px-6 lg:px-8 border-b border-[#1e2d4a] bg-[#0e1526] flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 p-0.5 shadow-lg shadow-emerald-500/10 shrink-0">
              <div className="w-full h-full bg-[#0a0e1a] rounded-[14px] flex items-center justify-center text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base lg:text-lg font-bold text-white tracking-tight">
                  Profile Customization Studio
                </h1>
                {hasUnsavedChanges ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Unsaved
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono text-emerald-300 bg-emerald-500/20 border border-emerald-500/30">
                    <Check className="w-3 h-3" /> Live
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 hidden sm:block">
                Design how your WhiterChat identity appears across profiles, feeds, and messaging.
              </p>
            </div>
          </div>

          {/* Top Actions: Save / Close */}
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <Button
                type="button"
                size="sm"
                disabled={isSaving}
                onClick={handleSaveAll}
                className="hidden sm:flex font-bold text-xs rounded-xl h-9 px-4 gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-md shadow-emerald-500/20"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save</span>
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs font-semibold h-9 px-3 text-slate-200 hover:text-white hover:bg-[#1a263d]"
            >
              <X className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Close</span>
            </Button>
          </div>
        </header>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* 3-ZONE MAIN STUDIO WORKSPACE (DESKTOP / LAPTOP / MOBILE)      */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden bg-[#0a0e1a]">
          
          {/* ─────────────────────────────────────────────────────────── */}
          {/* ZONE 1 (LEFT): CATEGORY NAVIGATION BAR                     */}
          {/* ─────────────────────────────────────────────────────────── */}
          <nav className="w-full lg:w-60 xl:w-64 border-b lg:border-b-0 lg:border-r border-[#1e2d4a] bg-[#0d1322] p-2.5 sm:p-4 flex flex-row lg:flex-col justify-between shrink-0 overflow-x-auto lg:overflow-y-auto scrollbar-none z-10">
            <div className="flex flex-row lg:flex-col gap-1.5 w-full">
              <div className="hidden lg:block px-3 py-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Studio Categories
              </div>

              {/* Navigation Item 1: Profile Effects */}
              <button
                type="button"
                onClick={() => setActiveSection("effects")}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 sm:py-3 rounded-2xl text-xs font-semibold transition-all duration-200 text-left shrink-0 lg:w-full",
                  activeSection === "effects"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 font-bold"
                    : "text-slate-300 hover:text-white hover:bg-[#151f38]"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                  activeSection === "effects" ? "bg-white/20 text-white" : "bg-[#18233a] text-indigo-400"
                )}>
                  <Waves className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span>Profile Effects</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-indigo-200">52</span>
                  </div>
                  <div className="text-[10px] opacity-80 font-normal truncate hidden lg:block">
                    Atmospheric energy & glow
                  </div>
                </div>
              </button>

              {/* Navigation Item 2: Avatar Frames */}
              <button
                type="button"
                onClick={() => setActiveSection("decorations")}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 sm:py-3 rounded-2xl text-xs font-semibold transition-all duration-200 text-left shrink-0 lg:w-full",
                  activeSection === "decorations"
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 font-bold"
                    : "text-slate-300 hover:text-white hover:bg-[#151f38]"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                  activeSection === "decorations" ? "bg-white/20 text-white" : "bg-[#18233a] text-emerald-400"
                )}>
                  <Layers className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span>Avatar Frames</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-emerald-200">12</span>
                  </div>
                  <div className="text-[10px] opacity-80 font-normal truncate hidden lg:block">
                    Animated decorative frames
                  </div>
                </div>
              </button>

              {/* Navigation Item 3: Avatar Photo Studio */}
              <button
                type="button"
                onClick={() => setActiveSection("avatar")}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 sm:py-3 rounded-2xl text-xs font-semibold transition-all duration-200 text-left shrink-0 lg:w-full",
                  activeSection === "avatar"
                    ? "bg-cyan-600 text-white shadow-lg shadow-cyan-500/20 font-bold"
                    : "text-slate-300 hover:text-white hover:bg-[#151f38]"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                  activeSection === "avatar" ? "bg-white/20 text-white" : "bg-[#18233a] text-cyan-400"
                )}>
                  <Camera className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span>Avatar Photo</span>
                  </div>
                  <div className="text-[10px] opacity-80 font-normal truncate hidden lg:block">
                    Crop, zoom & center
                  </div>
                </div>
              </button>
            </div>

            {/* Bottom Quick Staged Summary (Desktop) */}
            <div className="hidden lg:block pt-4 border-t border-[#1e2d4a] mt-auto space-y-2.5">
              <div className="p-3.5 rounded-2xl bg-[#12192b] border border-[#1e2d4a] text-[11px] space-y-2">
                <div className="text-slate-300 font-medium flex items-center justify-between">
                  <span>Selected Setup</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Atmosphere:</span>
                    <span className="font-bold text-white truncate max-w-[100px] text-right">
                      {stagedEffect?.name || "Standard"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Frame:</span>
                    <span className="font-bold text-white truncate max-w-[100px] text-right">
                      {stagedDecoration?.name || "Clean"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </nav>

          {/* ─────────────────────────────────────────────────────────── */}
          {/* ZONE 2 (CENTER): HERO LIVE PROFILE PREVIEW CANVAS           */}
          {/* ─────────────────────────────────────────────────────────── */}
          <div className="w-full lg:w-[420px] xl:w-[470px] border-b lg:border-b-0 lg:border-r border-[#1e2d4a] bg-[#0a0e1a] p-4 sm:p-6 flex flex-col justify-between overflow-y-auto shrink-0">
            <div className="space-y-4">
              
              {/* Preview Header / Device Switcher */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500 animate-pulse" />
                  <span className="text-xs font-mono font-bold tracking-wider uppercase text-slate-200">
                    Live Profile Canvas
                  </span>
                </div>

                <div className="flex items-center p-1 rounded-xl bg-[#12192b] border border-[#1e2d4a]">
                  <button
                    type="button"
                    onClick={() => setPreviewMode("card")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors",
                      previewMode === "card" ? "bg-[#1e2b44] text-white font-semibold" : "text-slate-400 hover:text-slate-200"
                    )}
                    title="Profile Card View"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span className="text-[11px] hidden sm:inline">Profile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode("feed")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors",
                      previewMode === "feed" ? "bg-[#1e2b44] text-white font-semibold" : "text-slate-400 hover:text-slate-200"
                    )}
                    title="Feed Post View"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span className="text-[11px] hidden sm:inline">Feed</span>
                  </button>
                </div>
              </div>

              {/* ── THE HERO LIVE PROFILE CARD (SOLID & HIGH CONTRAST) ── */}
              <div 
                className="relative rounded-3xl overflow-hidden border border-[#223352] bg-[#121a2d] shadow-2xl transition-all duration-300"
                style={{
                  boxShadow: stagedEffect?.colors.glow
                    ? `0 10px 40px -10px ${stagedEffect.colors.glow}`
                    : "0 20px 40px -15px rgba(0,0,0,0.8)",
                }}
              >
                {/* 1. Atmospheric Canvas / Profile Banner */}
                <div className="relative h-40 sm:h-44 w-full overflow-hidden bg-black flex items-center justify-center">
                  {/* Banner image if user has a profile cover */}
                  {currentUser.coverUrl ? (
                    <img
                      src={currentUser.coverUrl}
                      alt="Banner"
                      className="absolute inset-0 w-full h-full object-cover z-0"
                    />
                  ) : null}

                  {/* Profile Effect Renderer */}
                  {stagedEffectId ? (
                    <div className="absolute inset-0 z-10 pointer-events-none">
                      <ProfileEffectRenderer
                        effectId={stagedEffectId}
                        variant="full"
                        performanceTier="high"
                        interactive={true}
                      />
                    </div>
                  ) : !currentUser.coverUrl ? (
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#0b0f1a] via-[#121829] to-[#080b14] flex items-center justify-center">
                      <div className="text-center">
                        <Waves className="w-6 h-6 text-slate-600 mx-auto mb-1" />
                        <span className="text-xs text-slate-400 font-mono">Standard Atmosphere</span>
                      </div>
                    </div>
                  ) : null}

                  {/* Active Effect Pill on Canvas */}
                  {stagedEffect && (
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1 rounded-full bg-black/85 border border-white/20 text-xs text-white shadow-lg">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" style={{ animationDuration: "6s" }} />
                      <span className="font-bold">{stagedEffect.name}</span>
                    </div>
                  )}
                </div>

                {/* 2. Avatar & Live Identity Details */}
                <div className="relative p-5 sm:p-6 pt-0">
                  <div className="flex items-end justify-between -mt-12 sm:-mt-14 mb-3 sm:mb-4">
                    {/* Live Decorated Avatar */}
                    <div className="relative">
                      <DecoratedAvatar
                        avatarUrl={stagedAvatarUrl}
                        decorationId={stagedDecorationId}
                        username={currentUser.username}
                        fullName={currentUser.fullName}
                        size="2xl"
                        className="ring-4 ring-[#121a2d] shadow-2xl"
                      />
                    </div>

                    {/* Frame Badge */}
                    {stagedDecoration ? (
                      <div className="text-right">
                        <span className={cn(
                          "inline-flex items-center gap-1 text-[11px] font-mono font-bold uppercase px-2.5 py-1 rounded-full border shadow-md",
                          RARITY_COLORS[stagedDecoration.rarity]?.bg,
                          RARITY_COLORS[stagedDecoration.rarity]?.text,
                          RARITY_COLORS[stagedDecoration.rarity]?.border
                        )}>
                          <Layers className="w-3 h-3" />
                          <span>{stagedDecoration.name}</span>
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] font-mono text-slate-400">Clean Frame</span>
                    )}
                  </div>

                  {/* Name and Handle */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <h2 className="font-bold text-base sm:text-lg text-white tracking-tight truncate">
                        {currentUser.fullName || currentUser.username}
                      </h2>
                      {liveStats.isVerified && (
                        <CheckCircle2 className="w-4 h-4 text-blue-400 fill-blue-500 text-white shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-mono">
                      @{currentUser.username}
                    </p>
                  </div>

                  {/* Real User Bio */}
                  {liveStats.bio ? (
                    <p className="text-xs text-slate-200 mt-2.5 leading-relaxed whitespace-pre-line line-clamp-3">
                      {liveStats.bio}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-2 italic">
                      No bio added yet
                    </p>
                  )}

                  {/* Real Profile Statistics Strip */}
                  <div className="mt-4 pt-3.5 border-t border-[#223352] flex items-center justify-around text-center">
                    <div>
                      <div className="font-bold text-sm text-white">{formatStatNumber(liveStats.postsCount)}</div>
                      <div className="text-[10px] font-mono text-slate-400">Posts</div>
                    </div>
                    <div className="h-6 w-px bg-[#223352]" />
                    <div>
                      <div className="font-bold text-sm text-white">{formatStatNumber(liveStats.followersCount)}</div>
                      <div className="text-[10px] font-mono text-slate-400">Followers</div>
                    </div>
                    <div className="h-6 w-px bg-[#223352]" />
                    <div>
                      <div className="font-bold text-sm text-white">{formatStatNumber(liveStats.followingCount)}</div>
                      <div className="text-[10px] font-mono text-slate-400">Following</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Informative Guidance */}
              <div className="p-3.5 rounded-2xl bg-[#12192b] border border-[#1e2d4a] flex items-start gap-3 text-xs text-slate-300">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Select effects or avatar frames to preview them live. Click <strong className="text-white font-semibold">Save Changes</strong> when you are ready to publish.
                </p>
              </div>
            </div>

            {/* Bottom Actions Deck (Desktop / Tablet) */}
            <div className="pt-4 mt-4 border-t border-[#1e2d4a] space-y-2">
              <Button
                type="button"
                disabled={isSaving || !hasUnsavedChanges}
                onClick={handleSaveAll}
                className={cn(
                  "w-full font-bold text-xs sm:text-sm rounded-2xl h-11 gap-2 shadow-xl transition-all duration-300",
                  hasUnsavedChanges
                    ? "bg-gradient-to-r from-emerald-500 via-teal-600 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white shadow-emerald-500/20 scale-[1.01]"
                    : "bg-[#18233a] text-slate-400"
                )}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>{hasUnsavedChanges ? "Save & Apply Changes" : "All Changes Saved"}</span>
              </Button>

              <div className="flex items-center gap-2">
                {hasUnsavedChanges && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDiscard}
                    className="flex-1 rounded-xl text-xs h-9 gap-1.5 border-[#223352] bg-[#12192b] text-slate-200 hover:text-white hover:bg-[#1a263d]"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Discard</span>
                  </Button>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isResetting || (!currentUser.activeDecorationId && !currentUser.activeProfileEffectId)}
                  onClick={handleResetDefaults}
                  className="flex-1 rounded-xl text-xs h-9 text-red-400 hover:text-red-300 hover:bg-red-500/20 gap-1.5"
                >
                  {isResetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Reset Default</span>
                </Button>
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────── */}
          {/* ZONE 3 (RIGHT): GALLERIES & CONTROLS (FLEX-1)               */}
          {/* ─────────────────────────────────────────────────────────── */}
          <main className="flex-1 min-h-0 bg-[#0a0e1a] p-4 sm:p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              
              {/* Filter Bar: Search & Rarity Controls */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  {/* Search input */}
                  <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder={activeSection === "effects" ? "Search 52 effects (Dragon, Celestial, Aurora, Phoenix)..." : "Search avatar frames..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-10 text-xs rounded-2xl bg-[#12192b] border-[#223352] text-white placeholder:text-slate-400 focus:border-indigo-500"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Rarity filter pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
                    {(["all", "legendary", "epic", "rare", "common"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setSelectedRarity(r)}
                        className={cn(
                          "px-2.5 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase transition-all border shrink-0",
                          selectedRarity === r
                            ? "bg-slate-100 text-slate-950 border-slate-100 shadow-sm"
                            : "bg-[#12192b] text-slate-300 hover:text-white border-[#223352] hover:bg-[#18233a]"
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category filter pills */}
                {activeSection === "effects" && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {EFFECT_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedEffectCat(cat.id)}
                        className={cn(
                          "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border shrink-0",
                          selectedEffectCat === cat.id
                            ? "bg-indigo-600 text-white border-indigo-500 shadow-md font-bold"
                            : "bg-[#12192b] text-slate-300 hover:text-white hover:bg-[#18233a] border-[#223352]"
                        )}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                )}

                {activeSection === "decorations" && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {DECORATION_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedDecCat(cat.id)}
                        className={cn(
                          "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border shrink-0",
                          selectedDecCat === cat.id
                            ? "bg-emerald-600 text-white border-emerald-500 shadow-md font-bold"
                            : "bg-[#12192b] text-slate-300 hover:text-white hover:bg-[#18233a] border-[#223352]"
                        )}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ═══════════════════════════════════════════════════════ */}
              {/* SECTION 1: PROFILE EFFECTS GALLERY (52 EFFECTS)         */}
              {/* ═══════════════════════════════════════════════════════ */}
              {activeSection === "effects" && (
                <div className="space-y-4 pb-8">
                  {/* Gallery Subheader Counter & Quick Reset */}
                  <div className="flex items-center justify-between text-xs px-1">
                    <div className="flex items-center gap-2 text-slate-300 font-medium">
                      <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                      <span>Atmospheric Effects Gallery ({filteredEffects.length} of {PROFILE_EFFECTS_CATALOG.length})</span>
                    </div>
                    {stagedEffectId && (
                      <button
                        type="button"
                        onClick={() => handleSelectEffect(null)}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 underline underline-offset-4 flex items-center gap-1 font-semibold transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Remove Active Effect</span>
                      </button>
                    )}
                  </div>

                  {filteredEffects.length === 0 ? (
                    <div className="p-8 sm:p-12 rounded-3xl bg-[#12192b]/80 border border-[#223352] text-center space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-[#18233a] flex items-center justify-center text-slate-400 mx-auto">
                        <Search className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-white">No effects match "{searchQuery}"</h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Try adjusting your search terms or filter criteria above.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedEffectCat("all");
                          setSelectedRarity("all");
                        }}
                        className="rounded-xl text-xs h-9 border-[#223352] bg-[#18233a] text-slate-200 hover:text-white"
                      >
                        Reset All Filters
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {/* Standard Profile Slot (No Effect) */}
                      <div
                        onClick={() => handleSelectEffect(null)}
                        className={cn(
                          "group relative rounded-3xl p-5 border flex flex-col justify-between cursor-pointer transition-all duration-300 min-h-[200px]",
                          stagedEffectId === null
                            ? "ring-2 ring-indigo-500 border-indigo-500 bg-gradient-to-b from-indigo-500/15 via-[#12192b] to-[#0d1322] shadow-xl shadow-indigo-500/10 scale-[1.01]"
                            : "border-dashed border-[#223352] hover:border-slate-500 bg-[#12192b]/60 hover:bg-[#12192b]"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className={cn(
                            "w-10 h-10 rounded-2xl flex items-center justify-center transition-colors",
                            stagedEffectId === null ? "bg-indigo-600 text-white" : "bg-[#18233a] text-slate-400 group-hover:text-white"
                          )}>
                            <Trash2 className="w-5 h-5" />
                          </div>
                          {stagedEffectId === null && (
                            <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Selected for Preview</span>
                            </span>
                          )}
                        </div>

                        <div className="mt-4">
                          <h3 className="font-bold text-sm text-white group-hover:text-indigo-300 transition-colors">
                            Standard Profile (Default)
                          </h3>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                            Clean default profile background atmosphere without animated particle aura.
                          </p>
                        </div>

                        <div className="pt-3 mt-2 border-t border-[#223352]/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                          <span>Standard</span>
                          <span>Default</span>
                        </div>
                      </div>

                      {/* Effects Cards */}
                      {filteredEffects.map((eff) => {
                        const isSelected = stagedEffectId === eff.id;
                        const isLive = currentUser.activeProfileEffectId === eff.id;

                        return (
                          <div
                            key={eff.id}
                            onClick={() => handleSelectEffect(eff.id)}
                            className={cn(
                              "group relative rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 border flex flex-col justify-between",
                              isSelected
                                ? "ring-2 ring-indigo-500 border-indigo-400 shadow-2xl bg-[#121a2d] scale-[1.02] z-10"
                                : "border-[#1e2d4a] hover:border-slate-500 bg-[#12192b]/80 hover:bg-[#162238] hover:shadow-xl hover:-translate-y-1"
                            )}
                            style={{
                              boxShadow: isSelected
                                ? `0 12px 35px -8px ${eff.colors.glow}44, 0 0 15px ${eff.colors.primary}33`
                                : undefined,
                            }}
                          >
                            {/* Visual Animated Miniature Window */}
                            <div className="relative h-36 sm:h-40 w-full overflow-hidden bg-slate-950 flex items-center justify-center border-b border-[#1e2d4a]/80">
                              <ProfileEffectRenderer
                                effectId={eff.id}
                                variant="card"
                                performanceTier="medium"
                                interactive={false}
                              />

                              {/* Hover Glow Sheen */}
                              <div
                                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                                style={{
                                  background: `radial-gradient(circle at 50% 50%, ${eff.colors.glow}22 0%, transparent 80%)`,
                                }}
                              />

                              {/* Rarity Badge */}
                              <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                                <span className={cn(
                                  "text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full border shadow-lg backdrop-blur-md",
                                  RARITY_COLORS[eff.rarity]?.bg,
                                  RARITY_COLORS[eff.rarity]?.text,
                                  RARITY_COLORS[eff.rarity]?.border
                                )}>
                                  {eff.rarity}
                                </span>
                              </div>

                              {/* Inspect Fullscreen Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInspectingEffect(eff);
                                }}
                                className="absolute top-3 left-3 z-10 p-2 rounded-2xl bg-black/75 hover:bg-black text-slate-300 hover:text-white transition-all border border-white/20 shadow-md backdrop-blur-md hover:scale-110"
                                title="Inspect Details"
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Selected Overlay Indicator */}
                              {isSelected && (
                                <div className="absolute bottom-3 inset-x-3 z-10 px-3 py-1.5 rounded-2xl bg-indigo-950/90 border border-indigo-400 text-indigo-200 text-xs font-bold flex items-center justify-between shadow-lg backdrop-blur-md">
                                  <span className="flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" style={{ animationDuration: "5s" }} />
                                    <span>Selected for Preview</span>
                                  </span>
                                  <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                                </div>
                              )}
                            </div>

                            {/* Card Details */}
                            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-1.5">
                                      <span>{eff.name}</span>
                                    </h3>
                                    {eff.nameAr && (
                                      <span className="text-[11px] text-slate-400 font-mono block">
                                        {eff.nameAr}
                                      </span>
                                    )}
                                  </div>

                                  {isLive && (
                                    <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                                      Active
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs text-slate-300 line-clamp-2 mt-2 leading-relaxed">
                                  {eff.description}
                                </p>
                              </div>

                              {/* Specs & Category */}
                              <div className="pt-2.5 border-t border-[#1e2d4a] flex items-center justify-between text-[10px] font-mono text-slate-400">
                                <span className="capitalize px-2 py-0.5 rounded-md bg-[#18233a] text-slate-300">
                                  {eff.category}
                                </span>
                                <span className="text-indigo-300 font-medium flex items-center gap-1">
                                  <Waves className="w-3 h-3 text-indigo-400" />
                                  <span>{eff.animationType}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════ */}
              {/* SECTION 2: AVATAR FRAMES GALLERY                        */}
              {/* ═══════════════════════════════════════════════════════ */}
              {activeSection === "decorations" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5 pb-6">
                  {/* None / Clean Avatar Frame Slot */}
                  <div
                    onClick={() => setStagedDecorationId(null)}
                    className={cn(
                      "group rounded-3xl p-5 border flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 min-h-[160px]",
                      stagedDecorationId === null
                        ? "ring-2 ring-emerald-500 border-emerald-500 bg-emerald-500/20 shadow-lg"
                        : "border-dashed border-[#223352] hover:border-slate-500 bg-[#12192b] hover:bg-[#18233a]"
                    )}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#18233a] flex items-center justify-center text-slate-300 group-hover:text-white transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </div>
                    <div className="font-bold text-xs mt-3 text-white">Clean Frame</div>
                    <p className="text-[10px] text-slate-400 mt-0.5">No surrounding border</p>
                  </div>

                  {filteredDecorations.map((dec) => {
                    const isSelected = stagedDecorationId === dec.id;
                    const isLive = currentUser.activeDecorationId === dec.id;

                    return (
                      <div
                        key={dec.id}
                        onClick={() => setStagedDecorationId(dec.id)}
                        className={cn(
                          "group relative rounded-3xl p-4 flex flex-col items-center text-center cursor-pointer transition-all duration-300 border bg-[#12192b] hover:bg-[#162238]",
                          isSelected
                            ? "ring-2 ring-emerald-500 border-emerald-500 shadow-xl shadow-emerald-500/20 bg-emerald-500/10 scale-[1.01]"
                            : "border-[#223352] hover:border-slate-600 hover:shadow-md"
                        )}
                      >
                        <div className="relative my-3 p-1">
                          <DecoratedAvatar
                            avatarUrl={stagedAvatarUrl}
                            decorationId={dec.id}
                            username={currentUser.username}
                            size="xl"
                          />
                        </div>

                        <div className="w-full mt-2">
                          <div className="text-xs font-bold text-white truncate group-hover:text-emerald-300 transition-colors">
                            {dec.name}
                          </div>
                          <div className="flex items-center justify-center gap-1.5 mt-1.5">
                            <span className={cn(
                              "text-[9px] font-mono font-bold uppercase px-2 py-0.2 rounded-full border",
                              RARITY_COLORS[dec.rarity]?.bg,
                              RARITY_COLORS[dec.rarity]?.text,
                              RARITY_COLORS[dec.rarity]?.border
                            )}>
                              {dec.rarity}
                            </span>
                            {isLive && (
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                Active
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════ */}
              {/* SECTION 3: AVATAR PHOTO STUDIO EDITOR                   */}
              {/* ═══════════════════════════════════════════════════════ */}
              {activeSection === "avatar" && (
                <div className="p-6 sm:p-8 rounded-3xl bg-[#12192b] border border-[#223352] max-w-2xl mx-auto space-y-6">
                  {/* Hidden Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoSelected(file);
                    }}
                  />

                  {rawAvatarSrc ? (
                    /* Active Cropping Canvas */
                    <div className="space-y-6">
                      <div className="text-center space-y-1">
                        <h3 className="text-sm font-bold text-white">Adjust Photo Alignment</h3>
                        <p className="text-xs text-slate-300">Drag image to position, zoom, and rotate for ideal fit</p>
                      </div>

                      {/* Interactive Drag Box */}
                      <div className="flex flex-col items-center">
                        <div
                          className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-emerald-500 shadow-2xl bg-black select-none cursor-grab active:cursor-grabbing"
                          onMouseDown={(e) => {
                            setIsAvatarDragging(true);
                            setAvatarDragStart({ x: e.clientX - avatarPan.x, y: e.clientY - avatarPan.y });
                          }}
                          onMouseMove={(e) => {
                            if (!isAvatarDragging) return;
                            setAvatarPan({ x: e.clientX - avatarDragStart.x, y: e.clientY - avatarDragStart.y });
                          }}
                          onMouseUp={() => setIsAvatarDragging(false)}
                          onMouseLeave={() => setIsAvatarDragging(false)}
                          onTouchStart={(e) => {
                            if (!e.touches[0]) return;
                            setIsAvatarDragging(true);
                            setAvatarDragStart({ x: e.touches[0].clientX - avatarPan.x, y: e.touches[0].clientY - avatarPan.y });
                          }}
                          onTouchMove={(e) => {
                            if (!isAvatarDragging || !e.touches[0]) return;
                            setAvatarPan({ x: e.touches[0].clientX - avatarDragStart.x, y: e.touches[0].clientY - avatarDragStart.y });
                          }}
                          onTouchEnd={() => setIsAvatarDragging(false)}
                        >
                          <div
                            className="w-full h-full flex items-center justify-center transition-transform duration-75"
                            style={{
                              transform: `translate(${avatarPan.x}px, ${avatarPan.y}px) scale(${avatarZoom}) rotate(${avatarRotation}deg)`,
                            }}
                          >
                            <img
                              src={rawAvatarSrc}
                              alt="Crop target"
                              className="max-w-none pointer-events-none select-none"
                              style={{ minWidth: "100%", minHeight: "100%", objectFit: "cover" }}
                            />
                          </div>

                          {/* Alignment Rule-of-Thirds Grid */}
                          <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-25 border border-white">
                            <div className="border-r border-b border-white" />
                            <div className="border-r border-b border-white" />
                            <div className="border-b border-white" />
                            <div className="border-r border-b border-white" />
                            <div className="border-r border-b border-white" />
                            <div className="border-b border-white" />
                            <div className="border-r border-b border-white" />
                            <div className="border-r border-b border-white" />
                            <div />
                          </div>
                        </div>

                        <div className="mt-2 text-[11px] text-slate-300 flex items-center gap-1.5 font-mono">
                          <Move className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Drag to reposition photo</span>
                        </div>
                      </div>

                      {/* Sliders & Rotation controls */}
                      <div className="space-y-4 p-4 rounded-2xl bg-[#0a0e1a] border border-[#223352]">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-slate-300">
                            <span className="flex items-center gap-1.5 font-medium">
                              <ZoomIn className="w-3.5 h-3.5 text-emerald-400" /> Zoom & Scale
                            </span>
                            <span className="font-mono text-white font-bold">{Math.round(avatarZoom * 100)}%</span>
                          </div>
                          <Slider
                            min={1}
                            max={3.5}
                            step={0.05}
                            value={[avatarZoom]}
                            onValueChange={(vals) => setAvatarZoom(vals[0] || 1)}
                          />
                        </div>

                        <div className="pt-3 border-t border-[#223352] flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setAvatarRotation((r) => (r - 90 + 360) % 360)}
                              className="h-8 px-2.5 rounded-xl text-xs gap-1 border-[#223352] bg-[#12192b] text-slate-200 hover:text-white"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> -90°
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setAvatarRotation((r) => (r + 90) % 360)}
                              className="h-8 px-2.5 rounded-xl text-xs gap-1 border-[#223352] bg-[#12192b] text-slate-200 hover:text-white"
                            >
                              <RotateCw className="w-3.5 h-3.5" /> +90°
                            </Button>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => { setAvatarZoom(1); setAvatarRotation(0); setAvatarPan({ x: 0, y: 0 }); }}
                            className="h-8 text-xs text-slate-300 hover:text-white"
                          >
                            <RefreshCw className="w-3 h-3 mr-1" /> Reset
                          </Button>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2.5">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setRawAvatarSrc(null)}
                          className="flex-1 rounded-2xl h-11 text-xs border-[#223352] bg-[#12192b] text-slate-200 hover:text-white"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={handleApplyCroppedAvatar}
                          disabled={isProcessingAvatar}
                          className="flex-1 rounded-2xl h-11 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg gap-2"
                        >
                          {isProcessingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          <span>Apply to Preview</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Initial Photo Selector / Dropzone */
                    <div className="flex flex-col items-center text-center space-y-6">
                      <div className="relative my-2">
                        <DecoratedAvatar
                          avatarUrl={stagedAvatarUrl}
                          decorationId={stagedDecorationId}
                          username={currentUser.username}
                          size="3xl"
                          className="ring-4 ring-[#223352] shadow-2xl"
                        />
                      </div>

                      <div className="space-y-1.5 max-w-md">
                        <h3 className="text-base font-bold text-white">
                          Profile Photo Studio
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Upload high-resolution photos. Crop, scale, and center your image to look exceptional inside WhiterChat frames.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                        <Button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="rounded-2xl font-bold text-xs gap-2 px-6 h-11 shadow-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                          <Upload className="w-4 h-4" />
                          <span>Upload New Photo</span>
                        </Button>

                        {stagedAvatarUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setStagedAvatarUrl(null);
                              toast({ title: "Avatar reset", description: "Default profile initials will be displayed upon saving." });
                            }}
                            className="rounded-2xl text-xs gap-1.5 h-11 px-4 text-red-400 hover:text-red-300 hover:bg-red-500/20 border-[#223352] bg-[#12192b]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove Photo</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </DialogContent>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* EFFECT DETAIL INSPECTOR MODAL                                   */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {inspectingEffect && (
        <Dialog open={!!inspectingEffect} onOpenChange={(open) => !open && setInspectingEffect(null)}>
          <DialogContent 
            hideHandle={true}
            className="max-w-2xl w-[94vw] sm:w-full p-0 gap-0 overflow-hidden rounded-3xl bg-[#0a0e1a] border border-[#223352] shadow-2xl z-50 fixed inset-auto top-1/2 left-1/2 bottom-auto right-auto -translate-x-1/2 -translate-y-1/2 flex flex-col"
          >
            {/* Cinematic Preview Canvas */}
            <div 
              className="relative h-64 sm:h-72 w-full overflow-hidden bg-slate-950 flex items-center justify-center border-b border-[#223352]"
              style={{
                boxShadow: `inset 0 -30px 40px -10px ${inspectingEffect.colors.glow}22`,
              }}
            >
              <ProfileEffectRenderer
                effectId={inspectingEffect.id}
                variant="full"
                performanceTier="high"
                interactive={true}
              />

              {/* Rarity Tag */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                <span className={cn(
                  "text-xs font-mono font-bold uppercase px-3.5 py-1 rounded-full border shadow-lg backdrop-blur-md",
                  RARITY_COLORS[inspectingEffect.rarity]?.bg,
                  RARITY_COLORS[inspectingEffect.rarity]?.text,
                  RARITY_COLORS[inspectingEffect.rarity]?.border
                )}>
                  {inspectingEffect.rarity}
                </span>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setInspectingEffect(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/75 hover:bg-black text-slate-300 hover:text-white transition-colors border border-white/20 backdrop-blur-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inspector Details */}
            <div className="p-6 space-y-5 bg-[#0d1322]">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                    <span>{inspectingEffect.name}</span>
                  </h3>
                  {inspectingEffect.nameAr && (
                    <span className="text-xs font-mono text-indigo-300 bg-indigo-950/80 px-2.5 py-1 rounded-lg border border-indigo-800/50">
                      {inspectingEffect.nameAr}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed pt-1">
                  {inspectingEffect.description}
                </p>
              </div>

              {/* Energy Color Palette Swatches */}
              <div className="p-4 rounded-2xl bg-[#12192b] border border-[#223352] space-y-2.5">
                <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                  <span>Atmospheric Energy Palette</span>
                  <span className="text-[10px] text-indigo-300 capitalize">{inspectingEffect.category}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0a0e1a] border border-[#223352]">
                    <span className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: inspectingEffect.colors.primary }} />
                    <span className="text-xs font-mono text-slate-200">Primary ({inspectingEffect.colors.primary})</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0a0e1a] border border-[#223352]">
                    <span className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: inspectingEffect.colors.glow }} />
                    <span className="text-xs font-mono text-slate-200">Glow ({inspectingEffect.colors.glow})</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0a0e1a] border border-[#223352]">
                    <span className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: inspectingEffect.colors.accent }} />
                    <span className="text-xs font-mono text-slate-200">Accent ({inspectingEffect.colors.accent})</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setInspectingEffect(null)}
                  className="flex-1 rounded-2xl h-11 text-xs border-[#223352] bg-[#12192b] text-slate-200 hover:text-white"
                >
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    handleSelectEffect(inspectingEffect.id);
                    setInspectingEffect(null);
                    toast({ title: "Effect selected", description: `Selected ${inspectingEffect.name} for your profile preview.` });
                  }}
                  className="flex-1 rounded-2xl h-11 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Apply to Live Preview</span>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
