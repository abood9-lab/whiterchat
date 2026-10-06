import React, { useState } from "react";
import { Radio, Plus, Volume2, Shield, Mic, Sparkles } from "lucide-react";
import { LiveAudioRoomsTray } from "@/components/audio-space/LiveAudioRoomsTray";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n";

export function AudioSpacesSettingsSection() {
  const { t } = useI18n();
  const [muteOnJoin, setMuteOnJoin] = useState(true);
  const [requestNotifications, setRequestNotifications] = useState(true);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Info */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-violet-900/30 via-card to-indigo-900/20 border border-violet-500/30 shadow-sm space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-violet-500/20">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <span>{t("Live Audio Spaces", "الغرف الصوتية المباشرة")}</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </h2>
            <p className="text-xs text-muted-foreground">
              {t(
                "Host or join real-time audio rooms, broadcast stages, and group podcasts.",
                "استضِف أو انضم إلى غرف ومساحات صوتية مباشرة واستمع للحوارات الحية."
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Audio Preferences */}
      <div className="p-5 rounded-2xl bg-card border border-border/80 space-y-4">
        <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
          <Mic className="w-4 h-4 text-primary" />
          <span>{t("Audio Space Preferences", "تفضيلات الغرف الصوتية")}</span>
        </h3>

        <div className="space-y-3 divide-y divide-border/60">
          <div className="flex items-center justify-between pt-1">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-foreground">
                {t("Mute Microphone on Join", "كتم المايك عند الانضمام")}
              </span>
              <p className="text-[11px] text-muted-foreground">
                {t("Automatically join spaces with your microphone muted.", "الانضمام تلقائيًا بميكروفون مكتوم للحفاظ على الخصوصية.")}
              </p>
            </div>
            <Switch checked={muteOnJoin} onCheckedChange={setMuteOnJoin} />
          </div>

          <div className="flex items-center justify-between pt-3">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-foreground">
                {t("Speaker Request Alerts", "إشعارات طلب التحدث")}
              </span>
              <p className="text-[11px] text-muted-foreground">
                {t("Receive alerts when listeners ask to speak in your space.", "تلقي تنبيهات عند طلب المستمعين التحدث في غرفتك.")}
              </p>
            </div>
            <Switch checked={requestNotifications} onCheckedChange={setRequestNotifications} />
          </div>
        </div>
      </div>

      {/* Active Live Audio Spaces Tray */}
      <div className="space-y-3 pt-2">
        <LiveAudioRoomsTray limit={10} showStartButton={true} />
      </div>
    </div>
  );
}
