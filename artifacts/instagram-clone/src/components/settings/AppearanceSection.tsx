import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/theme-provider";
import { PRESET_COLORS, DEFAULT_ACCENT_HEX, UI_PALETTE_PRESETS } from "@/lib/accent-color";
import { cn } from "@/lib/utils";
import {
  type ThemeMode,
  type FontSize,
  type BorderRadius,
  type Density,
  type ThemeConfig,
  encodeTheme,
  decodeTheme,
} from "@/lib/theme-config";
import {
  Sun,
  Moon,
  Monitor,
  Palette,
  RotateCcw,
  Check,
  Copy,
  CheckCheck,
  Type,
  SquareDashedBottom,
  LayoutGrid,
} from "lucide-react";

export function AppearanceSection() {
  const {
    theme,
    setTheme,
    accentColor,
    setAccentColor,
    resetAccentColor,
    fontSize,
    setFontSize,
    radius,
    setRadius,
    density,
    setDensity,
    uiHue,
    setUiHue,
  } = useTheme();

  const { toast } = useToast();
  const [hexInput, setHexInput] = useState(accentColor || DEFAULT_ACCENT_HEX);
  const [savedHex, setSavedHex] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [importInput, setImportInput] = useState("");
  const colorInputRef = useRef<HTMLInputElement>(null);

  const handlePresetClick = (preset: (typeof PRESET_COLORS)[number]) => {
    setHexInput(preset.hex);
    setAccentColor(preset.hex);
  };

  const handlePalettePreset = (preset: (typeof UI_PALETTE_PRESETS)[number]) => {
    setUiHue(preset.hue);
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHexInput(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      setAccentColor(val);
    }
  };

  const handleHexSave = () => {
    if (/^#[0-9A-Fa-f]{6}$/.test(hexInput)) {
      setAccentColor(hexInput);
      setSavedHex(true);
      setTimeout(() => setSavedHex(false), 2000);
      toast({ title: "Accent color saved!" });
    } else {
      toast({ title: "Invalid hex code", description: "Format: #RRGGBB", variant: "destructive" });
    }
  };

  const handleNativeColorPicker = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHexInput(val);
    setAccentColor(val);
  };

  const currentThemeConfig: ThemeConfig = {
    accent: hexInput,
    mode: theme,
    fontSize,
    radius,
    density,
    uiHue,
  };

  const handleExportCode = () => {
    const code = encodeTheme(currentThemeConfig);
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    toast({ title: "Theme code copied to clipboard!" });
  };

  const handleImport = () => {
    const parsed = decodeTheme(importInput.trim());
    if (!parsed) {
      toast({ title: "Invalid theme code", variant: "destructive" });
      return;
    }
    setTheme(parsed.mode);
    if (parsed.accent) {
      setHexInput(parsed.accent);
      setAccentColor(parsed.accent);
    }
    setFontSize(parsed.fontSize);
    setRadius(parsed.radius);
    setDensity(parsed.density);
    setUiHue(parsed.uiHue);
    setImportInput("");
    toast({ title: "Theme loaded successfully!" });
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Appearance & Theme Engine</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Personalize colors, mode, typography scale, corner radius, and layout density.
        </p>
      </div>

      {/* Theme Mode */}
      <div className="p-6 rounded-2xl border border-border bg-card space-y-4 shadow-sm">
        <h3 className="font-semibold text-base">Color Mode</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: "light" as ThemeMode, icon: Sun, label: "Light" },
            { id: "dark" as ThemeMode, icon: Moon, label: "Dark" },
            { id: "system" as ThemeMode, icon: Monitor, label: "System" },
          ].map((mode) => {
            const Icon = mode.icon;
            const isSelected = theme === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setTheme(mode.id)}
                className={cn(
                  "p-4 rounded-xl border flex flex-col items-center gap-2 text-center transition-all",
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary font-semibold"
                    : "border-border bg-muted/20 hover:bg-muted/40 text-muted-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5", isSelected ? "text-primary" : "text-muted-foreground")} />
                <span className="text-xs">{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Accent Color Palette */}
      <div className="p-6 rounded-2xl border border-border bg-card space-y-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-base">Accent Color</h3>
            <p className="text-xs text-muted-foreground">Select a curated palette or customize your own hex</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetAccentColor}
            className="text-xs text-muted-foreground hover:text-foreground h-8 gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </Button>
        </div>

        {/* Presets Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
          {PRESET_COLORS.map((p) => {
            const isSelected = hexInput.toLowerCase() === p.hex.toLowerCase();
            return (
              <button
                key={p.hex}
                type="button"
                onClick={() => handlePresetClick(p)}
                className={cn(
                  "h-11 rounded-xl flex items-center justify-center transition-transform hover:scale-105 relative",
                  isSelected && "ring-2 ring-foreground ring-offset-2 ring-offset-card"
                )}
                style={{ backgroundColor: p.hex }}
                title={p.name}
              >
                {isSelected && <Check className="w-4 h-4 text-white drop-shadow" />}
              </button>
            );
          })}
        </div>

        {/* Custom Hex Picker */}
        <div className="flex items-center gap-3 pt-2">
          <div
            onClick={() => colorInputRef.current?.click()}
            className="w-10 h-10 rounded-xl cursor-pointer border border-border shrink-0 shadow-sm"
            style={{ backgroundColor: hexInput }}
          >
            <input
              ref={colorInputRef}
              type="color"
              value={hexInput}
              onChange={handleNativeColorPicker}
              className="sr-only"
            />
          </div>
          <Input
            value={hexInput}
            onChange={handleHexChange}
            placeholder="#E1306C"
            maxLength={7}
            className="font-mono text-xs uppercase h-10 w-36"
          />
          <Button type="button" onClick={handleHexSave} size="sm" className="h-10 text-xs font-semibold px-4">
            {savedHex ? <CheckCheck className="w-4 h-4 text-emerald-400 mr-1" /> : null}
            Apply Hex
          </Button>
        </div>
      </div>

      {/* Surface Hue Palettes */}
      <div className="p-6 rounded-2xl border border-border bg-card space-y-4 shadow-sm">
        <h3 className="font-semibold text-base">UI Surface Palette Tint</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {UI_PALETTE_PRESETS.map((p) => {
            const isSelected = uiHue === p.hue;
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => handlePalettePreset(p)}
                className={cn(
                  "p-2.5 rounded-xl border flex items-center gap-2 text-xs font-medium transition-all",
                  isSelected
                    ? "border-primary bg-primary/10 text-primary font-bold"
                    : "border-border bg-muted/20 hover:bg-muted/40"
                )}
              >
                <div className="w-4 h-4 rounded-full border border-border shrink-0" style={{ backgroundColor: p.swatch }} />
                <span className="truncate">{p.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Typography & Density Config */}
      <div className="p-6 rounded-2xl border border-border bg-card space-y-6 shadow-sm">
        <h3 className="font-semibold text-base">Layout & Sizing Dimensions</h3>

        {/* Font Size */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5" /> Font Scale
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {(["sm", "md", "lg"] as FontSize[]).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setFontSize(size)}
                className={cn(
                  "py-2 px-3 rounded-lg border text-xs font-medium uppercase tracking-wider transition-all",
                  fontSize === size
                    ? "border-primary bg-primary/10 text-primary font-bold"
                    : "border-border bg-muted/20 hover:bg-muted/40"
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Corner Radius */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <SquareDashedBottom className="w-3.5 h-3.5" /> Corner Radius
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {(["sharp", "soft", "round"] as BorderRadius[]).map((rad) => (
              <button
                key={rad}
                type="button"
                onClick={() => setRadius(rad)}
                className={cn(
                  "py-2 px-3 rounded-lg border text-xs font-medium uppercase tracking-wider transition-all",
                  radius === rad
                    ? "border-primary bg-primary/10 text-primary font-bold"
                    : "border-border bg-muted/20 hover:bg-muted/40"
                )}
              >
                {rad}
              </button>
            ))}
          </div>
        </div>

        {/* Density */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <LayoutGrid className="w-3.5 h-3.5" /> UI Density
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {(["compact", "comfortable"] as Density[]).map((den) => (
              <button
                key={den}
                type="button"
                onClick={() => setDensity(den)}
                className={cn(
                  "py-2 px-3 rounded-lg border text-xs font-medium capitalize transition-all",
                  density === den
                    ? "border-primary bg-primary/10 text-primary font-bold"
                    : "border-border bg-muted/20 hover:bg-muted/40"
                )}
              >
                {den}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Share / Import / Export Theme */}
      <div className="p-6 rounded-2xl border border-border bg-card space-y-4 shadow-sm">
        <h3 className="font-semibold text-base flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary" /> Export & Share Theme
        </h3>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCode}
            className="gap-2 h-9 text-xs font-semibold"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            Copy Theme Code
          </Button>
        </div>

        <div className="flex gap-2 pt-1">
          <Input
            value={importInput}
            onChange={(e) => setImportInput(e.target.value)}
            placeholder="Paste theme code here..."
            className="h-9 text-xs font-mono"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleImport}
            disabled={!importInput.trim()}
            className="h-9 text-xs font-semibold shrink-0"
          >
            Load
          </Button>
        </div>
      </div>
    </div>
  );
}
