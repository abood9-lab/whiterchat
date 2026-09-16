import { useState, useEffect, useRef, useCallback } from "react";
import { getSocket } from "@/lib/socket";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/api-url";
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  MonitorUp,
  MonitorOff,
  SwitchCamera,
  Wifi,
  Sparkles,
  ShieldCheck,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface CallState {
  active: boolean;
  conversationId: string | null;
  targetUserId: string | null;
  targetUser: {
    username: string;
    fullName?: string;
    avatarUrl?: string;
  } | null;
  callType: "voice" | "video";
  isIncoming: boolean;
  status: "idle" | "ringing" | "connecting" | "connected" | "ended" | "reconnecting" | "declined" | "failed";
  offer?: any;
}

interface CallOverlayProps {
  callState: CallState | null;
  onClose: () => void;
  myUserId: string;
  myUser?: {
    username?: string;
    fullName?: string;
    avatarUrl?: string;
  } | null;
  onStatusChange?: (status: CallState["status"]) => void;
}

export function CallOverlay({
  callState,
  onClose,
  myUserId,
  myUser,
  onStatusChange,
}: CallOverlayProps) {
  // Call controls state
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [duration, setDuration] = useState(0);
  const [connectionState, setConnectionState] = useState<string>("connecting");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  // Call phase tracker: "ringing" | "connecting" | "connected" | "ended"
  const [callPhase, setCallPhase] = useState<"ringing" | "connecting" | "connected" | "ended">(() =>
    callState?.status === "ringing" ? "ringing" : "connecting"
  );

  useEffect(() => {
    if (callState?.status && callState.status !== "ringing") {
      setCallPhase(callState.status === "connected" ? "connected" : "connecting");
    }
  }, [callState?.status]);

  // Peer media status (received from remote peer)
  const [peerMuted, setPeerMuted] = useState(false);
  const [peerCameraOff, setPeerCameraOff] = useState(false);

  // Audio visualizer state
  const [audioLevel, setAudioLevel] = useState(0);

  // Media & WebRTC Refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isAnsweredRef = useRef(false);
  const hasInitiatedRef = useRef(false);
  const pendingIceCandidatesRef = useRef<any[]>([]);

  // Web Audio Context for ringtones & audio analysis
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringtoneIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const startTimer = useCallback(() => {
    if (!timerRef.current) {
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
  }, []);

  // ── Web Audio Synthesizer for High-End Ringtones & Feedback ───────────────
  const initAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtxRef.current = new AudioCtxClass();
      }
    }
    if (audioCtxRef.current?.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playChimeTone = useCallback((freqs: number[], type: OscillatorType = "sine", dur = 0.3) => {
    try {
      const ctx = initAudioCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.001, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.2, now + idx * 0.12 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + dur);
      });
    } catch {
      // Audio autoplay policy catch
    }
  }, [initAudioCtx]);

  const startRingtone = useCallback((isIncoming: boolean) => {
    if (isAnsweredRef.current) return;
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }

    const playCycle = () => {
      if (isAnsweredRef.current) return;
      if (isIncoming) {
        // Incoming: High-end marimba/chime cycle
        playChimeTone([587.33, 880, 1174.66], "sine", 0.4);
      } else {
        // Outgoing: Soft supervisory ringback cadence
        playChimeTone([440, 480], "sine", 0.8);
      }
    };

    playCycle();
    ringtoneIntervalRef.current = setInterval(playCycle, isIncoming ? 2500 : 3500);
  }, [playChimeTone]);

  const stopRingtone = useCallback(() => {
    isAnsweredRef.current = true;
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
  }, []);

  // ── Audio Visualizer Hook ────────────────────────────────────────────────
  const setupAudioVisualizer = useCallback((stream: MediaStream) => {
    try {
      const ctx = initAudioCtx();
      if (!ctx) return;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (err) {
      console.warn("Could not start audio visualizer", err);
    }
  }, [initAudioCtx]);

  // ── Post Call Log into Conversation ──────────────────────────────────────
  const recordCallLog = useCallback(
    async (status: "completed" | "missed" | "declined" | "failed", durSecs: number) => {
      if (!callState?.conversationId) return;
      try {
        const token = localStorage.getItem("whiterchat_token") ?? "";
        await fetch(apiUrl(`/api/conversations/${callState.conversationId}/messages`), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            messageType: "call",
            callLog: {
              callType: callState.callType,
              duration: durSecs,
              status,
            },
          }),
        });
      } catch (err) {
        console.error("Failed to post call log", err);
      }
    },
    [callState]
  );

  // ── Clean Up All Tracks & Audio ──────────────────────────────────────────
  const stopMedia = useCallback(() => {
    stopRingtone();
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [stopRingtone]);

  // ── End / Decline Call Handler ───────────────────────────────────────────
  const handleEndCall = useCallback(
    (reason: "ended" | "declined" | "missed" = "ended") => {
      playChimeTone([440, 330], "sine", 0.25);
      const finalDur = duration;
      const socket = getSocket();

      if (callState?.conversationId && callState?.targetUserId) {
        socket?.emit("call_end", {
          conversationId: callState.conversationId,
          targetUserId: callState.targetUserId,
          duration: finalDur,
        });
      }

      if (callState?.isIncoming && callState.status === "ringing") {
        recordCallLog("missed", 0);
      } else if (reason === "declined") {
        recordCallLog("declined", 0);
      } else {
        recordCallLog("completed", finalDur);
      }

      stopMedia();
      onClose();
    },
    [callState, duration, onClose, playChimeTone, recordCallLog, stopMedia]
  );

  // ── Setup RTCPeerConnection with STUN Servers ─────────────────────────────
  const setupPeerConnection = useCallback(async () => {
    if (pcRef.current && pcRef.current.signalingState !== "closed") {
      return pcRef.current;
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ],
    });
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate && callState?.conversationId && callState?.targetUserId) {
        getSocket()?.emit("call_ice_candidate", {
          conversationId: callState.conversationId,
          targetUserId: callState.targetUserId,
          candidate: e.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
      if (pc.connectionState === "connected") {
        stopRingtone();
        setCallPhase("connected");
        startTimer();
        playChimeTone([523.25, 659.25], "sine", 0.18);
      } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        setConnectionState("reconnecting");
      }
    };

    pc.ontrack = (e) => {
      const stream = e.streams[0];
      if (callState?.callType === "video" && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      } else if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
      }
      setupAudioVisualizer(stream);
    };

    // Acquire Local Media
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const constraints: MediaStreamConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video:
            callState?.callType === "video"
              ? {
                  facingMode,
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                }
              : false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStreamRef.current = stream;

        if (callState?.callType === "video" && localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      } else {
        try { pc.addTransceiver("audio", { direction: "sendrecv" }); } catch {}
        if (callState?.callType === "video") {
          try { pc.addTransceiver("video", { direction: "sendrecv" }); } catch {}
        }
      }
    } catch (err) {
      console.warn("Could not get user media or permissions restricted, using media transceivers", err);
      try { pc.addTransceiver("audio", { direction: "sendrecv" }); } catch {}
      if (callState?.callType === "video") {
        try { pc.addTransceiver("video", { direction: "sendrecv" }); } catch {}
      }
    }

    return pc;
  }, [callState?.callType, callState?.conversationId, callState?.targetUserId, facingMode, playChimeTone, setupAudioVisualizer, startTimer, stopRingtone]);

  // ── Accept Incoming Call ─────────────────────────────────────────────────
  const handleAcceptCall = useCallback(async () => {
    // 1. Immediately kill the ringtone so sound stops at once
    stopRingtone();
    isAnsweredRef.current = true;
    setCallPhase("connected");
    setConnectionState("connected");
    startTimer();
    playChimeTone([523.25, 659.25, 783.99], "sine", 0.2);
    onStatusChange?.("connected");

    try {
      const pc = await setupPeerConnection();

      if (callState?.offer) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(callState.offer));

          // Drain queued ICE candidates
          while (pendingIceCandidatesRef.current.length > 0) {
            const cand = pendingIceCandidatesRef.current.shift();
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (e) {
              console.warn("Error adding queued ice candidate:", e);
            }
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          getSocket()?.emit("call_accept", {
            conversationId: callState.conversationId,
            targetUserId: callState.targetUserId,
            answer,
          });
        } catch (err) {
          console.warn("Error in SDP answer negotiation:", err);
          getSocket()?.emit("call_accept", {
            conversationId: callState.conversationId,
            targetUserId: callState.targetUserId,
          });
        }
      } else {
        getSocket()?.emit("call_accept", {
          conversationId: callState?.conversationId,
          targetUserId: callState?.targetUserId,
        });
      }
    } catch (err) {
      console.warn("Error during handleAcceptCall:", err);
      getSocket()?.emit("call_accept", {
        conversationId: callState?.conversationId,
        targetUserId: callState?.targetUserId,
      });
    }
  }, [callState, onStatusChange, playChimeTone, setupPeerConnection, startTimer, stopRingtone]);

  // ── Outgoing Call Initiation ─────────────────────────────────────────────
  const handleInitiateCall = useCallback(async () => {
    isAnsweredRef.current = false;
    startRingtone(false);
    try {
      const pc = await setupPeerConnection();
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callState?.callType === "video",
      });
      await pc.setLocalDescription(offer);

      getSocket()?.emit("call_initiate", {
        conversationId: callState?.conversationId,
        targetUserId: callState?.targetUserId,
        callType: callState?.callType,
        offer,
        caller: {
          id: myUserId,
          username: myUser?.username || "User",
          fullName: myUser?.fullName || myUser?.username || "User",
          avatarUrl: myUser?.avatarUrl,
        },
      });
    } catch (err) {
      console.warn("Error initiating call offer:", err);
      getSocket()?.emit("call_initiate", {
        conversationId: callState?.conversationId,
        targetUserId: callState?.targetUserId,
        callType: callState?.callType,
        caller: {
          id: myUserId,
          username: myUser?.username || "User",
          fullName: myUser?.fullName || myUser?.username || "User",
          avatarUrl: myUser?.avatarUrl,
        },
      });
    }
  }, [callState?.callType, callState?.conversationId, callState?.targetUserId, myUser, myUserId, setupPeerConnection, startRingtone]);

  // ── Listen for Signaling Events ──────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !callState) return;

    if (callState.isIncoming && !isAnsweredRef.current && callPhase === "ringing") {
      startRingtone(true);
    } else if (!callState.isIncoming && !hasInitiatedRef.current) {
      hasInitiatedRef.current = true;
      handleInitiateCall();
    }

    const onAccepted = async (data: any) => {
      if (data.conversationId !== callState.conversationId) return;
      stopRingtone();
      isAnsweredRef.current = true;
      setCallPhase("connected");
      setConnectionState("connected");
      startTimer();
      playChimeTone([523.25, 659.25, 783.99], "sine", 0.2);
      onStatusChange?.("connected");

      if (pcRef.current && data.answer) {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          while (pendingIceCandidatesRef.current.length > 0) {
            const cand = pendingIceCandidatesRef.current.shift();
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(cand));
            } catch (e) {
              console.warn("Failed to apply candidate on caller:", e);
            }
          }
        } catch (err) {
          console.warn("Error setting remote answer on caller:", err);
        }
      }
    };

    const onDeclined = (data: any) => {
      if (data.conversationId !== callState.conversationId) return;
      stopRingtone();
      handleEndCall("declined");
    };

    const onIceCandidate = async (data: any) => {
      if (data.conversationId !== callState.conversationId) return;
      if (!data.candidate) return;
      const pc = pcRef.current;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.warn("Failed to add ice candidate directly:", e);
        }
      } else {
        pendingIceCandidatesRef.current.push(data.candidate);
      }
    };

    const onEnded = (data: any) => {
      if (data.conversationId !== callState.conversationId) return;
      stopMedia();
      onClose();
    };

    const onPeerMediaToggled = (data: any) => {
      if (data.conversationId !== callState.conversationId) return;
      if (data.mediaType === "audio") {
        setPeerMuted(!data.enabled);
      } else if (data.mediaType === "video") {
        setPeerCameraOff(!data.enabled);
      }
    };

    socket.on("call_accepted", onAccepted);
    socket.on("call_declined", onDeclined);
    socket.on("call_ice_candidate", onIceCandidate);
    socket.on("call_ended", onEnded);
    socket.on("call_peer_media_toggled", onPeerMediaToggled);

    return () => {
      socket.off("call_accepted", onAccepted);
      socket.off("call_declined", onDeclined);
      socket.off("call_ice_candidate", onIceCandidate);
      socket.off("call_ended", onEnded);
      socket.off("call_peer_media_toggled", onPeerMediaToggled);
    };
  }, [callState?.conversationId, callState?.isIncoming, callPhase, handleEndCall, handleInitiateCall, onClose, onStatusChange, playChimeTone, startRingtone, startTimer, stopMedia, stopRingtone]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMedia();
    };
  }, [stopMedia]);

  // ── Mute / Unmute Audio Track ─────────────────────────────────────────────
  const toggleMute = () => {
    const nextMuted = !muted;
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !nextMuted));
      setMuted(nextMuted);

      // Notify peer
      getSocket()?.emit("call_toggle_media", {
        conversationId: callState?.conversationId,
        targetUserId: callState?.targetUserId,
        mediaType: "audio",
        enabled: !nextMuted,
      });
    }
  };

  // ── Camera Toggle ────────────────────────────────────────────────────────
  const toggleCamera = () => {
    const nextCameraOff = !cameraOff;
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = !nextCameraOff));
      setCameraOff(nextCameraOff);

      // Notify peer
      getSocket()?.emit("call_toggle_media", {
        conversationId: callState?.conversationId,
        targetUserId: callState?.targetUserId,
        mediaType: "video",
        enabled: !nextCameraOff,
      });
    }
  };

  // ── Screen Sharing Toggle ─────────────────────────────────────────────────
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Revert to camera
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      if (localStreamRef.current && pcRef.current) {
        const cameraTrack = localStreamRef.current.getVideoTracks()[0];
        const senders = pcRef.current.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === "video");
        if (videoSender && cameraTrack) {
          videoSender.replaceTrack(cameraTrack);
        }
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        if (pcRef.current) {
          const senders = pcRef.current.getSenders();
          const videoSender = senders.find((s) => s.track && s.track.kind === "video");
          if (videoSender && screenTrack) {
            videoSender.replaceTrack(screenTrack);
          }
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        screenTrack.onended = () => {
          toggleScreenShare();
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.warn("Screen share cancelled or unsupported", err);
      }
    }
  };

  // ── Switch Front / Back Camera (Mobile) ──────────────────────────────────
  const toggleCameraFacing = async () => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);

    if (localStreamRef.current && pcRef.current) {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: nextMode },
        });
        const newTrack = newStream.getVideoTracks()[0];
        const oldTrack = localStreamRef.current.getVideoTracks()[0];
        if (oldTrack) oldTrack.stop();

        localStreamRef.current.removeTrack(oldTrack);
        localStreamRef.current.addTrack(newTrack);

        const senders = pcRef.current.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === "video");
        if (videoSender) {
          videoSender.replaceTrack(newTrack);
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
      } catch (err) {
        console.warn("Failed to switch camera", err);
      }
    }
  };

  if (!callState || !callState.active) return null;

  const isVideo = callState.callType === "video";
  const target = callState.targetUser;

  // ── Floating Minimized Window (Picture-in-Picture) ───────────────────────
  if (isMinimized) {
    return (
      <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 animate-in slide-in-from-bottom-5">
        <div className="bg-neutral-950/95 border border-neutral-800 backdrop-blur-xl rounded-2xl shadow-2xl p-3 flex items-center gap-3 text-white border-primary/20">
          <Avatar className="w-10 h-10 border-2 border-primary/50">
            <AvatarImage src={target?.avatarUrl} />
            <AvatarFallback>{target?.username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 pr-2">
            <p className="text-xs font-bold truncate max-w-[120px]">
              {target?.fullName || target?.username}
            </p>
            <p className="text-[11px] font-mono text-emerald-400">
              {formatDuration(duration)}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-neutral-400 hover:text-white"
              onClick={toggleMute}
            >
              {muted ? <MicOff className="w-4 h-4 text-red-500" /> : <Mic className="w-4 h-4" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-neutral-400 hover:text-white"
              onClick={() => setIsMinimized(false)}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="destructive"
              className="h-8 w-8 rounded-xl bg-red-600 hover:bg-red-700"
              onClick={() => handleEndCall("ended")}
            >
              <PhoneOff className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-lg p-3 sm:p-4 animate-in fade-in duration-300">
      {/* Remote audio output stream */}
      <audio ref={remoteAudioRef} autoPlay />

      <div className="relative w-full max-w-lg h-[640px] max-h-[92vh] overflow-hidden rounded-3xl bg-neutral-950 border border-neutral-800 text-white shadow-2xl flex flex-col justify-between">
        {/* Top Header Bar */}
        <div className="absolute top-0 inset-x-0 z-20 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-medium border border-white/10">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>End-to-End Encrypted</span>
            </span>

            {connectionState === "connected" && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-mono border border-emerald-500/30">
                <Wifi className="w-3 h-3 animate-pulse" />
                HD
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 text-white"
              onClick={() => setIsMinimized(true)}
              title="Minimize to Picture-in-Picture"
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ── Call Stage View ────────────────────────────────────────────── */}
        {isVideo ? (
          <div className="relative flex-1 bg-neutral-900 flex items-center justify-center overflow-hidden">
            {/* Remote Video Stream */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Peer Disabled Camera Notice */}
            {peerCameraOff && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900/90 backdrop-blur-sm z-10">
                <Avatar className="w-24 h-24 border-2 border-primary/50 mb-3">
                  <AvatarImage src={target?.avatarUrl} />
                  <AvatarFallback className="text-2xl">{target?.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <p className="text-sm font-semibold">{target?.fullName || target?.username}</p>
                <p className="text-xs text-neutral-400 mt-0.5">Camera is turned off</p>
              </div>
            )}

            {/* PIP Local Video Stream */}
            <div className="absolute top-16 right-4 w-28 h-40 sm:w-32 sm:h-48 bg-neutral-800 rounded-2xl overflow-hidden border-2 border-neutral-700 shadow-2xl z-20 transition-all">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={cn("w-full h-full object-cover", !isScreenSharing && "scale-x-[-1]")}
              />
              {cameraOff && (
                <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center text-neutral-400">
                  <VideoOff className="w-6 h-6" />
                </div>
              )}
            </div>

            {/* Remote Muted Notice */}
            {peerMuted && (
              <div className="absolute bottom-24 left-4 z-20 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs flex items-center gap-1.5 text-neutral-300">
                <MicOff className="w-3.5 h-3.5 text-red-400" />
                <span>@{target?.username} is muted</span>
              </div>
            )}
          </div>
        ) : (
          /* Voice Call Stage */
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-neutral-900 via-neutral-950 to-black relative overflow-hidden">
            {/* Ambient Animated Rings (Pulsing with audio level) */}
            <div
              className="absolute rounded-full border border-primary/30 transition-all duration-100 ease-out"
              style={{
                width: `${160 + audioLevel * 1.5}px`,
                height: `${160 + audioLevel * 1.5}px`,
                opacity: 0.15 + (audioLevel / 100) * 0.4,
              }}
            />
            <div
              className="absolute rounded-full border border-primary/20 transition-all duration-150 ease-out"
              style={{
                width: `${220 + audioLevel * 2.2}px`,
                height: `${220 + audioLevel * 2.2}px`,
                opacity: 0.1 + (audioLevel / 100) * 0.3,
              }}
            />

            {/* User Avatar */}
            <div className="relative mb-5 z-10">
              <Avatar className="w-32 h-32 border-4 border-primary/40 shadow-2xl">
                <AvatarImage src={target?.avatarUrl} />
                <AvatarFallback className="bg-primary/20 text-3xl font-bold text-primary">
                  {target?.username?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              {peerMuted && (
                <div className="absolute bottom-0 right-0 p-1.5 bg-red-600 rounded-full border-2 border-neutral-950 shadow-md">
                  <MicOff className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            <h3 className="text-2xl font-bold tracking-tight text-white mb-1 z-10">
              {target?.fullName || target?.username || "WhiterChat User"}
            </h3>
            <p className="text-sm font-medium text-neutral-400 mb-4 z-10">
              @{target?.username}
            </p>

            {/* Connection Status & Duration */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-neutral-300 z-10">
              {callState.isIncoming && callPhase === "ringing" ? (
                <span className="flex items-center gap-2 text-emerald-400">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  Incoming {isVideo ? "Video" : "Voice"} Call...
                </span>
              ) : connectionState === "connected" || callPhase === "connected" ? (
                <div className="flex items-center gap-2 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono tracking-wider">{formatDuration(duration)}</span>
                </div>
              ) : (
                <span className="capitalize text-amber-400">{connectionState}...</span>
              )}
            </div>

            {/* Waveform Bars when connected */}
            {(connectionState === "connected" || callPhase === "connected") && (
              <div className="flex items-center gap-1 mt-6 h-8 z-10">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((bar) => {
                  const height = Math.max(4, Math.round(audioLevel * (0.3 + (bar % 3) * 0.2)));
                  return (
                    <span
                      key={bar}
                      className="w-1 bg-primary rounded-full transition-all duration-75"
                      style={{ height: `${height}px` }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Controls Bottom Bar ─────────────────────────────────────────── */}
        {callState.isIncoming && callPhase === "ringing" ? (
          <div className="p-6 bg-neutral-950/90 border-t border-neutral-800/80 backdrop-blur-md flex items-center justify-around z-20">
            <div className="flex flex-col items-center gap-2">
              <Button
                variant="destructive"
                size="icon"
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 shadow-xl"
                onClick={() => handleEndCall("declined")}
              >
                <PhoneOff className="w-7 h-7" />
              </Button>
              <span className="text-xs text-neutral-400 font-medium">Decline</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <Button
                className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl animate-bounce"
                onClick={handleAcceptCall}
              >
                <Phone className="w-7 h-7" />
              </Button>
              <span className="text-xs text-emerald-400 font-medium">Accept</span>
            </div>
          </div>
        ) : (
          <div className="p-5 sm:p-6 bg-neutral-950/95 border-t border-neutral-800/80 backdrop-blur-md flex items-center justify-around gap-2 sm:gap-3 z-20">
            {/* Mic Toggle */}
            <Button
              variant="secondary"
              size="icon"
              className={cn(
                "w-12 h-12 sm:w-14 sm:h-14 rounded-full transition-all",
                muted
                  ? "bg-red-500/20 text-red-400 border border-red-500/40"
                  : "bg-neutral-800/90 text-white hover:bg-neutral-700"
              )}
              onClick={toggleMute}
              title={muted ? "Unmute" : "Mute"}
            >
              {muted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
            </Button>

            {/* Video Toggle */}
            {isVideo && (
              <Button
                variant="secondary"
                size="icon"
                className={cn(
                  "w-12 h-12 sm:w-14 sm:h-14 rounded-full transition-all",
                  cameraOff
                    ? "bg-red-500/20 text-red-400 border border-red-500/40"
                    : "bg-neutral-800/90 text-white hover:bg-neutral-700"
                )}
                onClick={toggleCamera}
                title={cameraOff ? "Turn Camera On" : "Turn Camera Off"}
              >
                {cameraOff ? <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Video className="w-5 h-5 sm:w-6 sm:h-6" />}
              </Button>
            )}

            {/* Screen Share Toggle */}
            {isVideo && (
              <Button
                variant="secondary"
                size="icon"
                className={cn(
                  "w-12 h-12 sm:w-14 sm:h-14 rounded-full transition-all",
                  isScreenSharing
                    ? "bg-primary text-primary-foreground border border-primary/50"
                    : "bg-neutral-800/90 text-white hover:bg-neutral-700"
                )}
                onClick={toggleScreenShare}
                title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
              >
                {isScreenSharing ? <MonitorOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <MonitorUp className="w-5 h-5 sm:w-6 sm:h-6" />}
              </Button>
            )}

            {/* Switch Camera (Mobile) */}
            {isVideo && (
              <Button
                variant="secondary"
                size="icon"
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-neutral-800/90 text-white hover:bg-neutral-700"
                onClick={toggleCameraFacing}
                title="Switch Camera"
              >
                <SwitchCamera className="w-5 h-5 sm:w-6 sm:h-6" />
              </Button>
            )}

            {/* End Call Button */}
            <Button
              variant="destructive"
              size="icon"
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-600 hover:bg-red-700 shadow-2xl transition-transform hover:scale-105"
              onClick={() => handleEndCall("ended")}
              title="End Call"
            >
              <PhoneOff className="w-6 h-6 sm:w-7 sm:h-7" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
