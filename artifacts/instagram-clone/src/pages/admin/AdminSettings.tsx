import { useState, useEffect } from "react";
import { AdminLayout, useAdmin } from "./AdminLayout";
import { adminApi } from "./admin-api";
import { ADMIN_STRINGS } from "./admin-i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Shield,
  UploadCloud,
  FileText,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

function AdminSettingsContent() {
  const { lang, token, admin } = useAdmin();
  const t = ADMIN_STRINGS[lang];

  const [settings, setSettings] = useState<any>({
    allowNewRegistrations: true,
    maintenanceMode: false,
    requireEmailVerification: false,
    maxUploadSizeMB: 50,
    allowedMediaTypes: ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"],
    autoModerateSpam: true,
    feedAlgorithm: "chronological_engagement",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async (tkn: string | null) => {
    try {
      setLoading(true);
      const res = await adminApi.getSettings(tkn);
      if (res.settings) {
        setSettings(res.settings);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings(token);
  }, [token]);

  const handleSave = async () => {
    if (admin?.role !== "superadmin") {
      toast.error("Only Super Administrators can update platform settings");
      return;
    }

    try {
      setSaving(true);
      await adminApi.updateSettings(settings, token);
      toast.success("Platform settings saved and logged to audit trail");
    } catch (err: any) {
      toast.error(err.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const isSuperadmin = admin?.role === "superadmin";

  return (
    <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {t.settings}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure global platform operational rules, upload limits, and security toggles.
                </p>
              </div>

              <Button
                disabled={saving || !isSuperadmin || loading}
                onClick={handleSave}
                className="h-9 text-xs gap-1.5 self-start sm:self-auto"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{t.saveSettings}</span>
              </Button>
            </div>

            {!isSuperadmin && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>You have read-only access to platform settings. Super Administrator privilege is required to modify these options.</span>
              </div>
            )}

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                <span className="text-xs text-muted-foreground">{t.loading}</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Platform Access Card */}
                <Card className="shadow-none border-border/80">
                  <CardHeader className="p-4 pb-2 border-b border-border bg-secondary/20">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      Access & Registrations
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Control new user signups and platform maintenance status.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-foreground">
                          Allow New User Registrations
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          When disabled, signup endpoints reject new account creations.
                        </div>
                      </div>
                      <Switch
                        disabled={!isSuperadmin}
                        checked={settings.allowNewRegistrations}
                        onCheckedChange={(v) =>
                          setSettings({ ...settings, allowNewRegistrations: v })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-foreground">
                          Maintenance Mode
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Locks non-admin users to maintenance screen.
                        </div>
                      </div>
                      <Switch
                        disabled={!isSuperadmin}
                        checked={settings.maintenanceMode}
                        onCheckedChange={(v) =>
                          setSettings({ ...settings, maintenanceMode: v })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-foreground">
                          Require Email Verification
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Force users to confirm email before posting or commenting.
                        </div>
                      </div>
                      <Switch
                        disabled={!isSuperadmin}
                        checked={settings.requireEmailVerification}
                        onCheckedChange={(v) =>
                          setSettings({ ...settings, requireEmailVerification: v })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Media & Upload Limits */}
                <Card className="shadow-none border-border/80">
                  <CardHeader className="p-4 pb-2 border-b border-border bg-secondary/20">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <UploadCloud className="w-4 h-4 text-blue-500" />
                      Media & Storage Limits
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Enforce file sizes and media constraints across posts, reels, and stories.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Max Upload Size (MB)
                      </label>
                      <Input
                        type="number"
                        disabled={!isSuperadmin}
                        value={settings.maxUploadSizeMB}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            maxUploadSizeMB: Number(e.target.value) || 50,
                          })
                        }
                        className="text-xs h-9"
                      />
                      <span className="text-[11px] text-muted-foreground">
                        Controls client-side chunking and server payload caps for video reels.
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-foreground">
                          Automated Spam Filtering
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Auto-flag excessive comment frequency or repetitive links.
                        </div>
                      </div>
                      <Switch
                        disabled={!isSuperadmin}
                        checked={settings.autoModerateSpam}
                        onCheckedChange={(v) =>
                          setSettings({ ...settings, autoModerateSpam: v })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
    </div>
  );
}

export default function AdminSettings() {
  return (
    <AdminLayout activeTab="settings">
      <AdminSettingsContent />
    </AdminLayout>
  );
}
