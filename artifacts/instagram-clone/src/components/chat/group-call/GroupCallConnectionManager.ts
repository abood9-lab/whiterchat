/**
 * GroupCallConnectionManager
 * Centralized WebRTC Mesh connection manager supporting 2 to 8 participants.
 */

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ],
};

export interface RemotePeer {
  userId: string;
  user: {
    id: string;
    username: string;
    fullName?: string;
    avatarUrl?: string;
    activeDecorationId?: string;
  };
  pc: RTCPeerConnection;
  stream: MediaStream;
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeaking: boolean;
  connectionState: RTCPeerConnectionState;
}

export interface GroupCallCallbacks {
  onRemotePeerAdded: (peer: RemotePeer) => void;
  onRemotePeerUpdated: (userId: string, updates: Partial<RemotePeer>) => void;
  onRemotePeerRemoved: (userId: string) => void;
  onLocalStreamReady: (stream: MediaStream) => void;
  onLocalSpeaking: (isSpeaking: boolean) => void;
  onError: (err: Error) => void;
  sendSignal: (targetUserId: string, signal: any) => void;
  sendMediaToggle: (mediaType: "audio" | "video", enabled: boolean) => void;
  sendSpeaking: (isSpeaking: boolean) => void;
}

export class GroupCallConnectionManager {
  private localStream: MediaStream | null = null;
  private peers = new Map<string, RemotePeer>();
  private myUserId: string;
  private roomId: string;
  private callType: "voice" | "video";
  private callbacks: GroupCallCallbacks;

  // Audio Analysis
  private audioCtx: AudioContext | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private localSource: MediaStreamAudioSourceNode | null = null;
  private remoteAnalysers = new Map<string, { analyser: AnalyserNode; source: MediaStreamAudioSourceNode }>();
  private audioInterval: any = null;
  private isLocallySpeaking = false;

  constructor(
    myUserId: string,
    roomId: string,
    callType: "voice" | "video",
    callbacks: GroupCallCallbacks
  ) {
    this.myUserId = myUserId;
    this.roomId = roomId;
    this.callType = callType;
    this.callbacks = callbacks;
  }

  public async initializeLocalMedia(videoSourceFacing: "user" | "environment" = "user"): Promise<MediaStream> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: this.callType === "video" ? {
          facingMode: videoSourceFacing,
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 24, max: 30 },
        } : false,
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.callbacks.onLocalStreamReady(this.localStream);
      this.initAudioAnalysis();
      return this.localStream;
    } catch (err: any) {
      this.callbacks.onError(new Error(err.message || "Failed to access camera/microphone"));
      throw err;
    }
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public getPeers(): Map<string, RemotePeer> {
    return this.peers;
  }

  /**
   * Called when a new remote participant joins the room.
   * As an existing member (initiator), we create a PeerConnection and send an Offer to the newly joined peer.
   */
  public async handleUserJoined(remoteUser: any): Promise<void> {
    const targetUserId = remoteUser.id || remoteUser.userId;
    if (!targetUserId || targetUserId === this.myUserId) return;

    if (this.peers.has(targetUserId)) {
      this.removePeer(targetUserId);
    }

    const pc = this.createPeerConnection(targetUserId, remoteUser);
    const peer: RemotePeer = {
      userId: targetUserId,
      user: {
        id: targetUserId,
        username: remoteUser.username || "User",
        fullName: remoteUser.fullName,
        avatarUrl: remoteUser.avatarUrl,
        activeDecorationId: remoteUser.activeDecorationId,
      },
      pc,
      stream: new MediaStream(),
      isMuted: false,
      isCameraOff: this.callType === "voice",
      isSpeaking: false,
      connectionState: pc.connectionState || "new",
    };

    this.peers.set(targetUserId, peer);
    this.callbacks.onRemotePeerAdded(peer);

    // Create & send offer
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: this.callType === "video",
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
   * Handle incoming signaling (offer, answer, candidate) from another peer.
   */
  public async handleSignal(senderId: string, signal: any, senderUser?: any): Promise<void> {
    if (!senderId || senderId === this.myUserId) return;

    if (signal.type === "offer") {
      let peer = this.peers.get(senderId);
      let pc: RTCPeerConnection;

      if (!peer) {
        pc = this.createPeerConnection(senderId, senderUser);
        peer = {
          userId: senderId,
          user: {
            id: senderId,
            username: senderUser?.username || "User",
            fullName: senderUser?.fullName,
            avatarUrl: senderUser?.avatarUrl,
            activeDecorationId: senderUser?.activeDecorationId,
          },
          pc,
          stream: new MediaStream(),
          isMuted: false,
          isCameraOff: this.callType === "voice",
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
        } catch (err: any) {
          // Non-critical candidate handling
        }
      }
    }
  }

  public handleUserLeft(userId: string): void {
    this.removePeer(userId);
  }

  public handlePeerMediaToggled(userId: string, mediaType: "audio" | "video", enabled: boolean): void {
    const peer = this.peers.get(userId);
    if (!peer) return;

    if (mediaType === "audio") {
      peer.isMuted = !enabled;
      this.callbacks.onRemotePeerUpdated(userId, { isMuted: !enabled });
    } else if (mediaType === "video") {
      peer.isCameraOff = !enabled;
      this.callbacks.onRemotePeerUpdated(userId, { isCameraOff: !enabled });
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
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
    this.callbacks.sendMediaToggle("audio", !muted);
  }

  public toggleCamera(cameraOff: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = !cameraOff;
      });
    }
    this.callbacks.sendMediaToggle("video", !cameraOff);
  }

  public async switchCamera(facingMode: "user" | "environment"): Promise<void> {
    if (this.callType !== "video" || !this.localStream) return;

    try {
      const currentVideoTrack = this.localStream.getVideoTracks()[0];
      if (currentVideoTrack) {
        currentVideoTrack.stop();
        this.localStream.removeTrack(currentVideoTrack);
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
        },
        audio: false,
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      if (newVideoTrack) {
        this.localStream.addTrack(newVideoTrack);

        // Replace track on all active peer connections
        this.peers.forEach(peer => {
          const sender = peer.pc.getSenders().find(s => s.track?.kind === "video");
          if (sender) {
            sender.replaceTrack(newVideoTrack);
          } else {
            peer.pc.addTrack(newVideoTrack, this.localStream!);
          }
        });

        this.callbacks.onLocalStreamReady(this.localStream);
      }
    } catch (err: any) {
      this.callbacks.onError(err);
    }
  }

  private createPeerConnection(targetUserId: string, _userData?: any): RTCPeerConnection {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks to this peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
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
    } catch {
      // Ignored
    }

    const audioAnalysis = this.remoteAnalysers.get(userId);
    if (audioAnalysis) {
      audioAnalysis.source.disconnect();
      this.remoteAnalysers.delete(userId);
    }

    this.peers.delete(userId);
    this.callbacks.onRemotePeerRemoved(userId);
  }

  private initAudioAnalysis(): void {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass || !this.localStream) return;

      this.audioCtx = new AudioCtxClass();
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

      this.audioInterval = setInterval(() => {
        if (!this.localAnalyser) return;
        this.localAnalyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const isSpeaking = avg > 25; // threshold

        if (isSpeaking !== this.isLocallySpeaking) {
          this.isLocallySpeaking = isSpeaking;
          this.callbacks.onLocalSpeaking(isSpeaking);
          this.callbacks.sendSpeaking(isSpeaking);
        }
      }, 200);
    } catch {
      // Audio analysis is a progressive enhancement
    }
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
    } catch {
      // Ignored
    }
  }

  public dispose(): void {
    if (this.audioInterval) {
      clearInterval(this.audioInterval);
      this.audioInterval = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    this.peers.forEach((peer, userId) => {
      this.removePeer(userId);
    });
    this.peers.clear();

    this.remoteAnalysers.forEach(({ source }) => {
      try { source.disconnect(); } catch {}
    });
    this.remoteAnalysers.clear();

    if (this.localSource) {
      try { this.localSource.disconnect(); } catch {}
      this.localSource = null;
    }

    if (this.audioCtx) {
      try { this.audioCtx.close(); } catch {}
      this.audioCtx = null;
    }
  }
}
