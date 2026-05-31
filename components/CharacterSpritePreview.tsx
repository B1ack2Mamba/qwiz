import type { CSSProperties } from "react";
import type { ProfessionId } from "../lib/companyGame";

type CharacterSpritePreviewProps = {
  professionId: ProfessionId;
  selected?: boolean;
  weaponLevel?: number;
};

const characterSpriteSheets: Partial<Record<ProfessionId, string>> = {
  pathfinder: "/characters/essen-pathfinder-route-stages.png",
  miner: "/characters/essen-miner-pickaxe-stages.png",
  warden: "/characters/essen-hunter-blade-stages.png",
  artisan: "/characters/essen-artisan-shield-stages.png",
  enchanter: "/characters/essen-enchanter-staff-stages.png",
  tactician: "/characters/essen-tactician-banner-stages.png",
};

const characterSpriteLabels: Partial<Record<ProfessionId, string>> = {
  pathfinder: "ESSEN assassin pathfinder character with evolving route blades",
  miner: "ESSEN dwarf miner character with evolving pickaxe",
  warden: "ESSEN hunter character with evolving blade",
  artisan: "ESSEN dwarf artisan character with evolving shield",
  enchanter: "ESSEN female buffer character with evolving staff",
  tactician: "ESSEN tactician character with evolving banner",
};

export function getCharacterSpriteSheet(professionId: ProfessionId) {
  return characterSpriteSheets[professionId] || null;
}

export function getCharacterSpriteLabel(professionId: ProfessionId) {
  return characterSpriteLabels[professionId] || "ESSEN profession character";
}

export function getCharacterSpriteTier(weaponLevel: number) {
  return Math.max(0, Math.min(4, Math.floor(weaponLevel)));
}

export function getCharacterSpritePosition(weaponLevel: number) {
  const tier = getCharacterSpriteTier(weaponLevel);
  return `${tier * 25}%`;
}

export function hasCharacterSprite(professionId: ProfessionId) {
  return Boolean(getCharacterSpriteSheet(professionId));
}

export function CharacterSpritePreview({ professionId, selected = false, weaponLevel = 0 }: CharacterSpritePreviewProps) {
  const spriteSheet = characterSpriteSheets[professionId];
  const spriteTier = getCharacterSpriteTier(weaponLevel);

  if (!spriteSheet) {
    return null;
  }

  const style = {
    "--character-sprite-image": `url("${spriteSheet}")`,
    "--character-sprite-position": getCharacterSpritePosition(weaponLevel),
  } as CSSProperties;

  return (
    <span
      aria-label={getCharacterSpriteLabel(professionId)}
      className={`character-sprite-preview is-${professionId}${selected ? " is-selected" : ""}`}
      data-weapon-stage={spriteTier}
      role="img"
      style={style}
    />
  );
}
