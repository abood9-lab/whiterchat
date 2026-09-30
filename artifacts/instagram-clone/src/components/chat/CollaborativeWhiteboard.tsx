import { useState, useRef, useEffect, useCallback } from "react";
import { getSocket } from "@/lib/socket";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  Palette, Type, Square, Circle, Minus, ArrowRight, Eraser, Move,
  Undo2, Redo2, ZoomIn, ZoomOut, Maximize2, Trash2, Download, X,
  Check, Sparkles, User, HelpCircle, Loader2, Edit3, Image as ImageIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api-url";

export interface WhiteboardElement {
  id: string;
  type: "pen" | "marker" | "highlighter" | "line" | "arrow" | "rectangle" | "circle" | "text" | "image";
  points?: { x: number; y: number }[]; // For freehand drawing
  x?: number; // For shapes/text/images
  y?: number;
  width?: number; // For shapes/text/images
  height?: number;
  text?: string; // For text elements
  fontSize?: number;
  isBold?: boolean;
  isItalic?: boolean;
  align?: "left" | "center" | "right";
  color: string;
  lineWidth: number;
  opacity: number;
  userId: string;
  url?: string; // For images
}

interface PeerCursor {
  userId: string;
  username: string;
  avatarUrl?: string;
  x: number;
  y: number;
  lastActive: number;
}

interface PeerLaser {
  userId: string;
  x: number;
  y: number;
  fading: boolean;
}

interface Props {
  whiteboardId: string;
  onClose: () => void;
}

const PREDEFINED_COLORS = [
  "#ffffff", // White
  "#f87171", // Red
  "#fb923c", // Orange
  "#facc15", // Yellow
  "#4ade80", // Green
  "#38bdf8", // Blue
  "#a78bfa", // Purple
  "#f472b6", // Pink
  "#000000", // Black
];

export function CollaborativeWhiteboard({ whiteboardId, onClose }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Core State
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [undoStack, setUndoStack] = useState<WhiteboardElement[][]>([]);
  const [redoStack, setRedoStack] = useState<WhiteboardElement[][]>([]);
  const [title, setTitle] = useState("Shared Whiteboard");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [collaborators, setCollaborators] = useState<any[]>([]);

  // Whiteboard status
  const [saveStatus, setSaveStatus] = useState<"connected" | "saving" | "saved" | "offline" | "error">("connected");
  const [isLoading, setIsLoading] = useState(true);

  // Active Tool & Style Config
  const [tool, setTool] = useState<"select" | "pen" | "marker" | "highlighter" | "line" | "arrow" | "rectangle" | "circle" | "eraser" | "text" | "laser" | "image">("pen");
  const [color, setColor] = useState("#f87171");
  const [lineWidth, setLineWidth] = useState(4);
  const [opacity, setOpacity] = useState(1.0);

  // Text options
  const [fontSize, setFontSize] = useState(20);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("left");
  const [editingTextElementId, setEditingTextElementId] = useState<string | null>(null);
  const [textInputVal, setTextInputVal] = useState("");
  const [textInputPos, setTextInputPos] = useState<{ x: number; y: number } | null>(null);

  // Zoom & Pan
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Interactive interaction states
  const [isDrawing, setIsRecording] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [currentElement, setCurrentElement] = useState<WhiteboardElement | null>(null);

  // Selection states
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isDraggingSelected, setIsDraggingSelected] = useState(false);
  const [isResizingSelected, setIsResizingSelected] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<"nw" | "ne" | "se" | "sw" | null>(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [draggedOffset, setDraggedOffset] = useState({ x: 0, y: 0 });

  // Pan interaction
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Peer states
  const [peerCursors, setPeerCursors] = useState<Record<string, PeerCursor>>({});
  const [peerLasers, setPeerLasers] = useState<Record<string, PeerLaser>>({});

  // Image Upload reference
  const imageInputRef = useRef<HTMLInputElement>(null);

  // ── 1. Connect and Load State ──────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    setIsLoading(true);

    const token = localStorage.getItem("whiterchat_token") ?? "";
    fetch(apiUrl(`/api/whiteboards/${whiteboardId}`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Whiteboard not found");
        return res.json();
      })
      .then((data) => {
        if (active) {
          setElements(data.elements || []);
          setUndoStack(data.undoStack || []);
          setRedoStack(data.redoStack || []);
          setTitle(data.title || "Shared Whiteboard");
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        toast({ title: "Failed to load whiteboard", description: err.message, variant: "destructive" });
        setIsLoading(false);
        setSaveStatus("error");
      });

    return () => {
      active = false;
    };
  }, [whiteboardId]);

  // ── 2. Socket.IO Real-time Connection ──────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) {
      setSaveStatus("offline");
      return;
    }

    setSaveStatus("connected");

    // Join Whiteboard room
    socket.emit("whiteboard_join", {
      whiteboardId,
      user: {
        username: user?.username,
        fullName: user?.fullName,
        avatarUrl: user?.avatarUrl,
      },
    });

    // Collaborators Updated
    const onCollaboratorsUpdated = (data: { whiteboardId: string; collaborators: any[] }) => {
      if (data.whiteboardId === whiteboardId) {
        setCollaborators(data.collaborators);
      }
    };

    // Peer Draw Operation
    const onPeerDrawOperation = (data: { whiteboardId: string; operation: any; userId: string }) => {
      if (data.whiteboardId !== whiteboardId) return;
      const { type, payload } = data.operation;

      if (type === "draw" || type === "create") {
        setElements((prev) => {
          if (prev.some((el) => el.id === payload.id)) return prev; // Avoid duplicates
          return [...prev, payload];
        });
      } else if (type === "update") {
        setElements((prev) => prev.map((el) => (el.id === payload.id ? { ...el, ...payload } : el)));
      } else if (type === "delete") {
        setElements((prev) => prev.filter((el) => el.id !== payload.id));
        if (selectedElementId === payload.id) setSelectedElementId(null);
      } else if (type === "clear") {
        setElements([]);
        setSelectedElementId(null);
      } else if (type === "sync_state") {
        setElements(payload.elements || []);
        setUndoStack(payload.undoStack || []);
        setRedoStack(payload.redoStack || []);
      }
    };

    // Peer Cursor Moved
    const onPeerCursorMoved = (data: {
      whiteboardId: string;
      userId: string;
      username: string;
      avatarUrl?: string;
      x: number;
      y: number;
    }) => {
      if (data.whiteboardId !== whiteboardId) return;
      if (data.userId === user?.id) return;

      setPeerCursors((prev) => ({
        ...prev,
        [data.userId]: {
          userId: data.userId,
          username: data.username,
          avatarUrl: data.avatarUrl,
          x: data.x,
          y: data.y,
          lastActive: Date.now(),
        },
      }));
    };

    // Peer Laser Moved
    const onPeerLaserMoved = (data: { whiteboardId: string; userId: string; x: number; y: number }) => {
      if (data.whiteboardId !== whiteboardId) return;
      if (data.userId === user?.id) return;

      setPeerLasers((prev) => ({
        ...prev,
        [data.userId]: {
          userId: data.userId,
          x: data.x,
          y: data.y,
          fading: false,
        },
      }));
    };

    // Peer Cleared Board
    const onPeerCleared = (data: { whiteboardId: string }) => {
      if (data.whiteboardId === whiteboardId) {
        setElements([]);
        setUndoStack([]);
        setRedoStack([]);
        setSelectedElementId(null);
      }
    };

    // Whiteboard Metadata Updated
    const onMetadataUpdated = (data: { whiteboardId: string; title: string }) => {
      if (data.whiteboardId === whiteboardId) {
        setTitle(data.title);
      }
    };

    // Whiteboard Deleted
    const onDeleted = (data: { whiteboardId: string }) => {
      if (data.whiteboardId === whiteboardId) {
        toast({ title: "Whiteboard session ended", description: "This whiteboard has been deleted by its creator." });
        onClose();
      }
    };

    socket.on("whiteboard_collaborators_updated", onCollaboratorsUpdated);
    socket.on("whiteboard_peer_draw_operation", onPeerDrawOperation);
    socket.on("whiteboard_peer_cursor_moved", onPeerCursorMoved);
    socket.on("whiteboard_peer_laser_moved", onPeerLaserMoved);
    socket.on("whiteboard_peer_cleared", onPeerCleared);
    socket.on("whiteboard_metadata_updated", onMetadataUpdated);
    socket.on("whiteboard_deleted", onDeleted);

    // Clean up inactive cursors periodic timer
    const interval = setInterval(() => {
      const now = Date.now();
      setPeerCursors((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const [uid, c] of Object.entries(next)) {
          if (now - c.lastActive > 4000) {
            delete next[uid];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 2000);

    return () => {
      clearInterval(interval);
      socket.emit("whiteboard_leave", { whiteboardId });
      socket.off("whiteboard_collaborators_updated", onCollaboratorsUpdated);
      socket.off("whiteboard_peer_draw_operation", onPeerDrawOperation);
      socket.off("whiteboard_peer_cursor_moved", onPeerCursorMoved);
      socket.off("whiteboard_peer_laser_moved", onPeerLaserMoved);
      socket.off("whiteboard_peer_cleared", onPeerCleared);
      socket.off("whiteboard_metadata_updated", onMetadataUpdated);
      socket.off("whiteboard_deleted", onDeleted);
    };
  }, [whiteboardId, user?.id]);

  // ── 3. Helper: Save elements to server (Autosave with status) ─────────────
  const triggerAutoSave = useCallback((newElements: WhiteboardElement[], newUndo: WhiteboardElement[][], newRedo: WhiteboardElement[][]) => {
    setSaveStatus("saving");
    const socket = getSocket();
    if (socket) {
      socket.emit("whiteboard_save_state", {
        whiteboardId,
        elements: newElements,
        undoStack: newUndo,
        redoStack: newRedo,
      });
      setTimeout(() => setSaveStatus("saved"), 600);
    } else {
      setSaveStatus("offline");
    }
  }, [whiteboardId]);

  // ── 4. Broadcast Draw Operations to Peers ──────────────────────────────────
  const broadcastOperation = useCallback((type: "draw" | "create" | "update" | "delete" | "clear" | "sync_state", payload: any) => {
    const socket = getSocket();
    if (socket) {
      socket.emit("whiteboard_draw_operation", {
        whiteboardId,
        operation: { type, payload },
      });
    }
  }, [whiteboardId]);

  // ── 5. Coordinate Translation (Transforms mouse pointer to canvas coords) ─
  const getCanvasCoords = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    // Translate screen coords to canvas workspace taking Zoom and Pan into account
    const x = (clientX - rect.left - pan.x) / zoom;
    const y = (clientY - rect.top - pan.y) / zoom;
    return { x, y };
  }, [zoom, pan]);

  // ── 6. Throttle Cursor/Laser Movements to Socket.IO ────────────────────────
  const lastCursorEmitRef = useRef(0);
  const emitCursorPosition = useCallback((x: number, y: number, isLaser = false) => {
    const socket = getSocket();
    if (!socket) return;
    const now = Date.now();
    if (now - lastCursorEmitRef.current > 40) { // Max 25 events per second (highly throttled)
      lastCursorEmitRef.current = now;
      socket.emit(isLaser ? "whiteboard_laser_move" : "whiteboard_cursor_move", {
        whiteboardId,
        x,
        y,
      });
    }
  }, [whiteboardId]);

  // ── 7. Selection Hit Testing ────────────────────────────────────────────────
  const getElementAtPosition = useCallback((x: number, y: number): WhiteboardElement | null => {
    // Traverse backwards (from front-most element to back-most)
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.type === "pen" || el.type === "marker" || el.type === "highlighter") {
        if (!el.points) continue;
        // Simple distance check to any point in the path
        for (const pt of el.points) {
          const dist = Math.hypot(pt.x - x, pt.y - y);
          if (dist < el.lineWidth + 4) return el;
        }
      } else if (el.type === "rectangle" || el.type === "image") {
        if (el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
          const minX = Math.min(el.x, el.x + el.width);
          const maxX = Math.max(el.x, el.x + el.width);
          const minY = Math.min(el.y, el.y + el.height);
          const maxY = Math.max(el.y, el.y + el.height);
          if (x >= minX && x <= maxX && y >= minY && y <= maxY) return el;
        }
      } else if (el.type === "circle") {
        if (el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
          const cx = el.x + el.width / 2;
          const cy = el.y + el.height / 2;
          const rx = Math.abs(el.width / 2);
          const ry = Math.abs(el.height / 2);
          // Ellipse collision check
          const normalizedX = (x - cx) / rx;
          const normalizedY = (y - cy) / ry;
          if (normalizedX * normalizedX + normalizedY * normalizedY <= 1.05) return el;
        }
      } else if (el.type === "line" || el.type === "arrow") {
        if (el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
          const x1 = el.x;
          const y1 = el.y;
          const x2 = el.x + el.width;
          const y2 = el.y + el.height;
          // Distance from point to line segment
          const l2 = Math.hypot(x2 - x1, y2 - y1);
          if (l2 === 0) return Math.hypot(x1 - x, y1 - y) < 8 ? el : null;
          let t = ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / (l2 * l2);
          t = Math.max(0, Math.min(1, t));
          const projX = x1 + t * (x2 - x1);
          const projY = y1 + t * (y2 - y1);
          if (Math.hypot(x - projX, y - projY) < el.lineWidth + 4) return el;
        }
      } else if (el.type === "text") {
        if (el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
          if (x >= el.x && x <= el.x + el.width && y >= el.y - el.height && y <= el.y) return el;
        }
      }
    }
    return null;
  }, [elements]);

  // ── 8. Eraser Hit Testing (Immediate objects erasure) ──────────────────────
  const handleEraserHit = useCallback((x: number, y: number) => {
    const hit = getElementAtPosition(x, y);
    if (hit) {
      const nextElements = elements.filter((el) => el.id !== hit.id);
      setUndoStack((prev) => [...prev, elements]);
      setRedoStack([]);
      setElements(nextElements);
      broadcastOperation("delete", { id: hit.id });
      triggerAutoSave(nextElements, [...undoStack, elements], []);
    }
  }, [elements, undoStack, getElementAtPosition, broadcastOperation, triggerAutoSave]);

  // ── 9. Drawing & Mouse Interactions ─────────────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || tool === "select" && e.shiftKey) { // Pan with middle-click or Shift-drag
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    emitCursorPosition(x, y, tool === "laser");

    if (tool === "laser") {
      setIsRecording(true);
      return;
    }

    if (tool === "eraser") {
      setIsRecording(true);
      handleEraserHit(x, y);
      return;
    }

    if (tool === "select") {
      const hit = getElementAtPosition(x, y);
      if (hit) {
        setSelectedElementId(hit.id);
        setIsDraggingSelected(true);
        setDragStartPos({ x, y });
        setDraggedOffset({
          x: x - (hit.x ?? 0),
          y: y - (hit.y ?? 0),
        });
      } else {
        setSelectedElementId(null);
      }
      return;
    }

    if (tool === "text") {
      // Create text field immediately
      setTextInputPos({ x, y });
      setTextInputVal("");
      setEditingTextElementId(null);
      return;
    }

    setIsRecording(true);
    const newId = `el_${user?.id}_${Date.now()}`;

    if (tool === "pen" || tool === "marker" || tool === "highlighter") {
      const initialPoints = [{ x, y }];
      setCurrentPoints(initialPoints);

      const computedOpacity = tool === "highlighter" ? 0.4 : tool === "marker" ? 0.8 : opacity;
      const calculatedWidth = tool === "highlighter" ? 16 : tool === "marker" ? 8 : lineWidth;

      const element: WhiteboardElement = {
        id: newId,
        type: tool,
        points: initialPoints,
        color,
        lineWidth: calculatedWidth,
        opacity: computedOpacity,
        userId: user?.id ?? "",
      };
      setCurrentElement(element);
    } else {
      // Line, Arrow, Rectangle, Circle
      const element: WhiteboardElement = {
        id: newId,
        type: tool,
        x,
        y,
        width: 0,
        height: 0,
        color,
        lineWidth,
        opacity,
        userId: user?.id ?? "",
      };
      setCurrentElement(element);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    emitCursorPosition(x, y, tool === "laser");

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    if (!isDrawing && !isDraggingSelected) return;

    if (tool === "laser") {
      setPeerLasers((prev) => ({
        ...prev,
        [user?.id ?? "me"]: {
          userId: user?.id ?? "me",
          x,
          y,
          fading: false,
        },
      }));
      return;
    }

    if (tool === "eraser") {
      handleEraserHit(x, y);
      return;
    }

    if (tool === "select" && isDraggingSelected && selectedElementId) {
      const el = elements.find((e) => e.id === selectedElementId);
      if (el) {
        let updated: Partial<WhiteboardElement> = {};
        if (el.points) {
          const dx = x - dragStartPos.x;
          const dy = y - dragStartPos.y;
          updated = {
            points: el.points.map((pt) => ({ x: pt.x + dx, y: pt.y + dy })),
          };
          setDragStartPos({ x, y });
        } else {
          updated = {
            x: x - draggedOffset.x,
            y: y - draggedOffset.y,
          };
        }

        setElements((prev) => prev.map((item) => (item.id === selectedElementId ? { ...item, ...updated } : item)));
        broadcastOperation("update", { id: selectedElementId, ...updated });
      }
      return;
    }

    if (!currentElement) return;

    if (currentElement.type === "pen" || currentElement.type === "marker" || currentElement.type === "highlighter") {
      const nextPoints = [...currentPoints, { x, y }];
      setCurrentPoints(nextPoints);
      const updated = { ...currentElement, points: nextPoints };
      setCurrentElement(updated);
    } else {
      // Shape
      const dx = x - (currentElement.x ?? 0);
      const dy = y - (currentElement.y ?? 0);
      const updated = { ...currentElement, width: dx, height: dy };
      setCurrentElement(updated);
    }
  };

  const handlePointerUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (tool === "laser") {
      setIsRecording(false);
      // Fade laser out
      setPeerLasers((prev) => {
        const next = { ...prev };
        if (next[user?.id ?? "me"]) {
          next[user?.id ?? "me"].fading = true;
        }
        return next;
      });
      setTimeout(() => {
        setPeerLasers((prev) => {
          const next = { ...prev };
          delete next[user?.id ?? "me"];
          return next;
        });
      }, 1500);
      return;
    }

    if (isDraggingSelected && selectedElementId) {
      setIsDraggingSelected(false);
      triggerAutoSave(elements, [...undoStack, elements], []);
      return;
    }

    if (!isDrawing) return;
    setIsRecording(false);

    if (currentElement) {
      // Finalize elements
      const finalElement = { ...currentElement };
      if (finalElement.type === "rectangle" || finalElement.type === "circle" || finalElement.type === "line" || finalElement.type === "arrow") {
        // Handle negative bounds nicely
        if (finalElement.width !== undefined && finalElement.height !== undefined && finalElement.x !== undefined && finalElement.y !== undefined) {
          if (finalElement.type === "rectangle" || finalElement.type === "circle") {
            if (finalElement.width < 0) {
              finalElement.x = finalElement.x + finalElement.width;
              finalElement.width = Math.abs(finalElement.width);
            }
            if (finalElement.height < 0) {
              finalElement.y = finalElement.y + finalElement.height;
              finalElement.height = Math.abs(finalElement.height);
            }
          }
        }
      }

      const nextElements = [...elements, finalElement];
      setUndoStack((prev) => [...prev, elements]);
      setRedoStack([]);
      setElements(nextElements);
      setCurrentElement(null);
      setCurrentPoints([]);

      broadcastOperation("create", finalElement);
      triggerAutoSave(nextElements, [...undoStack, elements], []);
    }
  };

  // ── 10. Draw Canvas Frame Loop ──────────────────────────────────────────────
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Support screen scaling for crisp lines
    const ratio = window.devicePixelRatio || 1;
    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(ratio, ratio);
    ctx.clearRect(0, 0, width, height);

    // Save context state for camera translation
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw Whiteboard grid background
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    const gridSize = 40;
    const gridLimit = 3000;

    for (let x = -gridLimit; x < gridLimit; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, -gridLimit);
      ctx.lineTo(x, gridLimit);
      ctx.stroke();
    }
    for (let y = -gridLimit; y < gridLimit; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(-gridLimit, y);
      ctx.lineTo(gridLimit, y);
      ctx.stroke();
    }

    // Draw elements
    const renderElement = (el: WhiteboardElement) => {
      ctx.save();
      ctx.strokeStyle = el.color;
      ctx.fillStyle = el.color;
      ctx.lineWidth = el.lineWidth;
      ctx.globalAlpha = el.opacity;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (el.type === "pen" || el.type === "marker" || el.type === "highlighter") {
        if (el.points && el.points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(el.points[0].x, el.points[0].y);
          for (let pIdx = 1; pIdx < el.points.length; pIdx++) {
            ctx.lineTo(el.points[pIdx].x, el.points[pIdx].y);
          }
          ctx.stroke();
        }
      } else if (el.type === "rectangle") {
        if (el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
          ctx.strokeRect(el.x, el.y, el.width, el.height);
        }
      } else if (el.type === "circle") {
        if (el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
          ctx.beginPath();
          const rx = Math.abs(el.width / 2);
          const ry = Math.abs(el.height / 2);
          ctx.ellipse(el.x + el.width / 2, el.y + el.height / 2, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (el.type === "line") {
        if (el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
          ctx.beginPath();
          ctx.moveTo(el.x, el.y);
          ctx.lineTo(el.x + el.width, el.y + el.height);
          ctx.stroke();
        }
      } else if (el.type === "arrow") {
        if (el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
          const x1 = el.x;
          const y1 = el.y;
          const x2 = el.x + el.width;
          const y2 = el.y + el.height;

          // Draw shaft
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          // Draw head
          const angle = Math.atan2(y2 - y1, x2 - x1);
          const headlen = Math.max(el.lineWidth * 3, 10);
          ctx.beginPath();
          ctx.moveTo(x2, y2);
          ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
          ctx.closePath();
          ctx.fill();
        }
      } else if (el.type === "text") {
        if (el.x !== undefined && el.y !== undefined && el.text) {
          const styleStr = `${el.isItalic ? "italic " : ""}${el.isBold ? "bold " : ""}${el.fontSize || 16}px system-ui`;
          ctx.font = styleStr;
          ctx.textAlign = el.align || "left";
          ctx.textBaseline = "bottom";

          const lines = el.text.split("\n");
          let currentY = el.y;
          const lineHeight = (el.fontSize || 16) * 1.25;

          // Compute size on the fly for select bounding box
          let maxW = 0;
          for (const line of lines) {
            ctx.fillText(line, el.x, currentY);
            const wMetrics = ctx.measureText(line).width;
            if (wMetrics > maxW) maxW = wMetrics;
            currentY += lineHeight;
          }

          // Store bounding sizes for select bounding box rendering
          el.width = maxW;
          el.height = lineHeight * lines.length;
        }
      } else if (el.type === "image" && el.url) {
        if (el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
          const imgObj = new Image();
          imgObj.src = el.url;
          if (imgObj.complete) {
            ctx.drawImage(imgObj, el.x, el.y, el.width, el.height);
          } else {
            imgObj.onload = () => drawCanvas();
            // Placeholder while loading
            ctx.strokeRect(el.x, el.y, el.width, el.height);
            ctx.beginPath();
            ctx.moveTo(el.x, el.y);
            ctx.lineTo(el.x + el.width, el.y + el.height);
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    };

    // Render elements
    elements.forEach(renderElement);

    // Draw element preview being drawn currently
    if (currentElement) {
      renderElement(currentElement);
    }

    // Draw Selection Bounds Bounding Box
    if (tool === "select" && selectedElementId) {
      const el = elements.find((item) => item.id === selectedElementId);
      if (el) {
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 1;
        ctx.setLineDash([4, 4]);

        if (el.points && el.points.length > 0) {
          // Bounding box of points
          const xs = el.points.map((p) => p.x);
          const ys = el.points.map((p) => p.y);
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);
          ctx.strokeRect(minX - 4, minY - 4, (maxX - minX) + 8, (maxY - minY) + 8);
        } else if (el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
          if (el.type === "text") {
            ctx.strokeRect(el.x - 4, el.y - el.height - 4, el.width + 8, el.height + 8);
          } else {
            ctx.strokeRect(el.x - 4, el.y - 4, el.width + 8, el.height + 8);
          }
        }
        ctx.setLineDash([]); // Reset dash
      }
    }

    // Draw Peer Laser pointers
    Object.values(peerLasers).forEach((l) => {
      ctx.beginPath();
      ctx.arc(l.x, l.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = l.fading ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.8)";
      ctx.shadowBlur = l.fading ? 2 : 12;
      ctx.shadowColor = "red";
      ctx.fill();
      ctx.shadowBlur = 0; // Reset shadow
    });

    ctx.restore(); // Restore camera translation

    // Draw Peer cursors
    Object.values(peerCursors).forEach((peer) => {
      // Translate peer coordinates to current camera view
      const screenX = peer.x * zoom + pan.x;
      const screenY = peer.y * zoom + pan.y;

      if (screenX >= 0 && screenX <= width && screenY >= 0 && screenY <= height) {
        ctx.save();
        ctx.translate(screenX, screenY);

        // Draw cursor pointer arrow
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 16);
        ctx.lineTo(4, 12);
        ctx.lineTo(12, 12);
        ctx.closePath();
        ctx.fillStyle = "#3b82f6";
        ctx.fill();
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw label box with user info
        ctx.font = "bold 10px system-ui";
        const labelW = ctx.measureText(peer.username).width + 12;
        ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
        ctx.strokeStyle = "#3b82f6";
        ctx.beginPath();
        ctx.roundRect(12, 12, labelW, 18, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "white";
        ctx.textBaseline = "middle";
        ctx.fillText(peer.username, 18, 21);

        ctx.restore();
      }
    });
  }, [elements, currentElement, currentPoints, tool, selectedElementId, pan, zoom, peerCursors, peerLasers]);

  // Request Animation Frame loop for drawing
  useEffect(() => {
    let animFrame: number;
    const loop = () => {
      drawCanvas();
      animFrame = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animFrame);
  }, [drawCanvas]);

  // ── 11. Undo / Redo Collaborative Architecture ──────────────────────────────
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    const newUndo = undoStack.slice(0, undoStack.length - 1);

    setRedoStack((prev) => [...prev, elements]);
    setUndoStack(newUndo);
    setElements(previous);

    broadcastOperation("sync_state", { elements: previous, undoStack: newUndo, redoStack: [...redoStack, elements] });
    triggerAutoSave(previous, newUndo, [...redoStack, elements]);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const newRedo = redoStack.slice(0, redoStack.length - 1);

    setUndoStack((prev) => [...prev, elements]);
    setRedoStack(newRedo);
    setElements(next);

    broadcastOperation("sync_state", { elements: next, undoStack: [...undoStack, elements], redoStack: newRedo });
    triggerAutoSave(next, [...undoStack, elements], newRedo);
  };

  // ── 12. Clear Board Action ──────────────────────────────────────────────────
  const handleClearBoard = () => {
    if (window.confirm("Are you sure you want to clear the entire drawing board?")) {
      const socket = getSocket();
      if (socket) {
        socket.emit("whiteboard_clear_board", { whiteboardId });
      }
      setUndoStack((prev) => [...prev, elements]);
      setRedoStack([]);
      setElements([]);
      triggerAutoSave([], [...undoStack, elements], []);
    }
  };

  // ── 13. Text Submission ─────────────────────────────────────────────────────
  const submitTextElement = () => {
    if (!textInputPos || !textInputVal.trim()) {
      setTextInputPos(null);
      setTextInputVal("");
      return;
    }

    const newId = editingTextElementId || `el_${user?.id}_${Date.now()}`;
    const newElement: WhiteboardElement = {
      id: newId,
      type: "text",
      x: textInputPos.x,
      y: textInputPos.y,
      text: textInputVal,
      fontSize,
      isBold,
      isItalic,
      align: textAlign,
      color,
      lineWidth: 1,
      opacity: 1,
      userId: user?.id ?? "",
    };

    const nextElements = editingTextElementId
      ? elements.map((el) => (el.id === editingTextElementId ? newElement : el))
      : [...elements, newElement];

    setUndoStack((prev) => [...prev, elements]);
    setRedoStack([]);
    setElements(nextElements);

    if (editingTextElementId) {
      broadcastOperation("update", newElement);
    } else {
      broadcastOperation("create", newElement);
    }

    triggerAutoSave(nextElements, [...undoStack, elements], []);

    // Reset input
    setTextInputPos(null);
    setTextInputVal("");
    setEditingTextElementId(null);
  };

  // Double click text to edit
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== "select") return;
    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    const hit = getElementAtPosition(x, y);

    if (hit && hit.type === "text") {
      setEditingTextElementId(hit.id);
      setTextInputPos({ x: hit.x ?? x, y: hit.y ?? y });
      setTextInputVal(hit.text ?? "");
      setFontSize(hit.fontSize ?? 20);
      setIsBold(hit.isBold ?? false);
      setIsItalic(hit.isItalic ?? false);
      setTextAlign(hit.align ?? "left");
      setColor(hit.color);
    }
  };

  // Keyboard Shortcuts (Delete, Undo, Redo, Zoom)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) return;

      if (e.key === "Backspace" || e.key === "Delete") {
        if (selectedElementId) {
          const nextElements = elements.filter((el) => el.id !== selectedElementId);
          setUndoStack((prev) => [...prev, elements]);
          setRedoStack([]);
          setElements(nextElements);
          broadcastOperation("delete", { id: selectedElementId });
          triggerAutoSave(nextElements, [...undoStack, elements], []);
          setSelectedElementId(null);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      } else if (e.key === "Escape") {
        setSelectedElementId(null);
        setTextInputPos(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedElementId, elements, undoStack, redoStack]);

  // ── 14. Image insertion tool ────────────────────────────────────────────────
  const handleImageInsert = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Max size is 5MB", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      try {
        const token = localStorage.getItem("whiterchat_token") ?? "";
        const resp = await fetch(apiUrl("/api/posts/upload"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ data: base64, mimeType: file.type }),
        });
        if (resp.ok) {
          const res = await resp.json();
          if (res.url) {
            // Success! Insert Image object into canvas center
            const newId = `el_${user?.id}_${Date.now()}`;
            const imageEl: WhiteboardElement = {
              id: newId,
              type: "image",
              x: -pan.x / zoom + 100,
              y: -pan.y / zoom + 100,
              width: 250,
              height: 250,
              url: res.url,
              color: "#000",
              lineWidth: 0,
              opacity: 1,
              userId: user?.id ?? "",
            };

            const nextElements = [...elements, imageEl];
            setUndoStack((prev) => [...prev, elements]);
            setRedoStack([]);
            setElements(nextElements);

            broadcastOperation("create", imageEl);
            triggerAutoSave(nextElements, [...undoStack, elements], []);
            setSelectedElementId(newId);
            setTool("select");
          }
        }
      } catch (err) {
        toast({ title: "Failed to upload image object" });
      }
    };
    reader.readAsDataURL(file);
  };

  // ── 15. Export Board as High-Resolution PNG ──────────────────────────────────
  const handleExportPNG = () => {
    if (elements.length === 0) {
      toast({ title: "Whiteboard is empty" });
      return;
    }

    toast({ title: "Preparing export..." });

    // Compute bounds of all objects to crop exported canvas to drawing contents
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    elements.forEach((el) => {
      if (el.points && el.points.length > 0) {
        el.points.forEach((pt) => {
          if (pt.x < minX) minX = pt.x;
          if (pt.x > maxX) maxX = pt.x;
          if (pt.y < minY) minY = pt.y;
          if (pt.y > maxY) maxY = pt.y;
        });
      } else if (el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
        const x2 = el.x + el.width;
        const y2 = el.y + el.height;
        const xMin = Math.min(el.x, x2);
        const xMax = Math.max(el.x, x2);
        const yMin = Math.min(el.y, y2);
        const yMax = Math.max(el.y, y2);

        if (xMin < minX) minX = xMin;
        if (xMax > maxX) maxX = xMax;
        if (yMin < minY) minY = yMin;
        if (yMax > maxY) maxY = yMax;
      }
    });

    // Add margin
    const margin = 40;
    minX = Math.max(-3000, minX - margin);
    minY = Math.max(-3000, minY - margin);
    maxX = Math.min(3000, maxX + margin);
    maxY = Math.min(3000, maxY + margin);

    const exportW = maxX - minX;
    const exportH = maxY - minY;

    if (exportW <= 0 || exportH <= 0 || exportW > 10000 || exportH > 10000) {
      toast({ title: "Drawing size too large to export directly", variant: "destructive" });
      return;
    }

    const offscreen = document.createElement("canvas");
    offscreen.width = exportW;
    offscreen.height = exportH;
    const oCtx = offscreen.getContext("2d");

    if (!oCtx) return;

    // Background filling dark aesthetic
    oCtx.fillStyle = "#0f172a"; // Dark slate
    oCtx.fillRect(0, 0, exportW, exportH);

    // Translate to top-left bounds
    oCtx.save();
    oCtx.translate(-minX, -minY);

    // Draw elements
    const renderToOffscreen = (el: WhiteboardElement) => {
      oCtx.save();
      oCtx.strokeStyle = el.color;
      oCtx.fillStyle = el.color;
      oCtx.lineWidth = el.lineWidth;
      oCtx.globalAlpha = el.opacity;
      oCtx.lineCap = "round";
      oCtx.lineJoin = "round";

      if (el.type === "pen" || el.type === "marker" || el.type === "highlighter") {
        if (el.points && el.points.length > 0) {
          oCtx.beginPath();
          oCtx.moveTo(el.points[0].x, el.points[0].y);
          for (let pIdx = 1; pIdx < el.points.length; pIdx++) {
            oCtx.lineTo(el.points[pIdx].x, el.points[pIdx].y);
          }
          oCtx.stroke();
        }
      } else if (el.type === "rectangle") {
        if (el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
          oCtx.strokeRect(el.x, el.y, el.width, el.height);
        }
      } else if (el.type === "circle") {
        if (el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
          oCtx.beginPath();
          const rx = Math.abs(el.width / 2);
          const ry = Math.abs(el.height / 2);
          oCtx.ellipse(el.x + el.width / 2, el.y + el.height / 2, rx, ry, 0, 0, Math.PI * 2);
          oCtx.stroke();
        }
      } else if (el.type === "line") {
        if (el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
          oCtx.beginPath();
          oCtx.moveTo(el.x, el.y);
          oCtx.lineTo(el.x + el.width, el.y + el.height);
          oCtx.stroke();
        }
      } else if (el.type === "arrow") {
        if (el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
          const x1 = el.x;
          const y1 = el.y;
          const x2 = el.x + el.width;
          const y2 = el.y + el.height;

          oCtx.beginPath();
          oCtx.moveTo(x1, y1);
          oCtx.lineTo(x2, y2);
          oCtx.stroke();

          const angle = Math.atan2(y2 - y1, x2 - x1);
          const headlen = Math.max(el.lineWidth * 3, 10);
          oCtx.beginPath();
          oCtx.moveTo(x2, y2);
          oCtx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
          oCtx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
          oCtx.closePath();
          oCtx.fill();
        }
      } else if (el.type === "text") {
        if (el.x !== undefined && el.y !== undefined && el.text) {
          oCtx.font = `${el.isItalic ? "italic " : ""}${el.isBold ? "bold " : ""}${el.fontSize || 16}px system-ui`;
          oCtx.textAlign = el.align || "left";
          oCtx.textBaseline = "bottom";

          const lines = el.text.split("\n");
          let currentY = el.y;
          const lineHeight = (el.fontSize || 16) * 1.25;

          for (const line of lines) {
            oCtx.fillText(line, el.x, currentY);
            currentY += lineHeight;
          }
        }
      } else if (el.type === "image" && el.url) {
        if (el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
          const imgObj = new Image();
          imgObj.src = el.url;
          if (imgObj.complete) {
            oCtx.drawImage(imgObj, el.x, el.y, el.width, el.height);
          }
        }
      }
      oCtx.restore();
    };

    // Render all elements sequentially
    elements.forEach(renderToOffscreen);
    oCtx.restore();

    // Trigger download
    const dataUrl = offscreen.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${title.replace(/\s+/g, "_")}_board.png`;
    link.click();

    toast({ title: "Whiteboard exported successfully!" });
  };

  // Zoom handlers
  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.15, 4));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.15, 0.25));
  const handleResetZoom = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const saveTitle = async () => {
    setIsEditingTitle(false);
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      await fetch(apiUrl(`/api/whiteboards/${whiteboardId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title }),
      });
    } catch {
      toast({ title: "Failed to update title" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col select-none overflow-hidden touch-none" ref={containerRef}>
      {/* ── Header Toolbar (Glassmorphic) ─────────────────────────────────────── */}
      <header className="h-14 shrink-0 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 z-10 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white rounded-full">
            <X className="w-5 h-5" />
          </Button>

          {/* Whiteboard Title */}
          {isEditingTitle ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => e.key === "Enter" && saveTitle()}
              className="h-8 max-w-[200px] text-sm font-semibold rounded-lg bg-slate-950 border-slate-800 text-white"
              autoFocus
            />
          ) : (
            <div className="flex items-center gap-1.5 cursor-pointer max-w-[200px] sm:max-w-xs group" onClick={() => setIsEditingTitle(true)}>
              <h1 className="text-sm sm:text-base font-bold text-white truncate">{title}</h1>
              <Edit3 className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}

          {/* Glowing Status indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800/40 border border-slate-800/50 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
            {saveStatus === "saving" ? (
              <>
                <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                <span className="text-amber-400">Saving...</span>
              </>
            ) : saveStatus === "offline" ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span className="text-red-400">Offline</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-400">Saved</span>
              </>
            )}
          </div>
        </div>

        {/* Collaborators online tray */}
        <div className="flex items-center gap-3">
          <div className="flex items-center -space-x-2.5">
            {collaborators.map((c) => (
              <Avatar key={c.id} className="w-7 h-7 border-2 border-slate-900 shadow-lg ring-1 ring-slate-800/20" title={c.username}>
                <AvatarImage src={c.avatarUrl} />
                <AvatarFallback className="text-[10px] bg-slate-800 text-slate-300">{c.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
            ))}
          </div>

          {collaborators.length > 0 && (
            <span className="text-xs font-semibold text-slate-400 tabular-nums hidden xs:inline-block">
              {collaborators.length} drawing
            </span>
          )}

          {/* Import file upload */}
          <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleImageInsert} />

          <Button variant="ghost" size="icon" onClick={handleExportPNG} className="text-slate-400 hover:text-white rounded-full hidden sm:inline-flex" title="Export as PNG">
            <Download className="w-5 h-5" />
          </Button>

          <Button variant="ghost" size="icon" onClick={handleClearBoard} className="text-slate-400 hover:text-red-400 rounded-full" title="Clear board">
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* ── Drawing Area ──────────────────────────────────────────────────────── */}
      <div className="flex-1 relative bg-slate-950 cursor-crosshair overflow-hidden" ref={containerRef}>
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-40 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-xs text-slate-400 font-semibold tracking-wider">Syncing Board Elements...</p>
          </div>
        ) : null}

        {/* Dynamic Canvas element */}
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDoubleClick={handleDoubleClick}
          className="absolute inset-0"
        />

        {/* Inline HTML Text Input Editor overlay */}
        {textInputPos && (
          <div
            className="absolute z-30 p-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col gap-2 min-w-[200px]"
            style={{
              left: `${textInputPos.x * zoom + pan.x}px`,
              top: `${textInputPos.y * zoom + pan.y}px`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <textarea
              value={textInputVal}
              onChange={(e) => setTextInputVal(e.target.value)}
              placeholder="Type something..."
              className="bg-slate-950 border border-slate-800 rounded-lg text-white p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary min-h-[50px] leading-relaxed"
              autoFocus
            />
            <div className="flex items-center justify-between gap-2">
              <Button size="sm" variant="ghost" className="text-xs text-slate-400 hover:text-white" onClick={() => setTextInputPos(null)}>
                Cancel
              </Button>
              <Button size="sm" className="text-xs font-semibold px-4" onClick={submitTextElement}>
                Add Text
              </Button>
            </div>
          </div>
        )}

        {/* ── Float Navigation Palette Controls (Top Left) ────────────────── */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/90 p-1 flex flex-col gap-1 shadow-lg backdrop-blur-md">
            <Button variant="ghost" size="icon" onClick={handleZoomIn} className="h-8 w-8 text-slate-400 hover:text-white rounded-lg">
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleZoomOut} className="h-8 w-8 text-slate-400 hover:text-white rounded-lg">
              <ZoomOut className="w-4 h-4" />
            </Button>
            <button
              onClick={handleResetZoom}
              className="h-8 w-8 flex items-center justify-center text-[10px] font-bold text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800 rounded-lg tabular-nums"
              title="Reset Zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/90 p-1 flex flex-col gap-1 shadow-lg backdrop-blur-md">
            <Button variant="ghost" size="icon" onClick={handleUndo} disabled={undoStack.length === 0} className="h-8 w-8 text-slate-400 hover:text-white rounded-lg disabled:opacity-40">
              <Undo2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleRedo} disabled={redoStack.length === 0} className="h-8 w-8 text-slate-400 hover:text-white rounded-lg disabled:opacity-40">
              <Redo2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ── Desktop Left Toolbars Sidebar (md+) ────────────────────────────── */}
        <div className="absolute top-1/2 -translate-y-1/2 left-4 hidden md:flex flex-col gap-3 z-10">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/90 p-1.5 flex flex-col gap-1 shadow-xl backdrop-blur-md">
            {/* Draw Tools */}
            {[
              { id: "select", icon: Move, label: "Select & Move" },
              { id: "pen", icon: Palette, label: "Brush Pen" },
              { id: "marker", icon: Edit3, label: "Marker Pen" },
              { id: "highlighter", icon: Sparkles, label: "Highlighter" },
              { id: "eraser", icon: Eraser, label: "Eraser" },
              { id: "text", icon: Type, label: "Rich Text" },
              { id: "image", icon: ImageIcon, label: "Insert Image", action: () => imageInputRef.current?.click() },
              { id: "line", icon: Minus, label: "Draw Line" },
              { id: "arrow", icon: ArrowRight, label: "Draw Arrow" },
              { id: "rectangle", icon: Square, label: "Draw Rectangle" },
              { id: "circle", icon: Circle, label: "Draw Circle" },
            ].map((t) => {
              const Icon = t.icon;
              const active = tool === t.id;
              return (
                <Button
                  key={t.id}
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (t.action) t.action();
                    else setTool(t.id as any);
                  }}
                  className={cn(
                    "h-9 w-9 rounded-xl text-slate-400 transition-all",
                    active ? "bg-primary text-primary-foreground shadow-md" : "hover:text-white hover:bg-slate-800"
                  )}
                  title={t.label}
                >
                  <Icon className="w-4.5 h-4.5" />
                </Button>
              );
            })}
          </div>

          {/* Quick Colors Selector */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/90 p-1.5 flex flex-col gap-1.5 shadow-xl backdrop-blur-md items-center">
            {PREDEFINED_COLORS.map((c) => {
              const active = color === c;
              return (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-5 h-5 rounded-full border border-slate-950 transition-all shadow-inner hover:scale-110",
                    active ? "ring-2 ring-blue-500 scale-110 shadow-lg" : "ring-1 ring-slate-800"
                  )}
                  style={{ backgroundColor: c }}
                />
              );
            })}
            <div className="h-px bg-slate-800 w-5 my-0.5" />
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-5 h-5 rounded-full border-none cursor-pointer bg-transparent outline-none scale-105"
            />
          </div>
        </div>

        {/* ── Responsive Bottom Sticky Controls Toolbar (Mobile view) ────────── */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col gap-2 items-center w-[92%] max-w-[500px] md:hidden">
          {/* Colors Panel */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/95 px-3 py-2 flex items-center justify-between w-full shadow-lg backdrop-blur-md gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {PREDEFINED_COLORS.slice(0, 7).map((c) => {
                const active = color === c;
                return (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={cn(
                      "w-5 h-5 rounded-full shrink-0 border border-slate-950 transition-all",
                      active ? "ring-2 ring-blue-500 scale-110 shadow-lg" : ""
                    )}
                    style={{ backgroundColor: c }}
                  />
                );
              })}
            </div>
            <div className="h-5 w-px bg-slate-800 shrink-0" />
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-5 h-5 rounded-full border-none cursor-pointer bg-transparent outline-none shrink-0"
            />
          </div>

          {/* Actions Bottom Bar */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/95 p-1.5 flex items-center justify-between w-full shadow-xl backdrop-blur-md gap-1">
            {[
              { id: "select", icon: Move, label: "Select" },
              { id: "pen", icon: Palette, label: "Draw" },
              { id: "eraser", icon: Eraser, label: "Eraser" },
              { id: "text", icon: Type, label: "Text" },
              { id: "image", icon: ImageIcon, label: "Image", action: () => imageInputRef.current?.click() },
              { id: "rectangle", icon: Square, label: "Shape" },
            ].map((t) => {
              const Icon = t.icon;
              const active = tool === t.id;
              return (
                <Button
                  key={t.id}
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (t.action) t.action();
                    else setTool(t.id as any);
                  }}
                  className={cn(
                    "flex-1 h-9 rounded-lg text-slate-400 transition-colors",
                    active ? "bg-primary text-primary-foreground font-semibold shadow-md" : "hover:text-white"
                  )}
                  title={t.label}
                >
                  <Icon className="w-4.5 h-4.5" />
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
