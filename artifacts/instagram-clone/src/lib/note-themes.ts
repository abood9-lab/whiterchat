import type { NoteTheme } from "@/types/note";

export interface NoteThemeOption {
  id: NoteTheme;
  label: string;
  nameAr: string;
  // Swatch color for the color picker button
  swatchClass: string;
  // Outer bubble styles for the floating NoteBubble
  bubbleClass: string;
  tailClass: string;
  // Typography inside bubble
  textClass: string;
  accentClass: string;
  // Modal detail view background
  detailCardClass: string;
  // Chat preview styles
  chatPreviewClass: string;
  chatReplyClass: string;
}

export const NOTE_THEME_OPTIONS: NoteThemeOption[] = [
  {
    id: "default",
    label: "Default",
    nameAr: "افتراضي",
    swatchClass: "bg-neutral-200 dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600",
    bubbleClass: "bg-card/95 backdrop-blur-md border-border/90 text-card-foreground shadow-md",
    tailClass: "after:bg-card after:border-border/90",
    textClass: "text-foreground",
    accentClass: "text-primary",
    detailCardClass: "bg-secondary/40 border-border/80 text-foreground",
    chatPreviewClass: "bg-secondary/70 border-border text-foreground",
    chatReplyClass: "bg-secondary/70 border-border text-foreground",
  },
  {
    id: "green",
    label: "Green",
    nameAr: "أخضر",
    swatchClass: "bg-emerald-500 border-emerald-600",
    bubbleClass: "bg-emerald-50 dark:bg-emerald-950/90 border-emerald-400 dark:border-emerald-600 text-emerald-950 dark:text-emerald-50 shadow-md",
    tailClass: "after:bg-emerald-50 dark:after:bg-emerald-950/90 after:border-emerald-400 dark:after:border-emerald-600",
    textClass: "text-emerald-950 dark:text-emerald-50",
    accentClass: "text-emerald-700 dark:text-emerald-300",
    detailCardClass: "bg-emerald-500/10 border-emerald-400/60 dark:border-emerald-600/50 text-emerald-950 dark:text-emerald-50",
    chatPreviewClass: "bg-emerald-500/15 border-emerald-500/40 text-emerald-950 dark:text-emerald-100",
    chatReplyClass: "bg-emerald-500/15 border-emerald-500/40 text-emerald-950 dark:text-emerald-100",
  },
  {
    id: "blue",
    label: "Blue",
    nameAr: "أزرق",
    swatchClass: "bg-sky-500 border-sky-600",
    bubbleClass: "bg-sky-50 dark:bg-sky-950/90 border-sky-400 dark:border-sky-600 text-sky-950 dark:text-sky-50 shadow-md",
    tailClass: "after:bg-sky-50 dark:after:bg-sky-950/90 after:border-sky-400 dark:after:border-sky-600",
    textClass: "text-sky-950 dark:text-sky-50",
    accentClass: "text-sky-700 dark:text-sky-300",
    detailCardClass: "bg-sky-500/10 border-sky-400/60 dark:border-sky-600/50 text-sky-950 dark:text-sky-50",
    chatPreviewClass: "bg-sky-500/15 border-sky-500/40 text-sky-950 dark:text-sky-100",
    chatReplyClass: "bg-sky-500/15 border-sky-500/40 text-sky-950 dark:text-sky-100",
  },
  {
    id: "purple",
    label: "Purple",
    nameAr: "بنفسجي",
    swatchClass: "bg-purple-500 border-purple-600",
    bubbleClass: "bg-purple-50 dark:bg-purple-950/90 border-purple-400 dark:border-purple-600 text-purple-950 dark:text-purple-50 shadow-md",
    tailClass: "after:bg-purple-50 dark:after:bg-purple-950/90 after:border-purple-400 dark:after:border-purple-600",
    textClass: "text-purple-950 dark:text-purple-50",
    accentClass: "text-purple-700 dark:text-purple-300",
    detailCardClass: "bg-purple-500/10 border-purple-400/60 dark:border-purple-600/50 text-purple-950 dark:text-purple-50",
    chatPreviewClass: "bg-purple-500/15 border-purple-500/40 text-purple-950 dark:text-purple-100",
    chatReplyClass: "bg-purple-500/15 border-purple-500/40 text-purple-950 dark:text-purple-100",
  },
  {
    id: "pink",
    label: "Pink",
    nameAr: "وردي",
    swatchClass: "bg-pink-500 border-pink-600",
    bubbleClass: "bg-pink-50 dark:bg-pink-950/90 border-pink-400 dark:border-pink-600 text-pink-950 dark:text-pink-50 shadow-md",
    tailClass: "after:bg-pink-50 dark:after:bg-pink-950/90 after:border-pink-400 dark:after:border-pink-600",
    textClass: "text-pink-950 dark:text-pink-50",
    accentClass: "text-pink-700 dark:text-pink-300",
    detailCardClass: "bg-pink-500/10 border-pink-400/60 dark:border-pink-600/50 text-pink-950 dark:text-pink-50",
    chatPreviewClass: "bg-pink-500/15 border-pink-500/40 text-pink-950 dark:text-pink-100",
    chatReplyClass: "bg-pink-500/15 border-pink-500/40 text-pink-950 dark:text-pink-100",
  },
  {
    id: "orange",
    label: "Orange",
    nameAr: "برتقالي",
    swatchClass: "bg-amber-500 border-amber-600",
    bubbleClass: "bg-amber-50 dark:bg-amber-950/90 border-amber-400 dark:border-amber-600 text-amber-950 dark:text-amber-50 shadow-md",
    tailClass: "after:bg-amber-50 dark:after:bg-amber-950/90 after:border-amber-400 dark:after:border-amber-600",
    textClass: "text-amber-950 dark:text-amber-50",
    accentClass: "text-amber-700 dark:text-amber-300",
    detailCardClass: "bg-amber-500/10 border-amber-400/60 dark:border-amber-600/50 text-amber-950 dark:text-amber-50",
    chatPreviewClass: "bg-amber-500/15 border-amber-500/40 text-amber-950 dark:text-amber-100",
    chatReplyClass: "bg-amber-500/15 border-amber-500/40 text-amber-950 dark:text-amber-100",
  },
  {
    id: "red",
    label: "Red",
    nameAr: "أحمر",
    swatchClass: "bg-rose-500 border-rose-600",
    bubbleClass: "bg-rose-50 dark:bg-rose-950/90 border-rose-400 dark:border-rose-600 text-rose-950 dark:text-rose-50 shadow-md",
    tailClass: "after:bg-rose-50 dark:after:bg-rose-950/90 after:border-rose-400 dark:after:border-rose-600",
    textClass: "text-rose-950 dark:text-rose-50",
    accentClass: "text-rose-700 dark:text-rose-300",
    detailCardClass: "bg-rose-500/10 border-rose-400/60 dark:border-rose-600/50 text-rose-950 dark:text-rose-50",
    chatPreviewClass: "bg-rose-500/15 border-rose-500/40 text-rose-950 dark:text-rose-100",
    chatReplyClass: "bg-rose-500/15 border-rose-500/40 text-rose-950 dark:text-rose-100",
  },
  {
    id: "dark",
    label: "Dark",
    nameAr: "داكن",
    swatchClass: "bg-neutral-900 border-neutral-700 text-white",
    bubbleClass: "bg-neutral-900 border-neutral-700 text-neutral-100 shadow-md",
    tailClass: "after:bg-neutral-900 after:border-neutral-700",
    textClass: "text-neutral-100",
    accentClass: "text-neutral-300",
    detailCardClass: "bg-neutral-900 border-neutral-700 text-neutral-100",
    chatPreviewClass: "bg-neutral-900/90 border-neutral-700 text-neutral-100",
    chatReplyClass: "bg-neutral-900/90 border-neutral-700 text-neutral-100",
  },
];

export function getNoteTheme(theme?: string | null): NoteThemeOption {
  if (!theme) return NOTE_THEME_OPTIONS[0];
  const match = NOTE_THEME_OPTIONS.find((t) => t.id === theme);
  return match ?? NOTE_THEME_OPTIONS[0];
}
