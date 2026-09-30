# Live Audio Rooms / Spaces — Architecture & Specification

## 1. Overview
WhiterChat Live Audio Rooms (Spaces) is a production-grade, real-time audio broadcasting and interactive stage platform. It enables creators to start public or group-only live audio spaces where listeners can tune in with zero audio upload overhead, request to speak via a structured hand-raise queue, and participate on an interactive WebRTC audio stage with dynamic speaking detection.

---

## 2. Audio Room Data Schema

```typescript
export type AudioRoomRole = "host" | "co-host" | "speaker" | "listener";
export type AudioRoomStatus = "starting" | "live" | "ending" | "ended";
export type AudioRoomVisibility = "public" | "group";

export interface AudioRoomMetadata {
  id: string;                      // Unique space identifier (e.g. space-17748923-a8f9)
  title: string;                   // Space topic title (max 80 chars)
  description?: string | null;     // Optional space summary / agenda
  category: AudioRoomCategory;     // e.g. "tech", "music", "gaming", "crypto", etc.
  visibility: AudioRoomVisibility; // "public" or "group"
  groupId?: string | null;         // Associated group conversation ID (if group-only)
  hostId: string;                  // Creator user ID
  hostUser: {
    id: string;
    username: string;
    fullName?: string | null;
    avatarUrl?: string | null;
    activeDecorationId?: string | null;
    isVerified?: boolean;
  };
  coHostIds: string[];             // Array of designated Co-Host user IDs
  speakerIds: string[];            // Active stage speakers
  maxSpeakers: number;             // Configurable (default 8)
  maxListeners: number;            // Configurable (default 500)
  listenerCount: number;           // Live connected audience counter
  status: AudioRoomStatus;         // "live" | "starting" | "ended"
  createdAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
}
```

---

## 3. WebRTC Audio Topology & Web Audio Analysis

### 3.1 Topology Model
- **Stage (Host + Co-Hosts + Speakers):** Full-Mesh WebRTC audio connections between stage members. Each speaker's microphone audio track is captured with hardware-accelerated echo cancellation, noise suppression, and auto gain control (`echoCancellation: true, noiseSuppression: true, autoGainControl: true`).
- **Audience (Listeners):** Peer audio receivers that establish downstream-only RTCPeerConnections with active stage speakers. Listeners do not acquire or send microphone tracks until explicitly promoted to Speaker.

### 3.2 Real-Time Speaking Detection
- Powered by client-side **Web Audio API (`AudioContext` + `AnalyserNode`)**.
- FFT frequency data is sampled at 200ms intervals to compute RMS volume.
- When speech volume exceeds the 25dB threshold, `audio_room_speaking` is signaled and animated speaking rings pulse on the speaker's avatar podium.
- **Privacy Assurance:** Raw audio is processed strictly locally in memory; no audio recordings or raw audio streams are saved or uploaded to any storage backend.

---

## 4. Roles & Permissions Matrix

| Capability | Host | Co-Host | Speaker | Listener |
| :--- | :---: | :---: | :---: | :---: |
| **Start Space** | ✅ | ❌ | ❌ | ❌ |
| **End Space for Everyone** | ✅ | ❌ | ❌ | ❌ |
| **Mute/Unmute Own Mic** | ✅ | ✅ | ✅ | ❌ |
| **Raise Hand / Request to Speak** | N/A | N/A | N/A | ✅ |
| **Accept/Reject Hand Raises** | ✅ | ✅ | ❌ | ❌ |
| **Promote Listener to Speaker** | ✅ | ✅ | ❌ | ❌ |
| **Demote Speaker to Listener** | ✅ | ✅ | ❌ | ❌ |
| **Mute Remote Speaker** | ✅ | ✅ | ❌ | ❌ |
| **Assign/Remove Co-Host** | ✅ | ❌ | ❌ | ❌ |
| **Remove / Kick Participant** | ✅ | ✅ | ❌ | ❌ |
| **Send Live Reactions (❤️👏🔥)** | ✅ | ✅ | ✅ | ✅ |
| **Minimize to Picture-in-Picture (PiP)** | ✅ | ✅ | ✅ | ✅ |

---

## 5. Real-Time Socket.IO Signaling Events

| Event Name | Direction | Payload Description |
| :--- | :--- | :--- |
| `audio_room_create` | Client → Server | Creates a new live audio room instance |
| `audio_room_created` | Server → All | Broadcasts new room creation for discovery feeds |
| `audio_room_join` | Client → Server | Joins space as listener or speaker |
| `audio_room_user_joined` | Server → Room | Notifies space members of new participant |
| `audio_room_leave` | Client → Server | Gracefully leaves room |
| `audio_room_user_left` | Server → Room | Removes participant & closes peer connection |
| `audio_room_signal` | Client ↔ Server | Relays SDP offer/answer and ICE candidate signals |
| `audio_room_raise_hand` | Client → Room | Enqueues speaker request with user details |
| `audio_room_cancel_raise_hand`| Client → Room | Removes request from pending queue |
| `audio_room_accept_speaker` | Host → Room | Promotes listener to speaker; triggers mic setup |
| `audio_room_reject_speaker` | Host → Room | Declines speaker request |
| `audio_room_demote_speaker` | Host → Room | Demotes speaker back to listener |
| `audio_room_mute_speaker` | Host → Room | Remotely mutes a speaker |
| `audio_room_assign_cohost` | Host → Room | Promotes speaker to co-host |
| `audio_room_remove_cohost` | Host → Room | Reverts co-host back to speaker |
| `audio_room_kick_user` | Host → Room | Disconnects and removes user from room |
| `audio_room_toggle_mic` | Client → Room | Broadcasts mute/unmute state change |
| `audio_room_speaking` | Client → Room | Broadcasts real-time speaking indicator state |
| `audio_room_reaction` | Client → Room | Dispatches floating emoji reaction |
| `audio_room_end` | Host → Room | Terminates space for all participants |
| `audio_room_ended` | Server → Room | Closes stage and tears down all connections |

---

## 6. Lifecycle & State Machine

```
[Create Room Modal]
        │
        ▼
   (Starting) ──► Acquire Host Mic Track ──► Broadcast 'audio_room_create'
        │
        ▼
     (Live) ◄──────────────────────────────────────────────┐
        │                                                  │
        ├─► Listener Joins ──► Receives Speaker Audio      │
        │                                                  │
        ├─► Listener Raises Hand ──► Added to Request Queue │
        │                                                  │
        ├─► Host Accepts ──► Acquire Mic Track ──► (Speaker)
        │                                                  │
        ├─► Mute / Unmute / Reactions / Speaking Detection │
        │                                                  │
        ├─► Speaker Demoted ──► Stop Mic Track ──► (Listener)
        │                                                  │
        ▼                                                  │
   (Ending) ──► Close PeerConnections & AudioContext ──────┘
        │
        ▼
    (Ended) ──► Return to Explore / Feed
```

---

## 7. Reconnection & Cleanup Guarantee

1. **Reconnection:** If a user loses socket connectivity or ICE connection temporarily, the system enters `"reconnecting"` state with backoff retries without abruptly dropping the user or closing the stage.
2. **Deterministic Resource Teardown:**
   - All `MediaStreamTrack` instances are stopped (`track.stop()`).
   - All `RTCPeerConnection` instances are closed (`pc.close()`).
   - Web Audio `AudioContext` and `AnalyserNode` are disconnected and closed.
   - Socket event handlers are deregistered to prevent memory leaks.

---

## 8. Admin Control Center Integration

- **Route:** `/admin/audio-rooms`
- **Dashboard Monitoring:** Live spaces count, peak listener counts, active speakers, host info, category filters.
- **Administrative Moderation:** Direct "Terminate" button allowing superadmins and moderators to force-close any violating space immediately.
- **Configuration Limits:** Global limits on max speakers per stage and max audience capacity.

---

## 9. 1:1 and Group Calls Regression Test Results

- **1:1 Voice & Video Calls:** 100% operational via `CallOverlay` and `IncomingCallBanner`.
- **Group Voice & Video Calls (3-8 Members):** 100% operational via `GroupCallOverlay`.
- **Live Audio Spaces:** Seamlessly integrated via `AudioRoomStage` and `AudioRoomMiniPlayer` with zero cross-system interference.
