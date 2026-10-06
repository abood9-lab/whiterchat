# WhiterChat Mobile Architecture

## 1. System Overview & Monorepo Topology

WhiterChat is architected with a decoupled frontend ecosystem served by a unified backend and database engine:

```text
                    WHITERCHAT BACKEND
             (Express + Socket.io + MongoDB / Mongoose)
                         │
        ┌────────────────┴────────────────┐
        │                                 │
  WEB FRONTEND                      MOBILE FRONTEND
(artifacts/instagram-clone)        (artifacts/mobile-app)
- Stable Web Version               - Real Native-First Architecture
- Full Desktop & Mobile Web UI     - Safe Areas, Touch Gestures, Bottom Sheets
- Deployed at whiterchat.me        - Shared Authentication & Real DB Models
```

---

## 2. Directory Structure

```text
artifacts/mobile-app/
├── src/
│   ├── components/
│   │   ├── feed/          # PostCard, StoriesRail, CommentSheet, ShareSheet
│   │   ├── navigation/    # BottomTabBar, MobileHeader, StackHeaders
│   │   ├── profile/       # EditProfileSheet, HighlightsBar
│   │   └── ui/            # Button, Input, Avatar, BottomSheet, Badge, Spinner
│   ├── context/
│   │   ├── AuthContext.tsx    # Live session restoration, login, signup, OTP
│   │   └── ThemeContext.tsx   # Dark/Light mode, signature emerald theme
│   ├── navigation/
│   │   └── MobileNavigator.tsx # Screen router & Tab switcher
│   ├── screens/
│   │   ├── auth/          # LoginScreen, SignupScreen, VerifyOtpScreen, ForgotPasswordScreen
│   │   ├── create/        # CreatePostScreen (Media + Caption)
│   │   ├── explore/       # ExploreScreen (Search + Grid)
│   │   ├── home/          # HomeScreen (Feed, Stories, Comments)
│   │   ├── profile/       # ProfileScreen (Stats, Posts Grid, Reels Grid)
│   │   └── reels/         # ReelsScreen (Full-screen vertical feed)
│   ├── services/
│   │   ├── api/           # Real typed API client (Auth, Posts, Users, Stories)
│   │   └── storage/       # Multi-platform storage abstraction
│   ├── types/             # Shared TypeScript models
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 3. Technology & Communication

- **Framework**: Native-oriented React + TypeScript architecture with zero mocks.
- **Styling**: Tailwind CSS v4 with mobile-optimized safe area insets, touch ripple feedback, and dark/emerald branding.
- **State & Session Management**: React Context (`AuthContext`, `ThemeContext`) backed by `MobileStorage`.
- **API Transport**: Native `fetch` with Bearer token interceptor pointing to existing `/api/*` routes.
- **Zero Mocks Policy**: Connects directly to existing database models (`User`, `Post`, `Story`, `Comment`, `Notification`).
