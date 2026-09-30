import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import { 
  Camera, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  RotateCw, 
  Trash2, 
  Check, 
  Upload, 
  Loader2, 
  Sparkles,
  RefreshCw,
  Move
} from "lucide-react";
import { DecoratedAvatar } from "../DecoratedAvatar";
import { cn } from "@/lib/utils";

interface AvatarCropModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAvatarUrl?: string | null;
  activeDecorationId?: string | null;
  username?: string;
  onAvatarSaved: (newUrl: string | null) => void;
}

export function AvatarCropModal({
  open,
  onOpenChange,
  currentAvatarUrl,
  activeDecorationId,
  username = "User",
  onAvatarSaved,
}: AvatarCropModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isRemoving, setIsRemoving] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Reset state when modal opens or closes
  useEffect(() => {
    if (!open) {
      setRawImageSrc(null);
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      setIsDragOver(false);
    }
  }, [open]);

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid format", description: "Please choose an image file (PNG, JPG, WEBP, GIF)", variant: "destructive" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum image size is 10MB", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setRawImageSrc(reader.result as string);
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  };

  // Handle local file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  // Drag and drop onto area
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Drag pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!rawImageSrc) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch drag handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!rawImageSrc || !e.touches[0]) return;
    setIsDragging(true);
    setDragStart({
      x: e.touches[0].clientX - pan.x,
      y: e.touches[0].clientY - pan.y,
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !e.touches[0]) return;
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const rotateClockwise = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const rotateCounterClockwise = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  };

  // Crop & Optimize on Canvas, then upload
  const handleCropAndUpload = async () => {
    if (!rawImageSrc) return;

    setIsSaving(true);
    try {
      // Create high-res 512x512 canvas for optimized crop output
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");

      if (!ctx) throw new Error("Could not initialize canvas context");

      // Load image element
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = rawImageSrc;
      });

      const boxSize = 260; // preview container dimension

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Center transformations
      ctx.translate(256, 256);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate((pan.x / boxSize) * 512, (pan.y / boxSize) * 512);
      ctx.scale(zoom, zoom);

      // Draw aspect-ratio preserved image centered
      const imgAspect = img.width / img.height;
      let drawW = 512;
      let drawH = 512;
      if (imgAspect > 1) {
        drawW = 512 * imgAspect;
      } else {
        drawH = 512 / imgAspect;
      }

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

      // Convert to optimized WebP (with fallback)
      let mimeType = "image/webp";
      let base64Data = canvas.toDataURL(mimeType, 0.9);
      if (!base64Data.startsWith("data:image/webp")) {
        mimeType = "image/jpeg";
        base64Data = canvas.toDataURL(mimeType, 0.9);
      }

      // Upload to server
      const token = localStorage.getItem("pixlr_token") || localStorage.getItem("whiterchat_token") || "";
      const res = await fetch(apiUrl("/api/users/me/avatar"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ data: base64Data, mimeType }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload avatar");
      }

      toast({ title: "Avatar updated!", description: "Your profile photo has been refreshed." });
      onAvatarSaved(data.url);
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Crop failed",
        description: err.message || "Could not process image crop",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Remove avatar handler
  const handleRemoveAvatar = async () => {
    setIsRemoving(true);
    try {
      const token = localStorage.getItem("pixlr_token") || localStorage.getItem("whiterchat_token") || "";
      const res = await fetch(apiUrl("/api/users/me/avatar"), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to remove avatar");
      }

      toast({ title: "Avatar reset", description: "Default profile initials restored." });
      onAvatarSaved(null);
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Could not remove avatar",
        description: err.message || "Server error",
        variant: "destructive",
      });
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full p-6 rounded-3xl bg-card border border-border shadow-2xl overflow-hidden">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-500" />
            <span>Profile Photo Studio</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Crop, scale, rotate, and center your photo to look stunning with WhiterChat decorations.
          </DialogDescription>
        </DialogHeader>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        <div className="space-y-5 pt-2">
          {/* Main Visual Crop / Preview Box */}
          <div className="flex flex-col items-center justify-center">
            {rawImageSrc ? (
              <div className="relative flex flex-col items-center">
                <div
                  className="relative w-[260px] h-[260px] rounded-full overflow-hidden border-2 border-emerald-500/60 shadow-2xl bg-black/80 cursor-grab active:cursor-grabbing select-none"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleMouseUp}
                >
                  {/* Image being cropped */}
                  <div
                    className="w-full h-full flex items-center justify-center transition-transform duration-75"
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                    }}
                  >
                    <img
                      src={rawImageSrc}
                      alt="Crop preview"
                      className="max-w-none pointer-events-none select-none"
                      style={{ minWidth: "100%", minHeight: "100%", objectFit: "cover" }}
                      draggable={false}
                    />
                  </div>

                  {/* Alignment Grid Overlay */}
                  <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-25 border border-white/40">
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

                <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1.5 font-mono">
                  <Move className="w-3 h-3 text-emerald-400" />
                  <span>Drag photo to pan position</span>
                </div>
              </div>
            ) : (
              /* Dropzone & Current Avatar Preview */
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={cn(
                  "w-full p-8 rounded-2xl border-2 border-dashed transition-all duration-200 flex flex-col items-center text-center gap-4 cursor-pointer",
                  isDragOver
                    ? "border-emerald-500 bg-emerald-500/10 scale-[1.01]"
                    : "border-border/70 hover:border-emerald-500/50 bg-muted/20"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="relative my-2">
                  <DecoratedAvatar
                    avatarUrl={currentAvatarUrl}
                    decorationId={activeDecorationId}
                    username={username}
                    size="3xl"
                  />
                </div>

                <div className="space-y-1 max-w-xs">
                  <div className="text-sm font-bold text-foreground flex items-center justify-center gap-1.5">
                    <Upload className="w-4 h-4 text-emerald-500" />
                    <span>Upload or Drag Photo Here</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Supports PNG, JPG, WebP, GIF up to 10MB. Instant preview with frame.
                  </p>
                </div>

                <Button
                  type="button"
                  size="sm"
                  className="rounded-xl text-xs font-semibold px-4 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-2"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Browse Device Photos</span>
                </Button>
              </div>
            )}
          </div>

          {/* Transformation Controls (when image is loaded) */}
          {rawImageSrc && (
            <div className="space-y-3 bg-muted/40 p-4 rounded-2xl border border-border/60">
              {/* Zoom slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <ZoomIn className="w-3.5 h-3.5 text-emerald-500" />
                    Zoom & Scale
                  </span>
                  <span className="font-mono text-foreground font-bold">{Math.round(zoom * 100)}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <ZoomOut className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Slider
                    min={1}
                    max={3.5}
                    step={0.05}
                    value={[zoom]}
                    onValueChange={(vals) => setZoom(vals[0] || 1)}
                    className="w-full"
                  />
                  <ZoomIn className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              </div>

              {/* Rotation & Presets Bar */}
              <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={rotateCounterClockwise}
                    className="h-8 px-2.5 rounded-lg text-xs gap-1"
                    title="Rotate -90°"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>-90°</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={rotateClockwise}
                    className="h-8 px-2.5 rounded-lg text-xs gap-1"
                    title="Rotate +90°"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>+90°</span>
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setZoom(1); setRotation(0); setPan({ x: 0, y: 0 }); }}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset Crop</span>
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-1">
            {rawImageSrc ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRawImageSrc(null)}
                  className="flex-1 rounded-xl text-xs h-10"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleCropAndUpload}
                  disabled={isSaving}
                  className="flex-1 rounded-xl text-xs font-bold gap-2 h-10 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Save & Apply Photo</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                {currentAvatarUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveAvatar}
                    disabled={isRemoving}
                    className="text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 gap-1.5 rounded-xl h-9"
                  >
                    {isRemoving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>Remove Current Photo</span>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="text-xs font-medium rounded-xl h-9 ml-auto"
                >
                  Close Studio
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
