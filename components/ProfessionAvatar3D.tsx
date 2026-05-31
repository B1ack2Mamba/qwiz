import { useEffect, useRef } from "react";
import * as THREE from "three";
import { ProfessionId } from "../lib/companyGame";

type ProfessionAvatar3DProps = {
  professionId: ProfessionId;
  selected?: boolean;
};

const professionStyle: Record<
  ProfessionId,
  {
    accent: number;
    glow: number;
    tool: "map" | "pickaxe" | "shield" | "hammer" | "staff" | "banner";
  }
> = {
  pathfinder: { accent: 0x2f9d8f, glow: 0x7fd8c5, tool: "map" },
  miner: { accent: 0xb7791f, glow: 0xf2bd5f, tool: "pickaxe" },
  warden: { accent: 0xb94747, glow: 0xf08a8a, tool: "shield" },
  artisan: { accent: 0x6f5f48, glow: 0xd6b58a, tool: "hammer" },
  enchanter: { accent: 0x6f63c7, glow: 0xc2b6ff, tool: "staff" },
  tactician: { accent: 0x2f6f9f, glow: 0x8ec7ee, tool: "banner" },
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

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 1.25, 6.2);
    camera.lookAt(0, 1.15, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, canvas, preserveDrawingBuffer: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const root = new THREE.Group();
    scene.add(root);

    const ambient = new THREE.HemisphereLight(0xffffff, 0xcdd7d2, 2.2);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
    keyLight.position.set(3.2, 4.6, 4.4);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(style.glow, selected ? 4.2 : 2.7, 7);
    rimLight.position.set(-2.4, 2.2, 2.3);
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
      root.rotation.y = Math.sin(frame * 0.85) * 0.18;
      root.position.y = Math.sin(frame * 1.4) * 0.035;
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

function createCharacter(
  root: THREE.Group,
  style: {
    accent: number;
    glow: number;
    tool: "map" | "pickaxe" | "shield" | "hammer" | "staff" | "banner";
  },
  selected: boolean,
) {
  const navy = new THREE.MeshStandardMaterial({ color: 0x17352f, metalness: 0.08, roughness: 0.58 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf6f7f1, metalness: 0.02, roughness: 0.72 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xd8a478, metalness: 0.02, roughness: 0.72 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x2d2724, metalness: 0.02, roughness: 0.78 });
  const accent = new THREE.MeshStandardMaterial({
    color: style.accent,
    emissive: style.accent,
    emissiveIntensity: selected ? 0.12 : 0.05,
    metalness: 0.12,
    roughness: 0.48,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2b3130, metalness: 0.14, roughness: 0.56 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xbfc8c3, metalness: 0.5, roughness: 0.36 });
  const glow = new THREE.MeshStandardMaterial({
    color: style.glow,
    emissive: style.glow,
    emissiveIntensity: selected ? 0.75 : 0.42,
    metalness: 0.1,
    roughness: 0.35,
  });

  addMesh(root, new THREE.CylinderGeometry(0.47, 0.58, 1.38, 8), navy, [0, 0.72, 0], [0.04, 0, 0]);
  addMesh(root, new THREE.BoxGeometry(0.54, 0.78, 0.08), white, [0, 0.82, 0.51], [0, 0, 0]);
  addMesh(root, new THREE.BoxGeometry(0.2, 0.58, 0.09), accent, [0, 0.78, 0.57], [0, 0, 0]);
  addMesh(root, new THREE.BoxGeometry(0.64, 0.16, 0.08), accent, [0, 1.42, 0.54], [0, 0, 0]);

  const badgeTexture = createBadgeTexture();
  const badgeMaterial = new THREE.MeshBasicMaterial({ map: badgeTexture, transparent: true });
  const badge = addMesh(root, new THREE.PlaneGeometry(0.58, 0.19), badgeMaterial, [0, 0.86, 0.575], [0, 0, 0]);
  badge.renderOrder = 2;

  addMesh(root, new THREE.SphereGeometry(0.34, 18, 12), skin, [0, 1.66, 0], [0, 0, 0]);
  addMesh(root, new THREE.SphereGeometry(0.36, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.46), hair, [0, 1.81, 0], [0, 0, 0]);
  addMesh(root, new THREE.BoxGeometry(0.5, 0.09, 0.12), accent, [0, 1.97, 0.04], [0, 0, 0]);

  addArm(root, -0.56, 0.84, selected ? -0.36 : -0.2, navy, skin);
  addArm(root, 0.56, 0.84, selected ? 0.34 : 0.18, navy, skin);
  addLeg(root, -0.22, navy);
  addLeg(root, 0.22, navy);

  addMesh(root, new THREE.CircleGeometry(1.08, 36), glow, [0, 0.07, -0.34], [-Math.PI / 2, 0, 0], [1.0, 0.58, 1.0]);

  if (style.tool === "map") {
    addMesh(root, new THREE.BoxGeometry(0.42, 0.3, 0.04), accent, [-0.72, 1.1, 0.38], [0.1, -0.26, 0.2]);
    addMesh(root, new THREE.BoxGeometry(0.34, 0.22, 0.046), white, [-0.72, 1.1, 0.41], [0.1, -0.26, 0.2]);
  }

  if (style.tool === "pickaxe") {
    addMesh(root, new THREE.CylinderGeometry(0.035, 0.035, 0.94, 8), dark, [0.78, 1.1, 0.28], [0.55, 0.16, 0.08]);
    addMesh(root, new THREE.BoxGeometry(0.62, 0.08, 0.08), metal, [0.7, 1.5, 0.31], [0.02, 0.12, -0.3]);
  }

  if (style.tool === "shield") {
    addMesh(root, new THREE.CylinderGeometry(0.3, 0.36, 0.08, 6), accent, [-0.72, 0.98, 0.43], [Math.PI / 2, 0.2, 0]);
    addMesh(root, new THREE.CylinderGeometry(0.19, 0.21, 0.09, 6), metal, [-0.72, 0.98, 0.48], [Math.PI / 2, 0.2, 0]);
  }

  if (style.tool === "hammer") {
    addMesh(root, new THREE.CylinderGeometry(0.035, 0.035, 0.74, 8), dark, [0.72, 0.98, 0.36], [0.32, 0, -0.24]);
    addMesh(root, new THREE.BoxGeometry(0.4, 0.18, 0.16), metal, [0.79, 1.3, 0.34], [0.1, 0.18, -0.2]);
  }

  if (style.tool === "staff") {
    addMesh(root, new THREE.CylinderGeometry(0.03, 0.03, 1.36, 8), dark, [0.78, 1.12, 0.32], [0.2, 0, -0.18]);
    addMesh(root, new THREE.SphereGeometry(0.16, 18, 12), glow, [0.9, 1.78, 0.25], [0, 0, 0]);
  }

  if (style.tool === "banner") {
    addMesh(root, new THREE.CylinderGeometry(0.026, 0.026, 1.32, 8), dark, [0.76, 1.16, 0.32], [0.18, 0, -0.08]);
    addMesh(root, new THREE.BoxGeometry(0.44, 0.34, 0.035), accent, [0.98, 1.64, 0.26], [0, -0.08, 0]);
  }
}

function addArm(
  root: THREE.Group,
  x: number,
  y: number,
  rotationZ: number,
  sleeve: THREE.Material,
  hand: THREE.Material,
) {
  addMesh(root, new THREE.CylinderGeometry(0.095, 0.105, 0.82, 8), sleeve, [x, y, 0.02], [0.08, 0, rotationZ]);
  addMesh(root, new THREE.SphereGeometry(0.11, 12, 8), hand, [x + Math.sin(rotationZ) * 0.31, y - 0.38, 0.06], [0, 0, 0]);
}

function addLeg(root: THREE.Group, x: number, material: THREE.Material) {
  addMesh(root, new THREE.CylinderGeometry(0.13, 0.12, 0.88, 8), material, [x, -0.22, 0], [0.02, 0, 0]);
  addMesh(root, new THREE.BoxGeometry(0.32, 0.12, 0.42), material, [x, -0.72, 0.08], [0, 0, 0]);
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
  canvas.width = 512;
  canvas.height = 176;

  const context = canvas.getContext("2d");
  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  context.fillStyle = "#f6f7f1";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#17352f";
  context.lineWidth = 14;
  context.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);
  context.fillStyle = "#17352f";
  context.font = "900 76px Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("ESSEN", canvas.width / 2, canvas.height / 2 + 4);

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
