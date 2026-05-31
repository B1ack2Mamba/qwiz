import { useEffect, useRef } from "react";
import * as THREE from "three";
import { ProfessionId } from "../lib/companyGame";

type ToolId = "map" | "pickaxe" | "shield" | "hammer" | "staff" | "banner";

type ProfessionAvatar3DProps = {
  professionId: ProfessionId;
  selected?: boolean;
};

type CharacterStyle = {
  accent: number;
  accentDark: number;
  glow: number;
  hair: number;
  skin: number;
  tool: ToolId;
};

const professionStyle: Record<ProfessionId, CharacterStyle> = {
  pathfinder: { accent: 0x1e9f91, accentDark: 0x126a61, glow: 0x7fd8c5, hair: 0x3a2a20, skin: 0xd9a77d, tool: "map" },
  miner: { accent: 0xb7791f, accentDark: 0x7b4d14, glow: 0xf2bd5f, hair: 0x49392e, skin: 0xc98f67, tool: "pickaxe" },
  warden: { accent: 0xb94747, accentDark: 0x7d2c2c, glow: 0xf08a8a, hair: 0x2b2724, skin: 0xd6a06f, tool: "shield" },
  artisan: { accent: 0x6f5f48, accentDark: 0x463c2f, glow: 0xd6b58a, hair: 0x2f2a24, skin: 0xe0ad81, tool: "hammer" },
  enchanter: { accent: 0x6f63c7, accentDark: 0x493a91, glow: 0xc2b6ff, hair: 0x4b423e, skin: 0xd7a17a, tool: "staff" },
  tactician: { accent: 0x2f6f9f, accentDark: 0x1f4f73, glow: 0x8ec7ee, hair: 0x352b25, skin: 0xd39b72, tool: "banner" },
};

export function ProfessionAvatar3D({ professionId, selected = false }: ProfessionAvatar3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const style = professionStyle[professionId];
    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 1.22, 5.35);
    camera.lookAt(0, 1.02, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, canvas, preserveDrawingBuffer: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const root = new THREE.Group();
    root.rotation.y = -0.18;
    scene.add(root);

    const ambient = new THREE.HemisphereLight(0xffffff, 0xb5c2bd, 2.4);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(3.2, 4.7, 4.2);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xdff7ff, 1.1);
    fillLight.position.set(-3.5, 2.4, 2.2);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(style.glow, selected ? 4.8 : 3.2, 7);
    rimLight.position.set(-2.3, 2.2, 2.6);
    scene.add(rimLight);

    createCharacter(root, style, selected);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

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

    return () => {
      window.cancelAnimationFrame(animationId);
      observer.disconnect();
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          disposeMaterial(object.material);
        }
      });
    };
  }, [professionId, selected]);

  return (
    <span className="profession-avatar-3d" aria-hidden="true">
      <canvas ref={canvasRef} />
    </span>
  );
}

function createCharacter(root: THREE.Group, style: CharacterStyle, selected: boolean) {
  const materials = createMaterials(style, selected);

  addGlowBase(root, style, selected, materials.glow);
  addBody(root, materials);
  addHead(root, materials);
  addArms(root, style.tool, materials);
  addLegs(root, materials);
  addTool(root, style.tool, materials, style);
}

function createMaterials(style: CharacterStyle, selected: boolean) {
  return {
    navy: new THREE.MeshStandardMaterial({ color: 0x17352f, metalness: 0.12, roughness: 0.5 }),
    navyDark: new THREE.MeshStandardMaterial({ color: 0x0f2521, metalness: 0.16, roughness: 0.5 }),
    shirt: new THREE.MeshStandardMaterial({ color: 0xf7f6ef, metalness: 0.02, roughness: 0.66 }),
    skin: new THREE.MeshStandardMaterial({ color: style.skin, metalness: 0.02, roughness: 0.68 }),
    hair: new THREE.MeshStandardMaterial({ color: style.hair, metalness: 0.03, roughness: 0.76 }),
    accent: new THREE.MeshStandardMaterial({
      color: style.accent,
      emissive: style.accent,
      emissiveIntensity: selected ? 0.14 : 0.06,
      metalness: 0.18,
      roughness: 0.44,
    }),
    accentDark: new THREE.MeshStandardMaterial({ color: style.accentDark, metalness: 0.18, roughness: 0.48 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2b3130, metalness: 0.18, roughness: 0.52 }),
    metal: new THREE.MeshStandardMaterial({ color: 0xc7d0cc, metalness: 0.58, roughness: 0.28 }),
    boot: new THREE.MeshStandardMaterial({ color: 0x1d2322, metalness: 0.12, roughness: 0.56 }),
    glow: new THREE.MeshStandardMaterial({
      color: style.glow,
      transparent: true,
      opacity: selected ? 0.5 : 0.33,
      emissive: style.glow,
      emissiveIntensity: selected ? 0.95 : 0.55,
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

function addArms(root: THREE.Group, tool: ToolId, materials: ReturnType<typeof createMaterials>) {
  const leftRotation = tool === "shield" || tool === "map" ? -0.42 : -0.22;
  const rightRotation = tool === "staff" || tool === "banner" || tool === "pickaxe" ? 0.34 : 0.22;
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

function addGlowBase(root: THREE.Group, style: CharacterStyle, selected: boolean, material: THREE.Material) {
  addMesh(root, new THREE.CircleGeometry(selected ? 1.2 : 1.08, 48), material, [0, -0.72, -0.25], [-Math.PI / 2, 0, 0], [1, 0.7, 1]);
  addMesh(
    root,
    new THREE.TorusGeometry(0.72, selected ? 0.022 : 0.016, 8, 48),
    new THREE.MeshStandardMaterial({
      color: style.glow,
      emissive: style.glow,
      emissiveIntensity: selected ? 0.7 : 0.42,
      metalness: 0.2,
      roughness: 0.34,
    }),
    [0, -0.7, -0.23],
    [-Math.PI / 2, 0, 0],
  );
}

function addTool(
  root: THREE.Group,
  tool: ToolId,
  materials: ReturnType<typeof createMaterials>,
  style: CharacterStyle,
) {
  if (tool === "map") {
    const mapGroup = new THREE.Group();
    mapGroup.position.set(-0.67, 1.12, 0.42);
    mapGroup.rotation.set(0.18, -0.34, 0.14);
    root.add(mapGroup);
    addMesh(mapGroup, new THREE.BoxGeometry(0.5, 0.38, 0.035), materials.shirt, [0, 0, 0], [0, 0, 0]);
    addMesh(mapGroup, new THREE.BoxGeometry(0.14, 0.34, 0.04), materials.accent, [-0.17, 0, 0.024], [0, 0, 0]);
    addMesh(mapGroup, new THREE.BoxGeometry(0.1, 0.28, 0.045), materials.glow, [0.14, -0.01, 0.028], [0, 0, 0]);
    addMesh(root, new THREE.TorusGeometry(0.12, 0.015, 8, 24), materials.metal, [-0.34, 1.33, 0.5], [0.7, 0.2, 0.4]);
    return;
  }

  if (tool === "pickaxe") {
    addBackpack(root, materials.accentDark, materials.metal);
    addMesh(root, new THREE.CapsuleGeometry(0.03, 1.1, 4, 8), materials.dark, [0.74, 1.1, 0.3], [0.62, 0.16, 0.08]);
    addMesh(root, new THREE.BoxGeometry(0.72, 0.09, 0.08), materials.metal, [0.66, 1.54, 0.34], [0.02, 0.12, -0.32]);
    addMesh(root, new THREE.ConeGeometry(0.12, 0.28, 4), materials.metal, [0.29, 1.52, 0.35], [0, 0, Math.PI / 2]);
    addMesh(root, new THREE.ConeGeometry(0.12, 0.28, 4), materials.metal, [1.04, 1.49, 0.32], [0, 0, -Math.PI / 2]);
    return;
  }

  if (tool === "shield") {
    addMesh(root, new THREE.CylinderGeometry(0.34, 0.42, 0.09, 7), materials.accent, [-0.72, 1.02, 0.45], [Math.PI / 2, 0.18, 0]);
    addMesh(root, new THREE.CylinderGeometry(0.22, 0.25, 0.1, 7), materials.metal, [-0.72, 1.02, 0.51], [Math.PI / 2, 0.18, 0]);
    addMesh(root, new THREE.BoxGeometry(0.1, 0.55, 0.08), materials.accentDark, [-0.72, 1.02, 0.57], [0, 0, 0]);
    addMesh(root, new THREE.CapsuleGeometry(0.025, 0.92, 4, 8), materials.metal, [0.72, 1.1, 0.34], [0.28, 0, -0.14]);
    return;
  }

  if (tool === "hammer") {
    addToolBelt(root, materials);
    addMesh(root, new THREE.CapsuleGeometry(0.034, 0.78, 4, 8), materials.dark, [0.72, 0.98, 0.36], [0.34, 0, -0.24]);
    addMesh(root, new THREE.BoxGeometry(0.48, 0.2, 0.18), materials.metal, [0.81, 1.32, 0.35], [0.08, 0.18, -0.22]);
    addMesh(root, new THREE.CapsuleGeometry(0.025, 0.48, 4, 8), materials.metal, [-0.68, 1.02, 0.34], [0.2, 0, 0.34]);
    return;
  }

  if (tool === "staff") {
    addMesh(root, new THREE.CapsuleGeometry(0.03, 1.45, 4, 10), materials.dark, [0.78, 1.13, 0.32], [0.2, 0, -0.18]);
    addMesh(root, new THREE.SphereGeometry(0.17, 20, 14), materials.glow, [0.91, 1.82, 0.23], [0, 0, 0]);
    addMesh(root, new THREE.TorusGeometry(0.24, 0.014, 8, 32), materials.glow, [0.91, 1.82, 0.23], [0.7, 0.2, 0.1]);
    addMesh(root, new THREE.TorusGeometry(0.34, 0.012, 8, 40), materials.glow, [0, 1.16, 0.56], [0.1, 0.1, 0]);
    return;
  }

  addMesh(root, new THREE.CapsuleGeometry(0.027, 1.34, 4, 8), materials.dark, [0.76, 1.18, 0.32], [0.17, 0, -0.07]);
  addMesh(root, new THREE.BoxGeometry(0.52, 0.38, 0.04), materials.accent, [1.0, 1.72, 0.27], [0, -0.08, 0]);
  addMesh(root, new THREE.BoxGeometry(0.4, 0.09, 0.05), materials.shirt, [1.0, 1.82, 0.3], [0, -0.08, 0]);
  addMesh(root, new THREE.BoxGeometry(0.42, 0.28, 0.05), materials.glow, [-0.66, 1.1, 0.42], [0.08, 0.24, -0.12]);
  addMesh(root, new THREE.BoxGeometry(0.32, 0.035, 0.055), new THREE.MeshStandardMaterial({ color: style.accentDark }), [-0.66, 1.19, 0.45], [0.08, 0.24, -0.12]);
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

function disposeMaterial(material: THREE.Material | THREE.Material[]) {
  if (Array.isArray(material)) {
    material.forEach(disposeMaterial);
    return;
  }

  for (const value of Object.values(material)) {
    if (value instanceof THREE.Texture) {
      value.dispose();
    }
  }

  material.dispose();
}
