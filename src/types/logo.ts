export type MaterialPreset = 'pearl_cyan' | 'dark_obsidian' | 'frosted_crystal' | 'polished_silver';
export type FrameStyle = 'rounded_octagonal' | 'minimal_ring' | 'segmented_arc' | 'none';
export type BackgroundMode = 'cool_white' | 'deep_dark' | 'soft_ivory' | 'transparent';

export interface LogoConfig {
  bladeCount: number;          // 6 to 12 blades
  apertureSize: number;        // 0.1 to 0.8 (how open the center focal point is)
  bladeCurvature: number;      // 0.2 to 1.5 (twist / arc)
  glassOpacity: number;        // 0.2 to 0.95
  cyanGlowIntensity: number;   // 0 to 2.0
  metallicFinish: number;      // 0 to 1.0
  frameStyle: FrameStyle;
  preset: MaterialPreset;
  bgMode: BackgroundMode;
  autoRotate: boolean;
  rotationSpeed: number;
  studioLightIntensity: number;
  showNetworkGrid: boolean;
}

export const DEFAULT_LOGO_CONFIG: LogoConfig = {
  bladeCount: 8,
  apertureSize: 0.35,
  bladeCurvature: 0.8,
  glassOpacity: 0.65,
  cyanGlowIntensity: 0.8,
  metallicFinish: 0.3,
  frameStyle: 'rounded_octagonal',
  preset: 'pearl_cyan',
  bgMode: 'cool_white',
  autoRotate: true,
  rotationSpeed: 0.5,
  studioLightIntensity: 1.0,
  showNetworkGrid: true,
};

export interface GeneratedImageRef {
  id: string;
  title: string;
  category: string;
  aspectRatio: string;
  path: string;
  description: string;
}

export const GENERATED_IMAGES: GeneratedImageRef[] = [
  {
    id: 'primary',
    title: 'Primary 3D Centered Emblem',
    category: 'Core Logo',
    aspectRatio: '1:1',
    path: '/src/assets/images/logo_emblem_3d_primary_1790185691440.jpg',
    description: 'Master 3D logo render showcasing pearl white glassmorphism blades, icy cyan central core, and rounded geometric outer ring on off-white canvas.',
  },
  {
    id: 'studio',
    title: 'Three-Quarter Studio Perspective',
    category: 'Macro View',
    aspectRatio: '1:1',
    path: '/src/assets/images/logo_emblem_3d_studio_1790185702084.jpg',
    description: 'High-end macro studio perspective displaying material bevels, subsurface light diffusion, and polished silver accents.',
  },
  {
    id: 'dark',
    title: 'Dark Mode Obsidian & Cyan',
    category: 'Dark Theme',
    aspectRatio: '1:1',
    path: '/src/assets/images/logo_emblem_3d_dark_1790185711199.jpg',
    description: 'High-contrast dark mode variant with deep slate background, frosted pearl translucency, and electric cyan light diffusion.',
  },
  {
    id: 'banner',
    title: 'Brand Identity Presentation Banner',
    category: 'Widescreen Showcase',
    aspectRatio: '16:9',
    path: '/src/assets/images/logo_brand_showcase_banner_1790185721861.jpg',
    description: '4K widescreen presentation backdrop for luxury SaaS, AI startup, and tech product launch identity decks.',
  },
];
