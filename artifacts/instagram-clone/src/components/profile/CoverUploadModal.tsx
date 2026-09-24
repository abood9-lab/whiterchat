import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Trash2, Image as ImageIcon } from "lucide-react";
import { optimizeImage } from "@/lib/image-optimizer";
import { apiUrl } from "@/lib/api-url";
import { useToast } from "@/hooks/use-toast";

interface CoverUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCoverUrl?: string | null;
  onCoverUpdated: (newUrl: string | null) => void;
}

export function CoverUploadModal({
  open,
  onOpenChange,
  currentCoverUrl,
  onCoverUpdated,
}: CoverUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPEG, PNG, WebP).",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please choose an image under 25MB.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Perform Client-side Compression & Resizing
      const optimized = await optimizeImage(file, {
        maxWidth: 1600,
        maxHeight: 600,
        quality: 0.85,
        outputType: "image/jpeg",
      });

      setSelectedFile(file);
      setPreviewUrl(optimized.dataUrl);
    } catch (err) {
      toast({
        title: "Error processing image",
        description: err instanceof Error ? err.message : "Failed to load image preview.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpload = async () => {
    if (!previewUrl) return;

    setIsUploading(true);
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const res = await fetch(apiUrl("/api/users/me/cover"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          data: previewUrl,
          mimeType: "image/jpeg",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.url) {
        toast({ title: "Cover banner updated!" });
        onCoverUpdated(data.url);
        onOpenChange(false);
        resetState();
      } else {
        toast({
          title: "Failed to upload banner",
          description: data.error || (res.status === 413 ? "Image is too large for the server limit." : "Server error"),
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Failed to upload banner",
        description: "Network error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveCover = async () => {
    setIsRemoving(true);
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const res = await fetch(apiUrl("/api/users/me/cover"), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        toast({ title: "Cover banner removed!" });
        onCoverUpdated(null);
        onOpenChange(false);
        resetState();
      } else {
        toast({
          title: "Failed to remove cover",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Failed to remove cover",
        variant: "destructive",
      });
    } finally {
      setIsRemoving(false);
    }
  };

  const resetState = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) resetState(); }}>
      <DialogContent className="max-w-lg bg-background border-border text-foreground rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <ImageIcon className="w-5 h-5 text-primary" />
            <span>Profile Cover Banner</span>
          </DialogTitle>
        </DialogHeader>

        {/* Banner Preview Area */}
        <div className="relative w-full h-44 rounded-xl overflow-hidden bg-muted border border-border flex items-center justify-center">
          {previewUrl || currentCoverUrl ? (
            <img
              src={previewUrl || currentCoverUrl!}
              alt="Cover Preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground p-4 text-center">
              <Upload className="w-8 h-8 opacity-50" />
              <span className="text-sm font-medium">No cover image set</span>
              <span className="text-xs text-muted-foreground">Upload a banner image to customize your profile header</span>
            </div>
          )}

          {isProcessing && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center gap-2 text-sm font-medium">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span>Optimizing image...</span>
            </div>
          )}

          {isUploading && (
            <div className="absolute inset-0 bg-background/85 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-sm font-medium">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span>Uploading cover banner...</span>
            </div>
          )}
        </div>

        {/* Input Selector & Actions */}
        <div className="flex flex-col gap-3 pt-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />

          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isProcessing}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>{previewUrl || currentCoverUrl ? "Choose Different Image" : "Select Image"}</span>
            </Button>

            {currentCoverUrl && !previewUrl && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemoveCover}
                disabled={isRemoving || isUploading}
                className="gap-2"
              >
                {isRemoving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Remove Banner</span>
              </Button>
            )}
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-border flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => { onOpenChange(false); resetState(); }}
            disabled={isUploading || isProcessing}
          >
            Cancel
          </Button>

          {previewUrl && (
            <Button
              onClick={handleUpload}
              disabled={isUploading || isProcessing}
              className="gap-2 bg-primary text-primary-foreground font-semibold"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>Save Banner</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
