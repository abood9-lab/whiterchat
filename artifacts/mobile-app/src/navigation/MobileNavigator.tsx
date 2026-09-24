import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { SignupScreen } from "../screens/auth/SignupScreen";
import { VerifyOtpScreen } from "../screens/auth/VerifyOtpScreen";
import { HomeScreen } from "../screens/home/HomeScreen";
import { ExploreScreen } from "../screens/explore/ExploreScreen";
import { CreatePostScreen } from "../screens/create/CreatePostScreen";
import { ReelsScreen } from "../screens/reels/ReelsScreen";
import { ProfileScreen } from "../screens/profile/ProfileScreen";
import { ChatListScreen, ChatConversationScreen } from "../screens/chat/ChatScreen";
import { CameraScreen } from "../screens/camera/CameraScreen";
import { BottomTabBar, MobileTab } from "../components/navigation/BottomTabBar";

type AuthScreenState = "login" | "signup" | "verify";

export const MobileNavigator: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [authScreen, setAuthScreen] = useState<AuthScreenState>("login");
  const [verifyEmail, setVerifyEmail] = useState("");
  const [activeTab, setActiveTab] = useState<MobileTab>("home");
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);

  // Sub-screens
  const [activeChat, setActiveChat] = useState<{ userId: string; username: string; avatarUrl?: string } | null>(null);
  const [showChatList, setShowChatList] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-emerald-500/20">
          W
        </div>
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mt-4" />
      </div>
    );
  }

  // If user is not authenticated, show Auth Stack
  if (!user) {
    if (authScreen === "signup") {
      return (
        <SignupScreen
          onNavigateToLogin={() => setAuthScreen("login")}
          onNavigateToVerify={(email) => {
            setVerifyEmail(email);
            setAuthScreen("verify");
          }}
        />
      );
    }

    if (authScreen === "verify") {
      return (
        <VerifyOtpScreen
          email={verifyEmail}
          onNavigateToLogin={() => setAuthScreen("login")}
        />
      );
    }

    return (
      <LoginScreen
        onNavigateToSignup={() => setAuthScreen("signup")}
        onNavigateToForgot={() => setAuthScreen("login")}
        onNavigateToVerify={(email) => {
          setVerifyEmail(email);
          setAuthScreen("verify");
        }}
      />
    );
  }

  // Modal Camera / Stories View
  if (showCamera) {
    return (
      <CameraScreen
        onClose={() => setShowCamera(false)}
        onStoryPublished={() => {
          setShowCamera(false);
          setActiveTab("home");
        }}
      />
    );
  }

  // Active Direct Conversation
  if (activeChat) {
    return (
      <ChatConversationScreen
        userId={activeChat.userId}
        username={activeChat.username}
        avatarUrl={activeChat.avatarUrl}
        onBack={() => setActiveChat(null)}
      />
    );
  }

  // Messages List
  if (showChatList) {
    return (
      <ChatListScreen
        onOpenChat={(userId, username, avatarUrl) => {
          setActiveChat({ userId, username, avatarUrl });
        }}
        onBack={() => setShowChatList(false)}
      />
    );
  }

  // Main Mobile App Shell with Bottom Navigation
  return (
    <div className="relative min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
      <div className="flex-1">
        {activeTab === "home" && (
          <HomeScreen
            onNavigateToUser={(username) => {
              setSelectedUsername(username);
              setActiveTab("profile");
            }}
            onNavigateToCreateStory={() => setShowCamera(true)}
            onNavigateToMessages={() => setShowChatList(true)}
          />
        )}

        {activeTab === "explore" && (
          <ExploreScreen
            onNavigateToPost={(_postId) => {}}
          />
        )}

        {activeTab === "create" && (
          <CreatePostScreen
            onPostCreated={() => setActiveTab("home")}
            onCancel={() => setActiveTab("home")}
          />
        )}

        {activeTab === "reels" && <ReelsScreen />}

        {activeTab === "profile" && (
          <ProfileScreen
            username={selectedUsername || undefined}
            onNavigateToSettings={() => {}}
            onNavigateToPost={() => {}}
          />
        )}
      </div>

      {/* Persistent Bottom Tab Bar */}
      {activeTab !== "create" && (
        <BottomTabBar
          activeTab={activeTab}
          onTabChange={(tab) => {
            if (tab === "profile") {
              setSelectedUsername(null);
            }
            setActiveTab(tab);
          }}
        />
      )}
    </div>
  );
};
