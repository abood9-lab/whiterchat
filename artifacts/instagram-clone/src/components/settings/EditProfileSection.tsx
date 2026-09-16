import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api-url";
import { CoverUploadModal } from "@/components/profile/CoverUploadModal";
import { Camera, Image as ImageIcon, Check, AlertCircle, Plus, Trash2, Globe, MapPin, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const GENDERS = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "nonbinary", label: "Non-binary" },
  { id: "other", label: "Other" },
  { id: "prefer_not", label: "Prefer not to say" },
];

export function EditProfileSection() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [website, setWebsite] = useState(user?.website || "");
  const [location, setLocation] = useState((user as any)?.location || "");
  const [pronouns, setPronouns] = useState(user?.pronouns || "");
  const [gender, setGender] = useState(user?.gender || "");
  const [dateOfBirth, setDateOfBirth] = useState(
    user?.dateOfBirth ? user.dateOfBirth.split("T")[0] : ""
  );
  const [coverUrl, setCoverUrl] = useState((user as any)?.coverUrl || "");
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [customLinks, setCustomLinks] = useState<Array<{ title: string; url: string }>>(
    (user as any)?.customLinks || []
  );

  // Username validation state
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [usernameMessage, setUsernameMessage] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  // Check username debounce
  useEffect(() => {
    if (!username || username === user?.username) {
      setUsernameStatus("idle");
      setUsernameMessage("");
      return;
    }

    const timer = setTimeout(async () => {
      setUsernameStatus("checking");
      try {
        const token = localStorage.getItem("whiterchat_token") ?? "";
        const res = await fetch(apiUrl(`/api/users/check-username?username=${encodeURIComponent(username)}`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.available) {
          setUsernameStatus("available");
          setUsernameMessage(data.message || "Username is available");
        } else {
          setUsernameStatus("taken");
          setUsernameMessage(data.message || "Username is not available");
        }
      } catch {
        setUsernameStatus("idle");
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username, user?.username]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Max 5MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      setIsUploadingAvatar(true);
      try {
        const token = localStorage.getItem("whiterchat_token") ?? "";
        const res = await fetch(apiUrl("/api/users/me/avatar"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ data: reader.result as string, mimeType: file.type }),
        });
        if (res.ok) {
          const data = await res.json();
          if (user) updateUser({ ...user, avatarUrl: data.url });
          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
          toast({ title: "Profile photo updated!" });
        }
      } catch {
        toast({ title: "Failed to upload photo", variant: "destructive" });
      } finally {
        setIsUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: "Cover image too large", description: "Max 8MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      setIsUploadingCover(true);
      try {
        const token = localStorage.getItem("whiterchat_token") ?? "";
        const res = await fetch(apiUrl("/api/users/me/cover"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ data: reader.result as string, mimeType: file.type }),
        });
        if (res.ok) {
          const data = await res.json();
          setCoverUrl(data.url);
          if (user) updateUser({ ...user, coverUrl: data.url } as any);
          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
          toast({ title: "Cover banner updated!" });
        }
      } catch {
        toast({ title: "Failed to upload cover", variant: "destructive" });
      } finally {
        setIsUploadingCover(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const addCustomLink = () => {
    if (customLinks.length >= 5) {
      toast({ title: "Maximum 5 links allowed" });
      return;
    }
    setCustomLinks([...customLinks, { title: "", url: "" }]);
  };

  const updateCustomLink = (index: number, field: "title" | "url", value: string) => {
    const updated = [...customLinks];
    updated[index][field] = value;
    setCustomLinks(updated);
  };

  const removeCustomLink = (index: number) => {
    setCustomLinks(customLinks.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameStatus === "taken") {
      toast({ title: "Please choose a different username", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const validLinks = customLinks.filter((l) => l.title.trim() && l.url.trim());
      
      const res = await fetch(apiUrl("/api/users/me/profile"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          fullName: fullName.trim(),
          username: username.trim(),
          bio: bio.trim(),
          website: website.trim(),
          location: location.trim(),
          pronouns: pronouns.trim(),
          gender,
          dateOfBirth: dateOfBirth || null,
          coverUrl,
          customLinks: validLinks,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        if (user) {
          updateUser({
            ...user,
            fullName: updated.fullName,
            username: updated.username,
            bio: updated.bio,
            website: updated.website,
            location: updated.location,
            pronouns: updated.pronouns,
            gender: updated.gender,
            dateOfBirth: updated.dateOfBirth,
            coverUrl: updated.coverUrl,
            customLinks: updated.customLinks,
          } as any);
        }
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.username}`] });
        toast({ title: "Profile updated successfully!" });
      } else {
        const err = await res.json();
        toast({ title: "Update failed", description: err.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "An error occurred", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Edit Profile</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Customize how you appear to others on WhiterChat.
        </p>
      </div>

      {/* Cover Banner and Avatar Card */}
      <div className="relative rounded-2xl overflow-hidden border border-border bg-card shadow-sm">
        {/* Banner Area */}
        <div className="relative h-36 sm:h-48 w-full bg-gradient-to-r from-purple-700 via-indigo-600 to-pink-600 overflow-hidden">
          {coverUrl && (
            <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-black/25 flex items-center justify-end p-4">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowCoverModal(true)}
              className="gap-2 bg-background/80 backdrop-blur-md hover:bg-background shadow-md text-xs font-semibold"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              {coverUrl ? "Change Banner" : "Add Banner"}
            </Button>
          </div>
        </div>

        <CoverUploadModal
          open={showCoverModal}
          onOpenChange={setShowCoverModal}
          currentCoverUrl={coverUrl}
          onCoverUpdated={(newUrl) => {
            setCoverUrl(newUrl || "");
            if (user) updateUser({ ...user, coverUrl: newUrl } as any);
            queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
          }}
        />

        {/* Avatar Overlay */}
        <div className="px-6 pb-6 pt-0 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-12 sm:-mt-16 relative">
          <div className="relative group">
            <Avatar className="w-24 h-24 sm:w-28 sm:h-28 ring-4 ring-card shadow-xl">
              <AvatarImage src={user?.avatarUrl || undefined} />
              <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                {user?.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
            >
              {isUploadingAvatar ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
            </button>
            <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => avatarInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="text-xs font-semibold"
            >
              {isUploadingAvatar ? "Uploading..." : "Change Photo"}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Profile Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Display Name
            </Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              maxLength={60}
              className="h-10"
              required
            />
          </div>

          {/* Username */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="username" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Username
              </Label>
              {usernameStatus === "checking" && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Checking...
                </span>
              )}
              {usernameStatus === "available" && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                  <Check className="w-3.5 h-3.5" /> Available
                </span>
              )}
              {usernameStatus === "taken" && (
                <span className="text-xs text-destructive flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> Taken
                </span>
              )}
            </div>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))}
              placeholder="username"
              maxLength={30}
              className={cn("h-10", usernameStatus === "taken" && "border-destructive focus-visible:ring-destructive")}
              required
            />
          </div>
        </div>

        {/* Pronouns & Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pronouns" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pronouns
            </Label>
            <Input
              id="pronouns"
              value={pronouns}
              onChange={(e) => setPronouns(e.target.value)}
              placeholder="e.g. they/them, she/her, he/him"
              maxLength={30}
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Location
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. New York, USA or Cairo, Egypt"
              maxLength={60}
              className="h-10"
            />
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="bio" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Bio
            </Label>
            <span className={cn("text-xs font-mono", bio.length > 140 ? "text-amber-500 font-bold" : "text-muted-foreground")}>
              {bio.length} / 150
            </span>
          </div>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell the world about yourself..."
            maxLength={150}
            rows={3}
            className="resize-none leading-relaxed"
          />
        </div>

        {/* Primary Website */}
        <div className="space-y-2">
          <Label htmlFor="website" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" /> Primary Website / Link
          </Label>
          <Input
            id="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://yourwebsite.com"
            type="url"
            className="h-10"
          />
        </div>

        {/* Custom Links Manager */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Custom Profile Links ({customLinks.length}/5)
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add links to your portfolio, YouTube, GitHub, or shop.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCustomLink}
              disabled={customLinks.length >= 5}
              className="h-8 gap-1.5 text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> Add Link
            </Button>
          </div>

          <div className="space-y-2.5">
            {customLinks.map((link, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-muted/30">
                <Input
                  value={link.title}
                  onChange={(e) => updateCustomLink(idx, "title", e.target.value)}
                  placeholder="Link Title (e.g. YouTube)"
                  className="h-9 w-1/3 text-xs"
                />
                <Input
                  value={link.url}
                  onChange={(e) => updateCustomLink(idx, "url", e.target.value)}
                  placeholder="https://..."
                  className="h-9 flex-1 text-xs"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCustomLink(idx)}
                  className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Gender & DOB */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="gender" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Gender
            </Label>
            <select
              id="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select Gender</option>
              {GENDERS.map((g) => (
                <option key={g.id} value={g.id}>{g.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dob" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Date of Birth
            </Label>
            <Input
              id="dob"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="h-10 text-sm"
            />
          </div>
        </div>

        <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
          <Button
            type="submit"
            disabled={isSaving || usernameStatus === "taken" || usernameStatus === "checking"}
            className="w-full sm:w-auto px-6 h-10 font-semibold bg-primary text-primary-foreground"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
