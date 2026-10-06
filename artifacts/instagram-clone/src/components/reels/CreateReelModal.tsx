import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiUrl } from "@/lib/api-url";
import {
  Upload,
  Video,
  Play,
  Pause,
  Image as ImageIcon,
  Sparkles,
  Music,
  Lock,
  Globe,
  Loader2,
  CheckCircle2,
  X,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReelCreated?: (newReel: any) => void;
}

const POPULAR_HASHTAGS = [
  "reels", "viral", "explore", "trending", "fashion",
  "comedy", "music", "fitness", "dance", "tech", "gaming", "football"
];

export function CreateReelModal({ open, onOpenChange, onReelCreated }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<"select" | "details" | "publishing">("select");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  const [caption, setCaption] = useState("");
  const [audioTitle, setAudioTitle] = useState("");
  const [audience, setAudience] = useState<"everyone" | "close_friends">("everyone");

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Upload and processing pipeline states
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const resetForm = () => {
    setStep("select");
    setVideoFile(null);
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoPreviewUrl(null);
    setThumbnailUrl(null);
    setVideoDuration(null);
    setCaption("");
    setAudioTitle("");
    setAudience("everyone");
    setUploadProgress(0);
    setProcessingStage("");
  };

  const handleVideoFile = (file: File) => {
    if (!file.type.startsWith("video/")) {
      toast({
        title: "Invalid file type",
        description: "Please select a valid video file (MP4, WebM, MOV).",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Reel videos must be under 100 MB.",
        variant: "destructive",
      });
      return;
    }

    const preview = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoPreviewUrl(preview);
    setStep("details");
    setAudioTitle(`Original audio - ${user?.username || "creator"}`);
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      setVideoDuration(duration);
      // Automatically grab the first frame as cover
      setTimeout(() => captureFrameAsCover(), 300);
    }
  };

  const captureFrameAsCover = () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 720;
      canvas.height = video.videoHeight || 1280;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setThumbnailUrl(dataUrl);
        toast({ title: "Cover frame captured!" });
      }
    } catch {}
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handlePublish = async () => {
    if (!videoFile) return;

    setStep("publishing");
    setUploadProgress(15);
    setProcessingStage("Preparing video data...");

    try {
      // Step 1: Read video as base64 for reliable transport
      const reader = new FileReader();
      const videoBase64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(videoFile);
      });

      setUploadProgress(35);
      setProcessingStage("Optimizing video...");
      const videoBase64 = await videoBase64Promise;

      setUploadProgress(60);
      setProcessingStage("Uploading video to secure storage...");

      const token = localStorage.getItem("whiterchat_token");

      // Upload video
      const uploadRes = await fetch(apiUrl("/api/reels/upload"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          data: videoBase64,
          mimeType: videoFile.type,
        }),
      });

      let finalMediaUrl = videoBase64;
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        if (uploadData.url) finalMediaUrl = uploadData.url;
      }

      setUploadProgress(85);
      setProcessingStage("Generating Reel metadata and indexing...");

      // Upload or capture thumbnail
      let finalThumbnailUrl = thumbnailUrl;
      if (thumbnailUrl && thumbnailUrl.startsWith("data:")) {
        try {
          const thumbRes = await fetch(apiUrl("/api/posts/upload"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              data: thumbnailUrl,
              mimeType: "image/jpeg",
            }),
          });
          if (thumbRes.ok) {
            const thumbData = await thumbRes.json();
            if (thumbData.url) finalThumbnailUrl = thumbData.url;
          }
        } catch {}
      }

      // Step 2: Create Reel post record
      const createRes = await fetch(apiUrl("/api/reels"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          mediaUrl: finalMediaUrl,
          thumbnailUrl: finalThumbnailUrl,
          caption: caption.trim(),
          duration: videoDuration ? Math.round(videoDuration) : null,
          audioTitle: audioTitle.trim() || `Original audio - ${user?.username || "creator"}`,
          audioArtist: `@${user?.username || "creator"}`,
          audience,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.error || "Failed to publish Reel");
      }

      const newReel = await createRes.json();

      setUploadProgress(100);
      setProcessingStage("Reel published successfully!");

      toast({
        title: "Reel published!",
        description: "Your new Reel is now live in the feed.",
      });

      if (onReelCreated) onReelCreated(newReel);

      setTimeout(() => {
        onOpenChange(false);
        resetForm();
      }, 800);
    } catch (err: any) {
      toast({
        title: "Publishing failed",
        description: err.message || "Could not publish your Reel. Please try again.",
        variant: "destructive",
      });
      setStep("details");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetForm();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-border flex items-center justify-between">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Video className="w-4 h-4 text-primary" />
            Create Reel
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Select Video */}
        {step === "select" && (
          <div className="p-8 flex flex-col items-center justify-center min-h-[350px] text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
              <Upload className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">
              Select a vertical video for your Reel
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mb-6 leading-relaxed">
              Recommended: 9:16 vertical MP4 or WebM video, up to 60 seconds and 100 MB.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleVideoFile(file);
                e.target.value = "";
              }}
            />

            <Button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 rounded-full text-xs font-semibold gap-2"
            >
              <Upload className="w-4 h-4" />
              Choose Video
            </Button>
          </div>
        )}

        {/* Step 2: Edit & Metadata */}
        {step === "details" && videoPreviewUrl && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Video Preview & Thumbnail Extractor */}
              <div className="space-y-2">
                <div className="relative aspect-[9/16] max-h-[380px] bg-black rounded-2xl overflow-hidden shadow-md flex items-center justify-center mx-auto">
                  <video
                    ref={videoRef}
                    src={videoPreviewUrl}
                    className="w-full h-full object-cover"
                    playsInline
                    loop
                    onLoadedMetadata={handleVideoLoadedMetadata}
                    onTimeUpdate={() => {
                      if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                    }}
                    onClick={togglePlay}
                  />

                  {/* Play / Pause overlay */}
                  {!isPlaying && (
                    <div
                      onClick={togglePlay}
                      className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
                    >
                      <div className="p-3.5 rounded-full bg-black/60 text-white backdrop-blur">
                        <Play className="w-6 h-6 fill-white" />
                      </div>
                    </div>
                  )}

                  {/* Scrub Seeker Bar */}
                  {videoDuration && (
                    <div className="absolute bottom-2 inset-x-3 flex items-center gap-2 bg-black/60 backdrop-blur rounded-full px-3 py-1 text-[10px] text-white">
                      <span>{Math.floor(currentTime)}s</span>
                      <input
                        type="range"
                        min="0"
                        max={videoDuration}
                        step="0.1"
                        value={currentTime}
                        onChange={(e) => {
                          const time = parseFloat(e.target.value);
                          if (videoRef.current) videoRef.current.currentTime = time;
                          setCurrentTime(time);
                        }}
                        className="flex-1 h-1 bg-white/40 accent-primary cursor-pointer"
                      />
                      <span>{Math.floor(videoDuration)}s</span>
                    </div>
                  )}
                </div>

                {/* Cover selection action */}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={captureFrameAsCover}
                    className="flex-1 text-[11px] h-8 rounded-xl gap-1.5"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-primary" />
                    Set Current Frame as Cover
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setVideoFile(null);
                      setStep("select");
                    }}
                    className="text-[11px] h-8 px-2.5 rounded-xl text-destructive hover:bg-destructive/10"
                  >
                    Change Video
                  </Button>
                </div>
              </div>

              {/* Right Column: Details & Metadata */}
              <div className="space-y-3.5">
                {/* Caption */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <Label htmlFor="reel-caption" className="font-semibold">
                      Caption
                    </Label>
                    <span className="text-muted-foreground text-[10px]">
                      {caption.length} / 2200
                    </span>
                  </div>
                  <Textarea
                    id="reel-caption"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Write an engaging caption... use #hashtags and @mentions"
                    className="h-28 text-xs resize-none"
                    maxLength={2200}
                  />
                </div>

                {/* Popular Hashtags Quick Add */}
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground font-medium">
                    Suggested Hashtags
                  </Label>
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                    {POPULAR_HASHTAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const tagStr = `#${tag} `;
                          if (!caption.includes(`#${tag}`)) {
                            setCaption((prev) => prev.trim() + " " + tagStr);
                          }
                        }}
                        className="px-2 py-0.5 rounded-full bg-secondary hover:bg-primary/15 hover:text-primary text-[10px] font-medium transition-colors"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Audio Info */}
                <div className="space-y-1">
                  <Label htmlFor="audio-title" className="text-xs font-semibold flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-primary" />
                    Audio Name
                  </Label>
                  <Input
                    id="audio-title"
                    value={audioTitle}
                    onChange={(e) => setAudioTitle(e.target.value)}
                    placeholder="e.g. Original audio - name or track name"
                    className="h-8 text-xs"
                  />
                </div>

                {/* Audience / Privacy */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-primary" />
                    Audience
                  </Label>
                  <Select value={audience} onValueChange={(v: any) => setAudience(v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Audience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="everyone" className="text-xs">
                        Public (Everyone)
                      </SelectItem>
                      <SelectItem value="close_friends" className="text-xs">
                        Close Friends Only
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handlePublish}
                className="px-6 bg-primary text-primary-foreground font-semibold text-xs rounded-full gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Publish Reel
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Publishing Pipeline */}
        {step === "publishing" && (
          <div className="p-8 flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
            <div className="relative">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-sm font-bold text-foreground">
                Publishing your Reel
              </h3>
              <p className="text-xs text-muted-foreground">{processingStage}</p>
            </div>

            <div className="w-full max-w-xs space-y-1.5">
              <Progress value={uploadProgress} className="h-2" />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>Progress</span>
                <span>{uploadProgress}%</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
