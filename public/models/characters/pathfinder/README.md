# Pathfinder Character Brief

This folder is the landing zone for the first production GLB character:

```text
public/models/characters/pathfinder/character.glb
```

## Visual Target

- Stylized RPG hero, semi-anime proportions.
- Tall, agile silhouette with a long black ESSEN coat.
- White shirt, blue tie, visible ESSEN badge, black gloves, black boots.
- Blue crystal/energy accents on shoulders, cuffs, belt, and weapon stages.
- Front-facing preview pose should read clearly at small UI sizes.

## Required Export Contents

- One skinned character armature.
- Embedded or packed textures.
- Idle-like animation clip named `idle` or `preview_idle`.
- Optional stage animation clips named `stage_0` through `stage_4`.
- Weapon/VFX stage objects named `weapon_stage_0` through `weapon_stage_4`.

## Suggested Animation Set

```text
preview_idle
walk
attack_primary
attack_finisher
cast_stage
victory
```

Only `preview_idle` is required for the first UI preview. The rest can land in later iterations.

## Weapon Stage Direction

- Stage 0: clean compact route blade.
- Stage 1: blue edge glow, small crystal socket.
- Stage 2: larger angular blade, first floating shards.
- Stage 3: crescent route blade with strong electric trails.
- Stage 4: awakened dual/oversized blade, orbiting blue arc and crystal fragments.

## Acceptance Targets

- Under 120k estimated triangles for the UI preview model.
- One primary material family for ESSEN uniform, plus separate metal, skin/hair, glow/crystal materials.
- Textures embedded in the GLB or placed in the same public folder when using a custom manifest path.
- Character feet near world ground and model centered around origin before export.

Run before enabling:

```text
node scripts/validate-character-glb.mjs public/models/characters/pathfinder/character.glb
```
