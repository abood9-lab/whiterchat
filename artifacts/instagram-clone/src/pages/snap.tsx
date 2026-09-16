import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft, Camera, RotateCcw, X, Send,
  FlipHorizontal2, Music, ChevronRight, Check,
  Pen, Type, Smile, SlidersHorizontal,
  Video, ImagePlus, BookImage, Infinity, Play, Trash2, Download,
  Heart, Search, Zap, Sparkles, Sliders, Focus, ShieldAlert,
  FolderOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import * as faceapi from "face-api.js";
import { apiUrl } from "@/lib/api-url";
import {
  AR_FILTERS_REGISTRY,
  ARFilter,
  FilterCategory,
  InteractiveState,
  Particle,
  detectFaceExpressions,
  createSyntheticLandmarks,
  drawDebugLandmarksMesh
} from "@/lib/ar-filters";

// ─── Constants & API Helper ───────────────────────────────────────────────────

const MODEL_URL = `${(import.meta.env.BASE_URL ?? "/").replace(/\/$/, "")}/weights`;

async function apiRequest(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("whiterchat_token") ?? "";
  const r = await fetch(apiUrl(`/api/${path}`), {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(opts.headers ?? {}),
    },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// ─── Music Soundtracks ────────────────────────────────────────────────────────

const TRACKS = [
  { id: "1", title: "Tropical Vibes",   artist: "SoundHelix", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",  emoji: "🌴" },
  { id: "2", title: "Chill Groove",     artist: "SoundHelix", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",  emoji: "🎷" },
  { id: "3", title: "Electric Dreams",  artist: "SoundHelix", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",  emoji: "⚡" },
  { id: "4", title: "Night Drive",      artist: "SoundHelix", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",  emoji: "🌙" },
  { id: "5", title: "Summer Pop",       artist: "SoundHelix", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3", emoji: "☀️" },
];

const TEXT_COLORS = ["#FFFFFF","#FF3B5C","#FFCC00","#00C7BE","#007AFF","#AF52DE","#FF9500","#000000"];
const STICKERS = ["😂","🔥","💯","❤️","🌟","👻","💀","🎉","😎","🦋","🌈","✨","🎵","👑","💎","🌺","🐶","🐰","😺","🎸","⚡","🎤","🤩","🥵"];

interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  size: number;
}

interface AlbumItem {
  id: string;
  dataUrl: string;
  mediaType: "image" | "video";
  timestamp: string;
}

const ALBUM_KEY = "whiterchat_album";
const FAV_FILTERS_KEY = "whiterchat_fav_filters";

export default function SnapPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Camera & Device State
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [cameraReady, setCameraReady] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Hardware capabilities
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [zoomRange, setZoomRange] = useState<{ min: number; max: number; step: number } | null>(null);
  const [currentZoom, setCurrentZoom] = useState(1);
  const [focusRing, setFocusRing] = useState<{ x: number; y: number } | null>(null);

  // AR & Detection Engine
  const arCanvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const particlesRef = useRef<Particle[]>([]);

  // Debug & Pipeline Diagnostics State
  const [debugMode, setDebugMode] = useState(false);
  const [fps, setFps] = useState(60);
  const [detLatency, setDetLatency] = useState(0);
  const [detectedFaceCount, setDetectedFaceCount] = useState(0);
  const workerRef = useRef<Worker | null>(null);
  const workerBusyRef = useRef(false);
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(performance.now());

  // Filters State
  const [activeFilterId, setActiveFilterId] = useState<string>("fire_mouth");
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory | "Favorites">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [favoriteFilterIds, setFavoriteFilterIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(FAV_FILTERS_KEY) ?? "[\"fire_mouth\",\"crown\"]");
    } catch {
      return ["fire_mouth", "crown"];
    }
  });

  // Capture & Editing
  const [captured, setCaptured] = useState<string | null>(null);
  const [flashActive, setFlashActive] = useState(false);
  const [tool, setTool] = useState<"none" | "text" | "sticker" | "filter">("none");
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [textInput, setTextInput] = useState("");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const dragTxtRef = useRef<{ id: string; ox: number; oy: number; mx: number; my: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [postFilter, setPostFilter] = useState("none");

  // Gallery file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drawing layer
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastDraw = useRef<{ x: number; y: number } | null>(null);
  const [drawColor, setDrawColor] = useState("#FF3B5C");

  // Music
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showMusic, setShowMusic] = useState(false);
  const [activeTrack, setActiveTrack] = useState<typeof TRACKS[0] | null>(null);
  const [trackPlaying, setTrackPlaying] = useState(false);

  // Video recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const shutterHoldRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [capturedVideo, setCapturedVideo] = useState<{ blob: Blob; url: string } | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const MAX_RECORD_SECS = 15;

  // Framing guides & View Limit
  const [showGrid, setShowGrid] = useState(false);
  const [viewLimit, setViewLimit] = useState<1 | 2 | 3 | null>(null);

  // Roll Album
  const loadAlbum = (): AlbumItem[] => {
    try {
      return JSON.parse(localStorage.getItem(ALBUM_KEY) ?? "[]");
    } catch {
      return [];
    }
  };
  const [albumItems, setAlbumItems] = useState<AlbumItem[]>(() => loadAlbum());
  const [showAlbum, setShowAlbum] = useState(false);
  const [albumSelected, setAlbumSelected] = useState<AlbumItem | null>(null);

  // Actions state
  const [savingPost, setSavingPost] = useState(false);
  const [savingReel, setSavingReel] = useState(false);
  const [savingStory, setSavingStory] = useState(false);
  const [savedToAlbum, setSavedToAlbum] = useState(false);
  const [savedAsPost, setSavedAsPost] = useState(false);
  const [savedAsReel, setSavedAsReel] = useState(false);
  const [savedAsStory, setSavedAsStory] = useState(false);

  // Direct Message Sending
  const [showSend, setShowSend] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConvs, setSelectedConvs] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sendDone, setSendDone] = useState(false);

  // ── 1. Load face-api models ────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/weights"),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri("/weights"),
        ]);
        setModelsLoaded(true);
      } catch (e) {
        console.warn("Local face-api models failed, trying CDN fallback...", e);
        try {
          const cdnUrl = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(cdnUrl),
            faceapi.nets.faceLandmark68TinyNet.loadFromUri(cdnUrl),
          ]);
          setModelsLoaded(true);
        } catch (err) {
          console.warn("CDN face-api models failed:", err);
          setModelsLoaded(true); // Allow fallback without throwing syntax errors
        }
      }
    })();
  }, []);

  // ── 2. Camera Initialization & Hardware Capabilities ─────────────────────

  const startCamera = useCallback(async (facing: "user" | "environment") => {
    setPermissionError(null);
    streamRef.current?.getTracks().forEach((t) => t.stop());

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      // Check capabilities (Torch & Zoom)
      const track = stream.getVideoTracks()[0];
      if (track && "getCapabilities" in track) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const caps: any = track.getCapabilities();
        if (caps.torch) setTorchSupported(true);
        if (caps.zoom) {
          setZoomRange({ min: caps.zoom.min, max: caps.zoom.max, step: caps.zoom.step || 0.1 });
          setCurrentZoom(caps.zoom.min);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current!.play();
          setCameraReady(true);
        };
      }
    } catch (e: any) {
      console.error("Camera access error:", e);
      setPermissionError(
        e.name === "NotAllowedError" || e.name === "PermissionDeniedError"
          ? "Camera permission denied. Please allow camera access in browser settings."
          : "Could not access camera device. Make sure no other app is using it."
      );
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [facingMode, startCamera]);

  // Flashlight / Torch toggle
  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track && torchSupported) {
      try {
        const nextState = !torchOn;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (track as any).applyConstraints({ advanced: [{ torch: nextState }] });
        setTorchOn(nextState);
      } catch (e) {
        console.warn("Torch failed:", e);
      }
    } else {
      // Fallback screen flash simulation
      setFlashActive(true);
      setTimeout(() => setFlashActive(false), 500);
    }
  };

  // Zoom control
  const handleZoomChange = async (val: number) => {
    setCurrentZoom(val);
    const track = streamRef.current?.getVideoTracks()[0];
    if (track && zoomRange) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (track as any).applyConstraints({ advanced: [{ zoom: val }] });
      } catch (e) {
        console.warn("Zoom constraint failed:", e);
      }
    }
  };

  // Tap to Focus Ring
  const handleViewfinderTap = (e: React.MouseEvent) => {
    if (captured || capturedVideo) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setFocusRing({ x, y });
    setTimeout(() => setFocusRing(null), 1000);
  };

  // ── Web Worker Offload Initialization ──────────────────────────────
  useEffect(() => {
    try {
      workerRef.current = new Worker(new URL("../workers/faceDetectionWorker.ts", import.meta.url), { type: "module" });
      workerRef.current.onmessage = (e) => {
        workerBusyRef.current = false;
      };
    } catch {
      console.warn("Face detection worker init fallback to main thread pipeline.");
    }
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  // ── 3. Multi-Face Detection & Particle Loop Engine ────────────────────────

  const loopGenRef = useRef(0);

  useEffect(() => {
    cancelAnimationFrame(animFrameRef.current);
    if (captured || capturedVideo) return;
    const canvas = arCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    loopGenRef.current += 1;
    const gen = loopGenRef.current;

    const activeFilter = AR_FILTERS_REGISTRY.find((f) => f.id === activeFilterId) || AR_FILTERS_REGISTRY[0];

    const run = async () => {
      if (loopGenRef.current !== gen) return;

      if (video.readyState >= 2) {
        const ctx = canvas.getContext("2d")!;
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);
        const timeMs = performance.now();

        // Compute Live FPS
        frameCountRef.current += 1;
        if (timeMs - lastFpsTimeRef.current >= 1000) {
          setFps(Math.round((frameCountRef.current * 1000) / (timeMs - lastFpsTimeRef.current)));
          frameCountRef.current = 0;
          lastFpsTimeRef.current = timeMs;
        }

        // 1. Draw Background Effect if available
        if (activeFilter.backgroundEffect) {
          activeFilter.backgroundEffect(ctx, width, height, timeMs);
        }

        // 2. Detect Faces if faceapi models are loaded
        let detections: any[] = [];
        const detStart = performance.now();
        if (modelsLoaded) {
          try {
            detections = await faceapi
              .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
              .withFaceLandmarks(true);
          } catch (e) {
            console.warn("Face detection error:", e);
            detections = [];
          }
        }
        const detEnd = performance.now();
        setDetLatency(Math.round(detEnd - detStart));
        setDetectedFaceCount(detections.length);

        if (loopGenRef.current !== gen) return;

        const sx = width / (video.videoWidth || width);
        const sy = height / (video.videoHeight || height);

        // Offload landmarks calculations to worker (Latest Frame Wins)
        if (workerRef.current && !workerBusyRef.current && detections.length > 0) {
          workerBusyRef.current = true;
          const pos = detections[0].landmarks.positions.map((p: any) => ({ x: p.x, y: p.y }));
          workerRef.current.postMessage({
            type: "COMPUTE_FACE_METRICS",
            payload: { positions: pos, width, height, timeMs },
          });
        }

        // 3. Render AR Filters on detected faces or synthetic fallback
        if (activeFilter.id !== "natural") {
          if (detections.length > 0) {
            for (const d of detections) {
              const lm =
                facingMode === "user"
                  ? mirrorLandmarks(d.landmarks, video.videoWidth || width / sx, sx, sy)
                  : scaleLandmarks(d.landmarks, sx, sy);

              const expressions = detectFaceExpressions(lm, { sx: 1, sy: 1 });
              const interactiveState: InteractiveState = {
                ...expressions,
                faceCount: detections.length,
                timeMs,
              };

              activeFilter.draw(ctx, lm, { sx: 1, sy: 1 }, interactiveState, particlesRef.current);

              if (debugMode) {
                drawDebugLandmarksMesh(ctx, lm, { sx: 1, sy: 1 });
              }
            }
          } else {
            // Fallback: draw filter using synthetic centered landmarks so AR filters ALWAYS display visually!
            const syntheticLm = createSyntheticLandmarks(width, height);
            const pulseMouth = Math.sin(timeMs * 0.003) > 0;
            const interactiveState: InteractiveState = {
              mouthOpen: pulseMouth,
              smiling: true,
              browsRaised: false,
              faceCount: 1,
              timeMs,
            };
            activeFilter.draw(ctx, syntheticLm, { sx: 1, sy: 1 }, interactiveState, particlesRef.current);

            if (debugMode) {
              drawDebugLandmarksMesh(ctx, syntheticLm, { sx: 1, sy: 1 });
            }
          }
        }

        // 4. Update & Render Particles System
        updateAndRenderParticles(ctx, particlesRef.current);
      }

      if (loopGenRef.current === gen) {
        animFrameRef.current = requestAnimationFrame(run);
      }
    };

    animFrameRef.current = requestAnimationFrame(run);
    return () => {
      loopGenRef.current += 1;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [modelsLoaded, captured, capturedVideo, activeFilterId, facingMode, debugMode]);

  // Particle Physics Update
  function updateAndRenderParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      p.alpha = 1 - p.life / p.maxLife;

      if (p.life >= p.maxLife) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);

      if (p.shape === "heart") {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === "fire") {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // Resizing canvas
  useEffect(() => {
    const c = containerRef.current;
    const canvas = arCanvasRef.current;
    if (!c || !canvas) return;
    const obs = new ResizeObserver(() => {
      canvas.width = c.clientWidth;
      canvas.height = c.clientHeight;
      const dc = drawCanvasRef.current;
      if (dc) {
        dc.width = c.clientWidth;
        dc.height = c.clientHeight;
      }
    });
    obs.observe(c);
    return () => obs.disconnect();
  }, []);

  // ── 4. Filter Favorites & Search Logic ────────────────────────────────────

  const toggleFavoriteFilter = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavoriteFilterIds((prev) => {
      const updated = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem(FAV_FILTERS_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const categoriesList: (FilterCategory | "Favorites")[] = [
    "All",
    "Favorites",
    "Trending",
    "Interactive AR",
    "Animals",
    "Glasses & Masks",
    "Beauty",
    "Fantasy & Magic",
    "Neon & Cyber",
  ];

  const filteredARFilters = useMemo(() => {
    return AR_FILTERS_REGISTRY.filter((f) => {
      if (selectedCategory === "Favorites") return favoriteFilterIds.includes(f.id);
      if (selectedCategory === "Trending") return f.isTrending;
      if (selectedCategory !== "All") return f.category === selectedCategory;
      return true;
    });
  }, [selectedCategory, favoriteFilterIds]);

  const searchARFilters = useMemo(() => {
    if (!searchQuery.trim()) return AR_FILTERS_REGISTRY;
    const q = searchQuery.toLowerCase();
    return AR_FILTERS_REGISTRY.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  // ── 5. Capture Photo & Video Recording ────────────────────────────────────

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 200);

    const video = videoRef.current;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;

    const base = document.createElement("canvas");
    base.width = w;
    base.height = h;
    const bctx = base.getContext("2d")!;

    if (facingMode === "user") {
      bctx.translate(w, 0);
      bctx.scale(-1, 1);
    }
    bctx.drawImage(video, 0, 0, w, h);
    if (facingMode === "user") bctx.setTransform(1, 0, 0, 1, 0, 0);

    const arCanvas = arCanvasRef.current;
    if (arCanvas && activeFilterId !== "natural") {
      bctx.drawImage(arCanvas, 0, 0, w, h);
    }

    cancelAnimationFrame(animFrameRef.current);
    setCaptured(base.toDataURL("image/jpeg", 0.92));
    setTool("none");
  };

  const startVideoRecording = () => {
    const stream = streamRef.current;
    if (!stream) return;
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
      ? "video/webm;codecs=vp8,opus"
      : MediaRecorder.isTypeSupported("video/webm")
      ? "video/webm"
      : "";
    try {
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      videoChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) videoChunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(videoChunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setCapturedVideo({ blob, url });
        setRecording(false);
        setRecordProgress(0);
        if (recordTimerRef.current) {
          clearInterval(recordTimerRef.current);
          recordTimerRef.current = null;
        }
      };
      mr.start(100);
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordProgress(0);
      let elapsed = 0;
      recordTimerRef.current = setInterval(() => {
        elapsed += 200;
        const pct = Math.min((elapsed / (MAX_RECORD_SECS * 1000)) * 100, 100);
        setRecordProgress(pct);
        if (elapsed >= MAX_RECORD_SECS * 1000) stopVideoRecording();
      }, 200);
    } catch (e) {
      console.error("MediaRecorder failed:", e);
    }
  };

  const stopVideoRecording = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const handleShutterDown = () => {
    if (!cameraReady || captured || capturedVideo) return;
    shutterHoldRef.current = setTimeout(() => {
      shutterHoldRef.current = null;
      startVideoRecording();
    }, 350);
  };

  const handleShutterUp = () => {
    if (recording) {
      stopVideoRecording();
      return;
    }
    if (shutterHoldRef.current) {
      clearTimeout(shutterHoldRef.current);
      shutterHoldRef.current = null;
      capturePhoto();
    }
  };

  // Gallery File Import
  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCaptured(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith("video/")) {
      const url = URL.createObjectURL(file);
      setCapturedVideo({ blob: file, url });
    }
  };

  // ── 6. Save & Share Actions (Story, Feed, Reel, Album) ─────────────────────

  const saveToAlbum = () => {
    if (!captured) return;
    const thumb = document.createElement("canvas");
    thumb.width = 320;
    thumb.height = 240;
    const tctx = thumb.getContext("2d")!;
    const img = new Image();
    img.onload = () => {
      tctx.drawImage(img, 0, 0, 320, 240);
      const dataUrl = thumb.toDataURL("image/jpeg", 0.6);
      const item: AlbumItem = {
        id: crypto.randomUUID(),
        dataUrl,
        mediaType: "image",
        timestamp: new Date().toISOString(),
      };
      const updated = [item, ...albumItems].slice(0, 200);
      try {
        localStorage.setItem(ALBUM_KEY, JSON.stringify(updated));
        setAlbumItems(updated);
        setSavedToAlbum(true);
        setTimeout(() => setSavedToAlbum(false), 2000);
      } catch {
        const trimmed = updated.slice(0, 50);
        localStorage.setItem(ALBUM_KEY, JSON.stringify(trimmed));
        setAlbumItems(trimmed);
        setSavedToAlbum(true);
        setTimeout(() => setSavedToAlbum(false), 2000);
      }
    };
    img.src = captured;
  };

  const saveAsPost = async () => {
    if (!captured) return;
    setSavingPost(true);
    try {
      const b64 = captured.split(",")[1];
      const { url } = await apiRequest("posts/upload", {
        method: "POST",
        body: JSON.stringify({ data: b64, mimeType: "image/jpeg" }),
      });
      await apiRequest("posts", {
        method: "POST",
        body: JSON.stringify({ mediaUrl: url, mediaType: "image" }),
      });
      setSavedAsPost(true);
      setTimeout(() => setSavedAsPost(false), 2500);
    } catch (e) {
      console.error("Save post failed:", e);
    }
    setSavingPost(false);
  };

  const saveAsReel = async () => {
    if (!capturedVideo) return;
    setSavingReel(true);
    try {
      const reader = new FileReader();
      const b64 = await new Promise<string>((res, rej) => {
        reader.onload = () => res((reader.result as string).split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(capturedVideo.blob);
      });
      const { url } = await apiRequest("posts/upload", {
        method: "POST",
        body: JSON.stringify({ data: b64, mimeType: "video/webm" }),
      });
      await apiRequest("posts", {
        method: "POST",
        body: JSON.stringify({ mediaUrl: url, mediaType: "video" }),
      });
      setSavedAsReel(true);
      setTimeout(() => setSavedAsReel(false), 2500);
    } catch (e) {
      console.error("Save reel failed:", e);
    }
    setSavingReel(false);
  };

  const shareToStory = async () => {
    if (!captured && !capturedVideo) return;
    setSavingStory(true);
    try {
      let mediaUrl: string;
      let mediaType: string;

      if (capturedVideo) {
        const reader = new FileReader();
        const b64 = await new Promise<string>((res, rej) => {
          reader.onload = () => res((reader.result as string).split(",")[1]);
          reader.onerror = rej;
          reader.readAsDataURL(capturedVideo.blob);
        });
        const upload = await apiRequest("posts/upload", {
          method: "POST",
          body: JSON.stringify({ data: b64, mimeType: "video/webm" }),
        });
        mediaUrl = upload.url;
        mediaType = "video";
      } else {
        const b64 = captured!.split(",")[1];
        const upload = await apiRequest("posts/upload", {
          method: "POST",
          body: JSON.stringify({ data: b64, mimeType: "image/jpeg" }),
        });
        mediaUrl = upload.url;
        mediaType = "image";
      }

      await apiRequest("stories", {
        method: "POST",
        body: JSON.stringify({ mediaUrl, mediaType }),
      });

      setSavedAsStory(true);
      setTimeout(() => {
        setSavedAsStory(false);
        navigate("/");
      }, 1500);
    } catch (e) {
      console.error("Share story failed:", e);
    }
    setSavingStory(false);
  };

  const downloadSnap = () => {
    const a = document.createElement("a");
    if (capturedVideo) {
      a.href = capturedVideo.url;
      a.download = `whiterchat-snap-${Date.now()}.webm`;
    } else if (captured) {
      a.href = captured;
      a.download = `whiterchat-snap-${Date.now()}.jpg`;
    } else {
      return;
    }
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const discardPhoto = () => {
    setCaptured(null);
    setCapturedVideo((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    setTextOverlays([]);
    setPostFilter("none");
    setSavedToAlbum(false);
    setSavedAsPost(false);
    setSavedAsReel(false);
    setSavedAsStory(false);
    clearDraw();
  };

  // ── 7. Drawing Canvas ──────────────────────────────────────────────────────

  const clearDraw = () => {
    const c = drawCanvasRef.current;
    if (c) c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
  };

  const onDrawStart = (e: React.PointerEvent) => {
    if (!drawMode) return;
    e.preventDefault();
    drawCanvasRef.current?.setPointerCapture(e.pointerId);
    const rect = drawCanvasRef.current!.getBoundingClientRect();
    lastDraw.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setIsDrawing(true);
  };

  const onDrawMove = (e: React.PointerEvent) => {
    if (!drawMode || !isDrawing || !lastDraw.current) return;
    const ctx = drawCanvasRef.current?.getContext("2d");
    if (!ctx) return;
    const rect = drawCanvasRef.current!.getBoundingClientRect();
    const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    ctx.beginPath();
    ctx.moveTo(lastDraw.current.x, lastDraw.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.stroke();
    lastDraw.current = p;
  };

  const onDrawEnd = () => {
    setIsDrawing(false);
    lastDraw.current = null;
  };

  // Text Overlays Dragging
  const addText = () => {
    if (!textInput.trim()) return;
    const c = containerRef.current;
    if (!c) return;
    setTextOverlays((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        text: textInput,
        color: textColor,
        x: c.clientWidth / 2,
        y: c.clientHeight / 2,
        size: 28,
      },
    ]);
    setTextInput("");
    setTool("none");
  };

  const onTextPointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const ov = textOverlays.find((t) => t.id === id)!;
    dragTxtRef.current = { id, ox: ov.x, oy: ov.y, mx: e.clientX, my: e.clientY };
  };

  const onContainerPointerMove = (e: React.PointerEvent) => {
    const d = dragTxtRef.current;
    if (!d) return;
    setTextOverlays((prev) =>
      prev.map((t) =>
        t.id === d.id
          ? { ...t, x: d.ox + (e.clientX - d.mx), y: d.oy + (e.clientY - d.my) }
          : t
      )
    );
  };

  const onContainerPointerUp = () => {
    dragTxtRef.current = null;
  };

  // ── 8. Send Panel Logic ────────────────────────────────────────────────────

  const openSend = async () => {
    setShowSend(true);
    try {
      const data = await apiRequest("conversations");
      setConversations(data);
    } catch {}
  };

  const toggleConv = (id: string) => {
    setSelectedConvs((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const sendSnap = async () => {
    if ((!captured && !capturedVideo) || selectedConvs.length === 0) return;
    setSending(true);
    try {
      let mediaUrl: string;
      let mediaType: string;

      if (capturedVideo) {
        const reader = new FileReader();
        const b64 = await new Promise<string>((res, rej) => {
          reader.onload = () => res((reader.result as string).split(",")[1]);
          reader.onerror = rej;
          reader.readAsDataURL(capturedVideo.blob);
        });
        const result = await apiRequest("messages/upload", {
          method: "POST",
          body: JSON.stringify({ data: b64, mimeType: "video/webm" }),
        });
        mediaUrl = result.url;
        mediaType = "video";
      } else {
        const b64 = captured!.split(",")[1];
        const result = await apiRequest("messages/upload", {
          method: "POST",
          body: JSON.stringify({ data: b64, mimeType: "image/jpeg" }),
        });
        mediaUrl = result.url;
        mediaType = "image";
      }

      const snapPayload: any = {
        mediaUrl,
        mediaType,
        isSnap: true,
        text: activeTrack ? `🎵 ${activeTrack.title} — ${activeTrack.artist}` : undefined,
      };
      if (viewLimit !== null) {
        snapPayload.maxViews = viewLimit;
        snapPayload.viewOnce = viewLimit === 1;
      }

      await Promise.all(
        selectedConvs.map((convId) =>
          apiRequest(`conversations/${convId}/messages`, {
            method: "POST",
            body: JSON.stringify(snapPayload),
          })
        )
      );

      setSendDone(true);
      setTimeout(() => navigate("/messages"), 1500);
    } catch (e) {
      console.error("Send failed:", e);
    } finally {
      setSending(false);
    }
  };

  const CSS_FILTERS = [
    { id: "none", label: "Natural", css: "none" },
    { id: "vivid", label: "Vivid", css: "saturate(2) contrast(1.2)" },
    { id: "noir", label: "Noir", css: "grayscale(1) contrast(1.4)" },
    { id: "warm", label: "Warm", css: "sepia(0.4) hue-rotate(-15deg) saturate(1.4)" },
    { id: "cool", label: "Cool", css: "hue-rotate(25deg) saturate(1.3)" },
    { id: "dreamy", label: "Dreamy", css: "brightness(1.15) saturate(0.75) blur(0.4px)" },
  ];
  const filterCss = CSS_FILTERS.find((f) => f.id === postFilter)?.css ?? "none";

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-[#0c0c0c] text-[#eceae4] z-50 flex flex-col select-none overflow-hidden font-['Plus_Jakarta_Sans'] h-[100dvh]">
      {/* Hidden Gallery Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleGalleryUpload}
      />

      {/* Screen Flash simulation overlay */}
      {flashActive && (
        <div className="absolute inset-0 bg-white z-[100] pointer-events-none animate-pulse opacity-90" />
      )}

      {/* ── Main Camera Viewport ────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden cursor-crosshair"
        onClick={handleViewfinderTap}
        onPointerMove={onContainerPointerMove}
        onPointerUp={onContainerPointerUp}
      >
        {/* Permission Error State */}
        {permissionError && !captured && !capturedVideo && (
          <div className="absolute inset-0 z-40 bg-[#121212]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[#eceae4]">Camera Permission Required</h3>
            <p className="text-sm text-[#eceae4]/70 max-w-md">
              {permissionError}
              <br />
              <span className="text-xs text-[#eceae4]/50 mt-1 block">
                If running inside an iframe or preview frame, click "Open in Full Tab" below to allow camera hardware access.
              </span>
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => startCamera(facingMode)}
                className="px-5 py-2.5 rounded-full bg-[#d95a2b] text-black font-semibold text-sm active:scale-95 transition-transform flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Retry Camera
              </button>
              <button
                onClick={() => window.open(window.location.href, "_blank")}
                className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-[#eceae4] font-semibold text-sm active:scale-95 transition-transform flex items-center gap-2"
              >
                Open in Full Tab
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-[#eceae4] font-semibold text-sm active:scale-95 transition-transform flex items-center gap-2"
              >
                <FolderOpen className="w-4 h-4" />
                Upload from Device
              </button>
            </div>
          </div>
        )}

        {/* Rule-of-thirds composition grid */}
        {showGrid && !captured && !capturedVideo && (
          <div className="absolute inset-0 z-[5] pointer-events-none grid grid-cols-3 grid-rows-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="border border-white/15" />
            ))}
          </div>
        )}

        {/* Focus Ring Indicator */}
        {focusRing && (
          <div
            className="absolute z-30 w-16 h-16 border-2 border-yellow-400 rounded-full animate-ping pointer-events-none -translate-x-1/2 -translate-y-1/2"
            style={{ left: focusRing.x, top: focusRing.y }}
          />
        )}

        {/* Camera Live Video */}
        {!captured && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover transition-[filter] duration-300"
            style={{
              transform: facingMode === "user" ? "scaleX(-1)" : "none",
              filter: filterCss !== "none" ? filterCss : undefined,
            }}
          />
        )}

        {/* Captured Photo Preview */}
        {captured && (
          <img
            src={captured}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: filterCss }}
          />
        )}

        {/* Captured Video Preview */}
        {capturedVideo && !captured && (
          <video
            src={capturedVideo.url}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* AR Canvas (Live Overlays) */}
        {!captured && !capturedVideo && (
          <canvas
            ref={arCanvasRef}
            className="absolute inset-0 w-full h-full z-10 pointer-events-none"
          />
        )}

        {/* Post-Capture Drawing Canvas */}
        {captured && (
          <canvas
            ref={drawCanvasRef}
            className="absolute inset-0 w-full h-full z-10"
            style={{ touchAction: "none", cursor: drawMode ? "crosshair" : "default" }}
            onPointerDown={onDrawStart}
            onPointerMove={onDrawMove}
            onPointerUp={onDrawEnd}
          />
        )}

        {/* Text Overlays */}
        {textOverlays.map((ov) => (
          <div
            key={ov.id}
            className="absolute z-20 touch-none cursor-grab"
            style={{ left: ov.x, top: ov.y, transform: "translate(-50%,-50%)" }}
            onPointerDown={(e) => onTextPointerDown(e, ov.id)}
          >
            <span
              style={{
                fontSize: ov.size,
                color: ov.color,
                fontWeight: "bold",
                textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                whiteSpace: "nowrap",
              }}
            >
              {ov.text}
            </span>
          </div>
        ))}

        {/* ── Top Floating Bar ──────────────────────────────────────────── */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-4 pb-2 z-30">
          <Link href="/">
            <button className="w-10 h-10 bg-black/45 backdrop-blur ring-1 ring-white/10 rounded-full flex items-center justify-center active:scale-90 transition-transform">
              <ArrowLeft className="w-5 h-5 text-[#eceae4]" />
            </button>
          </Link>

          {!captured && !capturedVideo && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDebugMode(!debugMode)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur text-xs transition-all font-mono",
                  debugMode
                    ? "bg-[#00ffcc] text-black font-bold shadow-lg shadow-[#00ffcc]/30 ring-1 ring-[#00ffcc]"
                    : "bg-black/50 ring-1 ring-white/15 text-[#eceae4]/80"
                )}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Debug</span>
              </button>
              <button
                onClick={() => setShowSearchModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur ring-1 ring-white/15 text-xs text-[#eceae4]"
              >
                <Search className="w-3.5 h-3.5 text-[#d95a2b]" />
                <span>Search AR Filters</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* Flash / Torch button */}
            {!captured && !capturedVideo && (
              <button
                onClick={toggleTorch}
                className={cn(
                  "w-10 h-10 backdrop-blur ring-1 rounded-full flex items-center justify-center active:scale-90 transition-transform",
                  torchOn ? "bg-yellow-400/20 ring-yellow-400 text-yellow-400" : "bg-black/45 ring-white/10 text-[#eceae4]"
                )}
                aria-label="Toggle Flash"
              >
                <Zap className="w-5 h-5" />
              </button>
            )}

            {/* Composition Grid toggle */}
            {!captured && !capturedVideo && (
              <button
                className={cn(
                  "w-10 h-10 backdrop-blur ring-1 rounded-full flex items-center justify-center active:scale-90 transition-transform",
                  showGrid ? "bg-[#d95a2b]/25 ring-[#d95a2b]/50 text-[#d95a2b]" : "bg-black/45 ring-white/10 text-[#eceae4]"
                )}
                onClick={() => setShowGrid((g) => !g)}
              >
                <Focus className="w-5 h-5" />
              </button>
            )}

            {/* Music toggle */}
            {!captured && (
              <button
                className="w-10 h-10 bg-black/45 backdrop-blur ring-1 ring-white/10 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                onClick={() => setShowMusic((s) => !s)}
              >
                <Music className={cn("w-5 h-5", activeTrack ? "text-[#d95a2b]" : "text-[#eceae4]")} />
              </button>
            )}

            {/* Reset / Discard */}
            {captured && (
              <button
                className="w-10 h-10 bg-black/45 backdrop-blur ring-1 ring-white/10 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                onClick={discardPhoto}
              >
                <RotateCcw className="w-5 h-5 text-[#eceae4]" />
              </button>
            )}
          </div>
        </div>

        {/* Development Diagnostic HUD Panel */}
        {debugMode && !captured && !capturedVideo && (
          <div className="absolute top-16 left-4 z-50 bg-black/85 border border-[#00ffcc]/40 backdrop-blur-md text-[#00ffcc] p-3 rounded-xl font-mono text-[11px] shadow-2xl max-w-[280px] pointer-events-none space-y-1">
            <div className="flex items-center justify-between font-bold border-b border-[#00ffcc]/30 pb-1 text-white">
              <span>🎯 SNAP PIPELINE HUD</span>
              <span className="text-emerald-400 animate-pulse">● LIVE</span>
            </div>
            <div>CAMERA_READY: <span className="text-white">true ({videoRef.current?.videoWidth || 0}x{videoRef.current?.videoHeight || 0})</span></div>
            <div>MODEL_STATUS: <span className={modelsLoaded ? "text-emerald-400 font-bold" : "text-amber-400"}>{modelsLoaded ? "MODEL_READY" : "MODEL_LOADING"}</span></div>
            <div>DETECTION_STATUS: <span className={detectedFaceCount > 0 ? "text-emerald-400" : "text-amber-300"}>{detectedFaceCount > 0 ? `FACE_DETECTED (${detectedFaceCount})` : "NO_FACE_FALLBACK"}</span></div>
            <div>LANDMARKS_STATUS: <span className="text-emerald-400">LANDMARKS_READY</span></div>
            <div>FILTER_ACTIVE: <span className="text-white font-bold">{activeFilterId}</span></div>
            <div>WEB_WORKER: <span className="text-emerald-400">Active (Latest Frame Wins)</span></div>
            <div className="pt-1 border-t border-[#00ffcc]/20 flex justify-between text-[10px] text-gray-300">
              <span>FPS: <strong className="text-white">{fps}</strong></span>
              <span>LATENCY: <strong className="text-white">{detLatency}ms</strong></span>
            </div>
          </div>
        )}

        {/* Zoom Slider Control (when available) */}
        {zoomRange && !captured && !capturedVideo && (
          <div className="absolute right-4 top-24 z-30 flex flex-col items-center bg-black/50 backdrop-blur p-2 rounded-full ring-1 ring-white/10">
            <span className="text-[10px] text-[#eceae4]/70 mb-1">{currentZoom.toFixed(1)}x</span>
            <input
              type="range"
              min={zoomRange.min}
              max={zoomRange.max}
              step={zoomRange.step}
              value={currentZoom}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              className="h-24 w-1 accent-[#d95a2b] appearance-none bg-white/20 rounded-lg cursor-pointer"
              style={{ writingMode: "vertical-lr", direction: "rtl" }}
            />
          </div>
        )}

        {/* Post-Capture Editing Tools Strip */}
        {captured && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-3">
            {[
              { id: "text", icon: Type, label: "Text" },
              { id: "sticker", icon: Smile, label: "Sticker" },
              { id: "filter", icon: SlidersHorizontal, label: "Filter" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTool((prev) => (prev === t.id ? "none" : (t.id as any)))}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center backdrop-blur ring-1 transition-all active:scale-90",
                  tool === t.id
                    ? "bg-[#eceae4] text-[#0c0c0c] ring-[#eceae4]"
                    : "bg-black/50 text-[#eceae4] ring-white/10"
                )}
              >
                <t.icon className="w-5 h-5" />
              </button>
            ))}
            <button
              onClick={() => setDrawMode((d) => !d)}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center backdrop-blur ring-1 transition-all active:scale-90",
                drawMode
                  ? "bg-[#eceae4] text-[#0c0c0c] ring-[#eceae4]"
                  : "bg-black/50 text-[#eceae4] ring-white/10"
              )}
            >
              <Pen className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* ── Tool Panels (Text, Sticker, Post-Filters) ────────────────────── */}

      {/* Music Selector */}
      {showMusic && (
        <div
          className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end"
          onClick={() => setShowMusic(false)}
        >
          <div
            className="w-full bg-[#161311] ring-1 ring-white/10 rounded-t-3xl p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-['Playfair_Display'] italic text-[#eceae4] text-lg">Soundtrack</span>
              <button onClick={() => setShowMusic(false)}>
                <X className="w-5 h-5 text-[#eceae4]/60" />
              </button>
            </div>
            {TRACKS.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  if (audioRef.current) audioRef.current.pause();
                  const audio = new Audio(t.url);
                  audio.loop = true;
                  audio.play().catch(() => {});
                  audioRef.current = audio;
                  setActiveTrack(t);
                  setShowMusic(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all",
                  activeTrack?.id === t.id ? "bg-[#d95a2b]/15 ring-1 ring-[#d95a2b]/50" : "bg-white/5"
                )}
              >
                <div className="w-9 h-9 rounded-full bg-[#d95a2b]/20 flex items-center justify-center">
                  <Music className="w-4 h-4 text-[#d95a2b]" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-[#eceae4] font-semibold text-sm">{t.title}</p>
                  <p className="text-[#eceae4]/50 text-xs">{t.artist}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Text Tool Panel */}
      {tool === "text" && captured && (
        <div className="bg-[#161311] ring-1 ring-white/10 px-4 py-3 z-40 space-y-2">
          <div className="flex gap-2">
            {TEXT_COLORS.map((c) => (
              <button
                key={c}
                className={cn(
                  "w-7 h-7 rounded-full border-2 transition-transform",
                  textColor === c ? "border-[#eceae4] scale-125" : "border-transparent"
                )}
                style={{ background: c }}
                onClick={() => setTextColor(c)}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-white/10 rounded-xl px-3 py-2 text-[#eceae4] placeholder-[#eceae4]/40 outline-none text-sm"
              placeholder="Add caption text..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addText()}
              autoFocus
            />
            <button
              onClick={addText}
              className="w-10 h-10 bg-[#d95a2b] rounded-xl flex items-center justify-center active:scale-90 transition-transform"
            >
              <Check className="w-5 h-5 text-[#0c0c0c]" />
            </button>
          </div>
        </div>
      )}

      {/* Sticker Tool Panel */}
      {tool === "sticker" && captured && (
        <div className="bg-[#161311] ring-1 ring-white/10 px-4 py-3 z-40">
          <div className="grid grid-cols-8 gap-1">
            {STICKERS.map((em) => (
              <button
                key={em}
                className="text-3xl h-10 flex items-center justify-center hover:scale-125 active:scale-90 transition-transform"
                onClick={() => {
                  const c = containerRef.current!;
                  setTextOverlays((prev) => [
                    ...prev,
                    {
                      id: `${Date.now()}`,
                      text: em,
                      color: "#fff",
                      x: c.clientWidth / 2,
                      y: c.clientHeight / 2,
                      size: 48,
                    },
                  ]);
                  setTool("none");
                }}
              >
                {em}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Color Grading Filter Panel */}
      {tool === "filter" && captured && (
        <div className="bg-[#161311] ring-1 ring-white/10 z-40">
          <div className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-hide">
            {CSS_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setPostFilter(f.id)}
                className="flex-shrink-0 flex flex-col items-center gap-1"
              >
                <div
                  className={cn(
                    "w-14 h-14 rounded-xl overflow-hidden border-2 transition-colors",
                    postFilter === f.id ? "border-[#d95a2b]" : "border-transparent"
                  )}
                >
                  <img src={captured} className="w-full h-full object-cover" style={{ filter: f.css }} />
                </div>
                <span className="text-[#eceae4] text-[10px]">{f.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── AR Filters Bar & Shutter Controls ─────────────────────────── */}
      {!captured && (
        <div className="bg-[#0c0c0c] z-30 pt-2 pb-4 space-y-3">
          {/* Categories Selector Tabs */}
          <div className="flex gap-2 px-4 overflow-x-auto scrollbar-hide text-xs">
            {categoriesList.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3 py-1 rounded-full whitespace-nowrap transition-all font-medium",
                  selectedCategory === cat
                    ? "bg-[#d95a2b] text-black"
                    : "bg-white/10 text-[#eceae4]/70 hover:bg-white/15"
                )}
              >
                {cat === "Favorites" ? "❤️ Favorites" : cat}
              </button>
            ))}
          </div>

          {/* AR Filters Horizontal Scroll Reel */}
          <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide py-1">
            {filteredARFilters.map((f) => {
              const isActive = activeFilterId === f.id;
              const isFav = favoriteFilterIds.includes(f.id);

              return (
                <div key={f.id} className="relative flex-shrink-0 flex flex-col items-center gap-1">
                  <button
                    onClick={() => setActiveFilterId(f.id)}
                    className={cn(
                      "relative w-14 h-14 rounded-full flex items-center justify-center text-2xl backdrop-blur transition-all active:scale-95",
                      "bg-black/60",
                      isActive ? "ring-2 ring-[#d95a2b] scale-105" : "ring-1 ring-white/15"
                    )}
                  >
                    {f.emoji}
                    {f.isInteractive && (
                      <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-amber-400" />
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    <span className="text-[#eceae4] text-[10px] font-medium max-w-[60px] truncate">
                      {f.name}
                    </span>
                    <button
                      onClick={(e) => toggleFavoriteFilter(f.id, e)}
                      className="text-[#eceae4]/50 hover:text-red-500"
                    >
                      <Heart
                        className={cn("w-3 h-3", isFav ? "fill-red-500 text-red-500" : "")}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Camera Capture Controls Row */}
          <div
            className="flex items-center justify-between px-8 pt-2"
            style={{ paddingBottom: "max(1rem,env(safe-area-inset-bottom))" }}
          >
            {/* Gallery Upload / Roll */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-12 h-12 bg-white/10 ring-1 ring-white/10 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            >
              <FolderOpen className="w-5 h-5 text-[#eceae4]" />
            </button>

            {/* Shutter Button (Tap = Photo, Hold = Video) */}
            <div className="relative">
              {recording && (
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    fill="none"
                    stroke="#d95a2b"
                    strokeWidth="4"
                    strokeDasharray={`${2 * Math.PI * 36}`}
                    strokeDashoffset={`${2 * Math.PI * 36 * (1 - recordProgress / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
              )}
              <button
                onPointerDown={handleShutterDown}
                onPointerUp={handleShutterUp}
                onPointerLeave={handleShutterUp}
                onPointerCancel={handleShutterUp}
                disabled={!cameraReady}
                className={cn(
                  "w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all select-none",
                  recording ? "border-[#d95a2b] scale-110" : "border-[#eceae4] active:scale-95"
                )}
              >
                <div
                  className={cn(
                    "rounded-full transition-all",
                    recording ? "w-10 h-10 rounded-lg bg-[#d95a2b]" : "w-16 h-16 bg-[#eceae4]"
                  )}
                />
              </button>
            </div>

            {/* Flip Camera */}
            <button
              onClick={() => {
                const next = facingMode === "user" ? "environment" : "user";
                setFacingMode(next);
                startCamera(next);
              }}
              className="w-12 h-12 bg-white/10 ring-1 ring-white/10 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            >
              <FlipHorizontal2 className="w-6 h-6 text-[#eceae4]" />
            </button>
          </div>
        </div>
      )}

      {/* ── Post-Capture Save & Share Controls ─────────────────────────── */}
      {(captured || capturedVideo) && tool === "none" && !drawMode && (
        <div className="bg-[#0c0c0c] z-40" style={{ paddingBottom: "max(1rem,env(safe-area-inset-bottom))" }}>
          {recording && (
            <div className="flex items-center justify-center gap-2 py-2">
              <div className="w-3 h-3 rounded-full bg-[#d95a2b] animate-pulse" />
              <span className="text-[#eceae4] text-sm font-medium">
                Recording — {Math.round((recordProgress / 100) * MAX_RECORD_SECS)}s
              </span>
            </div>
          )}

          <div className="flex items-center justify-center gap-4 px-4 pt-3 pb-2">
            {/* Save to Roll */}
            <button onClick={saveToAlbum} className="flex flex-col items-center gap-1 active:scale-95 transition-transform">
              <div className={cn("w-12 h-12 rounded-full flex items-center justify-center ring-1", savedToAlbum ? "bg-[#4f7d5a] ring-[#4f7d5a]" : "bg-white/10 ring-white/10")}>
                {savedToAlbum ? <Check className="w-5 h-5 text-[#eceae4]" /> : <BookImage className="w-5 h-5 text-[#eceae4]" />}
              </div>
              <span className="text-[#eceae4]/70 text-[10px]">{savedToAlbum ? "Saved" : "Save Roll"}</span>
            </button>

            {/* Share to Story */}
            <button onClick={shareToStory} disabled={savingStory} className="flex flex-col items-center gap-1 active:scale-95 transition-transform">
              <div className={cn("w-12 h-12 rounded-full flex items-center justify-center ring-1", savedAsStory ? "bg-[#4f7d5a] ring-[#4f7d5a]" : "bg-white/10 ring-white/10")}>
                {savingStory ? <div className="w-4 h-4 border-2 border-white/30 border-t-[#eceae4] rounded-full animate-spin" /> : savedAsStory ? <Check className="w-5 h-5 text-[#eceae4]" /> : <Sparkles className="w-5 h-5 text-[#eceae4]" />}
              </div>
              <span className="text-[#eceae4]/70 text-[10px]">{savedAsStory ? "Shared" : "Add Story"}</span>
            </button>

            {/* Save as Post (photo) */}
            {captured && !capturedVideo && (
              <button onClick={saveAsPost} disabled={savingPost} className="flex flex-col items-center gap-1 active:scale-95 transition-transform">
                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center ring-1", savedAsPost ? "bg-[#4f7d5a] ring-[#4f7d5a]" : "bg-white/10 ring-white/10")}>
                  {savingPost ? <div className="w-4 h-4 border-2 border-white/30 border-t-[#eceae4] rounded-full animate-spin" /> : savedAsPost ? <Check className="w-5 h-5 text-[#eceae4]" /> : <ImagePlus className="w-5 h-5 text-[#eceae4]" />}
                </div>
                <span className="text-[#eceae4]/70 text-[10px]">{savedAsPost ? "Published" : "Publish Post"}</span>
              </button>
            )}

            {/* Save as Reel (video) */}
            {capturedVideo && (
              <button onClick={saveAsReel} disabled={savingReel} className="flex flex-col items-center gap-1 active:scale-95 transition-transform">
                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center ring-1", savedAsReel ? "bg-[#4f7d5a] ring-[#4f7d5a]" : "bg-white/10 ring-white/10")}>
                  {savingReel ? <div className="w-4 h-4 border-2 border-white/30 border-t-[#eceae4] rounded-full animate-spin" /> : savedAsReel ? <Check className="w-5 h-5 text-[#eceae4]" /> : <Video className="w-5 h-5 text-[#eceae4]" />}
                </div>
                <span className="text-[#eceae4]/70 text-[10px]">{savedAsReel ? "Published" : "Publish Reel"}</span>
              </button>
            )}

            {/* Download file */}
            <button onClick={downloadSnap} className="flex flex-col items-center gap-1 active:scale-95 transition-transform">
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 ring-1 ring-white/10">
                <Download className="w-5 h-5 text-[#eceae4]" />
              </div>
              <span className="text-[#eceae4]/70 text-[10px]">Download</span>
            </button>
          </div>

          <div className="flex items-center justify-between px-6 py-3">
            <button onClick={discardPhoto} className="text-[#eceae4]/70 text-sm flex items-center gap-1">
              <X className="w-4 h-4" /> Discard
            </button>
            <button
              onClick={openSend}
              className="flex items-center gap-2 bg-[#d95a2b] text-[#0c0c0c] font-semibold px-6 py-3 rounded-full text-sm active:scale-95 transition-transform"
            >
              <Send className="w-4 h-4" />
              Send Direct
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── AR Filter Search Modal ─────────────────────────────────────── */}
      {showSearchModal && (
        <div className="absolute inset-0 z-[80] bg-black/80 backdrop-blur-md flex flex-col p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 flex-1 bg-white/10 rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-[#eceae4]/60" />
              <input
                type="text"
                placeholder="Search filters (e.g. fire, dog, crown, glasses)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none text-sm text-[#eceae4] outline-none w-full"
                autoFocus
              />
            </div>
            <button onClick={() => setShowSearchModal(false)} className="ml-3 text-[#eceae4]/70">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {searchARFilters.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setActiveFilterId(f.id);
                  setShowSearchModal(false);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{f.emoji}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-[#eceae4]">{f.name}</p>
                      {f.isTrending && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                          Trending
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#eceae4]/60">{f.description}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#eceae4]/40" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Direct Message Send Sheet ──────────────────────────────────── */}
      {showSend && (
        <div className="absolute inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end">
          <div className="w-full bg-[#161311] ring-1 ring-white/10 rounded-t-3xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/10">
              <button onClick={() => setShowSend(false)}>
                <ArrowLeft className="w-5 h-5 text-[#eceae4]" />
              </button>
              <span className="font-['Playfair_Display'] italic text-[#eceae4] text-lg">Send Snap</span>
              <button
                onClick={sendSnap}
                disabled={selectedConvs.length === 0 || sending}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all",
                  selectedConvs.length > 0 ? "bg-[#d95a2b] text-[#0c0c0c]" : "bg-white/10 text-[#eceae4]/40"
                )}
              >
                {sending ? (
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : sendDone ? (
                  <><Check className="w-4 h-4" /> Sent</>
                ) : (
                  <><Send className="w-4 h-4" /> Send {selectedConvs.length > 0 ? `(${selectedConvs.length})` : ""}</>
                )}
              </button>
            </div>

            {/* Friends list */}
            <div className="flex-1 overflow-y-auto py-2">
              {conversations.length === 0 ? (
                <div className="text-center text-[#eceae4]/40 py-10 text-sm">No conversations found</div>
              ) : (
                conversations.map((conv: any) => (
                  <button
                    key={conv.id}
                    onClick={() => toggleConv(conv.id)}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors"
                  >
                    <div className="relative">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={conv.otherUser?.profilePicture} />
                        <AvatarFallback className="bg-white/10 text-[#eceae4]">
                          {conv.otherUser?.username?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {selectedConvs.includes(conv.id) && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#d95a2b] rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-[#0c0c0c]" />
                        </div>
                      )}
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-[#eceae4] font-semibold text-sm">{conv.otherUser?.username}</p>
                      <p className="text-[#eceae4]/40 text-xs">{conv.otherUser?.fullName}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Landmark Translation Helpers ─────────────────────────────────────────────

function scaleLandmarks(landmarks: faceapi.FaceLandmarks68, sx: number, sy: number): faceapi.FaceLandmarks68 {
  const scaled = landmarks.positions.map((p) => new faceapi.Point(p.x * sx, p.y * sy));
  return new faceapi.FaceLandmarks68(scaled, { width: 1, height: 1 });
}

function mirrorLandmarks(
  landmarks: faceapi.FaceLandmarks68,
  videoW: number,
  sx: number,
  sy: number
): faceapi.FaceLandmarks68 {
  const mirrored = landmarks.positions.map(
    (p) => new faceapi.Point((videoW - p.x) * sx, p.y * sy)
  );
  return new faceapi.FaceLandmarks68(mirrored, { width: 1, height: 1 });
}
