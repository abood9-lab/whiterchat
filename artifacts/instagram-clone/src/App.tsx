import { useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
import { Layout } from "@/components/layout";
import { SplashScreen, hasShownSplashThisSession, markSplashShown } from "@/components/splash-screen";
import NotFound from "@/pages/not-found";
import { decodeTheme, applyThemeExtras } from "@/lib/theme-config";
import { applyAccentColor, ACCENT_STORAGE_KEY } from "@/lib/accent-color";
import { NavigationProvider } from "@/lib/navigation-context";

import { GuestAuthProvider } from "@/components/GuestAuthModal";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import Login from "@/pages/login";
import Register from "@/pages/register";
import SetupProfile from "@/pages/setup-profile";
import Home from "@/pages/home";
import Explore from "@/pages/explore";
import Create from "@/pages/create";
import Profile from "@/pages/profile";
import Messages from "@/pages/messages";
import Notifications from "@/pages/notifications";
import PostDetail from "@/pages/post";
import Settings from "@/pages/settings";
import Reels from "@/pages/reels";
import SnapPage from "@/pages/snap";
import AIPage from "@/pages/ai";

// Institutional & Trust Pages
import PrivacyPolicyPage from "@/pages/institutional/privacy";
import TermsOfServicePage from "@/pages/institutional/terms";
import CommunityGuidelinesPage from "@/pages/institutional/community-guidelines";
import SafetyCenterPage from "@/pages/institutional/safety";
import SecurityPracticesPage from "@/pages/institutional/security";
import ResponsibleDisclosurePage from "@/pages/institutional/responsible-disclosure";
import HelpCenterPage from "@/pages/institutional/help";
import FaqPage from "@/pages/institutional/faq";
import ContactUsPage from "@/pages/institutional/contact";
import ReportProblemPage from "@/pages/institutional/report-problem";
import CareersPage from "@/pages/institutional/careers";
import JobDetailsPage from "@/pages/institutional/job-details";
import AboutUsPage from "@/pages/institutional/about";
import PressKitPage from "@/pages/institutional/press";
import SystemStatusPage from "@/pages/institutional/status";
import CreatorResourcesPage from "@/pages/institutional/creators";
import LegalCenterPage from "@/pages/institutional/legal";
import CookiePolicyPage from "@/pages/institutional/cookies";
import CopyrightPolicyPage from "@/pages/institutional/copyright";
import AccessibilityPage from "@/pages/institutional/accessibility";
import PlatformRulesPage from "@/pages/institutional/platform-rules";
import BusinessPage from "@/pages/institutional/business";
import AdvertisingPage from "@/pages/institutional/advertising";

// Production Admin Dashboard Pages
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminReports from "@/pages/admin/AdminReports";
import AdminContent from "@/pages/admin/AdminContent";
import AdminComments from "@/pages/admin/AdminComments";
import AdminStories from "@/pages/admin/AdminStories";
import AdminFeedback from "@/pages/admin/AdminFeedback";
import AdminSecurity from "@/pages/admin/AdminSecurity";
import AdminAuditLogs from "@/pages/admin/AdminAuditLogs";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminVerification from "@/pages/admin/AdminVerification";
import AdminGroups from "@/pages/admin/AdminGroups";
import AdminPlans from "@/pages/admin/AdminPlans";

function ThemeImporter() {
  const { setTheme, setAccentColor, setFontSize, setRadius, setDensity, setUiHue } = useTheme();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("theme");
    if (!code) return;
    const config = decodeTheme(code);
    if (!config) return;
    setTheme(config.mode);
    setAccentColor(config.accent);
    setFontSize(config.fontSize);
    setRadius(config.radius);
    setDensity(config.density);
    setUiHue(config.uiHue);
    const url = new URL(window.location.href);
    url.searchParams.delete("theme");
    window.history.replaceState({}, "", url.toString());
  }, []);
  return null;
}

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Redirect to="/login" />;
  if (!user.profileCompleted) return <Redirect to="/setup-profile" />;
  return <Component {...rest} />;
}

function HybridRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user && !user.profileCompleted) return <Redirect to="/setup-profile" />;
  return <Component {...rest} />;
}

function SetupRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Redirect to="/login" />;
  if (user.profileCompleted) return <Redirect to="/" />;
  return <SetupProfile />;
}

function PublicRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) return <Redirect to={user.profileCompleted ? "/" : "/setup-profile"} />;
  return <Component {...rest} />;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/login" component={() => <PublicRoute component={Login} />} />
        <Route path="/register" component={() => <PublicRoute component={Register} />} />
        <Route path="/setup-profile" component={SetupRoute} />
        
        {/* Public & Member Hybrid Routes */}
        <Route path="/" component={() => <HybridRoute component={Home} />} />
        <Route path="/explore" component={() => <HybridRoute component={Explore} />} />
        <Route path="/reels" component={() => <HybridRoute component={Reels} />} />
        <Route path="/reel/:id" component={() => <HybridRoute component={Reels} />} />
        <Route path="/profile/:username" component={() => <HybridRoute component={Profile} />} />
        <Route path="/post/:id" component={() => <HybridRoute component={PostDetail} />} />

        {/* Member-Only Protected Routes */}
        <Route path="/create" component={() => <ProtectedRoute component={Create} />} />
        <Route path="/messages" component={() => <ProtectedRoute component={Messages} />} />
        <Route path="/messages/:id" component={() => <ProtectedRoute component={Messages} />} />
        <Route path="/notifications" component={() => <ProtectedRoute component={Notifications} />} />
        <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
        <Route path="/plans" component={() => <ProtectedRoute component={Settings} />} />
        <Route path="/snap" component={() => <ProtectedRoute component={SnapPage} />} />
        <Route path="/ai" component={() => <ProtectedRoute component={AIPage} />} />
        
        {/* Institutional & Corporate Routes */}
        <Route path="/about" component={AboutUsPage} />
        <Route path="/privacy" component={PrivacyPolicyPage} />
        <Route path="/terms" component={TermsOfServicePage} />
        <Route path="/community-guidelines" component={CommunityGuidelinesPage} />
        <Route path="/safety" component={SafetyCenterPage} />
        <Route path="/security" component={SecurityPracticesPage} />
        <Route path="/security/disclosure" component={ResponsibleDisclosurePage} />
        <Route path="/help" component={HelpCenterPage} />
        <Route path="/faq" component={FaqPage} />
        <Route path="/contact" component={ContactUsPage} />
        <Route path="/report-problem" component={ReportProblemPage} />
        <Route path="/careers" component={CareersPage} />
        <Route path="/careers/:slug" component={JobDetailsPage} />
        <Route path="/press" component={PressKitPage} />
        <Route path="/status" component={SystemStatusPage} />
        <Route path="/creators" component={CreatorResourcesPage} />
        <Route path="/legal" component={LegalCenterPage} />
        <Route path="/cookies" component={CookiePolicyPage} />
        <Route path="/copyright" component={CopyrightPolicyPage} />
        <Route path="/accessibility" component={AccessibilityPage} />
        <Route path="/rules" component={PlatformRulesPage} />
        <Route path="/business" component={BusinessPage} />
        <Route path="/advertising" component={AdvertisingPage} />

        {/* Real Production Admin Dashboard Routes */}
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/groups" component={AdminGroups} />
        <Route path="/admin/plans" component={AdminPlans} />
        <Route path="/admin/verification" component={AdminVerification} />
        <Route path="/admin/reports" component={AdminReports} />
        <Route path="/admin/content" component={() => <AdminContent />} />
        <Route path="/admin/reels" component={() => <AdminContent forcedType="reel" />} />
        <Route path="/admin/comments" component={AdminComments} />
        <Route path="/admin/stories" component={AdminStories} />
        <Route path="/admin/feedback" component={AdminFeedback} />
        <Route path="/admin/security" component={AdminSecurity} />
        <Route path="/admin/audit-logs" component={AdminAuditLogs} />
        <Route path="/admin/settings" component={AdminSettings} />

        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

function App() {
  const [showSplash, setShowSplash] = useState(() => !hasShownSplashThisSession());

  return (
    <ThemeProvider defaultTheme="system" storageKey="whiterchat-theme">
      <ThemeImporter />
      <QueryClientProvider client={queryClient}>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <AppWithGuestAuth />
          </AuthProvider>
        </WouterRouter>
      </QueryClientProvider>
      {showSplash && (
        <SplashScreen
          onDone={() => {
            markSplashShown();
            setShowSplash(false);
          }}
        />
      )}
    </ThemeProvider>
  );
}

function AppWithGuestAuth() {
  const { user } = useAuth();
  return (
    <GuestAuthProvider isLoggedIn={Boolean(user)}>
      <NavigationProvider>
        <TooltipProvider>
          <ErrorBoundary>
            <Router />
          </ErrorBoundary>
          <Toaster />
        </TooltipProvider>
      </NavigationProvider>
    </GuestAuthProvider>
  );
}

export default App;
