import { useState, createContext, useContext } from "react";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Heart, MessageCircle, UserPlus, Film, LogIn } from "lucide-react";

interface GuestAuthContextType {
  requireAuth: (actionDescription?: string) => boolean;
  openAuthModal: (actionDescription?: string) => void;
  closeAuthModal: () => void;
}

const GuestAuthContext = createContext<GuestAuthContextType>({
  requireAuth: () => true,
  openAuthModal: () => {},
  closeAuthModal: () => {},
});

export function GuestAuthProvider({
  children,
  isLoggedIn,
}: {
  children: React.ReactNode;
  isLoggedIn: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [actionText, setActionText] = useState<string>("continue");

  const openAuthModal = (desc: string = "interact with this content") => {
    setActionText(desc);
    setIsOpen(true);
  };

  const closeAuthModal = () => setIsOpen(false);

  const requireAuth = (desc?: string): boolean => {
    if (!isLoggedIn) {
      openAuthModal(desc);
      return false;
    }
    return true;
  };

  return (
    <GuestAuthContext.Provider value={{ requireAuth, openAuthModal, closeAuthModal }}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-center">
              Join WhiterChat
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground text-center mt-1">
              Log in or create a free account to {actionText}, discover personalized Reels, and connect with creators worldwide.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 my-4 py-3 border-y border-border text-left">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Heart className="w-4 h-4 text-pink-500 shrink-0" />
              <span>Like & React to Posts</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MessageCircle className="w-4 h-4 text-blue-500 shrink-0" />
              <span>Comment & Direct Chat</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <UserPlus className="w-4 h-4 text-purple-500 shrink-0" />
              <span>Follow Favorite Creators</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Film className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Publish Stories & Reels</span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <Button asChild className="w-full font-semibold rounded-xl h-11 shadow-sm">
              <Link href="/register" onClick={() => setIsOpen(false)}>
                Create Free Account
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full font-semibold rounded-xl h-11">
              <Link href="/login" onClick={() => setIsOpen(false)}>
                <LogIn className="w-4 h-4 mr-2" /> Log In
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </GuestAuthContext.Provider>
  );
}

export function useGuestAuth() {
  return useContext(GuestAuthContext);
}
