# WhiterChat Native Mobile Application Architecture (Flutter)

## 1. Specifications
- **Flutter Version Target**: `>=3.19.0`
- **Dart Version Target**: `>=3.0.0 <4.0.0`
- **Platforms**: Android (minSdkVersion 21, targetSdkVersion 34), iOS (iOS 14.0+)
- **Package / Application ID**: `com.whiterchat.mobile`

---

## 2. Directory Structure

```
mobile/
├── pubspec.yaml                 # Dependencies and assets specification
├── android/                     # Native Android Gradle project (APK & AAB ready)
│   ├── app/
│   │   ├── build.gradle         # Application ID, SDK targets, MultiDex
│   │   └── src/main/
│   │       ├── AndroidManifest.xml # Permissions (Camera, Audio, Storage, Deep links)
│   │       └── kotlin/com/whiterchat/mobile/MainActivity.kt
│   ├── build.gradle             # Root Gradle build script
│   └── settings.gradle          # Gradle plugin loader
├── ios/                         # Native iOS Xcode project
│   ├── Podfile                  # CocoaPods dependencies
│   └── Runner/
│       ├── Info.plist           # Permissions (Camera, Microphone, Photos)
│       └── AppDelegate.swift    # iOS application delegate
├── lib/
│   ├── main.dart                # ProviderScope entry & Auth router switch
│   ├── core/
│   │   ├── config/app_config.dart # API base URL configuration
│   │   ├── theme/               # Emerald accent, Dark & Light Material 3
│   │   ├── storage/secure_storage_service.dart # FlutterSecureStorage for JWT
│   │   └── network/             # Dio HTTP client & Auth interceptors
│   ├── models/                  # UserModel, PostModel, StoryModel, CommentModel
│   ├── providers/               # Riverpod StateNotifiers (Auth, Feed, Profile)
│   └── features/
│       ├── auth/views/          # LoginScreen, SignupScreen, VerifyOtpScreen
│       ├── home/                # HomeScreen, StoriesRail, PostCard, CommentsSheet
│       ├── profile/views/       # ProfileScreen (User stats, grid, verification badge)
│       └── navigation/views/    # MainNavigationScreen (5-tab bar)
└── test/
    └── widget_test.dart         # Flutter widget test suite
```

---

## 3. State Management & Architecture
- **Framework**: `flutter_riverpod: ^2.5.1`
- **Pattern**: Unidirectional Data Flow with `StateNotifier` and immutable state models.
- **Session Lifecycle**:
  1. App initializes `SecureStorageService`.
  2. If valid JWT and user cache exists, user is routed to `MainNavigationScreen`.
  3. Background call to `/api/auth/me` refreshes profile entitlements, verification status, and limits.
  4. If unauthenticated or token expired, app routes to `LoginScreen`.

---

## 4. Shared Backend & Database Integration
- **Zero Mock Data**: Directly connects to WhiterChat Node/Express backend endpoints.
- **Unified Authentication**: Accounts created on Web work on Flutter, and accounts created on Flutter work on Web.
- **Security**: JWT stored exclusively in platform-encrypted storage (Android Keystore / iOS Keychain). No secrets hardcoded in the client.

---

## 5. Build & Deployment Instructions

### Android:
```bash
cd mobile
flutter pub get
flutter build apk --release
flutter build appbundle --release
```

### iOS:
```bash
cd mobile
flutter pub get
cd ios && pod install && cd ..
flutter build ipa --release
```
