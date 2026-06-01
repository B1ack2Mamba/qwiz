import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(rootDir, "public", "models", "characters", "manifest.json");
const defaultModelPaths = {
  pathfinder: "public/models/characters/pathfinder/character.glb",
  warden: "public/models/characters/warden/character.glb",
};
const supportedProfessionIds = new Set(Object.keys(defaultModelPaths));

const directArgs = process.argv.slice(2);

if (directArgs.length > 0) {
  let hasError = false;

  for (const item of directArgs) {
    const result = await validateCharacterFile(path.resolve(rootDir, item), path.basename(path.dirname(item)) || item);
    printValidationResult(result);
    hasError ||= result.errors.length > 0;
  }

  process.exit(hasError ? 1 : 0);
}

const manifest = await readJsonFile(manifestPath);
const characters = manifest.characters || {};
const enabledEntries = Object.entries(characters).filter(([, value]) => Boolean(value));

if (enabledEntries.length === 0) {
  console.log("No enabled GLB characters in public/models/characters/manifest.json.");
  console.log("Add an entry such as: { \"characters\": { \"pathfinder\": true } }");
  process.exit(0);
}

let hasError = false;

for (const [professionId, entry] of enabledEntries) {
  const defaultPath = defaultModelPaths[professionId];

  if (!supportedProfessionIds.has(professionId)) {
    console.log(`\n${professionId}`);
    console.log(`  error: unsupported profession id in manifest`);
    console.log(`  supported ids: ${[...supportedProfessionIds].join(", ")}`);
    hasError = true;
    continue;
  }

  if (entry === true && !defaultPath) {
    console.log(`\n${professionId}`);
    console.log(`  error: no default GLB path is configured for this profession`);
    hasError = true;
    continue;
  }

  const modelPath = entry === true ? defaultPath : toPublicRelativePath(entry);

  if (!modelPath) {
    console.log(`\n${professionId}`);
    console.log(`  error: manifest entry must be true or a public model path string`);
    hasError = true;
    continue;
  }

  const result = await validateCharacterFile(path.join(rootDir, modelPath), professionId);
  printValidationResult(result);
  hasError ||= result.errors.length > 0;
}

process.exit(hasError ? 1 : 0);

async function validateCharacterFile(filePath, professionId) {
  const errors = [];
  const warnings = [];
  let gltf = null;

  try {
    gltf = await readGltfLikeFile(filePath);
  } catch (error) {
    return {
      animations: [],
      errors: [`could not read ${path.relative(rootDir, filePath)}: ${error.message}`],
      filePath,
      imageCount: 0,
      materialNames: [],
      nodeNames: [],
      professionId,
      stageNodes: [],
      textureCount: 0,
      warnings: [],
    };
  }

  const animations = (gltf.animations || []).map((item, index) => item.name || `animation_${index}`);
  const materialNames = (gltf.materials || []).map((item, index) => item.name || `material_${index}`);
  const nodeNames = (gltf.nodes || []).map((item, index) => item.name || `node_${index}`);
  const stageNodes = nodeNames.filter((name) => getStageIndexFromName(name) !== null);
  const imageCount = (gltf.images || []).length;
  const textureCount = (gltf.textures || []).length;
  const hasIdleClip = animations.some((name) => includesAnyNormalized(name, ["preview_idle", "idle", "stance", "breath", "loop"]));

  if ((gltf.scenes || []).length === 0) {
    errors.push("no scenes found");
  }

  if ((gltf.nodes || []).length === 0) {
    errors.push("no nodes found");
  }

  if ((gltf.meshes || []).length === 0) {
    warnings.push("no meshes found");
  }

  if (materialNames.length === 0) {
    warnings.push("no materials found");
  }

  if (textureCount === 0 || imageCount === 0) {
    warnings.push("no texture/image data found");
  }

  if ((gltf.skins || []).length === 0) {
    warnings.push("no skin/armature found");
  }

  if (animations.length === 0) {
    warnings.push("no animations found");
  } else if (!hasIdleClip) {
    warnings.push("no idle-like animation clip found");
  }

  for (const stage of [0, 1, 2, 3, 4]) {
    if (!stageNodes.some((name) => getStageIndexFromName(name) === stage)) {
      warnings.push(`no weapon_stage_${stage} or tier_${stage} node found`);
    }
  }

  return {
    animations,
    errors,
    filePath,
    imageCount,
    materialNames,
    nodeNames,
    professionId,
    stageNodes,
    textureCount,
    warnings,
  };
}

async function readGltfLikeFile(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const buffer = await readFile(filePath);

  if (extension === ".gltf") {
    return JSON.parse(buffer.toString("utf8"));
  }

  if (extension !== ".glb") {
    throw new Error("expected .glb or .gltf");
  }

  return parseGlbJson(buffer);
}

function parseGlbJson(buffer) {
  if (buffer.readUInt32LE(0) !== 0x46546c67) {
    throw new Error("invalid GLB magic");
  }

  const version = buffer.readUInt32LE(4);

  if (version !== 2) {
    throw new Error(`unsupported GLB version ${version}`);
  }

  const length = buffer.readUInt32LE(8);

  if (length > buffer.length) {
    throw new Error("truncated GLB file");
  }

  let offset = 12;

  while (offset + 8 <= length) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkLength;

    if (chunkEnd > buffer.length) {
      throw new Error("truncated GLB chunk");
    }

    if (chunkType === 0x4e4f534a) {
      return JSON.parse(buffer.subarray(chunkStart, chunkEnd).toString("utf8").replace(/\0+$/g, "").trimEnd());
    }

    offset = chunkEnd;
  }

  throw new Error("missing JSON chunk");
}

function printValidationResult(result) {
  console.log(`\n${result.professionId}`);
  console.log(`  file: ${path.relative(rootDir, result.filePath)}`);
  console.log(`  nodes: ${result.nodeNames.length}`);
  console.log(`  materials: ${result.materialNames.length ? result.materialNames.join(", ") : "none"}`);
  console.log(`  textures/images: ${result.textureCount}/${result.imageCount}`);
  console.log(`  animations: ${result.animations.length ? result.animations.join(", ") : "none"}`);
  console.log(`  stage nodes: ${result.stageNodes.length ? result.stageNodes.join(", ") : "none"}`);

  for (const warning of result.warnings) {
    console.log(`  warning: ${warning}`);
  }

  for (const error of result.errors) {
    console.log(`  error: ${error}`);
  }
}

async function readJsonFile(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return {};
  }
}

function toPublicRelativePath(value) {
  if (typeof value !== "string") {
    return null;
  }

  return value.replace(/^\/+/, "public/");
}

function getStageIndexFromName(name) {
  const match = normalizeAssetName(name).match(/(?:weapon_)?(?:stage|tier)_?([0-4])(?:_|$)/);
  return match ? Number(match[1]) : null;
}

function includesAnyNormalized(value, names) {
  const normalizedValue = normalizeAssetName(value);
  return names.some((name) => normalizedValue.includes(normalizeAssetName(name)));
}

function normalizeAssetName(name) {
  return name.toLowerCase().replace(/[\s.-]+/g, "_");
}
