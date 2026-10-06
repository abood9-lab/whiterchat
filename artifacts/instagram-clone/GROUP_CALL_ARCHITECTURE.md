# WhiterChat Group Voice & Video Rooms Architecture

## 1. Overview
The Group Voice and Video Calling feature in WhiterChat extends the platform's real-time messaging infrastructure to support multi-user interactive rooms (3 to 8 participants). It operates alongside the existing 1:1 calling system without architectural collision or regression.

---

## 2. Room Lifecycle
1. **Creation / Initialization:**
   - Any member of a group chat can launch a **Voice Room** or **Video Room** via the conversation header or the **Group Info Panel**.
   - A unique `roomId` is generated (`room-${conversationId}-${timestamp}`).
   - The user joins the room as initiator/host and initializes their local media stream (`getUserMedia` with audio-only for Voice rooms or audio + dynamic video constraints for Video rooms).
   - A `group_call_join_room` socket signal is emitted to the conversation namespace.

2. **Participant Discovery & Mesh Negotiation:**
   - Existing participants receive the `group_call_user_joined` event.
   - The initiator creates an `RTCPeerConnection` targeting the new participant and sends an SDP Offer via `group_call_signal`.
   - The joining peer answers the Offer via `group_call_signal` and exchanges ICE candidates.
   - Audio and video tracks are dynamically attached to peer connections.

3. **In-Call Presence & State:**
   - Microphone mute/unmute state changes trigger `group_call_toggle_media` (audio).
   - Camera toggles trigger `group_call_toggle_media` (video) and cleanly stop/start video tracks.
   - Speaking detection (local Web Audio API AnalyserNode) emits `group_call_speaking` to trigger visual wave rings.

4. **Termination & Cleanup:**
   - Individual departure emits `group_call_leave_room` and cleans up that peer's connection.
   - When the host or group admin terminates the room, `group_call_ended` is broadcast to all participants.
   - Disposing the session stops all local media tracks, closes all PeerConnections, disconnects AudioContext nodes, and clears timers.

---

## 3. WebRTC Topology (Mesh for 3–8 Participants)
- **Architecture:** Full Mesh Peer-to-Peer.
- **Why Mesh:** For small groups of 3 to 8 users, Full Mesh provides direct low-latency peer media transmission without requiring costly external SFU/MCU infrastructure.
- **ICE Configuration:** Multi-redundant Google and Cloudflare STUN servers (`stun.l.google.com:19302`, `stun.cloudflare.com:3478`).
- **Bitrate & Constraints:**
  - Video: `ideal: 640x480`, `max: 1280x720`, `24-30 fps` adaptive.
  - Audio: Echo cancellation, noise suppression, and auto gain control enabled.

---

## 4. Socket.IO Signaling Events
| Event Name | Direction | Payload | Description |
|---|---|---|---|
| `group_call_join_room` | Client → Server | `{ roomId, conversationId, user }` | Announces joining a group room |
| `group_call_user_joined` | Server → Client | `{ roomId, userId, user }` | Informs peers of a newly joined member |
| `group_call_signal` | Client → Server | `{ roomId, targetUserId, signal }` | P2P SDP Offer/Answer/ICE relay |
| `group_call_signal_received` | Server → Client | `{ senderId, signal }` | Delivers P2P signal to recipient |
| `group_call_toggle_media` | Client → Server | `{ roomId, mediaType, enabled }` | Synchronizes mute and camera states |
| `group_call_peer_media_toggled` | Server → Client | `{ userId, mediaType, enabled }` | Updates peer's mute/camera state |
| `group_call_speaking` | Client → Server | `{ roomId, isSpeaking }` | Broadcasts speaking state indicator |
| `group_call_peer_speaking` | Server → Client | `{ userId, isSpeaking }` | Updates active speaker glow |
| `group_call_leave_room` | Client → Server | `{ roomId, conversationId }` | User leaves group room |
| `group_call_user_left` | Server → Client | `{ userId }` | Cleans up peer connection for left user |
| `group_call_ended` | Server → Client | `{ roomId }` | Closes room for everyone |

---

## 5. Security & Authorization
- **Authentication:** Verified through valid JWT session tokens in HTTP Bearer headers and Socket.IO connection authentication.
- **Group Membership:** Strictly validated before joining; non-members are prohibited from receiving signals or joining.
- **Participant Limit:** Capped at 8 active participants per room.

---

## 6. Performance & Resource Management
- **Camera Off Handling:** Video tracks are disabled (`track.enabled = false`) and streams are unhooked to minimize CPU/GPU decoding.
- **Lightweight Audio Analysis:** A 128-sample FFT `AnalyserNode` runs locally with a 200ms throttle to detect vocal activity without sending raw audio frames.
- **Floating PiP:** Unmounts heavy video grids into lightweight avatar pills when minimized, keeping media streams alive in memory.

---

## 7. 1:1 Calling Coexistence & Regression Safety
- 1:1 Calls continue to use `CallOverlay` and existing signaling (`call_incoming`, `incoming_call`, `call_ended`).
- Group Calls use `GroupCallOverlay` and `group_call_*` signaling namespaces.
- Navigation state cleanly routes between 1:1 and group room states without state leakage.
