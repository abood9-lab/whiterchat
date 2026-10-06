/**
 * AudioRoomConnectionManager
 * Centralized WebRTC Audio Mesh & Audio Frequency Analysis Manager.
 * Designed for Live Audio Rooms / Spaces (Host, Co-Hosts, Speakers & Listeners).
 */

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ],
};

export interface RemoteAudioPeer {
  userId: string;
  username: string;
  role: "host" | "co-host" | "speaker" | "listener";
  pc: RTCPeerConnection;
  stream: MediaStream;
  isMuted: boolean;
  isSpeaking: boolean;
  connectionState: RTCPeerConnectionState;
}

export interface AudioRoomCallbacks {
  onRemotePeerAdded: (peer: RemoteAudioPeer) => void;
  onRemotePeerUpdated: (userId: string, updates: Partial<RemoteAudioPeer>) => void;
  onRemotePeerRemoved: (userId: string) => void;
  onLocalStreamReady: (stream: MediaStream) => void;
  onLocalSpeaking: (isSpeaking: boolean) => void;
  onError: (err: Error) => void;
  sendSignal: (targetUserId: string, signal: any) => void;
  sendMediaToggle: (mediaType: "audio", enabled: boolean) => void;
  sendSpeaking: (isSpeaking: boolean) => void;
}

export class AudioRoomConnectionManager {
  private localStream: MediaStream | null = null;
  private peers = new Map<string, RemoteAudioPeer>();
  private myUserId: string;
  private roomId: string;
  private isSpeaker: boolean;
  private callbacks: AudioRoomCallbacks;

  // Real-time Audio Frequency Analysis for Speaking Detection
  private audioCtx: AudioContext | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private localSource: MediaStreamAudioSourceNode | null = null;
  private remoteAnalysers = new Map<string, { analyser: AnalyserNode; source: MediaStreamAudioSourceNode }>();
  private audioInterval: any = null;
  private isLocallySpeaking = false;
  private selectedAudioDeviceId: string | null = null;

  constructor(
    myUserId: string,
    roomId: string,
    isSpeaker: boolean,
    callbacks: AudioRoomCallbacks
  ) {
    this.myUserId = myUserId;
    this.roomId = roomId;
    this.isSpeaker = isSpeaker;
    this.callbacks = callbacks;
  }

  /**
   * Initializes local microphone stream when user is Host or promoted to Speaker.
   */
  public async initializeLocalAudio(deviceId?: string): Promise<MediaStream> {
    try {
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => track.stop());
        this.localStream = null;
      }

      if (deviceId) {
        this.selectedAudioDeviceId = deviceId;
      }

      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          ...(this.selectedAudioDeviceId ? { deviceId: { exact: this.selectedAudioDeviceId } } : {}),
        },
        video: false,
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.isSpeaker = true;
      this.callbacks.onLocalStreamReady(this.localStream);
      this.initAudioAnalysis();

      // Attach new audio track to all existing peer connections
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        this.peers.forEach((peer) => {
          const sender = peer.pc.getSenders().find((s) => s.track?.kind === "audio");
          if (sender) {
            sender.replaceTrack(audioTrack);
          } else {
            peer.pc.addTrack(audioTrack, this.localStream!);
          }
        });
      }

      return this.localStream;
    } catch (err: any) {
      this.callbacks.onError(new Error(err.message || "Failed to access microphone"));
      throw err;
    }
  }

  /**
   * Handles transitioning a Speaker to a Listener (demotion / step down).
   * Stops local microphone capture and cleans up local analyser while keeping remote listener connections.
   */
  public stepDownToListener(): void {
    this.isSpeaker = false;
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.localSource) {
      try {
        this.localSource.disconnect();
      } catch {}
      this.localSource = null;
    }
    this.localAnalyser = null;
    this.isLocallySpeaking = false;
    this.callbacks.onLocalSpeaking(false);

    // Remove local track from peer connections
    this.peers.forEach((peer) => {
      const sender = peer.pc.getSenders().find((s) => s.track?.kind === "audio");
      if (sender) {
        try {
          peer.pc.removeTrack(sender);
        } catch {}
      }
    });
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public getPeers(): Map<string, RemoteAudioPeer> {
    return this.peers;
  }

  /**
   * Called when a peer (Speaker or Listener) joins the room.
   * As an initiator, create RTCPeerConnection and send offer.
   */
  public async handleUserJoined(remoteUser: any, remoteRole: "host" | "co-host" | "speaker" | "listener"): Promise<void> {
    const targetUserId = remoteUser.id || remoteUser.userId;
    if (!targetUserId || targetUserId === this.myUserId) return;

    if (this.peers.has(targetUserId)) {
      this.removePeer(targetUserId);
    }

    const pc = this.createPeerConnection(targetUserId);
    const peer: RemoteAudioPeer = {
      userId: targetUserId,
      username: remoteUser.username || "User",
      role: remoteRole,
      pc,
      stream: new MediaStream(),
      isMuted: false,
      isSpeaking: false,
      connectionState: pc.connectionState || "new",
    };

    this.peers.set(targetUserId, peer);
    this.callbacks.onRemotePeerAdded(peer);

    // Create & send offer
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      await pc.setLocalDescription(offer);
      this.callbacks.sendSignal(targetUserId, {
        type: "offer",
        sdp: pc.localDescription,
      });
    } catch (err: any) {
      this.callbacks.onError(err);
    }
  }

  /**
   * Handle incoming WebRTC signaling (offer, answer, ICE candidate).
   */
  public async handleSignal(senderId: string, signal: any, senderUser?: any): Promise<void> {
    if (!senderId || senderId === this.myUserId) return;

    if (signal.type === "offer") {
      let peer = this.peers.get(senderId);
      let pc: RTCPeerConnection;

      if (!peer) {
        pc = this.createPeerConnection(senderId);
        peer = {
          userId: senderId,
          username: senderUser?.username || "User",
          role: senderUser?.role || "listener",
          pc,
          stream: new MediaStream(),
          isMuted: false,
          isSpeaking: false,
          connectionState: pc.connectionState || "new",
        };
        this.peers.set(senderId, peer);
        this.callbacks.onRemotePeerAdded(peer);
      } else {
        pc = peer.pc;
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.callbacks.sendSignal(senderId, {
          type: "answer",
          sdp: pc.localDescription,
        });
      } catch (err: any) {
        this.callbacks.onError(err);
      }
    } else if (signal.type === "answer") {
      const peer = this.peers.get(senderId);
      if (peer && peer.pc.signalingState !== "stable") {
        try {
          await peer.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        } catch (err: any) {
          this.callbacks.onError(err);
        }
      }
    } else if (signal.type === "candidate" && signal.candidate) {
      const peer = this.peers.get(senderId);
      if (peer && peer.pc) {
        try {
          await peer.pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } catch {}
      }
    }
  }

  public handleUserLeft(userId: string): void {
    this.removePeer(userId);
  }

  public handlePeerMediaToggled(userId: string, mediaType: "audio", enabled: boolean): void {
    const peer = this.peers.get(userId);
    if (!peer) return;

    if (mediaType === "audio") {
      peer.isMuted = !enabled;
      this.callbacks.onRemotePeerUpdated(userId, { isMuted: !enabled });
    }
  }

  public handlePeerSpeaking(userId: string, isSpeaking: boolean): void {
    const peer = this.peers.get(userId);
    if (!peer) return;
    peer.isSpeaking = isSpeaking;
    this.callbacks.onRemotePeerUpdated(userId, { isSpeaking });
  }

  public toggleMute(muted: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
    this.callbacks.sendMediaToggle("audio", !muted);
  }

  private createPeerConnection(targetUserId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks if current user is an active speaker
    if (this.localStream && this.isSpeaker) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.callbacks.sendSignal(targetUserId, {
          type: "candidate",
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      const peer = this.peers.get(targetUserId);
      if (!peer) return;

      if (event.streams && event.streams[0]) {
        peer.stream = event.streams[0];
      } else {
        peer.stream.addTrack(event.track);
      }

      this.callbacks.onRemotePeerUpdated(targetUserId, { stream: peer.stream });
      this.attachRemoteAudioAnalysis(targetUserId, peer.stream);
    };

    pc.onconnectionstatechange = () => {
      const peer = this.peers.get(targetUserId);
      if (peer) {
        peer.connectionState = pc.connectionState;
        this.callbacks.onRemotePeerUpdated(targetUserId, { connectionState: pc.connectionState });
      }

      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        this.removePeer(targetUserId);
      }
    };

    return pc;
  }

  private removePeer(userId: string): void {
    const peer = this.peers.get(userId);
    if (!peer) return;

    try {
      peer.pc.ontrack = null;
      peer.pc.onicecandidate = null;
      peer.pc.onconnectionstatechange = null;
      peer.pc.close();
    } catch {}

    const audioAnalysis = this.remoteAnalysers.get(userId);
    if (audioAnalysis) {
      try {
        audioAnalysis.source.disconnect();
      } catch {}
      this.remoteAnalysers.delete(userId);
    }

    this.peers.delete(userId);
    this.callbacks.onRemotePeerRemoved(userId);
  }

  private initAudioAnalysis(): void {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass || !this.localStream) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioCtxClass();
      }
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume().catch(() => {});
      }

      const audioTrack = this.localStream.getAudioTracks()[0];
      if (!audioTrack) return;

      this.localSource = this.audioCtx.createMediaStreamSource(new MediaStream([audioTrack]));
      this.localAnalyser = this.audioCtx.createAnalyser();
      this.localAnalyser.fftSize = 128;
      this.localSource.connect(this.localAnalyser);

      const bufferLength = this.localAnalyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      if (!this.audioInterval) {
        this.audioInterval = setInterval(() => {
          if (!this.localAnalyser || !this.localStream) return;
          this.localAnalyser.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const avg = sum / bufferLength;
          const isSpeaking = avg > 25;

          if (isSpeaking !== this.isLocallySpeaking) {
            this.isLocallySpeaking = isSpeaking;
            this.callbacks.onLocalSpeaking(isSpeaking);
            this.callbacks.sendSpeaking(isSpeaking);
          }
        }, 200);
      }
    } catch {}
  }

  private attachRemoteAudioAnalysis(userId: string, stream: MediaStream): void {
    try {
      if (!this.audioCtx || stream.getAudioTracks().length === 0) return;

      if (this.remoteAnalysers.has(userId)) {
        this.remoteAnalysers.get(userId)?.source.disconnect();
      }

      const source = this.audioCtx.createMediaStreamSource(stream);
      const analyser = this.audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);

      this.remoteAnalysers.set(userId, { source, analyser });
    } catch {}
  }

  public dispose(): void {
    if (this.audioInterval) {
      clearInterval(this.audioInterval);
      this.audioInterval = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    this.peers.forEach((peer, userId) => {
      this.removePeer(userId);
    });
    this.peers.clear();

    this.remoteAnalysers.forEach(({ source }) => {
      try {
        source.disconnect();
      } catch {}
    });
    this.remoteAnalysers.clear();

    if (this.localSource) {
      try {
        this.localSource.disconnect();
      } catch {}
      this.localSource = null;
    }

    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
    }
  }
}
