import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { DECORATIONS_CATALOG, getDecorationById } from "../decorations/ProfileDecorations";
import { PROFILE_EFFECTS_CATALOG, getProfileEffectById } from "../effects/ProfileEffects";
import { ProfileEffectRenderer } from "../effects/ProfileEffectRenderer";
import { DecoratedAvatar } from "../DecoratedAvatar";
import {
  ChevronLeft,
  Camera,
  Layers,
  Waves,
  Palette,
  Check,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Trash2,
  Upload,
  Move,
  Search,
  Sparkles,
  Loader2,
  X,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PRESET_COLORS, applyAccentColor } from "@/lib/accent-color";

export interface MobileProfileAppearanceProps {
  currentUser: {
    id: string;
    username: string;
    fullName?: string;
    bio?: string;
    avatarUrl?: string | null;
    coverUrl?: string | null;
    isVerified?: boolean;
    activeDecorationId?: string | null;
    unlockedDecorations?: string[];
    activeProfileEffectId?: string | null;
    unlockedProfileEffects?: string[];
    subscriptionPlan?: string;
    role?: string;
  };
  initialTab?: "avatar" | "effects" | "decorations" | "themes";
  stagedAvatarUrl: string | null;
  setStagedAvatarUrl: (url: string | null) => void;
  stagedDecorationId: string | null;
  setStagedDecorationId: (id: string | null) => void;
  stagedEffectId: string | null;
  setStagedEffectId: (id: string | null) => void;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onSave: () => Promise<void>;
  onClose: () => void;
  onPreviewEffectChange?: (effectId: string | null) => void;
}

const RARITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  common: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/30" },
  rare: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  epic: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
  legendary: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  limited: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
};

const EFFECT_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "dragon", label: "Dragons 🐉" },
  { id: "animal", label: "Animals 🦁" },
  { id: "mythical", label: "Mythical 🦅" },
  { id: "dark", label: "Cosmic & Dark 🌌" },
  { id: "aurora", label: "Aurora" },
  { id: "cyber", label: "Cyber" },
  { id: "luxury", label: "Luxury" },
  { id: "holographic", label: "Holo" },
  { id: "animated", label: "Animated" },
  { id: "minimal", label: "Minimal" },
];

const DECORATION_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "neon", label: "Neon" },
  { id: "cyber", label: "Cyber" },
  { id: "luxury", label: "Luxury" },
  { id: "cosmic", label: "Cosmic" },
  { id: "animated", label: "Animated" },
  { id: "minimal", label: "Minimal" },
];

export function MobileProfileAppearance({
  currentUser,
  initialTab = "avatar",
  stagedAvatarUrl,
  setStagedAvatarUrl,
  stagedDecorationId,
  setStagedDecorationId,
  stagedEffectId,
  setStagedEffectId,
  hasUnsavedChanges,
  isSaving,
  onSave,
  onClose,
  onPreviewEffectChange,
}: MobileProfileAppearanceProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"avatar" | "effects" | "decorations" | "themes">(initialTab);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEffectCat, setSelectedEffectCat] = useState("all");
  const [selectedDecCat, setSelectedDecCat] = useState("all");

  // Avatar Cropper State
  const [rawAvatarSrc, setRawAvatarSrc] = useState<string | null>(null);
  const [avatarZoom, setAvatarZoom] = useState<number>(1);
  const [avatarRotation, setAvatarRotation] = useState<number>(0);
  const [avatarPan, setAvatarPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isProcessingCrop, setIsProcessingCrop] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const cropAreaRef = useRef<HTMLDivElement>(null);

  // Multi-touch tracking for pinch-to-zoom & single-touch pan
  const pointersMapRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const initialPinchDistRef = useRef<number | null>(null);
  const initialZoomOnPinchRef = useRef<number>(1);
  const lastPanPointRef = useRef<{ x: number; y: number } | null>(null);

  // Active effect object
  const currentStagedEffect = useMemo(() => {
    return stagedEffectId ? getProfileEffectById(stagedEffectId) : null;
  }, [stagedEffectId]);

  // Handle back button / dismiss attempt
  const handleBack = () => {
    if (rawAvatarSrc) {
      // In middle of cropping: cancel crop first
      setRawAvatarSrc(null);
      return;
    }
    if (hasUnsavedChanges) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  // Process chosen photo file
  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid format", description: "Please upload an image file (PNG, JPG, WEBP)", variant: "destructive" });
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      toast({ title: "File too large", description: "Image size must be under 12MB", variant: "destructive" });
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

  // Pointer event handlers for touch-safe Pan & Pinch-Zoom
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!cropAreaRef.current) return;
    cropAreaRef.current.setPointerCapture(e.pointerId);

    pointersMapRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const activePointers = Array.from(pointersMapRef.current.values());
    if (activePointers.length === 1) {
      lastPanPointRef.current = { x: e.clientX, y: e.clientY };
    } else if (activePointers.length === 2) {
      const p1 = activePointers[0];
      const p2 = activePointers[1];
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      initialPinchDistRef.current = dist > 0 ? dist : 1;
      initialZoomOnPinchRef.current = avatarZoom;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!pointersMapRef.current.has(e.pointerId)) return;

    pointersMapRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const activePointers = Array.from(pointersMapRef.current.values());

    if (activePointers.length === 2 && initialPinchDistRef.current) {
      // Pinch to Zoom
      const p1 = activePointers[0];
      const p2 = activePointers[1];
      const currentDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const ratio = currentDist / initialPinchDistRef.current;
      const nextZoom = Math.min(3.5, Math.max(1, initialZoomOnPinchRef.current * ratio));
      setAvatarZoom(Number(nextZoom.toFixed(2)));
    } else if (activePointers.length === 1 && lastPanPointRef.current) {
      // 1-Finger Pan
      const dx = e.clientX - lastPanPointRef.current.x;
      const dy = e.clientY - lastPanPointRef.current.y;
      setAvatarPan((prev) => ({
        x: Math.max(-180, Math.min(180, prev.x + dx)),
        y: Math.max(-180, Math.min(180, prev.y + dy)),
      }));
      lastPanPointRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    pointersMapRef.current.delete(e.pointerId);
    if (cropAreaRef.current) {
      try {
        cropAreaRef.current.releasePointerCapture(e.pointerId);
      } catch {}
    }
    const remaining = Array.from(pointersMapRef.current.values());
    if (remaining.length === 1) {
      lastPanPointRef.current = remaining[0];
      initialPinchDistRef.current = null;
    } else if (remaining.length === 0) {
      lastPanPointRef.current = null;
      initialPinchDistRef.current = null;
    }
  };

  // Apply Crop to Canvas & Stage
  const handleApplyCrop = async () => {
    if (!rawAvatarSrc) return;
    setIsProcessingCrop(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not initialize canvas context");

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
      ctx.translate((avatarPan.x / 240) * 512, (avatarPan.y / 240) * 512);
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
      toast({ title: "Avatar staged!", description: "Preview updated. Tap 'Save' above to publish." });
    } catch (err: any) {
      toast({ title: "Failed to crop photo", description: err.message || "Error", variant: "destructive" });
    } finally {
      setIsProcessingCrop(false);
    }
  };

  // Filtered Effects
  const filteredEffects = useMemo(() => {
    return PROFILE_EFFECTS_CATALOG.filter((eff) => {
      const matchCat = selectedEffectCat === "all" || eff.category === selectedEffectCat;
      const matchSearch =
        !searchQuery.trim() ||
        eff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        eff.nameAr?.includes(searchQuery) ||
        eff.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [selectedEffectCat, searchQuery]);

  // Filtered Decorations
  const filteredDecorations = useMemo(() => {
    return DECORATIONS_CATALOG.filter((dec) => {
      const matchCat = selectedDecCat === "all" || dec.category === selectedDecCat;
      const matchSearch =
        !searchQuery.trim() ||
        dec.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dec.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [selectedDecCat, searchQuery]);

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0e1a] text-slate-100 flex flex-col overflow-hidden pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER: Back, Title, Save                             */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header className="h-14 border-b border-[#1e2d4a] bg-[#0d1322] px-3.5 flex items-center justify-between shrink-0 z-20">
        <button
          type="button"
          onClick={handleBack}
          className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center text-slate-200 active:bg-white/10 active:scale-95 transition-all"
          aria-label="Back"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div className="flex-1 text-center px-2">
          <h1 className="text-sm font-bold text-white tracking-tight">Customize Profile</h1>
          <p className="text-[10px] text-slate-400 truncate">
            {hasUnsavedChanges ? "● Unsaved edits" : `@${currentUser.username}`}
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          disabled={isSaving || !hasUnsavedChanges}
          onClick={onSave}
          className={cn(
            "h-8 px-3.5 rounded-full text-xs font-bold transition-all shadow-md",
            hasUnsavedChanges
              ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-500/25 active:scale-95"
              : "bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed shadow-none"
          )}
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <span>Save</span>
          )}
        </Button>
      </header>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. STICKY LIVE PROFILE PREVIEW CARD                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-3 bg-gradient-to-b from-[#0d1322] to-[#0a0e1a] border-b border-[#1e2d4a] shrink-0 z-10">
        <div className="relative rounded-2xl p-3 border border-[#223352] bg-[#12192b]/90 shadow-xl overflow-hidden flex items-center gap-3.5 min-h-[82px]">
          {/* Real Full Animated Effect in Live Preview */}
          {stagedEffectId && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl opacity-90">
              <ProfileEffectRenderer effectId={stagedEffectId} variant="card" performanceTier="auto" />
            </div>
          )}

          {/* Avatar with Frame */}
          <div className="relative shrink-0 z-10">
            <DecoratedAvatar
              avatarUrl={stagedAvatarUrl}
              decorationId={stagedDecorationId}
              username={currentUser.username}
              size="lg"
            />
          </div>

          {/* User Info */}
          <div className="min-w-0 flex-1 z-10">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-white truncate">
                {currentUser.fullName || currentUser.username}
              </span>
              {currentUser.isVerified && (
                <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px] font-bold">
                  ✓
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 truncate">@{currentUser.username}</div>

            {/* Active Setup Badges */}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 truncate max-w-[130px]">
                {stagedDecorationId ? (getDecorationById(stagedDecorationId)?.name || "Frame") : "Clean Frame"}
              </span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 truncate max-w-[130px]">
                {stagedEffectId ? (currentStagedEffect?.name || "Effect") : "Standard Aura"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. CATEGORY NAVIGATION TABS (Horizontal Scroll)              */}
      {/* ───────────────────────────────────────────────────────────── */}
      <nav className="border-b border-[#1e2d4a] bg-[#0d1322] px-2.5 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 z-10">
        {[
          { id: "avatar", label: "Avatar", icon: Camera },
          { id: "effects", label: "Effects", icon: Waves },
          { id: "decorations", label: "Frames", icon: Layers },
          { id: "themes", label: "Themes", icon: Palette },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id as any);
                setSearchQuery("");
              }}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 active:scale-95",
                isActive
                  ? "bg-white text-slate-950 font-bold shadow-sm"
                  : "bg-transparent text-slate-400 hover:text-slate-200 hover:bg-[#151f38]"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. MAIN SCROLLABLE CONTENT BODY                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB 1: AVATAR STUDIO                                       */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === "avatar" && (
          <div className="space-y-4 max-w-md mx-auto">
            {rawAvatarSrc ? (
              /* ACTIVE CROPPER INTERACTION VIEW */
              <div className="p-4 rounded-3xl bg-[#12192b] border border-[#223352] space-y-4">
                <div className="text-center">
                  <h3 className="text-xs font-bold text-white">Position & Crop Avatar</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Drag with one finger, pinch with two to zoom
                  </p>
                </div>

                {/* Stable Square Viewport with Touch-Safe Pointer Events */}
                <div className="flex flex-col items-center select-none">
                  <div
                    ref={cropAreaRef}
                    className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-emerald-500 shadow-2xl bg-black cursor-grab active:cursor-grabbing touch-none select-none"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                  >
                    <div
                      className="w-full h-full flex items-center justify-center transition-transform duration-75 pointer-events-none"
                      style={{
                        transform: `translate(${avatarPan.x}px, ${avatarPan.y}px) scale(${avatarZoom}) rotate(${avatarRotation}deg)`,
                      }}
                    >
                      <img
                        src={rawAvatarSrc}
                        alt="Crop target"
                        className="max-w-none select-none pointer-events-none"
                        style={{ minWidth: "100%", minHeight: "100%", objectFit: "cover" }}
                      />
                    </div>

                    {/* Rule of Thirds Guide Grid */}
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

                  <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                    <Move className="w-3 h-3 text-emerald-400" />
                    <span>Drag photo • Pinch with 2 fingers to zoom</span>
                  </div>
                </div>

                {/* Zoom & Rotation Controls */}
                <div className="space-y-3 p-3 rounded-2xl bg-[#0a0e1a] border border-[#223352]">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span className="flex items-center gap-1 font-medium">
                        <ZoomIn className="w-3.5 h-3.5 text-emerald-400" /> Zoom
                      </span>
                      <span className="font-mono text-white text-[11px]">
                        {Math.round(avatarZoom * 100)}%
                      </span>
                    </div>
                    <Slider
                      min={1}
                      max={3.5}
                      step={0.05}
                      value={[avatarZoom]}
                      onValueChange={(vals) => setAvatarZoom(vals[0] || 1)}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#223352]/80">
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAvatarRotation((r) => (r - 90 + 360) % 360)}
                        className="h-8 px-2.5 rounded-xl text-xs gap-1 border-[#223352] bg-[#12192b] text-slate-200 hover:text-white"
                      >
                        <RotateCcw className="w-3 h-3" /> -90°
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAvatarRotation((r) => (r + 90) % 360)}
                        className="h-8 px-2.5 rounded-xl text-xs gap-1 border-[#223352] bg-[#12192b] text-slate-200 hover:text-white"
                      >
                        <RotateCw className="w-3 h-3" /> +90°
                      </Button>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAvatarPan({ x: 0, y: 0 });
                        setAvatarZoom(1);
                        setAvatarRotation(0);
                      }}
                      className="h-8 text-xs text-slate-400 hover:text-white"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" /> Reset
                    </Button>
                  </div>
                </div>

                {/* Crop Confirmation Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRawAvatarSrc(null)}
                    disabled={isProcessingCrop}
                    className="flex-1 h-10 rounded-2xl text-xs border-[#223352] text-slate-300 hover:text-white bg-[#0a0e1a]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleApplyCrop}
                    disabled={isProcessingCrop}
                    className="flex-1 h-10 rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 shadow-md shadow-emerald-600/25"
                  >
                    {isProcessingCrop ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Use Photo</span>
                  </Button>
                </div>
              </div>
            ) : (
              /* AVATAR UPLOAD MENU */
              <div className="space-y-4">
                <div className="p-5 rounded-3xl bg-[#12192b] border border-[#223352] flex flex-col items-center text-center space-y-4">
                  <div className="relative">
                    <DecoratedAvatar
                      avatarUrl={stagedAvatarUrl}
                      decorationId={stagedDecorationId}
                      username={currentUser.username}
                      size="2xl"
                    />
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-white">Profile Photo</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      This photo represents you across WhiterChat posts, messages, and stories.
                    </p>
                  </div>

                  {/* Touch Action Buttons */}
                  <div className="w-full space-y-2 pt-2">
                    <Button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-2 shadow-lg shadow-indigo-600/20 active:scale-98"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Choose From Photos</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => cameraInputRef.current?.click()}
                      className="w-full h-11 rounded-2xl border-[#223352] bg-[#0a0e1a] text-slate-200 hover:text-white font-semibold text-xs gap-2 active:scale-98"
                    >
                      <Camera className="w-4 h-4 text-emerald-400" />
                      <span>Take Selfie / Photo</span>
                    </Button>

                    {stagedAvatarUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setStagedAvatarUrl(null);
                          toast({ title: "Avatar removed", description: "Reverted to initials avatar. Save to confirm." });
                        }}
                        className="w-full h-10 rounded-2xl text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Photo</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB 2: PROFILE EFFECTS GALLERY                             */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === "effects" && (
          <div className="space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 50+ energy & creature effects..."
                className="pl-9 h-10 text-xs rounded-2xl bg-[#12192b] border-[#223352] text-white"
              />
            </div>

            {/* Category Chips (Horizontally Scrollable) */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {EFFECT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedEffectCat(cat.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors border",
                    selectedEffectCat === cat.id
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                      : "bg-[#12192b] text-slate-400 border-[#223352] hover:text-slate-200"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Effects Grid: 2-col on small, 3-col on 400px+ */}
            <div className="grid grid-cols-2 min-[400px]:grid-cols-3 gap-2.5 pb-6">
              {/* None / Clean Option */}
              <div
                onClick={() => {
                  setStagedEffectId(null);
                  onPreviewEffectChange?.(null);
                }}
                className={cn(
                  "p-3 rounded-2xl border flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[110px] active:scale-95",
                  stagedEffectId === null
                    ? "border-indigo-500 bg-indigo-500/20 ring-2 ring-indigo-500 shadow-lg"
                    : "border-dashed border-[#223352] bg-[#12192b] text-slate-400"
                )}
              >
                <div className="w-8 h-8 rounded-xl bg-[#18233a] flex items-center justify-center text-slate-300 mb-2">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-white">None</div>
                <div className="text-[10px] text-slate-400">Clean Aura</div>
              </div>

              {/* Lightweight Effect Thumbnails */}
              {filteredEffects.map((eff) => {
                const isSelected = stagedEffectId === eff.id;
                const isLive = currentUser.activeProfileEffectId === eff.id;
                const rarity = RARITY_COLORS[eff.rarity] || RARITY_COLORS.common;

                return (
                  <div
                    key={eff.id}
                    onClick={() => {
                      setStagedEffectId(eff.id);
                      onPreviewEffectChange?.(eff.id);
                    }}
                    className={cn(
                      "relative p-3 rounded-2xl border flex flex-col items-center text-center cursor-pointer transition-all min-h-[110px] active:scale-95",
                      isSelected
                        ? "border-indigo-500 bg-indigo-500/20 ring-2 ring-indigo-500 shadow-lg"
                        : "border-[#223352] bg-[#12192b] hover:border-slate-500"
                    )}
                  >
                    {/* Active Selected Check Badge */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px]">
                        ✓
                      </div>
                    )}

                    {/* Effect Visual Icon / Palette Badge */}
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg my-1 shadow-md border"
                      style={{
                        background: `radial-gradient(circle, ${eff.colors?.primary || "#6366f1"}40, transparent)`,
                        borderColor: `${eff.colors?.primary || "#6366f1"}60`,
                      }}
                    >
                      {eff.badge || "✨"}
                    </div>

                    {/* Name */}
                    <div className="font-bold text-xs text-white truncate w-full mt-1">
                      {eff.name}
                    </div>

                    {/* Rarity & Status */}
                    <div className="flex items-center gap-1 mt-1">
                      <span className={cn("text-[9px] font-mono px-1.5 py-0.2 rounded-full border", rarity.bg, rarity.text, rarity.border)}>
                        {eff.rarity}
                      </span>
                      {isLive && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB 3: AVATAR FRAMES (DECORATIONS)                         */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === "decorations" && (
          <div className="space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search avatar frames..."
                className="pl-9 h-10 text-xs rounded-2xl bg-[#12192b] border-[#223352] text-white"
              />
            </div>

            {/* Category Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {DECORATION_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedDecCat(cat.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors border",
                    selectedDecCat === cat.id
                      ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                      : "bg-[#12192b] text-slate-400 border-[#223352] hover:text-slate-200"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Frames Grid */}
            <div className="grid grid-cols-2 min-[400px]:grid-cols-3 gap-2.5 pb-6">
              {/* Clean Frame Option */}
              <div
                onClick={() => setStagedDecorationId(null)}
                className={cn(
                  "p-3 rounded-2xl border flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[120px] active:scale-95",
                  stagedDecorationId === null
                    ? "border-emerald-500 bg-emerald-500/20 ring-2 ring-emerald-500 shadow-lg"
                    : "border-dashed border-[#223352] bg-[#12192b] text-slate-400"
                )}
              >
                <div className="w-8 h-8 rounded-xl bg-[#18233a] flex items-center justify-center text-slate-300 mb-2">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-white">Clean</div>
                <div className="text-[10px] text-slate-400">No Frame</div>
              </div>

              {filteredDecorations.map((dec) => {
                const isSelected = stagedDecorationId === dec.id;
                const isLive = currentUser.activeDecorationId === dec.id;
                const rarity = RARITY_COLORS[dec.rarity] || RARITY_COLORS.common;

                return (
                  <div
                    key={dec.id}
                    onClick={() => setStagedDecorationId(dec.id)}
                    className={cn(
                      "relative p-3 rounded-2xl border flex flex-col items-center text-center cursor-pointer transition-all min-h-[120px] active:scale-95",
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/20 ring-2 ring-emerald-500 shadow-lg"
                        : "border-[#223352] bg-[#12192b] hover:border-slate-500"
                    )}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                        ✓
                      </div>
                    )}

                    <div className="my-2">
                      <DecoratedAvatar
                        avatarUrl={stagedAvatarUrl}
                        decorationId={dec.id}
                        username={currentUser.username}
                        size="md"
                      />
                    </div>

                    <div className="font-bold text-xs text-white truncate w-full mt-1">
                      {dec.name}
                    </div>

                    <div className="flex items-center gap-1 mt-1">
                      <span className={cn("text-[9px] font-mono px-1.5 py-0.2 rounded-full border", rarity.bg, rarity.text, rarity.border)}>
                        {dec.rarity}
                      </span>
                      {isLive && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB 4: ACCENT THEMES                                       */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === "themes" && (
          <div className="space-y-4 max-w-md mx-auto">
            <div className="p-4 rounded-3xl bg-[#12192b] border border-[#223352] space-y-3">
              <h3 className="font-bold text-xs text-white flex items-center gap-2">
                <Palette className="w-4 h-4 text-cyan-400" />
                <span>Accent Color</span>
              </h3>
              <p className="text-xs text-slate-400">
                Choose your brand accent color for buttons, highlights, and profile glow.
              </p>

              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 pt-2">
                {PRESET_COLORS.map((col) => (
                  <button
                    key={col.hex}
                    type="button"
                    onClick={() => {
                      applyAccentColor(col.hex);
                      toast({ title: `Theme set to ${col.name}` });
                    }}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-[#0a0e1a] border border-[#223352] hover:border-slate-400 active:scale-95 transition-all"
                  >
                    <div
                      className="w-7 h-7 rounded-full shadow-md"
                      style={{ backgroundColor: col.hex }}
                    />
                    <span className="text-[10px] text-slate-300 font-medium truncate w-full text-center">
                      {col.name.split(" ")[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. UNSAVED CHANGES CONFIRMATION POPUP                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12192b] border border-[#223352] rounded-3xl p-5 max-w-xs w-full text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">Discard Unsaved Changes?</h4>
              <p className="text-xs text-slate-400 mt-1">
                You have staged appearance edits that haven't been saved yet.
              </p>
            </div>
            <div className="space-y-2">
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setShowDiscardConfirm(false);
                  onClose();
                }}
                className="w-full h-10 rounded-2xl text-xs font-bold"
              >
                Discard Edits
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDiscardConfirm(false)}
                className="w-full h-10 rounded-2xl text-xs border-[#223352] text-slate-300 bg-[#0a0e1a]"
              >
                Keep Editing
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
