<div align="center">

<img src="./docs/screenshots/whiterchat-logo.jpg" alt="WhiterChat Official Logo" width="130" style="border-radius: 28px; box-shadow: 0 10px 30px rgba(0, 240, 255, 0.25);" />

# WhiterChat
### Next-Generation Social Media, Viral Reels & Real-Time Messaging Platform
**A comprehensive social ecosystem featuring interactive feed posts, full-screen reels, 24h stories, end-to-end encrypted messaging, WebRTC live voice/video calls, and an embedded AI Creative Studio.**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-orange?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

<br />

<p align="center">
  <a href="https://whiterchat.me"><strong>🌐 Visit Live Production Site (whiterchat.me) »</strong></a>
  <br />
  <a href="#-overview">Overview</a> •
  <a href="#-ui-showcase--screenshots">UI Showcase</a> •
  <a href="#-core-features">Core Features</a> •
  <a href="#-system-architecture">Architecture</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-security--data-protection">Security</a> •
  <a href="#-license">License</a>
</p>

---

</div>

<br />

![WhiterChat Hero Banner](./docs/screenshots/hero-banner.jpg)

<br />

## 🌟 Overview

**WhiterChat** is a state-of-the-art social media and real-time communication platform engineered for performance, elegant aesthetics, and unmatched reliability. Combining the viral media discovery of Instagram and TikTok with the high-fidelity direct messaging and calling of WhatsApp and Telegram, WhiterChat provides a seamless, unified digital ecosystem.

Built with a native-first **Progressive Web App (PWA)** standard, WhiterChat functions offline, delivers push notifications, supports multi-account instant switching, provides encrypted personal vaults with 2FA authentication, and integrates an AI Studio for generative captions and creative tools.

---

## 📸 UI Showcase & Screenshots

### 1. Social Experience, Reels & Direct Messaging
Experience fluid vertical reels, rich carousel posts, interactive story rails, and an encrypted messenger with real-time waveform voice notes and typing indicators.

![UI Features & Reels](./docs/screenshots/features-preview.jpg)

### 2. High-Performance Admin Analytics & WebRTC Live Calling
A complete administrative cockpit for platform telemetry, content moderation, security auditing, and peer-to-peer audio/video WebRTC calling.

![Admin & WebRTC Calls](./docs/screenshots/admin-chat-preview.jpg)

---

## ✨ Core Features

### 📱 1. Rich Media Feed & Community Engagement
- **Dynamic Multi-Media Carousel:** High-resolution image and video posts with pinch-to-zoom, swipe gestures, and lazy loading.
- **Micro-Interactions & Reactions:** Animated heart bursts, double-tap to like, bookmark collections, and threaded comment replies.
- **Discovery Engine:** Trending hashtags, user search with instant debounce, and personalized recommendation feeds.

### 🎥 2. Stories, Highlights & Vertical Reels
- **24-Hour Interactive Stories:** Media sharing with interactive polling stickers, caption overlays, and close friends filters.
- **Story Highlights:** Pin memorable moments to user profiles with customizable highlight cover iconography.
- **Full-Screen Reels Player:** Infinite vertical video feed, background audio playback, and instant engagement tools.
- **Ephemeral Media (Snaps):** Self-destructing photo and video messages for sensitive and private moments.

### 💬 3. Real-Time Chat & Encrypted Voice/Video Calling
- **Socket.io Streaming Engine:** Zero-latency direct and group messaging with real-time delivery and read receipts.
- **Voice Messages with Waveform Visualizer:** In-browser audio recording, automatic compression, and sleek waveform playback.
- **Peer-to-Peer WebRTC Video/Audio Calls:** Direct calling with call overlays, camera flip, mute controls, and reconnection resilience.
- **Typing & Presence Indicators:** Real-time online badges and live typing status across active conversation threads.

### 🤖 4. AI Studio & Smart Creation Suite
- **Generative Captions & Hashtags:** AI-assisted copywriting tailored to post imagery and content themes.
- **Smart Conversation Assistant:** In-app generative assistant for answering inquiries and drafting responses.
- **Image Filters & Enhancement:** Visual processing algorithms for instant image styling before publishing.

### 🛡️ 5. Enterprise-Grade Security & Vault
- **Two-Factor Authentication (2FA):** Time-based OTP (TOTP) support compatible with Google Authenticator and Authy, plus emergency recovery backup codes.
- **Encrypted Privacy Vault:** Secondary PIN-protected folder inside user profiles for sensitive media and private logs.
- **Strict Role-Based Access Control (RBAC):** Hierarchical permissions governing `user`, `moderator`, `admin`, and `superadmin` tiers.
- **Hardened Data Layer:** Protection against IDOR/BOLA, NoSQL injections, XSS, and automated credential stuffing with aggressive rate-limiting.

### 👥 6. Instant Multi-Account Switcher
- Seamlessly link and switch between multiple user profiles in one active session without re-authenticating.

### 👑 7. SuperAdmin Dashboard & Moderation Cockpit
- **Live User Governance:** Verify creators with the official badge, manage role elevations, and issue temporary or permanent account suspensions.
- **Report & Content Triage:** Real-time queue for reviewing flagged posts, messages, and user reports.
- **Platform Telemetry:** Visual graphs for active sessions, API traffic volume, database connection pools, and error metrics.

### 📲 8. Progressive Web App (PWA) Standard
- **Installable Everywhere:** Native-like standalone installation across iOS, Android, macOS, and Windows.
- **Offline-First Cache:** Service Worker caching strategies ensure uninterrupted navigation even with intermittent connectivity.
- **Web Push Notifications:** Real-time push alerts for messages, mentions, and friend activities.

---

## 🏗️ System Architecture

```text
                               ┌────────────────────────┐
                               │     WhiterChat DNS     │
                               │   (whiterchat.me)      │
                               └───────────┬────────────┘
                                           │
                                           ▼
                               ┌────────────────────────┐
                               │   Cloudflare Tunnel    │
                               │     & Edge Network     │
                               └───────────┬────────────┘
                                           │
                ┌──────────────────────────┴──────────────────────────┐
                │                                                     │
                ▼                                                     ▼
     ┌──────────────────────┐                              ┌──────────────────────┐
     │   React Frontend     │                              │  Express API Server  │
     │  (Vite + Tailwind)   │ <────── WebSockets ────────> │ (Node.js + Socket.io)│
     │  PWA / ServiceWorker │         & REST APIs          │  Rate Limiting, Auth │
     └──────────────────────┘                              └──────────┬───────────┘
                                                                      │
                                                           ┌──────────┴───────────┐
                                                           │   MongoDB Database   │
                                                           │ (Mongoose Schemas)   │
                                                           └──────────────────────┘
```

### Technology Stack:
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide Icons, Radix UI Primitives, TanStack Query.
- **Backend:** Node.js, Express, Socket.io, Pino HTTP Logger, Web-Push, JSONWebToken, Bcrypt.
- **Database & Storage:** MongoDB with Mongoose ODM, Cloudinary / Local Object Storage.
- **Real-Time:** WebSockets (Socket.io) for messaging and WebRTC for live audio/video communication.

---

## 🚀 Quick Start & Installation

### Prerequisites:
- **Node.js** (v18.0.0 or higher)
- **npm**, **pnpm**, or **bun**
- **MongoDB Instance** (Local MongoDB Community Server or MongoDB Atlas Cloud)

### Setup Instructions:

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/abood9-lab/whiterchat.git
   cd whiterchat
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy the sample environment file to `.env`:
   ```bash
   cp .env.example .env
   ```
   Provide your configuration keys:
   ```env
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/whiterchat
   JWT_SECRET=your_jwt_secret_key_here
   JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here
   FRONTEND_ORIGINS=https://whiterchat.me,http://localhost:3000
   ```

4. **Launch the Development Server:**
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000`

5. **Build for Production:**
   ```bash
   npm run build
   npm start
   ```

---

## 🔒 Security & Data Protection

- **Protected Credential Projections:** Sensitive user hashes (`passwordHash`, `vaultPin`, `twoFactorSecret`) are stripped via `select: false` schemas and JSON transforms.
- **Brute-Force Rate Limiting:** Login, registration, and OTP verification endpoints are guarded by IP-based rate limiters.
- **Sanitized Inputs:** Strict schema validations with Zod on both client and server prevent script injection and malicious payloads.
- **GDPR & Privacy Compliance:** Full institutional policy suites including Privacy Policy, Terms of Service, Cookie Management, and Responsible Disclosure.

---

## 📄 License
This project is licensed under the **MIT License** - see the LICENSE file for details.

---

<div align="center">
  <sub>Developed with passion by the <strong>WhiterChat Platforms</strong> Team © 2026. All rights reserved.</sub>
</div>
