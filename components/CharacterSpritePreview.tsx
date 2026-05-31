import type { CSSProperties } from "react";
import type { ProfessionId } from "../lib/companyGame";

type CharacterSpritePreviewProps = {
  professionId: ProfessionId;
  selected?: boolean;
  weaponLevel?: number;
};

const characterSpriteSheets: Partial<Record<ProfessionId, string>> = {
  warden: "/characters/essen-hunter-blade-stages.png",
};

export function hasCharacterSprite(professionId: ProfessionId) {
  return Boolean(characterSpriteSheets[professionId]);
}

export function CharacterSpritePreview({ professionId, selected = false, weaponLevel = 0 }: CharacterSpritePreviewProps) {
  const spriteSheet = characterSpriteSheets[professionId];

  if (!spriteSheet) {
    return null;
  }

  const tier = Math.max(0, Math.min(4, Math.floor(weaponLevel)));
  const style = {
    "--character-sprite-image": `url("${spriteSheet}")`,
    "--character-sprite-position": `${tier * 25}%`,
  } as CSSProperties;

  return (
    <span
      aria-label="ESSEN hunter character with evolving blade"
      className={`character-sprite-preview${selected ? " is-selected" : ""}`}
      role="img"
      style={style}
    />
  );
}
