import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
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

type CharacterModelConfig = {
  height: number;
  src: string;
};

type CharacterModelManifest = {
  characters?: Partial<Record<ProfessionId, string | true>>;
};

export const professionWeaponEnhancement: Record<ProfessionId, EnhancementId> = {
  pathfinder: "route",
  miner: "workbench",
  warden: "strike",
  artisan: "guard",
  enchanter: "spark",
  tactician: "banner",
};

export function hasRiggedProfessionAvatar3D(professionId: ProfessionId) {
  return professionId === "pathfinder" || professionId === "warden";
}

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

const characterModelConfig: Partial<Record<ProfessionId, CharacterModelConfig>> = {
  pathfinder: { height: 2.42, src: "/models/characters/pathfinder/character.glb" },
  warden: { height: 2.42, src: "/models/characters/warden/character.glb" },
};

const characterModelManifestSrc = "/models/characters/manifest.json";

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

    let fallbackRoot: THREE.Group | null = new THREE.Group();
    root.add(fallbackRoot);
    let characterAnimation: CharacterAnimationController | null = createCharacter(fallbackRoot, professionId, style, selected, tier);
    let disposed = false;

    loadGlbCharacter(professionId, style, selected, tier).then((loadedCharacter) => {
      if (!loadedCharacter) {
        return;
      }

      if (disposed) {
        disposeObject3D(loadedCharacter.root);
        return;
      }

      if (fallbackRoot) {
        root.remove(fallbackRoot);
        disposeObject3D(fallbackRoot);
        fallbackRoot = null;
      }

      root.add(loadedCharacter.root);
      characterAnimation = loadedCharacter.controller;
    });

    const resize = () => resizeRenderer(canvas, renderer, camera);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let elapsed = 0;
    let previousTime = performance.now();
    let animationId = 0;

    const animate = () => {
      const time = performance.now();
      const delta = Math.min((time - previousTime) / 1000, 0.04);
      previousTime = time;
      elapsed += delta;

      if (!prefersReducedMotion) {
        characterAnimation?.update(delta, elapsed);
        root.rotation.y = -0.18 + Math.sin(elapsed * 0.75) * 0.16;
        root.position.y = Math.sin(elapsed * 1.35) * 0.035;
      }

      renderer.render(scene, camera);
      animationId = window.requestAnimationFrame(animate);
    };

    animate();

    return () => {
      disposed = true;
      cleanupScene(animationId, observer, renderer, scene);
    };
  }, [professionId, selected, weaponLevel]);

  return (
    <span className={`profession-avatar-3d is-${professionId}${selected ? " is-selected" : ""}`} aria-hidden="true">
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
  renderer.shadowMap.type = THREE.PCFShadowMap;
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

let characterModelManifest: Promise<CharacterModelManifest> | null = null;

async function loadGlbCharacter(
  professionId: ProfessionId,
  style: CharacterStyle,
  selected: boolean,
  tier: number,
): Promise<{ controller: CharacterAnimationController; root: THREE.Group } | null> {
  const config = await getAvailableGlbConfig(professionId);

  if (!config) {
    return null;
  }

  return new Promise((resolve) => {
    new GLTFLoader().load(
      config.src,
      (gltf) => {
        const root = new THREE.Group();
        const materials = createMaterials(style, selected, tier);
        addGlowBase(root, style, selected, tier, materials.glow);

        const model = gltf.scene;
        model.name = `${professionId}_glb_model`;
        configureGlbScene(model, tier);
        normalizeGlbModel(model, config.height);
        root.add(model);

        resolve({
          controller: createGlbAnimationController(model, gltf.animations, selected, tier),
          root,
        });
      },
      undefined,
      () => resolve(null),
    );
  });
}

async function getAvailableGlbConfig(professionId: ProfessionId) {
  const config = characterModelConfig[professionId];

  if (!config) {
    return null;
  }

  const manifest = await loadCharacterModelManifest();
  const manifestEntry = manifest.characters?.[professionId];

  if (!manifestEntry) {
    return null;
  }

  return {
    ...config,
    src: manifestEntry === true ? config.src : manifestEntry,
  };
}

function loadCharacterModelManifest() {
  if (!characterModelManifest) {
    characterModelManifest = fetch(characterModelManifestSrc)
      .then((response) => (response.ok ? response.json() : {}))
      .catch(() => ({}));
  }

  return characterModelManifest;
}

function configureGlbScene(model: THREE.Object3D, tier: number) {
  model.traverse((object) => {
    const stageIndex = getStageIndexFromName(object.name);

    if (stageIndex !== null) {
      object.visible = stageIndex === tier;
    }

    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
}

function normalizeGlbModel(model: THREE.Object3D, targetHeight: number) {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());

  if (size.y <= 0) {
    return;
  }

  model.scale.multiplyScalar(targetHeight / size.y);
  model.updateMatrixWorld(true);

  const scaledBox = new THREE.Box3().setFromObject(model);
  const center = scaledBox.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.y += -0.72 - scaledBox.min.y;
  model.position.z -= center.z;
}

function createGlbAnimationController(
  model: THREE.Object3D,
  clips: THREE.AnimationClip[],
  selected: boolean,
  tier: number,
): CharacterAnimationController {
  const mixer = new THREE.AnimationMixer(model);
  const idleClip = findAnimationClip(clips, ["preview_idle", "idle", "stance", "breath", "loop"]) || clips[0];
  const motionClip = selected
    ? findAnimationClip(clips, ["preview_attack", "attack_primary", "attack_finisher", "combat_idle", "ready"])
    : findAnimationClip(clips, ["preview_walk", "walk", "scout", "patrol"]);
  const stageClip = findAnimationClip(clips, [`stage_${tier}`, `tier_${tier}`, `weapon_${tier}`, `fx_${tier}`]);

  if (idleClip) {
    mixer.clipAction(idleClip).setLoop(THREE.LoopRepeat, Infinity).setEffectiveWeight(1).play();
  }

  if (motionClip && motionClip !== idleClip) {
    mixer
      .clipAction(motionClip)
      .setLoop(THREE.LoopRepeat, Infinity)
      .setEffectiveWeight(selected ? 0.58 : 0.34)
      .play();
  }

  if (stageClip && stageClip !== idleClip) {
    mixer
      .clipAction(stageClip)
      .setLoop(THREE.LoopRepeat, Infinity)
      .setEffectiveWeight(Math.min(0.82, 0.46 + tier * 0.08))
      .play();
  }

  return {
    update(delta) {
      mixer.update(delta);
    },
  };
}

function findAnimationClip(clips: THREE.AnimationClip[], names: string[]) {
  return clips.find((clip) => {
    const clipName = normalizeAssetName(clip.name);
    return names.some((name) => clipName.includes(normalizeAssetName(name)));
  });
}

function getStageIndexFromName(name: string) {
  const match = normalizeAssetName(name).match(/(?:weapon_)?(?:stage|tier)_?([0-4])(?:_|$)/);
  return match ? Number(match[1]) : null;
}

function normalizeAssetName(name: string) {
  return name.toLowerCase().replace(/[\s.-]+/g, "_");
}

type CharacterAnimationController = {
  update: (delta: number, elapsed: number) => void;
};

type RiggedHunterBoneName =
  | "hunter_model"
  | "hunter_pelvis"
  | "hunter_spine"
  | "hunter_chest"
  | "hunter_head"
  | "hunter_cloak"
  | "hunter_left_upper_arm"
  | "hunter_left_lower_arm"
  | "hunter_left_hand"
  | "hunter_right_upper_arm"
  | "hunter_right_lower_arm"
  | "hunter_right_hand"
  | "hunter_left_upper_leg"
  | "hunter_left_lower_leg"
  | "hunter_right_upper_leg"
  | "hunter_right_lower_leg"
  | "hunter_right_blade"
  | "hunter_left_blade";

type RiggedHunterBones = Record<RiggedHunterBoneName, THREE.Group>;

function createCharacter(
  root: THREE.Group,
  professionId: ProfessionId,
  style: CharacterStyle,
  selected: boolean,
  tier: number,
): CharacterAnimationController | null {
  const materials = createMaterials(style, selected, tier);

  addGlowBase(root, style, selected, tier, materials.glow);

  if (hasRiggedProfessionAvatar3D(professionId)) {
    return createRiggedHunterCharacter(root, style, materials, selected, tier, professionId);
  }

  addBody(root, materials);
  addHead(root, materials);
  addArms(root, style.tool, materials, tier);
  addLegs(root, materials);
  addWeaponModel(root, style.tool, materials, style, tier, false);
  return null;
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

function createRiggedHunterCharacter(
  root: THREE.Group,
  style: CharacterStyle,
  materials: ReturnType<typeof createMaterials>,
  selected: boolean,
  tier: number,
  professionId: ProfessionId,
): CharacterAnimationController {
  const bones = createHunterRig(root, style, materials, tier, professionId);
  const mixer = new THREE.AnimationMixer(bones.hunter_model);
  const idleAction = mixer.clipAction(createHunterIdleClip());
  const motionAction = mixer.clipAction(selected ? createHunterStrikeClip() : createHunterScoutClip());
  const gearAction = mixer.clipAction(createHunterGearClip(tier));

  idleAction.setLoop(THREE.LoopRepeat, Infinity).setEffectiveWeight(1).play();
  motionAction
    .setLoop(THREE.LoopRepeat, Infinity)
    .setEffectiveWeight(selected ? 0.78 : 0.42)
    .play();
  gearAction
    .setLoop(THREE.LoopRepeat, Infinity)
    .setEffectiveWeight(Math.min(1, 0.38 + tier * 0.14))
    .play();

  mixer.update(professionId === "warden" ? 0.32 : 0.14);

  return {
    update(delta, elapsed) {
      mixer.update(delta);
      bones.hunter_model.rotation.y = (professionId === "warden" ? 0.08 : -0.05) + Math.sin(elapsed * 0.55) * 0.035;
    },
  };
}

function createHunterRig(
  root: THREE.Group,
  style: CharacterStyle,
  materials: ReturnType<typeof createMaterials>,
  tier: number,
  professionId: ProfessionId,
) {
  const bones = {} as RiggedHunterBones;
  const model = new THREE.Group();
  model.name = "hunter_model";
  model.position.set(0, 0.02, 0);
  model.scale.setScalar(professionId === "warden" ? 1.03 : 0.98);
  root.add(model);
  bones.hunter_model = model;

  const rig = new THREE.Group();
  rig.position.set(0, -0.44, 0);
  model.add(rig);

  bones.hunter_pelvis = addHunterBone(rig, "hunter_pelvis", [0, 0.48, 0]);
  bones.hunter_spine = addHunterBone(bones.hunter_pelvis, "hunter_spine", [0, 0.32, 0.01]);
  bones.hunter_chest = addHunterBone(bones.hunter_spine, "hunter_chest", [0, 0.42, 0.01]);
  bones.hunter_head = addHunterBone(bones.hunter_chest, "hunter_head", [0, 0.54, 0.05]);
  bones.hunter_cloak = addHunterBone(bones.hunter_chest, "hunter_cloak", [0, 0.12, -0.25]);

  bones.hunter_left_upper_arm = addHunterBone(bones.hunter_chest, "hunter_left_upper_arm", [-0.46, 0.22, 0.02]);
  bones.hunter_left_lower_arm = addHunterBone(bones.hunter_left_upper_arm, "hunter_left_lower_arm", [0, -0.42, 0.01]);
  bones.hunter_left_hand = addHunterBone(bones.hunter_left_lower_arm, "hunter_left_hand", [0, -0.34, 0.04]);
  bones.hunter_right_upper_arm = addHunterBone(bones.hunter_chest, "hunter_right_upper_arm", [0.46, 0.22, 0.02]);
  bones.hunter_right_lower_arm = addHunterBone(bones.hunter_right_upper_arm, "hunter_right_lower_arm", [0, -0.42, 0.01]);
  bones.hunter_right_hand = addHunterBone(bones.hunter_right_lower_arm, "hunter_right_hand", [0, -0.34, 0.04]);

  bones.hunter_left_upper_leg = addHunterBone(bones.hunter_pelvis, "hunter_left_upper_leg", [-0.2, -0.08, 0.01]);
  bones.hunter_left_lower_leg = addHunterBone(bones.hunter_left_upper_leg, "hunter_left_lower_leg", [0, -0.34, 0]);
  bones.hunter_right_upper_leg = addHunterBone(bones.hunter_pelvis, "hunter_right_upper_leg", [0.2, -0.08, 0.01]);
  bones.hunter_right_lower_leg = addHunterBone(bones.hunter_right_upper_leg, "hunter_right_lower_leg", [0, -0.34, 0]);

  bones.hunter_left_upper_arm.rotation.z = 0.16;
  bones.hunter_left_lower_arm.rotation.z = 0.08;
  bones.hunter_right_upper_arm.rotation.z = -0.22;
  bones.hunter_right_lower_arm.rotation.z = -0.1;

  addHunterTorso(bones, style, materials, professionId);
  addHunterHead(bones, style, materials, professionId);
  addHunterArm(bones.hunter_left_upper_arm, bones.hunter_left_lower_arm, bones.hunter_left_hand, materials, "left");
  addHunterArm(bones.hunter_right_upper_arm, bones.hunter_right_lower_arm, bones.hunter_right_hand, materials, "right");
  addHunterLeg(bones.hunter_left_upper_leg, bones.hunter_left_lower_leg, materials, -1);
  addHunterLeg(bones.hunter_right_upper_leg, bones.hunter_right_lower_leg, materials, 1);

  bones.hunter_right_blade = addHunterBladeToHand(bones.hunter_right_hand, materials, style, tier, "right", true);
  bones.hunter_left_blade = addHunterBladeToHand(bones.hunter_left_hand, materials, style, tier, "left", tier >= 2);

  return bones;
}

function addHunterBone(parent: THREE.Group, name: RiggedHunterBoneName, position: [number, number, number]) {
  const bone = new THREE.Group();
  bone.name = name;
  bone.position.set(...position);
  parent.add(bone);
  return bone;
}

function addHunterTorso(
  bones: RiggedHunterBones,
  style: CharacterStyle,
  materials: ReturnType<typeof createMaterials>,
  professionId: ProfessionId,
) {
  const cloakMaterial = new THREE.MeshStandardMaterial({
    color: professionId === "warden" ? 0x402326 : 0x0f3b35,
    metalness: 0.08,
    roughness: 0.72,
  });
  const strapMaterial = new THREE.MeshStandardMaterial({ color: 0x243331, metalness: 0.16, roughness: 0.55 });
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: style.accent,
    emissive: style.accent,
    emissiveIntensity: 0.08,
    metalness: 0.18,
    roughness: 0.5,
  });

  addMesh(bones.hunter_pelvis, new THREE.BoxGeometry(0.66, 0.2, 0.32), materials.navyDark, [0, 0, 0.02], [0, 0, 0]);
  addMesh(bones.hunter_pelvis, new THREE.BoxGeometry(0.78, 0.08, 0.36), materials.accentDark, [0, 0.09, 0.04], [0, 0, 0]);
  addMesh(bones.hunter_chest, new THREE.CapsuleGeometry(0.34, 0.58, 6, 14), materials.navy, [0, -0.15, 0], [0.04, 0, 0]);
  addMesh(bones.hunter_chest, new THREE.BoxGeometry(0.5, 0.58, 0.08), materials.shirt, [0, -0.17, 0.34], [0, 0, 0]);
  addMesh(bones.hunter_chest, new THREE.BoxGeometry(0.14, 0.54, 0.09), materials.accent, [0, -0.19, 0.39], [0, 0, 0]);
  addMesh(bones.hunter_chest, new THREE.BoxGeometry(0.84, 0.11, 0.16), materials.accentDark, [0, 0.15, 0.08], [0, 0, 0]);
  addMesh(bones.hunter_chest, new THREE.BoxGeometry(0.1, 0.86, 0.08), strapMaterial, [-0.22, -0.16, 0.42], [0, 0, -0.38]);
  addMesh(bones.hunter_chest, new THREE.BoxGeometry(0.16, 0.16, 0.08), trimMaterial, [0.22, -0.28, 0.43], [0, 0, 0]);

  const badge = addMesh(bones.hunter_chest, new THREE.PlaneGeometry(0.42, 0.15), materials.badge, [0.1, -0.08, 0.44], [0, 0, 0]);
  badge.renderOrder = 4;

  addMesh(bones.hunter_cloak, new THREE.BoxGeometry(0.78, 0.86, 0.045), cloakMaterial, [0, -0.38, 0], [0.18, 0, 0], [1, 1, 1]);
  addMesh(bones.hunter_cloak, new THREE.BoxGeometry(0.58, 0.08, 0.05), materials.accent, [0, 0.08, 0.02], [0, 0, 0]);
  addMesh(bones.hunter_cloak, new THREE.BoxGeometry(0.18, 0.62, 0.045), materials.glow, [0.32, -0.4, 0.025], [0.16, 0, -0.05]);
}

function addHunterHead(
  bones: RiggedHunterBones,
  style: CharacterStyle,
  materials: ReturnType<typeof createMaterials>,
  professionId: ProfessionId,
) {
  const hoodMaterial = new THREE.MeshStandardMaterial({
    color: professionId === "warden" ? 0x2a1d1e : 0x123d38,
    metalness: 0.1,
    roughness: 0.68,
  });
  const visorMaterial = new THREE.MeshStandardMaterial({
    color: style.accentDark,
    emissive: style.accent,
    emissiveIntensity: 0.1,
    metalness: 0.24,
    roughness: 0.42,
  });

  addMesh(bones.hunter_head, new THREE.SphereGeometry(0.29, 24, 16), materials.skin, [0, 0.02, 0.02], [0, 0, 0]);
  addMesh(bones.hunter_head, new THREE.SphereGeometry(0.315, 24, 10, 0, Math.PI * 2, 0, Math.PI * 0.56), hoodMaterial, [0, 0.11, 0], [0.12, 0, 0]);
  addMesh(bones.hunter_head, new THREE.BoxGeometry(0.46, 0.06, 0.12), visorMaterial, [0, 0.16, 0.19], [0, 0, 0]);
  addMesh(bones.hunter_head, new THREE.SphereGeometry(0.028, 10, 8), materials.eye, [-0.1, 0.01, 0.28], [0, 0, 0]);
  addMesh(bones.hunter_head, new THREE.SphereGeometry(0.028, 10, 8), materials.eye, [0.1, 0.01, 0.28], [0, 0, 0]);
  addMesh(bones.hunter_head, new THREE.BoxGeometry(0.12, 0.024, 0.024), materials.eye, [0, -0.08, 0.3], [0, 0, 0]);
  addMesh(bones.hunter_head, new THREE.ConeGeometry(0.16, 0.22, 5), hoodMaterial, [0, -0.14, -0.12], [-0.68, 0, Math.PI]);
}

function addHunterArm(
  upperArm: THREE.Group,
  lowerArm: THREE.Group,
  hand: THREE.Group,
  materials: ReturnType<typeof createMaterials>,
  side: "left" | "right",
) {
  const sideSign = side === "left" ? -1 : 1;
  addMesh(upperArm, new THREE.SphereGeometry(0.15, 12, 8), materials.accentDark, [0, 0.03, 0], [0, 0, 0]);
  addMesh(upperArm, new THREE.CapsuleGeometry(0.078, 0.36, 5, 10), materials.navy, [0, -0.2, 0.02], [0.04, 0, sideSign * 0.02]);
  addMesh(lowerArm, new THREE.CapsuleGeometry(0.068, 0.3, 5, 10), materials.navyDark, [0, -0.17, 0.03], [0.04, 0, 0]);
  addMesh(lowerArm, new THREE.CylinderGeometry(0.075, 0.075, 0.08, 10), materials.accent, [0, -0.32, 0.05], [0, 0, 0]);
  addMesh(hand, new THREE.SphereGeometry(0.095, 14, 10), materials.skin, [0, -0.03, 0.04], [0, 0, 0]);
}

function addHunterLeg(
  upperLeg: THREE.Group,
  lowerLeg: THREE.Group,
  materials: ReturnType<typeof createMaterials>,
  sideSign: -1 | 1,
) {
  addMesh(upperLeg, new THREE.CapsuleGeometry(0.095, 0.32, 5, 9), materials.navyDark, [0, -0.17, 0], [0.03, 0, sideSign * 0.03]);
  addMesh(lowerLeg, new THREE.CapsuleGeometry(0.085, 0.32, 5, 9), materials.navyDark, [0, -0.17, 0.02], [0.02, 0, 0]);
  addMesh(lowerLeg, new THREE.BoxGeometry(0.28, 0.11, 0.38), materials.boot, [0.025 * sideSign, -0.37, 0.12], [0, 0, 0]);
}

function addHunterBladeToHand(
  hand: THREE.Group,
  materials: ReturnType<typeof createMaterials>,
  style: CharacterStyle,
  tier: number,
  side: "left" | "right",
  visible: boolean,
) {
  const blade = new THREE.Group();
  blade.name = side === "left" ? "hunter_left_blade" : "hunter_right_blade";
  blade.position.set(side === "left" ? -0.02 : 0.02, -0.1, 0.14);
  blade.rotation.set(0.18, 0, side === "left" ? 0.18 : -0.18);
  blade.scale.setScalar(visible ? 1 : 0.001);
  hand.add(blade);

  const bladeLength = (side === "right" ? 0.48 : 0.38) + tier * 0.085;
  const guardWidth = (side === "right" ? 0.28 : 0.22) + tier * 0.03;
  const bladeGlow = new THREE.MeshStandardMaterial({
    color: style.glow,
    transparent: true,
    opacity: Math.min(0.68, 0.28 + tier * 0.08),
    emissive: style.glow,
    emissiveIntensity: 0.45 + tier * 0.16,
    metalness: 0.1,
    roughness: 0.3,
  });

  addMesh(blade, new THREE.CapsuleGeometry(0.03, 0.28, 4, 8), materials.dark, [0, -0.1, 0], [0, 0, 0]);
  addMesh(blade, new THREE.BoxGeometry(guardWidth, 0.055, 0.07), materials.accent, [0, 0.06, 0.01], [0, 0, 0]);
  addMesh(blade, new THREE.ConeGeometry(0.105 + tier * 0.012, bladeLength, 5), materials.metal, [0, 0.28 + tier * 0.04, 0.01], [0, 0, Math.PI]);

  if (tier >= 1) {
    addMesh(blade, new THREE.TorusGeometry(0.14 + tier * 0.018, 0.01, 8, 28), bladeGlow, [0, 0.25, 0.02], [0.7, 0.12, 0]);
  }

  if (tier >= 3) {
    addMesh(blade, new THREE.ConeGeometry(0.042, 0.26, 4), bladeGlow, [-0.12, 0.2, 0.02], [0, 0, Math.PI]);
    addMesh(blade, new THREE.ConeGeometry(0.042, 0.26, 4), bladeGlow, [0.12, 0.2, 0.02], [0, 0, Math.PI]);
  }

  return blade;
}

function createHunterIdleClip() {
  const times = [0, 0.6, 1.2, 1.8, 2.4];

  return new THREE.AnimationClip("hunter-idle", 2.4, [
    vectorTrack("hunter_pelvis.position", times, [
      [0, 0.48, 0],
      [0, 0.505, 0.006],
      [0, 0.49, 0],
      [0, 0.5, -0.004],
      [0, 0.48, 0],
    ]),
    quaternionTrack("hunter_chest.quaternion", times, [
      [0.02, 0, 0],
      [0.035, 0.018, 0.014],
      [0.015, 0, -0.008],
      [0.03, -0.014, 0.01],
      [0.02, 0, 0],
    ]),
    quaternionTrack("hunter_head.quaternion", times, [
      [0, 0, 0],
      [0.035, -0.045, 0.012],
      [0.015, 0.02, -0.006],
      [0.028, 0.042, 0.01],
      [0, 0, 0],
    ]),
    quaternionTrack("hunter_left_upper_arm.quaternion", times, [
      [0, 0, 0.16],
      [0.035, 0, 0.21],
      [0, 0, 0.17],
      [0.02, 0, 0.2],
      [0, 0, 0.16],
    ]),
    quaternionTrack("hunter_right_upper_arm.quaternion", times, [
      [0, 0, -0.22],
      [0.03, 0.01, -0.28],
      [0, 0, -0.23],
      [0.02, -0.01, -0.25],
      [0, 0, -0.22],
    ]),
    quaternionTrack("hunter_cloak.quaternion", times, [
      [0.04, 0, 0],
      [0.12, 0.02, -0.02],
      [0.06, 0, 0.01],
      [0.1, -0.02, 0.02],
      [0.04, 0, 0],
    ]),
  ]);
}

function createHunterScoutClip() {
  const times = [0, 0.32, 0.64, 0.96, 1.28];

  return new THREE.AnimationClip("hunter-scout-step", 1.28, [
    vectorTrack("hunter_pelvis.position", times, [
      [0, 0.48, 0],
      [0.015, 0.515, 0.012],
      [0, 0.48, 0],
      [-0.015, 0.515, -0.012],
      [0, 0.48, 0],
    ]),
    quaternionTrack("hunter_chest.quaternion", times, [
      [0.03, 0.02, 0],
      [0.05, 0.05, -0.025],
      [0.02, -0.01, 0],
      [0.05, -0.045, 0.025],
      [0.03, 0.02, 0],
    ]),
    quaternionTrack("hunter_left_upper_leg.quaternion", times, [
      [0.18, 0, 0],
      [-0.18, 0, -0.035],
      [0.18, 0, 0],
      [0.36, 0, 0.035],
      [0.18, 0, 0],
    ]),
    quaternionTrack("hunter_right_upper_leg.quaternion", times, [
      [-0.18, 0, 0],
      [0.36, 0, 0.035],
      [-0.18, 0, 0],
      [-0.18, 0, -0.035],
      [-0.18, 0, 0],
    ]),
    quaternionTrack("hunter_left_lower_leg.quaternion", times, [
      [-0.12, 0, 0],
      [0.24, 0, 0],
      [-0.12, 0, 0],
      [0.08, 0, 0],
      [-0.12, 0, 0],
    ]),
    quaternionTrack("hunter_right_lower_leg.quaternion", times, [
      [0.24, 0, 0],
      [0.08, 0, 0],
      [0.24, 0, 0],
      [-0.12, 0, 0],
      [0.24, 0, 0],
    ]),
    quaternionTrack("hunter_left_upper_arm.quaternion", times, [
      [-0.12, 0, 0.2],
      [0.2, 0, 0.18],
      [-0.12, 0, 0.2],
      [-0.28, 0, 0.24],
      [-0.12, 0, 0.2],
    ]),
    quaternionTrack("hunter_right_upper_arm.quaternion", times, [
      [0.22, 0, -0.28],
      [-0.2, 0, -0.22],
      [0.22, 0, -0.28],
      [0.32, 0, -0.3],
      [0.22, 0, -0.28],
    ]),
  ]);
}

function createHunterStrikeClip() {
  const times = [0, 0.18, 0.38, 0.62, 0.9, 1.18];

  return new THREE.AnimationClip("hunter-ready-strike", 1.18, [
    vectorTrack("hunter_pelvis.position", times, [
      [0, 0.48, 0],
      [-0.035, 0.5, -0.015],
      [-0.055, 0.515, -0.02],
      [0.08, 0.49, 0.025],
      [0.02, 0.5, 0.006],
      [0, 0.48, 0],
    ]),
    quaternionTrack("hunter_chest.quaternion", times, [
      [0.03, 0.02, 0],
      [0.08, -0.34, -0.08],
      [0.1, -0.42, -0.1],
      [0.04, 0.38, 0.12],
      [0.02, 0.1, 0.02],
      [0.03, 0.02, 0],
    ]),
    quaternionTrack("hunter_head.quaternion", times, [
      [0, 0, 0],
      [0.08, 0.2, -0.02],
      [0.1, 0.25, -0.04],
      [0.04, -0.18, 0.04],
      [0.02, -0.06, 0.02],
      [0, 0, 0],
    ]),
    quaternionTrack("hunter_right_upper_arm.quaternion", times, [
      [0.1, 0, -0.24],
      [-0.92, -0.24, -0.62],
      [-1.16, -0.34, -0.72],
      [0.42, 0.18, -1.08],
      [0.16, 0.06, -0.36],
      [0.1, 0, -0.24],
    ]),
    quaternionTrack("hunter_right_lower_arm.quaternion", times, [
      [-0.08, 0, -0.1],
      [-0.48, 0.08, -0.28],
      [-0.68, 0.1, -0.34],
      [0.28, -0.12, -0.16],
      [0.04, 0, -0.12],
      [-0.08, 0, -0.1],
    ]),
    quaternionTrack("hunter_right_hand.quaternion", times, [
      [0, 0, 0],
      [0.1, -0.18, -0.1],
      [0.18, -0.3, -0.16],
      [-0.08, 0.22, 0.24],
      [0.02, 0.08, 0.08],
      [0, 0, 0],
    ]),
    quaternionTrack("hunter_left_upper_arm.quaternion", times, [
      [0, 0, 0.18],
      [0.28, 0.08, 0.52],
      [0.36, 0.12, 0.58],
      [-0.12, -0.04, 0.22],
      [0.02, 0, 0.2],
      [0, 0, 0.18],
    ]),
    quaternionTrack("hunter_left_lower_arm.quaternion", times, [
      [0, 0, 0.08],
      [-0.26, -0.04, 0.3],
      [-0.34, -0.08, 0.38],
      [0.12, 0.02, 0.12],
      [0.04, 0, 0.08],
      [0, 0, 0.08],
    ]),
    quaternionTrack("hunter_left_upper_leg.quaternion", times, [
      [0.08, 0, 0],
      [0.32, 0, -0.05],
      [0.36, 0, -0.05],
      [-0.16, 0, 0.06],
      [0.04, 0, 0],
      [0.08, 0, 0],
    ]),
    quaternionTrack("hunter_right_upper_leg.quaternion", times, [
      [-0.08, 0, 0],
      [-0.22, 0, 0.05],
      [-0.24, 0, 0.05],
      [0.28, 0, -0.06],
      [0.02, 0, 0],
      [-0.08, 0, 0],
    ]),
    quaternionTrack("hunter_cloak.quaternion", times, [
      [0.04, 0, 0],
      [0.16, -0.12, 0.08],
      [0.2, -0.18, 0.12],
      [0.08, 0.2, -0.16],
      [0.06, 0.06, -0.05],
      [0.04, 0, 0],
    ]),
  ]);
}

function createHunterGearClip(tier: number) {
  const times = [0, 0.7, 1.4, 2.1];
  const pulseScale = 1 + tier * 0.035;

  return new THREE.AnimationClip("hunter-gear-pulse", 2.1, [
    vectorTrack("hunter_right_blade.scale", times, [
      [1, 1, 1],
      [pulseScale, 1 + tier * 0.055, pulseScale],
      [1.015, 1.01, 1.015],
      [1, 1, 1],
    ]),
    quaternionTrack("hunter_right_blade.quaternion", times, [
      [0.18, 0, -0.18],
      [0.25, 0.04, -0.22],
      [0.2, -0.03, -0.16],
      [0.18, 0, -0.18],
    ]),
    quaternionTrack("hunter_left_blade.quaternion", times, [
      [0.18, 0, 0.18],
      [0.23, -0.04, 0.23],
      [0.2, 0.03, 0.16],
      [0.18, 0, 0.18],
    ]),
  ]);
}

function vectorTrack(name: string, times: number[], vectors: Array<[number, number, number]>) {
  return new THREE.VectorKeyframeTrack(name, times, vectors.flat());
}

function quaternionTrack(name: string, times: number[], eulers: Array<[number, number, number]>) {
  return new THREE.QuaternionKeyframeTrack(
    name,
    times,
    eulers.flatMap(([x, y, z]) => {
      const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
      return [quaternion.x, quaternion.y, quaternion.z, quaternion.w];
    }),
  );
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

function disposeObject3D(root: THREE.Object3D) {
  const disposedMaterials = new Set<THREE.Material>();
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      disposeMaterial(object.material, disposedMaterials);
    }
  });
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
  disposeObject3D(scene);
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
