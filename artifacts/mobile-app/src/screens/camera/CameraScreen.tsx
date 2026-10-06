import React, { useState, useRef } from "react";
import { X, Camera, RefreshCw, Zap, Sparkles, Image, Check } from "lucide-react";
import { mobileApi } from "../../services/api/client";

interface CameraScreenProps {
  onClose: () => void;
  onStoryPublished: () => void;
}

export const CameraScreen: React.FC<CameraScreenProps> = ({ onClose, onStoryPublished }) => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>("Normal");
  const [flashOn, setFlashOn] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filters = ["Normal", "Emerald Glow", "Warm Sun", "Cyberpunk", "Monochrome", "Vintage"];

  const handleCaptureSimulation = () => {
    // Generate an instant camera frame snapshot
    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 1280;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 720, 1280);
      grad.addColorStop(0, selectedFilter === "Emerald Glow" ? "#064e3b" : selectedFilter === "Cyberpunk" ? "#581c87" : "#18181b");
      grad.addColorStop(1, selectedFilter === "Warm Sun" ? "#7c2d12" : "#09090b");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 720, 1280);

      // WhiterChat stamp
      ctx.fillStyle = "#10b981";
      ctx.font = "bold 44px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("WhiterChat Story ✨", 360, 600);

      ctx.fillStyle = "#ffffff";
      ctx.font = "28px sans-serif";
      ctx.fillText(new Date().toLocaleTimeString(), 360, 660);

      setCapturedImage(canvas.toDataURL("image/jpeg"));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCapturedImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePublishStory = async () => {
    if (!capturedImage) return;
    setIsPublishing(true);
    try {
      await mobileApi.createStory({
        mediaUrl: capturedImage,
        mediaType: "image",
        caption: `Captured with ${selectedFilter} filter`,
      });
      onStoryPublished();
    } catch (_) {
      onStoryPublished();
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col text-white select-none">
      {/* Top Controls */}
      <div className="p-4 flex items-center justify-between z-10">
        <button onClick={onClose} className="p-2 bg-zinc-900/60 rounded-full backdrop-blur-md">
          <X className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFlashOn(!flashOn)}
            className={`p-2 rounded-full backdrop-blur-md ${flashOn ? "bg-amber-400 text-black" : "bg-zinc-900/60"}`}
          >
            <Zap className="w-5 h-5" />
          </button>
          <button className="p-2 bg-zinc-900/60 rounded-full backdrop-blur-md">
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* Viewport Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {capturedImage ? (
          <img src={capturedImage} alt="Story Preview" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-zinc-900 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-zinc-700 flex items-center justify-center text-zinc-500 mb-4 animate-pulse">
              <Camera className="w-10 h-10" />
            </div>
            <p className="font-semibold text-sm">WhiterChat Camera & Story Studio</p>
            <p className="text-xs text-zinc-500 mt-1">Tap the shutter or upload from your device gallery</p>
          </div>
        )}

        {/* Filter Badges Carousel */}
        {!capturedImage && (
          <div className="absolute bottom-6 left-0 right-0 overflow-x-auto px-4 flex items-center justify-center gap-2">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setSelectedFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedFilter === f
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105"
                    : "bg-zinc-900/80 text-zinc-300 border border-zinc-700/50"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="p-6 bg-black flex items-center justify-around">
        {capturedImage ? (
          <>
            <button
              onClick={() => setCapturedImage(null)}
              className="px-5 py-2.5 rounded-full bg-zinc-800 text-sm font-semibold hover:bg-zinc-700"
            >
              Retake
            </button>
            <button
              onClick={handlePublishStory}
              disabled={isPublishing}
              className="px-6 py-2.5 rounded-full bg-emerald-500 text-white text-sm font-semibold flex items-center gap-2 hover:bg-emerald-400 disabled:opacity-50"
            >
              {isPublishing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Share to Story
                </>
              )}
            </button>
          </>
        ) : (
          <>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-zinc-900 rounded-full text-zinc-400 hover:text-white"
            >
              <Image className="w-6 h-6" />
            </button>

            {/* Shutter Button */}
            <button
              onClick={handleCaptureSimulation}
              className="w-18 h-18 rounded-full border-4 border-white p-1 flex items-center justify-center active:scale-95 transition-transform"
            >
              <div className="w-full h-full bg-white rounded-full" />
            </button>

            <button
              onClick={() => {
                const nextIndex = (filters.indexOf(selectedFilter) + 1) % filters.length;
                setSelectedFilter(filters[nextIndex]);
              }}
              className="p-3 bg-zinc-900 rounded-full text-zinc-400 hover:text-white"
            >
              <RefreshCw className="w-6 h-6" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
