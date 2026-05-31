import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EnhancementId, ProfessionId } from "../lib/companyGame";

type ToolId = "blade" | "pickaxe" | "shield" | "hammer" | "staff" | "banner";

type ProfessionAvatar3DProps = {
  professionId: ProfessionId;
  selected?: boolean;
  weaponLevel?: number;
};

type WeaponPreview3DProps = {
  enhancementId: EnhancementId;
  level?: number;
};

type CharacterStyle = {
  accent: number;
  accentDark: number;
  glow: number;
  hair: number;
  skin: number;
  tool: ToolId;
};

export const professionWeaponEnhancement: Record<ProfessionId, EnhancementId> = {
  pathfinder: "route",
  miner: "workbench",
  warden: "strike",
  artisan: "guard",
  enchanter: "spark",
  tactician: "banner",
};

export const enhancementWeaponNames: Record<EnhancementId, string> = {
  strike: "Клинок цели",
  guard: "Щит смены",
  route: "Маршрутный резак",
  spark: "Эфирный посох",
  workbench: "Ресурсная кирка",
  banner: "Знамя ядра",
};

const visualStageLabels = ["База", "Заряд", "Редкий вид", "Эпический вид", "Пробужденный вид"];

const professionStyle: Record<ProfessionId, CharacterStyle> = {
  pathfinder: { accent: 0x1e9f91, accentDark: 0x126a61, glow: 0x7fd8c5, hair: 0x3a2a20, skin: 0xd9a77d, tool: "blade" },
  miner: { accent: 0xb7791f, accentDark: 0x7b4d14, glow: 0xf2bd5f, hair: 0x49392e, skin: 0xc98f67, tool: "pickaxe" },
  warden: { accent: 0xb94747, accentDark: 0x7d2c2c, glow: 0xf08a8a, hair: 0x2b2724, skin: 0xd6a06f, tool: "blade" },
  artisan: { accent: 0x6f5f48, accentDark: 0x463c2f, glow: 0xd6b58a, hair: 0x2f2a24, skin: 0xe0ad81, tool: "shield" },
  enchanter: { accent: 0x6f63c7, accentDark: 0x493a91, glow: 0xc2b6ff, hair: 0x4b423e, skin: 0xd7a17a, tool: "staff" },
  tactician: { accent: 0x2f6f9f, accentDark: 0x1f4f73, glow: 0x8ec7ee, hair: 0x352b25, skin: 0xd39b72, tool: "banner" },
};

const enhancementStyle: Record<EnhancementId, CharacterStyle> = {
  strike: { ...professionStyle.warden, tool: "blade" },
  guard: { ...professionStyle.artisan, tool: "shield" },
  route: professionStyle.pathfinder,
  spark: professionStyle.enchanter,
  workbench: professionStyle.miner,
  banner: professionStyle.tactician,
};

export function getWeaponStageLabel(level: number) {
  return visualStageLabels[getVisualTier(level)];
}

export function ProfessionAvatar3D({ professionId, selected = false, weaponLevel = 0 }: ProfessionAvatar3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const style = professionStyle[professionId];
    const tier = getVisualTier(weaponLevel);
    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 1.22, 5.35);
    camera.lookAt(0, 1.02, 0);

    const renderer = createRenderer(canvas);
    const root = new THREE.Group();
    root.rotation.y = -0.18;
    scene.add(root);

    addLights(scene, style, selected, tier);
    createCharacter(root, style, selected, tier);

    const resize = () => resizeRenderer(canvas, renderer, camera);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let frame = 0;
    let animationId = 0;

    const animate = () => {
      frame += 0.016;
      root.rotation.y = -0.18 + Math.sin(frame * 0.75) * 0.16;
      root.position.y = Math.sin(frame * 1.35) * 0.035;
      renderer.render(scene, camera);
      animationId = window.requestAnimationFrame(animate);
    };

    animate();

    return () => cleanupScene(animationId, observer, renderer, scene);
  }, [professionId, selected, weaponLevel]);

  return (
    <span className="profession-avatar-3d" aria-hidden="true">
      <canvas ref={canvasRef} />
    </span>
  );
}

export function WeaponPreview3D({ enhancementId, level = 0 }: WeaponPreview3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const style = enhancementStyle[enhancementId];
    const tier = getVisualTier(level);
    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0.58, 3.8);
    camera.lookAt(0, 0.35, 0);

    const renderer = createRenderer(canvas);
    const root = new THREE.Group();
    scene.add(root);

    addLights(scene, style, true, tier);
    addPreviewBase(root, style, tier);
    addWeaponModel(root, style.tool, createMaterials(style, true, tier), style, tier, true);

    const resize = () => resizeRenderer(canvas, renderer, camera);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let frame = 0;
    let animationId = 0;

    const animate = () => {
      frame += 0.016;
      root.rotation.y = Math.sin(frame * 0.7) * 0.22;
      root.position.y = Math.sin(frame * 1.2) * 0.025;
      renderer.render(scene, camera);
      animationId = window.requestAnimationFrame(animate);
    };

    animate();

    return () => cleanupScene(animationId, observer, renderer, scene);
  }, [enhancementId, level]);

  return (
    <span className="weapon-preview-3d" aria-hidden="true">
      <canvas ref={canvasRef} />
    </span>
  );
}

function createRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, canvas, preserveDrawingBuffer: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

function resizeRenderer(canvas: HTMLCanvasElement, renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function addLights(scene: THREE.Scene, style: CharacterStyle, selected: boolean, tier: number) {
  const ambient = new THREE.HemisphereLight(0xffffff, 0xb5c2bd, 2.4);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
  keyLight.position.set(3.2, 4.7, 4.2);
  keyLight.castShadow = true;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xdff7ff, 1.1);
  fillLight.position.set(-3.5, 2.4, 2.2);
  scene.add(fillLight);

  const rimLight = new THREE.PointLight(style.glow, (selected ? 4.8 : 3.2) + tier * 0.55, 7);
  rimLight.position.set(-2.3, 2.2, 2.6);
  scene.add(rimLight);
}

function createCharacter(root: THREE.Group, style: CharacterStyle, selected: boolean, tier: number) {
  const materials = createMaterials(style, selected, tier);

  addGlowBase(root, style, selected, tier, materials.glow);
  addBody(root, materials);
  addHead(root, materials);
  addArms(root, style.tool, materials, tier);
  addLegs(root, materials);
  addWeaponModel(root, style.tool, materials, style, tier, false);
}

function createMaterials(style: CharacterStyle, selected: boolean, tier: number) {
  const glowBoost = selected ? 0.16 : 0.08;
  return {
    navy: new THREE.MeshStandardMaterial({ color: 0x17352f, metalness: 0.12, roughness: 0.5 }),
    navyDark: new THREE.MeshStandardMaterial({ color: 0x0f2521, metalness: 0.16, roughness: 0.5 }),
    shirt: new THREE.MeshStandardMaterial({ color: 0xf7f6ef, metalness: 0.02, roughness: 0.66 }),
    skin: new THREE.MeshStandardMaterial({ color: style.skin, metalness: 0.02, roughness: 0.68 }),
    hair: new THREE.MeshStandardMaterial({ color: style.hair, metalness: 0.03, roughness: 0.76 }),
    accent: new THREE.MeshStandardMaterial({
      color: style.accent,
      emissive: style.accent,
      emissiveIntensity: glowBoost + tier * 0.05,
      metalness: 0.2 + tier * 0.04,
      roughness: 0.44,
    }),
    accentDark: new THREE.MeshStandardMaterial({ color: style.accentDark, metalness: 0.18, roughness: 0.48 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2b3130, metalness: 0.18, roughness: 0.52 }),
    metal: new THREE.MeshStandardMaterial({ color: 0xc7d0cc, metalness: 0.58 + tier * 0.05, roughness: 0.28 }),
    boot: new THREE.MeshStandardMaterial({ color: 0x1d2322, metalness: 0.12, roughness: 0.56 }),
    glow: new THREE.MeshStandardMaterial({
      color: style.glow,
      transparent: true,
      opacity: Math.min(0.74, (selected ? 0.5 : 0.33) + tier * 0.07),
      emissive: style.glow,
      emissiveIntensity: (selected ? 0.95 : 0.55) + tier * 0.2,
      roughness: 0.32,
    }),
    eye: new THREE.MeshBasicMaterial({ color: 0x17201f }),
    badge: new THREE.MeshBasicMaterial({ map: createBadgeTexture(), transparent: true }),
  };
}

function addBody(root: THREE.Group, materials: ReturnType<typeof createMaterials>) {
  addMesh(root, new THREE.CapsuleGeometry(0.42, 0.94, 6, 14), materials.navy, [0, 0.77, 0], [0.03, 0, 0]);
  addMesh(root, new THREE.BoxGeometry(0.58, 0.92, 0.09), materials.shirt, [0, 0.78, 0.47], [0, 0, 0]);
  addMesh(root, new THREE.BoxGeometry(0.18, 0.72, 0.11), materials.accent, [0, 0.76, 0.535], [0, 0, 0]);
  addMesh(root, new THREE.BoxGeometry(0.82, 0.14, 0.13), materials.accentDark, [0, 1.43, 0.12], [0, 0, 0]);
  addMesh(root, new THREE.BoxGeometry(0.86, 0.12, 0.16), materials.navyDark, [0, 0.18, 0.04], [0, 0, 0]);

  const leftLapels = addMesh(root, new THREE.BoxGeometry(0.2, 0.78, 0.08), materials.navyDark, [-0.21, 0.82, 0.545], [0, 0, -0.1]);
  leftLapels.scale.set(0.82, 1, 1);
  const rightLapels = addMesh(root, new THREE.BoxGeometry(0.2, 0.78, 0.08), materials.navyDark, [0.21, 0.82, 0.545], [0, 0, 0.1]);
  rightLapels.scale.set(0.82, 1, 1);

  const badge = addMesh(root, new THREE.PlaneGeometry(0.66, 0.23), materials.badge, [0, 0.96, 0.595], [0, 0, 0]);
  badge.renderOrder = 3;
  addMesh(root, new THREE.BoxGeometry(0.78, 0.08, 0.1), materials.accent, [0, 1.22, 0.55], [0, 0, 0]);
}

function addHead(root: THREE.Group, materials: ReturnType<typeof createMaterials>) {
  addMesh(root, new THREE.SphereGeometry(0.36, 24, 16), materials.skin, [0, 1.66, 0.03], [0, 0, 0]);
  addMesh(root, new THREE.SphereGeometry(0.37, 24, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), materials.hair, [0, 1.83, 0.02], [0, 0, 0]);
  addMesh(root, new THREE.BoxGeometry(0.58, 0.08, 0.12), materials.accent, [0, 1.96, 0.06], [0, 0, 0]);
  addMesh(root, new THREE.SphereGeometry(0.035, 10, 8), materials.eye, [-0.12, 1.68, 0.36], [0, 0, 0]);
  addMesh(root, new THREE.SphereGeometry(0.035, 10, 8), materials.eye, [0.12, 1.68, 0.36], [0, 0, 0]);
  addMesh(root, new THREE.BoxGeometry(0.12, 0.025, 0.025), materials.eye, [0, 1.56, 0.38], [0, 0, 0]);
}

function addArms(root: THREE.Group, tool: ToolId, materials: ReturnType<typeof createMaterials>, tier: number) {
  const leftRotation = tool === "shield" || tool === "blade" ? -0.42 - tier * 0.02 : -0.22;
  const rightRotation = tool === "staff" || tool === "banner" || tool === "pickaxe" ? 0.34 + tier * 0.02 : 0.22;
  addArm(root, -0.55, 0.93, leftRotation, materials.navy, materials.skin, materials.accent);
  addArm(root, 0.55, 0.93, rightRotation, materials.navy, materials.skin, materials.accent);
}

function addArm(
  root: THREE.Group,
  x: number,
  y: number,
  rotationZ: number,
  sleeve: THREE.Material,
  hand: THREE.Material,
  cuff: THREE.Material,
) {
  addMesh(root, new THREE.SphereGeometry(0.16, 12, 8), sleeve, [x * 0.92, y + 0.34, 0.02], [0, 0, 0]);
  addMesh(root, new THREE.CapsuleGeometry(0.085, 0.6, 5, 10), sleeve, [x, y, 0.08], [0.08, 0, rotationZ]);
  addMesh(root, new THREE.CylinderGeometry(0.088, 0.088, 0.08, 10), cuff, [x + Math.sin(rotationZ) * 0.22, y - 0.24, 0.1], [0.1, 0, rotationZ]);
  addMesh(root, new THREE.SphereGeometry(0.115, 14, 10), hand, [x + Math.sin(rotationZ) * 0.34, y - 0.36, 0.12], [0, 0, 0]);
}

function addLegs(root: THREE.Group, materials: ReturnType<typeof createMaterials>) {
  addLeg(root, -0.2, materials.navyDark, materials.boot);
  addLeg(root, 0.2, materials.navyDark, materials.boot);
}

function addLeg(root: THREE.Group, x: number, pant: THREE.Material, boot: THREE.Material) {
  addMesh(root, new THREE.CapsuleGeometry(0.105, 0.62, 5, 9), pant, [x, -0.22, 0], [0.02, 0, 0]);
  addMesh(root, new THREE.BoxGeometry(0.34, 0.13, 0.42), boot, [x + 0.015, -0.66, 0.1], [0, 0, 0]);
}

function addGlowBase(root: THREE.Group, style: CharacterStyle, selected: boolean, tier: number, material: THREE.Material) {
  addMesh(root, new THREE.CircleGeometry(selected ? 1.22 : 1.08, 48), material, [0, -0.72, -0.25], [-Math.PI / 2, 0, 0], [1, 0.7, 1]);
  addMesh(
    root,
    new THREE.TorusGeometry(0.72 + tier * 0.03, selected ? 0.022 : 0.016, 8, 48),
    new THREE.MeshStandardMaterial({
      color: style.glow,
      emissive: style.glow,
      emissiveIntensity: (selected ? 0.7 : 0.42) + tier * 0.12,
      metalness: 0.2,
      roughness: 0.34,
    }),
    [0, -0.7, -0.23],
    [-Math.PI / 2, 0, 0],
  );

  if (tier >= 3) {
    addMesh(root, new THREE.TorusGeometry(0.94, 0.012, 8, 64), material, [0, -0.68, -0.22], [-Math.PI / 2, 0, 0.2]);
  }
}

function addPreviewBase(root: THREE.Group, style: CharacterStyle, tier: number) {
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: style.glow,
    transparent: true,
    opacity: 0.24 + tier * 0.04,
    emissive: style.glow,
    emissiveIntensity: 0.42 + tier * 0.12,
    roughness: 0.28,
  });
  addMesh(root, new THREE.CircleGeometry(0.82, 48), baseMaterial, [0, -0.56, -0.32], [-Math.PI / 2, 0, 0], [1, 0.58, 1]);
  addMesh(root, new THREE.TorusGeometry(0.58 + tier * 0.04, 0.012 + tier * 0.002, 8, 48), baseMaterial, [0, -0.55, -0.3], [-Math.PI / 2, 0, 0]);
}

function addWeaponModel(
  root: THREE.Group,
  tool: ToolId,
  materials: ReturnType<typeof createMaterials>,
  style: CharacterStyle,
  tier: number,
  preview: boolean,
) {
  const group = new THREE.Group();
  group.position.set(preview ? 0 : 0, preview ? 0.35 : 0, preview ? 0 : 0);
  group.scale.setScalar(preview ? 1.12 + tier * 0.05 : 1);
  root.add(group);

  if (tool === "blade") {
    addBlade(group, materials, tier, preview);
    return;
  }

  if (tool === "pickaxe") {
    addPickaxe(group, materials, tier, preview);
    return;
  }

  if (tool === "shield") {
    addShield(group, materials, tier, preview);
    return;
  }

  if (tool === "hammer") {
    addHammer(group, materials, tier, preview);
    return;
  }

  if (tool === "staff") {
    addStaff(group, materials, tier, preview);
    return;
  }

  addBanner(group, materials, style, tier, preview);
}

function addBlade(root: THREE.Group, materials: ReturnType<typeof createMaterials>, tier: number, preview: boolean) {
  const x = preview ? 0 : -0.7;
  const y = preview ? 0.38 : 1.1;
  const z = preview ? 0 : 0.4;
  const length = 0.68 + tier * 0.12;

  addMesh(root, new THREE.CapsuleGeometry(0.035, 0.36, 4, 8), materials.dark, [x, y - 0.33, z], [0, 0, preview ? 0 : -0.2]);
  addMesh(root, new THREE.ConeGeometry(0.12 + tier * 0.018, length, 5), materials.metal, [x, y + length * 0.22, z], [0, 0, Math.PI]);
  addMesh(root, new THREE.BoxGeometry(0.32 + tier * 0.05, 0.06, 0.06), materials.accent, [x, y - 0.12, z + 0.02], [0, 0, 0]);
  addMesh(root, new THREE.TorusGeometry(0.16 + tier * 0.025, 0.012, 8, 32), materials.glow, [x, y + 0.18, z + 0.02], [0.4, 0.2, 0.08]);

  if (tier >= 2) {
    addMesh(root, new THREE.ConeGeometry(0.055, 0.34, 4), materials.glow, [x - 0.14, y + 0.14, z], [0, 0, Math.PI]);
    addMesh(root, new THREE.ConeGeometry(0.055, 0.34, 4), materials.glow, [x + 0.14, y + 0.14, z], [0, 0, Math.PI]);
  }
}

function addPickaxe(root: THREE.Group, materials: ReturnType<typeof createMaterials>, tier: number, preview: boolean) {
  if (!preview) {
    addBackpack(root, materials.accentDark, materials.metal);
  }

  const x = preview ? 0 : 0.74;
  const y = preview ? 0.35 : 1.1;
  const z = preview ? 0 : 0.3;
  addMesh(root, new THREE.CapsuleGeometry(0.032, 1.02 + tier * 0.1, 4, 8), materials.dark, [x, y, z], [0.62, 0.16, 0.08]);
  addMesh(root, new THREE.BoxGeometry(0.7 + tier * 0.09, 0.09 + tier * 0.01, 0.08), materials.metal, [x - 0.08, y + 0.44, z + 0.04], [0.02, 0.12, -0.32]);
  addMesh(root, new THREE.ConeGeometry(0.12 + tier * 0.016, 0.28 + tier * 0.05, 4), materials.metal, [x - 0.45, y + 0.42, z + 0.04], [0, 0, Math.PI / 2]);
  addMesh(root, new THREE.ConeGeometry(0.12 + tier * 0.016, 0.28 + tier * 0.05, 4), materials.metal, [x + 0.31, y + 0.39, z + 0.02], [0, 0, -Math.PI / 2]);

  if (tier >= 1) {
    addMesh(root, new THREE.OctahedronGeometry(0.1 + tier * 0.025), materials.glow, [x - 0.1, y + 0.53, z + 0.08], [0.2, 0.2, 0.4]);
  }

  if (tier >= 3) {
    addMesh(root, new THREE.TorusGeometry(0.36, 0.013, 8, 36), materials.glow, [x - 0.06, y + 0.43, z + 0.04], [0.3, 0.1, -0.32]);
  }
}

function addShield(root: THREE.Group, materials: ReturnType<typeof createMaterials>, tier: number, preview: boolean) {
  const x = preview ? 0 : -0.72;
  const y = preview ? 0.35 : 1.02;
  const z = preview ? 0 : 0.45;
  const radius = 0.36 + tier * 0.035;

  addMesh(root, new THREE.CylinderGeometry(radius * 0.8, radius, 0.09, 7), materials.accent, [x, y, z], [Math.PI / 2, 0.18, 0]);
  addMesh(root, new THREE.CylinderGeometry(radius * 0.52, radius * 0.6, 0.1, 7), materials.metal, [x, y, z + 0.06], [Math.PI / 2, 0.18, 0]);
  addMesh(root, new THREE.BoxGeometry(0.1, radius * 1.45, 0.08), materials.accentDark, [x, y, z + 0.12], [0, 0, 0]);

  if (tier >= 1) {
    addMesh(root, new THREE.TorusGeometry(radius * 0.95, 0.012 + tier * 0.002, 8, 42), materials.glow, [x, y, z + 0.14], [Math.PI / 2, 0.18, 0]);
  }

  if (tier >= 3) {
    for (const offset of [-0.28, 0.28]) {
      addMesh(root, new THREE.ConeGeometry(0.06, 0.22, 4), materials.metal, [x + offset, y + 0.1, z + 0.16], [Math.PI / 2, 0, 0]);
    }
  }

  if (!preview) {
    addMesh(root, new THREE.CapsuleGeometry(0.025, 0.92, 4, 8), materials.metal, [0.72, 1.1, 0.34], [0.28, 0, -0.14]);
  }
}

function addHammer(root: THREE.Group, materials: ReturnType<typeof createMaterials>, tier: number, preview: boolean) {
  if (!preview) {
    addToolBelt(root, materials);
  }

  const x = preview ? 0 : 0.72;
  const y = preview ? 0.3 : 0.98;
  const z = preview ? 0 : 0.36;
  addMesh(root, new THREE.CapsuleGeometry(0.034, 0.76 + tier * 0.08, 4, 8), materials.dark, [x, y, z], [0.34, 0, -0.24]);
  addMesh(root, new THREE.BoxGeometry(0.48 + tier * 0.08, 0.2 + tier * 0.02, 0.18), materials.metal, [x + 0.09, y + 0.34, z - 0.01], [0.08, 0.18, -0.22]);
  addMesh(root, new THREE.BoxGeometry(0.22, 0.16, 0.2), materials.accent, [x + 0.09, y + 0.34, z + 0.1], [0.08, 0.18, -0.22]);

  if (tier >= 2) {
    addMesh(root, new THREE.TorusGeometry(0.26, 0.014, 8, 32), materials.glow, [x + 0.09, y + 0.34, z + 0.12], [0.6, 0.15, -0.2]);
  }

  if (!preview) {
    addMesh(root, new THREE.CapsuleGeometry(0.025, 0.48, 4, 8), materials.metal, [-0.68, 1.02, 0.34], [0.2, 0, 0.34]);
  }
}

function addStaff(root: THREE.Group, materials: ReturnType<typeof createMaterials>, tier: number, preview: boolean) {
  const x = preview ? 0 : 0.78;
  const y = preview ? 0.34 : 1.13;
  const z = preview ? 0 : 0.32;
  addMesh(root, new THREE.CapsuleGeometry(0.03, 1.28 + tier * 0.12, 4, 10), materials.dark, [x, y, z], [0.2, 0, -0.18]);
  addMesh(root, new THREE.SphereGeometry(0.17 + tier * 0.025, 22, 14), materials.glow, [x + 0.13, y + 0.68, z - 0.09], [0, 0, 0]);
  addMesh(root, new THREE.TorusGeometry(0.24 + tier * 0.035, 0.014, 8, 36), materials.glow, [x + 0.13, y + 0.68, z - 0.09], [0.7, 0.2, 0.1]);

  if (tier >= 2) {
    addMesh(root, new THREE.TorusGeometry(0.34 + tier * 0.025, 0.012, 8, 44), materials.glow, [preview ? 0 : 0, preview ? 0.15 : 1.16, preview ? 0 : 0.56], [0.1, 0.1, 0]);
  }
}

function addBanner(
  root: THREE.Group,
  materials: ReturnType<typeof createMaterials>,
  style: CharacterStyle,
  tier: number,
  preview: boolean,
) {
  const x = preview ? 0 : 0.76;
  const y = preview ? 0.26 : 1.18;
  const z = preview ? 0 : 0.32;
  addMesh(root, new THREE.CapsuleGeometry(0.027, 1.16 + tier * 0.12, 4, 8), materials.dark, [x, y, z], [0.17, 0, -0.07]);
  addMesh(root, new THREE.BoxGeometry(0.52 + tier * 0.08, 0.38 + tier * 0.04, 0.04), materials.accent, [x + 0.24, y + 0.55, z - 0.05], [0, -0.08, 0]);
  addMesh(root, new THREE.BoxGeometry(0.4 + tier * 0.05, 0.09, 0.05), materials.shirt, [x + 0.24, y + 0.65, z - 0.02], [0, -0.08, 0]);

  if (tier >= 2) {
    addMesh(root, new THREE.BoxGeometry(0.42, 0.28, 0.05), materials.glow, [preview ? -0.28 : -0.66, y - 0.08, z + 0.1], [0.08, 0.24, -0.12]);
    addMesh(root, new THREE.BoxGeometry(0.32, 0.035, 0.055), new THREE.MeshStandardMaterial({ color: style.accentDark }), [preview ? -0.28 : -0.66, y + 0.01, z + 0.13], [0.08, 0.24, -0.12]);
  }
}

function addBackpack(root: THREE.Group, material: THREE.Material, strap: THREE.Material) {
  addMesh(root, new THREE.BoxGeometry(0.45, 0.62, 0.24), material, [0, 0.78, -0.34], [0.04, 0, 0]);
  addMesh(root, new THREE.BoxGeometry(0.08, 0.72, 0.08), strap, [-0.27, 0.82, 0.42], [0, 0, -0.08]);
  addMesh(root, new THREE.BoxGeometry(0.08, 0.72, 0.08), strap, [0.27, 0.82, 0.42], [0, 0, 0.08]);
}

function addToolBelt(root: THREE.Group, materials: ReturnType<typeof createMaterials>) {
  addMesh(root, new THREE.BoxGeometry(0.78, 0.09, 0.12), materials.accentDark, [0, 0.35, 0.48], [0, 0, 0]);
  addMesh(root, new THREE.BoxGeometry(0.16, 0.18, 0.08), materials.metal, [-0.28, 0.28, 0.54], [0, 0, 0]);
  addMesh(root, new THREE.BoxGeometry(0.16, 0.18, 0.08), materials.metal, [0.28, 0.28, 0.54], [0, 0, 0]);
}

function addMesh(
  root: THREE.Group,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number],
  rotation: [number, number, number],
  scale: [number, number, number] = [1, 1, 1],
) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  root.add(mesh);
  return mesh;
}

function getVisualTier(level: number) {
  return Math.max(0, Math.min(4, Math.floor(level)));
}

function createBadgeTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 256;

  const context = canvas.getContext("2d");
  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  context.fillStyle = "#f6f7f1";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#17352f";
  context.lineWidth = 18;
  context.strokeRect(22, 22, canvas.width - 44, canvas.height - 44);
  context.fillStyle = "#17352f";
  context.font = "900 116px Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("ESSEN", canvas.width / 2, canvas.height / 2 + 6);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function cleanupScene(
  animationId: number,
  observer: ResizeObserver,
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
) {
  window.cancelAnimationFrame(animationId);
  observer.disconnect();
  renderer.dispose();

  const disposedMaterials = new Set<THREE.Material>();
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      disposeMaterial(object.material, disposedMaterials);
    }
  });
}

function disposeMaterial(material: THREE.Material | THREE.Material[], disposedMaterials: Set<THREE.Material>) {
  if (Array.isArray(material)) {
    material.forEach((item) => disposeMaterial(item, disposedMaterials));
    return;
  }

  if (disposedMaterials.has(material)) {
    return;
  }

  disposedMaterials.add(material);

  for (const value of Object.values(material)) {
    if (value instanceof THREE.Texture) {
      value.dispose();
    }
  }

  material.dispose();
}
