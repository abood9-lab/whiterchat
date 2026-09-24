import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { LogoConfig } from '../types/logo';

interface ThreeLogoCanvasProps {
  config: LogoConfig;
  className?: string;
}

export const ThreeLogoCanvas: React.FC<ThreeLogoCanvasProps> = ({ config, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const logoGroupRef = useRef<THREE.Group | null>(null);
  const frameGroupRef = useRef<THREE.Group | null>(null);
  const coreLightRef = useRef<THREE.PointLight | null>(null);
  const reqIdRef = useRef<number | null>(null);

  // Mouse interaction state
  const isDraggingRef = useRef<boolean>(false);
  const previousMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rotationTargetRef = useRef<{ x: number; y: number }>({ x: 0.15, y: 0 });
  const [webglError, setWebglError] = useState<boolean>(false);

  // Setup Three.js Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 600;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 10);
    cameraRef.current = camera;

    // WebGL Renderer
    try {
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;

      // Clean container & attach canvas
      container.innerHTML = '';
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;
    } catch (e) {
      console.error('WebGL initialization error:', e);
      setWebglError(true);
      return;
    }

    // Main Logo Group
    const logoGroup = new THREE.Group();
    scene.add(logoGroup);
    logoGroupRef.current = logoGroup;

    // Frame Group
    const frameGroup = new THREE.Group();
    scene.add(frameGroup);
    frameGroupRef.current = frameGroup;

    // Lights Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfffef0, 1.4);
    keyLight.position.set(5, 8, 7);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 0.8);
    fillLight.position.set(-6, -3, 5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    rimLight.position.set(0, 5, -8);
    scene.add(rimLight);

    // Cyan Core Point Light inside the shutter
    const coreLight = new THREE.PointLight(0x06b6d4, 1.5, 12);
    coreLight.position.set(0, 0, 0);
    scene.add(coreLight);
    coreLightRef.current = coreLight;

    // Handle Resize
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Animation Loop
    const animate = () => {
      reqIdRef.current = requestAnimationFrame(animate);

      if (logoGroupRef.current) {
        if (config.autoRotate && !isDraggingRef.current) {
          rotationTargetRef.current.y += 0.005 * config.rotationSpeed;
        }

        // Smooth damp rotation
        logoGroupRef.current.rotation.x += (rotationTargetRef.current.x - logoGroupRef.current.rotation.x) * 0.08;
        logoGroupRef.current.rotation.y += (rotationTargetRef.current.y - logoGroupRef.current.rotation.y) * 0.08;

        if (frameGroupRef.current) {
          frameGroupRef.current.rotation.x = logoGroupRef.current.rotation.x;
          frameGroupRef.current.rotation.y = logoGroupRef.current.rotation.y;
          frameGroupRef.current.rotation.z = -logoGroupRef.current.rotation.y * 0.2;
        }
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    return () => {
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Update Geometry & Materials when config changes
  useEffect(() => {
    const scene = sceneRef.current;
    const logoGroup = logoGroupRef.current;
    const frameGroup = frameGroupRef.current;
    if (!scene || !logoGroup || !frameGroup) return;

    // Clear previous geometries
    while (logoGroup.children.length > 0) {
      const obj = logoGroup.children[0] as THREE.Mesh;
      if (obj.geometry) obj.geometry.dispose();
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
      else if (obj.material) obj.material.dispose();
      logoGroup.remove(obj);
    }

    while (frameGroup.children.length > 0) {
      const obj = frameGroup.children[0] as THREE.Mesh;
      if (obj.geometry) obj.geometry.dispose();
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
      else if (obj.material) obj.material.dispose();
      frameGroup.remove(obj);
    }

    // Set Scene Background based on bgMode
    if (config.bgMode === 'deep_dark') {
      scene.background = new THREE.Color(0x090d16);
    } else if (config.bgMode === 'soft_ivory') {
      scene.background = new THREE.Color(0xfbfbfa);
    } else if (config.bgMode === 'cool_white') {
      scene.background = new THREE.Color(0xf8f9fc);
    } else {
      scene.background = null;
    }

    // Update Light Intensity
    if (coreLightRef.current) {
      coreLightRef.current.intensity = config.cyanGlowIntensity * 2.0;
    }

    // Create Materials according to Preset
    let bladeMaterial: THREE.MeshPhysicalMaterial;
    let frameMaterial: THREE.MeshStandardMaterial;

    if (config.preset === 'dark_obsidian') {
      bladeMaterial = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0x1e293b),
        metalness: 0.6,
        roughness: 0.2,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        transmission: 0.3 * config.glassOpacity,
        ior: 1.5,
        reflectivity: 0.9,
      });
      frameMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x334155),
        metalness: 0.85,
        roughness: 0.25,
      });
    } else if (config.preset === 'frosted_crystal') {
      bladeMaterial = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0xf0f9ff),
        metalness: 0.1,
        roughness: 0.08,
        clearcoat: 1.0,
        transmission: 0.85 * config.glassOpacity,
        thickness: 1.2,
        ior: 1.45,
      });
      frameMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x38bdf8),
        metalness: 0.5,
        roughness: 0.2,
      });
    } else if (config.preset === 'polished_silver') {
      bladeMaterial = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0xe2e8f0),
        metalness: 0.85 * config.metallicFinish,
        roughness: 0.15,
        clearcoat: 0.8,
        transmission: 0.2,
      });
      frameMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xcbd5e1),
        metalness: 0.95,
        roughness: 0.1,
      });
    } else {
      // Default: Pearl White & Icy Cyan Glass
      bladeMaterial = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0xf8fafc),
        metalness: 0.3 * config.metallicFinish,
        roughness: 0.12,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        transmission: 0.65 * config.glassOpacity,
        ior: 1.52,
        thickness: 0.8,
        attenuationColor: new THREE.Color(0xcffafe),
        attenuationDistance: 1.5,
      });
      frameMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x94a3b8),
        metalness: 0.7,
        roughness: 0.3,
      });
    }

    // 1. Build N Interlocking Curved Shutter Blades
    const count = Math.max(6, Math.min(12, config.bladeCount));
    const apertureRadius = 0.5 + config.apertureSize * 0.8;
    const outerRadius = 2.4;

    for (let i = 0; i < count; i++) {
      const angle = (i * Math.PI * 2) / count;

      // Create 2D Shape for individual curved blade
      const shape = new THREE.Shape();
      const curvature = config.bladeCurvature;

      // Start at inner aperture edge
      const innerA = angle;
      const x0 = Math.cos(innerA) * apertureRadius;
      const y0 = Math.sin(innerA) * apertureRadius;
      shape.moveTo(x0, y0);

      // Curve outwards along blade twist
      const midA = angle + (Math.PI / count) * (1.2 * curvature);
      const midR = (apertureRadius + outerRadius) * 0.55;
      const xMid = Math.cos(midA) * midR;
      const yMid = Math.sin(midA) * midR;

      const outerA = angle + ((2.2 * Math.PI) / count) * (1.1 * curvature);
      const xOuter = Math.cos(outerA) * outerRadius;
      const yOuter = Math.sin(outerA) * outerRadius;

      shape.quadraticCurveTo(xMid, yMid, xOuter, yOuter);

      // Return curve back to inner radius with offset
      const returnOuterA = outerA - 0.25;
      const xRetOuter = Math.cos(returnOuterA) * (outerRadius * 0.85);
      const yRetOuter = Math.sin(returnOuterA) * (outerRadius * 0.85);

      const returnInnerA = innerA + (Math.PI * 1.8) / count;
      const xRetInner = Math.cos(returnInnerA) * (apertureRadius * 1.15);
      const yRetInner = Math.sin(returnInnerA) * (apertureRadius * 1.15);

      shape.quadraticCurveTo(xRetOuter, yRetOuter, xRetInner, yRetInner);
      shape.lineTo(x0, y0);

      // Extrude shape with smooth bevels
      const extrudeSettings = {
        steps: 1,
        depth: 0.15,
        bevelEnabled: true,
        bevelThickness: 0.06,
        bevelSize: 0.04,
        bevelOffset: 0,
        bevelSegments: 5,
      };

      const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geom.center();

      const mesh = new THREE.Mesh(geom, bladeMaterial);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Position blade in radial circle offset
      const distFromCenter = apertureRadius * 0.8;
      mesh.position.x = Math.cos(angle + 0.2) * distFromCenter;
      mesh.position.y = Math.sin(angle + 0.2) * distFromCenter;
      mesh.position.z = (i % 3) * 0.05; // Slight Z-stack layer depth
      mesh.rotation.z = angle + 0.3;

      logoGroup.add(mesh);
    }

    // 2. Central Focal Core Lens
    const coreGeom = new THREE.CylinderGeometry(
      apertureRadius * 0.65,
      apertureRadius * 0.65,
      0.2,
      32
    );
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x06b6d4),
      emissive: new THREE.Color(0x06b6d4),
      emissiveIntensity: 0.8 * config.cyanGlowIntensity,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.8,
    });
    const coreMesh = new THREE.Mesh(coreGeom, coreMat);
    coreMesh.rotation.x = Math.PI / 2;
    coreMesh.position.z = -0.1;
    logoGroup.add(coreMesh);

    // 3. Build Outer Geometric Frame Ring
    if (config.frameStyle !== 'none') {
      const ringRadius = outerRadius + 0.4;

      if (config.frameStyle === 'rounded_octagonal') {
        const sides = 8;
        const ringPoints: THREE.Vector3[] = [];
        for (let s = 0; s <= sides; s++) {
          const a = (s * Math.PI * 2) / sides - Math.PI / 8;
          ringPoints.push(new THREE.Vector3(Math.cos(a) * ringRadius, Math.sin(a) * ringRadius, 0));
        }

        const tubeGeom = new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(ringPoints, true),
          64,
          0.04,
          8,
          true
        );
        const tubeMesh = new THREE.Mesh(tubeGeom, frameMaterial);
        tubeMesh.castShadow = true;
        frameGroup.add(tubeMesh);

        // Corner accents
        for (let s = 0; s < sides; s++) {
          const a = (s * Math.PI * 2) / sides - Math.PI / 8;
          const cornerGeom = new THREE.SphereGeometry(0.08, 16, 16);
          const cornerMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0x38bdf8),
            metalness: 0.8,
            roughness: 0.2,
            emissive: new THREE.Color(0x06b6d4),
            emissiveIntensity: 0.3 * config.cyanGlowIntensity,
          });
          const cornerMesh = new THREE.Mesh(cornerGeom, cornerMat);
          cornerMesh.position.set(Math.cos(a) * (ringRadius + 0.08), Math.sin(a) * (ringRadius + 0.08), 0);
          frameGroup.add(cornerMesh);
        }
      } else if (config.frameStyle === 'segmented_arc') {
        const arcs = 4;
        for (let a = 0; a < arcs; a++) {
          const startAngle = (a * Math.PI * 2) / arcs + 0.15;
          const arcGeom = new THREE.TorusGeometry(ringRadius, 0.035, 12, 32, Math.PI / 2.8);
          const arcMesh = new THREE.Mesh(arcGeom, frameMaterial);
          arcMesh.rotation.z = startAngle;
          frameGroup.add(arcMesh);
        }
      } else {
        // Minimal ring
        const ringGeom = new THREE.TorusGeometry(ringRadius, 0.025, 16, 100);
        const ringMesh = new THREE.Mesh(ringGeom, frameMaterial);
        frameGroup.add(ringMesh);
      }
    }
  }, [config]);

  // Mouse Drag to Orbit handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    previousMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - previousMouseRef.current.x;
    const deltaY = e.clientY - previousMouseRef.current.y;

    rotationTargetRef.current.y += deltaX * 0.008;
    rotationTargetRef.current.x += deltaY * 0.008;

    // Clamp X tilt
    rotationTargetRef.current.x = Math.max(-0.8, Math.min(0.8, rotationTargetRef.current.x));

    previousMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  if (webglError) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 text-center bg-slate-100 rounded-2xl border border-slate-200 ${className}`}>
        <p className="text-sm font-semibold text-slate-700">3D WebGL Viewport Fallback</p>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">Rendering 2D resolution-independent SVG vector preview.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={`relative cursor-grab active:cursor-grabbing select-none w-full h-full min-h-[380px] ${className}`}
      title="Click and drag to orbit 3D emblem"
    />
  );
};
