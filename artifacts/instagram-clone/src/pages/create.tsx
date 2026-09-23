import { useState, useRef, useCallback, useEffect } from "react";
import { useUploadPostMedia, useCreatePost, useGenerateCaption } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  ImagePlus,
  X,
  Sparkles,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Users,
  Lock,
  MessageCircleOff,
  Info,
  Check,
  Upload,
  Image as ImageIcon,
  Grid3X3,
  Film,
  Sliders,
  Play,
  Pause,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Smile,
  Hash,
  AtSign,
  ChevronDown,
  Layers,
  Globe,
  Settings2,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CreateReelModal } from "@/components/reels/CreateReelModal";
import { StoryCreator } from "@/components/StoryCreator";
import { apiUrl } from "@/lib/api-url";

// ─── Filter presets ───────────────────────────────────────────────────────────
const FILTERS = [
  { name: "Normal", css: "none" },
  { name: "Clarendon", css: "contrast(1.2) saturate(1.35)" },
  { name: "Juno", css: "saturate(1.4) contrast(1.05) brightness(1.02)" },
  { name: "Lark", css: "contrast(0.9) brightness(1.1) saturate(1.4)" },
  { name: "Ludwig", css: "contrast(1.05) brightness(1.05) saturate(1.3)" },
  { name: "Moon", css: "grayscale(1) contrast(1.1) brightness(1.1)" },
  { name: "Perpetua", css: "contrast(1.1) brightness(1.05) saturate(1.1)" },
  { name: "Reyes", css: "sepia(0.4) contrast(0.85) brightness(1.1) saturate(0.75)" },
  { name: "Slumber", css: "saturate(0.66) brightness(1.05)" },
] as const;

// ─── Aspect ratios ────────────────────────────────────────────────────────────
const RATIOS = [
  { label: "1:1", desc: "Square", icon: "■", style: { aspectRatio: "1/1" } },
  { label: "4:5", desc: "Portrait", icon: "▬", style: { aspectRatio: "4/5" } },
  { label: "16:9", desc: "Landscape", icon: "▭", style: { aspectRatio: "16/9" } },
  { label: "Original", desc: "Auto", icon: "⊞", style: { aspectRatio: "auto" } },
] as const;

// ─── Hashtag suggestions ──────────────────────────────────────────────────────
const POPULAR_TAGS = [
  "photography", "art", "lifestyle", "travel", "nature",
  "creativity", "vibes", "design", "explore", "aesthetic",
  "sunset", "inspiration", "portrait", "community", "music",
];

// ─── AI prompt tones ──────────────────────────────────────────────────────────
const AI_PROMPTS = [
  { label: "Engaging & Fun", prompt: "Write an engaging, vibrant, and fun caption with high conversational energy" },
  { label: "Inspirational", prompt: "Write a motivational and thoughtful caption about perseverance and growth" },
  { label: "Witty & Playful", prompt: "Create a short, witty caption with subtle humor and clever phrasing" },
  { label: "Minimalist", prompt: "Write a clean, aesthetic one-liner caption with quiet confidence" },
  { label: "Storytelling", prompt: "Draft a heartfelt storytelling caption sharing a meaningful perspective" },
];

const EMOJI_LIST = ["✨", "🔥", "📸", "🖤", "💫", "🌿", "🚀", "💡", "☕", "🌊", "🎉", "❤️"];

type Step = "select" | "edit" | "details";
type CreationType = "post" | "reel" | "story";

interface MediaItem {
  file: File;
  preview: string;
  filterIndex: number;
}

interface UserSuggestion {
  _id: string;
  username: string;
  name?: string;
  avatar?: string;
}

export default function Create() {
  const [creationType, setCreationType] = useState<CreationType>("post");
  const [reelModalOpen, setReelModalOpen] = useState(false);
  const [storyCreatorOpen, setStoryCreatorOpen] = useState(false);

  // ── Step state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("select");

  // ── Media state ─────────────────────────────────────────────────────────────
  const [items, setItems] = useState<MediaItem[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [ratioIdx, setRatioIdx] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Video preview controls ──────────────────────────────────────────────────
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // ── Caption & details state ─────────────────────────────────────────────────
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [altText, setAltText] = useState("");
  const [audience, setAudience] = useState<"everyone" | "close_friends">("everyone");
  const [commentsDisabled, setCommentsDisabled] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ── Hashtag and Mention Autocomplete ────────────────────────────────────────
  const [hashtagSuggestions, setHashtagSuggestions] = useState<string[]>([]);
  const [mentionSuggestions, setMentionSuggestions] = useState<UserSuggestion[]>([]);
  const captionRef = useRef<HTMLTextAreaElement>(null);

  // ── AI state ────────────────────────────────────────────────────────────────
  const [showAI, setShowAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  // ── Real upload progress ────────────────────────────────────────────────────
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  const { toast } = useToast();
  const [, setLocation_] = useLocation();

  const uploadMutation = useUploadPostMedia();
  const createMutation = useCreatePost();
  const generateCaptionMutation = useGenerateCaption();

  const isPosting = uploadMutation.isPending || createMutation.isPending;
  const activeItem = items[activeIdx] ?? null;

  // ── File processing ─────────────────────────────────────────────────────────
  const processFiles = useCallback(
    (files: File[]) => {
      const valid = files.filter((f) => {
        if (!f.type.startsWith("image/") && !f.type.startsWith("video/")) {
          toast({
            title: `${f.name} skipped`,
            description: "Only image and video files are supported.",
            variant: "destructive",
          });
          return false;
        }
        if (f.size > 50 * 1024 * 1024) {
          toast({
            title: `${f.name} is too large`,
            description: "Maximum file size is 50 MB.",
            variant: "destructive",
          });
          return false;
        }
        return true;
      });

      const remaining = 10 - items.length;
      const toAdd = valid.slice(0, remaining);
      if (valid.length > remaining) {
        toast({
          title: "File Limit Reached",
          description: `You can select up to 10 media files per post. Added ${toAdd.length} files.`,
        });
      }

      toAdd.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setItems((prev) => [
            ...prev,
            { file, preview: reader.result as string, filterIndex: 0 },
          ]);
        };
        reader.readAsDataURL(file);
      });

      if (toAdd.length > 0 && step === "select") {
        setStep("edit");
      }
    },
    [items.length, step, toast]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) processFiles(files);
    e.target.value = "";
  };

  // ── Drag & drop ─────────────────────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    processFiles(Array.from(e.dataTransfer.files));
  };

  // ── Filter assignment ────────────────────────────────────────────────────────
  const setFilter = (filterIdx: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === activeIdx ? { ...item, filterIndex: filterIdx } : item
      )
    );
  };

  // ── Reordering items ────────────────────────────────────────────────────────
  const moveItem = (fromIdx: number, direction: "left" | "right") => {
    const toIdx = direction === "left" ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= items.length) return;
    setItems((prev) => {
      const copy = [...prev];
      const [removed] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, removed);
      return copy;
    });
    setActiveIdx(toIdx);
  };

  // ── Remove item ─────────────────────────────────────────────────────────────
  const removeItem = (idx: number) => {
    const next = items.filter((_, i) => i !== idx);
    setItems(next);
    setActiveIdx(Math.min(activeIdx, Math.max(0, next.length - 1)));
    if (next.length === 0) {
      setStep("select");
      setActiveIdx(0);
    }
  };

  // ── Hashtag & Mention Detection ─────────────────────────────────────────────
  useEffect(() => {
    const words = caption.split(/\s/);
    const lastWord = words[words.length - 1] || "";

    // Hashtags
    if (lastWord.startsWith("#") && lastWord.length > 1) {
      const q = lastWord.slice(1).toLowerCase();
      setHashtagSuggestions(
        POPULAR_TAGS.filter((t) => t.startsWith(q) && t !== q).slice(0, 6)
      );
    } else {
      setHashtagSuggestions([]);
    }

    // Mentions (@)
    if (lastWord.startsWith("@") && lastWord.length > 1) {
      const q = lastWord.slice(1);
      const controller = new AbortController();
      fetch(apiUrl(`/api/search/users?q=${encodeURIComponent(q)}`), {
        signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : { users: [] }))
        .then((data) => {
          setMentionSuggestions((data.users || []).slice(0, 5));
        })
        .catch(() => {
          setMentionSuggestions([]);
        });
      return () => controller.abort();
    } else {
      setMentionSuggestions([]);
    }
  }, [caption]);

  const insertHashtag = (tag: string) => {
    const words = caption.split(/\s/);
    words[words.length - 1] = `#${tag} `;
    setCaption(words.join(" "));
    setHashtagSuggestions([]);
    captionRef.current?.focus();
  };

  const insertMention = (username: string) => {
    const words = caption.split(/\s/);
    words[words.length - 1] = `@${username} `;
    setCaption(words.join(" "));
    setMentionSuggestions([]);
    captionRef.current?.focus();
  };

  const insertEmoji = (emoji: string) => {
    setCaption((prev) => prev + emoji);
    captionRef.current?.focus();
  };

  // ── AI caption ──────────────────────────────────────────────────────────────
  const handleGenerateCaption = async (promptOverride?: string) => {
    const prompt = promptOverride ?? aiPrompt.trim();
    if (!prompt) {
      toast({ title: "Enter a prompt description first", variant: "destructive" });
      return;
    }
    setAiGenerating(true);
    try {
      const result = await generateCaptionMutation.mutateAsync({
        data: { prompt },
      });
      setCaption(result.caption);
      toast({ title: "Caption generated successfully" });
    } catch (e: any) {
      toast({
        title: "AI Caption Failed",
        description: e?.message ?? "Could not generate caption at this time.",
        variant: "destructive",
      });
    } finally {
      setAiGenerating(false);
    }
  };

  // ── Submit post ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (items.length === 0) {
      toast({ title: "No media attached", description: "Please attach at least one photo or video.", variant: "destructive" });
      return;
    }

    try {
      setUploadProgress({ current: 0, total: items.length });
      const uploadedUrls: string[] = [];

      for (let i = 0; i < items.length; i++) {
        setUploadProgress({ current: i + 1, total: items.length });
        const res = await uploadMutation.mutateAsync({
          data: { data: items[i].preview, mimeType: items[i].file.type },
        });
        uploadedUrls.push(res.url);
      }

      const [firstUrl, ...restUrls] = uploadedUrls;
      const mediaType = items[0].file.type.startsWith("video/") ? "video" : "image";

      await createMutation.mutateAsync({
        data: {
          caption: caption || undefined,
          mediaUrl: firstUrl,
          mediaType,
          audience,
          location: location || undefined,
          altText: altText || undefined,
          commentsDisabled,
          additionalMediaUrls: restUrls,
        } as any,
      });

      toast({
        title: "Post Published!",
        description: "Your post is now live in the community feed.",
      });
      setLocation_("/");
    } catch (e: any) {
      toast({
        title: "Failed to publish post",
        description: e.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setUploadProgress(null);
    }
  };

  // ── Switch Creation Types ───────────────────────────────────────────────────
  const handleTypeSelect = (type: CreationType) => {
    setCreationType(type);
    if (type === "reel") {
      setReelModalOpen(true);
    } else if (type === "story") {
      setStoryCreatorOpen(true);
    }
  };

  // ── Navigation step header ──────────────────────────────────────────────────
  const StepHeader = () => (
    <div className="flex items-center gap-1.5 text-xs">
      {(["select", "edit", "details"] as Step[]).map((s, i) => {
        const labels: Record<Step, string> = {
          select: "1. Upload",
          edit: "2. Edit & Filter",
          details: "3. Details & Publish",
        };
        const isActive = step === s;
        const isPassed =
          (step === "details" && s !== "details") ||
          (step === "edit" && s === "select");

        return (
          <div key={s} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />}
            <span
              className={cn(
                "px-2.5 py-1 rounded-full font-medium transition-colors text-xs",
                isActive
                  ? "bg-primary text-primary-foreground font-semibold"
                  : isPassed
                  ? "text-foreground font-semibold hover:underline cursor-pointer"
                  : "text-muted-foreground"
              )}
              onClick={() => {
                if (isPassed) setStep(s);
              }}
            >
              {labels[s]}
            </span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto pt-2 sm:pt-4 pb-24 md:pb-12 px-3 sm:px-6 space-y-6">
      {/* ── Studio Header & Format Selector ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Creation Studio
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Publish authentic photos, immersive reels, and interactive stories to your audience.
          </p>
        </div>

        {/* Content Type Selector Pills */}
        <div className="flex items-center p-1 bg-muted/60 rounded-xl border border-border/70 self-start sm:self-auto">
          <button
            onClick={() => handleTypeSelect("post")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
              creationType === "post"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ImageIcon className="w-3.5 h-3.5 text-primary" />
            <span>Post</span>
          </button>
          <button
            onClick={() => handleTypeSelect("reel")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
              creationType === "reel"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Film className="w-3.5 h-3.5 text-pink-500" />
            <span>Reel</span>
          </button>
          <button
            onClick={() => handleTypeSelect("story")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
              creationType === "story"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Story</span>
          </button>
        </div>
      </div>

      {/* ── STEP 1: SELECT / UPLOAD WORKSPACE ─────────────────────────── */}
      {step === "select" && (
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
              <span className="font-bold text-sm text-foreground">Upload Media</span>
              <StepHeader />
            </div>

            {/* Drag & Drop Area */}
            <div
              className={cn(
                "m-6 border-2 border-dashed rounded-2xl transition-all cursor-pointer",
                "flex flex-col items-center justify-center gap-4 py-16 px-6 text-center",
                isDragOver
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              )}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div
                className={cn(
                  "rounded-2xl p-4 transition-colors shadow-inner",
                  isDragOver ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                )}
              >
                <Upload className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <p className="font-bold text-base text-foreground">
                  {isDragOver ? "Drop files to upload" : "Drag and drop your photos or videos"}
                </p>
                <p className="text-xs text-muted-foreground">
                  or click anywhere to browse your files from device
                </p>
              </div>

              <Button
                variant="default"
                size="sm"
                className="rounded-xl px-5 font-semibold gap-2 shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                <ImagePlus className="w-4 h-4" />
                Select From Computer
              </Button>

              <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-4 border-t border-border/60">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" /> High-res JPG, PNG, WEBP
                </span>
                <span>·</span>
                <span className="flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5" /> MP4 or MOV video
                </span>
                <span>·</span>
                <span className="flex items-center gap-1.5">
                  <Grid3X3 className="w-3.5 h-3.5" /> Up to 10 files
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: EDIT & FILTER WORKSPACE ───────────────────────────── */}
      {step === "edit" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          {/* Top Bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/20">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep("select")}
              className="gap-1.5 text-xs font-semibold"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Upload
            </Button>
            <StepHeader />
            <Button
              onClick={() => setStep("details")}
              size="sm"
              className="rounded-xl px-5 font-semibold gap-1.5 shadow-sm"
            >
              Next: Details <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
            {/* Center: Main Preview Canvas */}
            <div className="lg:col-span-8 bg-black/95 flex flex-col items-center justify-center p-4 relative overflow-hidden min-h-[380px] lg:min-h-[520px]">
              {activeItem && (
                <div
                  className="w-full max-w-[500px] flex items-center justify-center transition-all overflow-hidden rounded-lg shadow-2xl"
                  style={RATIOS[ratioIdx].style as any}
                >
                  {activeItem.file.type.startsWith("video/") ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <video
                        ref={videoRef}
                        src={activeItem.preview}
                        className="w-full h-full object-contain"
                        style={{ filter: FILTERS[activeItem.filterIndex].css }}
                        controls
                        autoPlay
                        loop
                      />
                    </div>
                  ) : (
                    <img
                      src={activeItem.preview}
                      className="w-full h-full object-cover select-none"
                      style={{ filter: FILTERS[activeItem.filterIndex].css }}
                      alt="Preview"
                    />
                  )}
                </div>
              )}

              {/* Prev / Next Item overlay arrows */}
              {items.length > 1 && (
                <>
                  {activeIdx > 0 && (
                    <button
                      onClick={() => setActiveIdx((i) => i - 1)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white rounded-full h-9 w-9 flex items-center justify-center transition-all shadow-md z-10"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  )}
                  {activeIdx < items.length - 1 && (
                    <button
                      onClick={() => setActiveIdx((i) => i + 1)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white rounded-full h-9 w-9 flex items-center justify-center transition-all shadow-md z-10"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}

                  {/* Dot Indicators */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm z-10">
                    {items.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveIdx(i)}
                        className={cn(
                          "w-2 h-2 rounded-full transition-all",
                          i === activeIdx ? "bg-white scale-125" : "bg-white/40 hover:bg-white/70"
                        )}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Right: Studio Controls (Aspect Ratio & Filters) */}
            <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-border flex flex-col bg-card">
              {/* Aspect Ratio Selector */}
              <div className="p-4 border-b border-border space-y-2">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Aspect Ratio
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {RATIOS.map((r, i) => (
                    <button
                      key={r.label}
                      onClick={() => setRatioIdx(i)}
                      className={cn(
                        "py-2 px-1 text-center rounded-xl border text-xs font-semibold transition-all",
                        ratioIdx === i
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span className="text-sm block mb-0.5">{r.icon}</span>
                      <span>{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Photo Filter Presets */}
              <div className="p-4 flex-1 overflow-y-auto space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Filter Effects
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Applied to item {activeIdx + 1} of {items.length}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {FILTERS.map((f, i) => (
                    <button
                      key={f.name}
                      onClick={() => setFilter(i)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-1.5 rounded-xl border transition-all text-center",
                        (activeItem?.filterIndex ?? 0) === i
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-transparent hover:border-border"
                      )}
                    >
                      {activeItem && (
                        <div className="w-full aspect-square rounded-lg overflow-hidden border border-border/50">
                          <img
                            src={activeItem.preview}
                            className="w-full h-full object-cover"
                            style={{ filter: f.css }}
                            alt={f.name}
                          />
                        </div>
                      )}
                      <span className="text-[10px] font-semibold text-foreground">
                        {f.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Thumbnails Strip & Reordering */}
          {items.length > 0 && (
            <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between gap-4 overflow-x-auto">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
                  Media Items ({items.length}/10):
                </span>
                <div className="flex items-center gap-2">
                  {items.map((item, i) => (
                    <div
                      key={i}
                      className={cn(
                        "relative group rounded-xl overflow-hidden border-2 transition-all shrink-0",
                        i === activeIdx
                          ? "border-primary ring-2 ring-primary/20 scale-105"
                          : "border-border/80 opacity-70 hover:opacity-100"
                      )}
                    >
                      <button
                        onClick={() => setActiveIdx(i)}
                        className="block w-14 h-14"
                      >
                        <img
                          src={item.preview}
                          className="w-full h-full object-cover"
                          style={{ filter: FILTERS[item.filterIndex].css }}
                          alt={`Media ${i + 1}`}
                        />
                      </button>

                      {/* Cover Badge for Item 0 */}
                      {i === 0 && (
                        <span className="absolute bottom-0 inset-x-0 bg-primary/90 text-primary-foreground text-[8px] font-bold uppercase text-center py-0.5">
                          Cover
                        </span>
                      )}

                      {/* Reorder and Delete overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity">
                        {i > 0 && (
                          <button
                            onClick={() => moveItem(i, "left")}
                            className="text-white hover:text-primary p-0.5"
                            title="Move Left"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => removeItem(i)}
                          className="text-destructive hover:text-red-400 p-0.5"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {i < items.length - 1 && (
                          <button
                            onClick={() => moveItem(i, "right")}
                            className="text-white hover:text-primary p-0.5"
                            title="Move Right"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Add more button */}
                  {items.length < 10 && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-14 h-14 rounded-xl border-2 border-dashed border-border hover:border-primary flex flex-col items-center justify-center text-muted-foreground hover:text-primary transition-colors shrink-0"
                      title="Add more photos or videos"
                    >
                      <ImagePlus className="w-5 h-5" />
                      <span className="text-[9px] font-semibold mt-0.5">Add</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3: DETAILS & PUBLISH WORKSPACE ───────────────────────── */}
      {step === "details" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          {/* Top Bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/20">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep("edit")}
              className="gap-1.5 text-xs font-semibold"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Edit
            </Button>
            <StepHeader />
            <Button
              onClick={handleSubmit}
              disabled={isPosting || items.length === 0}
              className="rounded-xl px-6 font-bold shadow-md shadow-primary/20 gap-2"
            >
              {isPosting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {uploadProgress
                    ? `Uploading (${uploadProgress.current}/${uploadProgress.total})...`
                    : "Publishing..."}
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Share Post
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
            {/* Left: Media Preview Strip */}
            <div className="lg:col-span-4 bg-muted/30 p-5 border-b lg:border-b-0 lg:border-r border-border space-y-4">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Post Preview
              </span>

              {items[0] && (
                <div className="rounded-xl overflow-hidden border border-border bg-black shadow-md aspect-square relative">
                  {items[0].file.type.startsWith("video/") ? (
                    <video
                      src={items[0].preview}
                      className="w-full h-full object-cover"
                      style={{ filter: FILTERS[items[0].filterIndex].css }}
                    />
                  ) : (
                    <img
                      src={items[0].preview}
                      className="w-full h-full object-cover"
                      style={{ filter: FILTERS[items[0].filterIndex].css }}
                      alt="Cover Preview"
                    />
                  )}
                  {items.length > 1 && (
                    <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm">
                      <Layers className="w-3 h-3" />
                      <span>+{items.length - 1} more</span>
                    </div>
                  )}
                </div>
              )}

              {/* Thumbnails grid */}
              {items.length > 1 && (
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {items.map((item, i) => (
                    <div
                      key={i}
                      className={cn(
                        "aspect-square rounded-lg overflow-hidden border",
                        i === 0 ? "border-primary ring-1 ring-primary" : "border-border/60"
                      )}
                    >
                      <img
                        src={item.preview}
                        className="w-full h-full object-cover"
                        style={{ filter: FILTERS[item.filterIndex].css }}
                        alt={`Item ${i + 1}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Caption & Settings Form */}
            <div className="lg:col-span-8 p-5 sm:p-7 space-y-6">
              {/* Caption Area */}
              <div className="space-y-2 relative">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground">Post Caption</Label>
                  <span className="text-[11px] text-muted-foreground">
                    {caption.length} / 2,200
                  </span>
                </div>

                <div className="border border-border rounded-xl bg-card overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                  <Textarea
                    ref={captionRef}
                    placeholder="Write a caption... use # for hashtags and @ to mention people"
                    className="border-none focus-visible:ring-0 resize-none min-h-[120px] text-sm p-4 bg-transparent"
                    value={caption}
                    maxLength={2200}
                    onChange={(e) => setCaption(e.target.value)}
                  />

                  {/* Emoji Quick Tray */}
                  <div className="flex items-center justify-between px-3 py-2 border-t border-border/60 bg-muted/20">
                    <div className="flex items-center gap-1.5 overflow-x-auto">
                      {EMOJI_LIST.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => insertEmoji(emoji)}
                          className="hover:scale-125 transition-transform text-sm p-1"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAI(!showAI)}
                      className="text-xs font-semibold gap-1 text-primary hover:text-primary hover:bg-primary/10 h-7 px-2"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      AI Assist
                    </Button>
                  </div>
                </div>

                {/* Hashtag Suggestions Dropdown */}
                {hashtagSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-popover border border-border rounded-xl shadow-xl p-2 z-30 flex flex-wrap gap-1.5">
                    {hashtagSuggestions.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => insertHashtag(tag)}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                )}

                {/* Mention Suggestions Dropdown */}
                {mentionSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-popover border border-border rounded-xl shadow-xl p-2 z-30 space-y-1">
                    {mentionSuggestions.map((u) => (
                      <button
                        key={u._id}
                        onClick={() => insertMention(u.username)}
                        className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/80 text-left transition-colors"
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                          {u.username[0]?.toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-semibold text-foreground truncate">
                            @{u.username}
                          </p>
                          {u.name && (
                            <p className="text-[10px] text-muted-foreground truncate">{u.name}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* AI Caption Generator Panel */}
              {showAI && (
                <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="text-xs font-bold text-foreground">
                        AI Caption Generator
                      </span>
                    </div>
                    <button
                      onClick={() => setShowAI(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {AI_PROMPTS.map(({ label, prompt }) => (
                      <button
                        key={label}
                        onClick={() => handleGenerateCaption(prompt)}
                        disabled={aiGenerating}
                        className="text-xs px-3 py-1.5 rounded-lg border border-border bg-card hover:border-primary hover:text-primary transition-all font-medium disabled:opacity-50"
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Or describe the mood or theme for your caption..."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleGenerateCaption()}
                      disabled={aiGenerating}
                      className="text-xs"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleGenerateCaption()}
                      disabled={aiGenerating || !aiPrompt.trim()}
                      className="shrink-0 text-xs font-semibold gap-1.5"
                    >
                      {aiGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      Generate
                    </Button>
                  </div>
                </div>
              )}

              {/* Location Tagging */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  Add Location
                </Label>
                <Input
                  placeholder="e.g. Amman, Jordan or Silicon Valley, CA"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* Audience & Privacy */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                  Audience & Visibility
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAudience("everyone")}
                    className={cn(
                      "flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold transition-all text-left",
                      audience === "everyone"
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    <Globe className="w-4 h-4 shrink-0" />
                    <div>
                      <p className="font-bold text-foreground">Everyone</p>
                      <p className="text-[10px] text-muted-foreground font-normal">Visible to all users</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAudience("close_friends")}
                    className={cn(
                      "flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold transition-all text-left",
                      audience === "close_friends"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm"
                        : "border-border text-muted-foreground hover:border-emerald-500/40 hover:text-foreground"
                    )}
                  >
                    <Lock className="w-4 h-4 shrink-0" />
                    <div>
                      <p className="font-bold text-foreground">Close Friends</p>
                      <p className="text-[10px] text-muted-foreground font-normal">Only your private list</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Advanced Settings Accordion */}
              <div className="border border-border rounded-xl overflow-hidden bg-card">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full flex items-center justify-between p-4 text-xs font-bold text-foreground hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-muted-foreground" />
                    <span>Advanced Settings</span>
                  </div>
                  <ChevronDown
                    className={cn("w-4 h-4 text-muted-foreground transition-transform", showAdvanced && "rotate-180")}
                  />
                </button>

                {showAdvanced && (
                  <div className="p-4 pt-1 border-t border-border/60 space-y-4 text-xs">
                    {/* Disable comments switch */}
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <Label htmlFor="disable-comments" className="font-semibold text-foreground cursor-pointer">
                          Turn Off Commenting
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Prevent other members from leaving comments on this post.
                        </p>
                      </div>
                      <Switch
                        id="disable-comments"
                        checked={commentsDisabled}
                        onCheckedChange={setCommentsDisabled}
                      />
                    </div>

                    {/* Accessibility Alt Text */}
                    <div className="space-y-1.5 pt-2 border-t border-border/50">
                      <Label className="font-semibold text-foreground">Accessibility Alt Text</Label>
                      <Input
                        placeholder="Describe your photo for visually impaired people..."
                        value={altText}
                        onChange={(e) => setAltText(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*,video/*"
        multiple
        onChange={handleFileSelect}
      />

      {/* Reel Creation Studio Modal */}
      <CreateReelModal
        open={reelModalOpen}
        onOpenChange={(open) => {
          setReelModalOpen(open);
          if (!open) setCreationType("post");
        }}
        onReelCreated={() => {
          setReelModalOpen(false);
          setCreationType("post");
          toast({ title: "Reel Created", description: "Your reel has been published to the feed." });
          setLocation_("/reels");
        }}
      />

      {/* Story Creator Studio Overlay */}
      {storyCreatorOpen && (
        <StoryCreator
          onClose={() => {
            setStoryCreatorOpen(false);
            setCreationType("post");
          }}
          onSuccess={() => {
            setStoryCreatorOpen(false);
            setCreationType("post");
            toast({ title: "Story Shared", description: "Your story is live for 24 hours." });
            setLocation_("/");
          }}
        />
      )}
    </div>
  );
}
