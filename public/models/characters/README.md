# Character GLB Pipeline

Place exported character files under:

```text
public/models/characters/<profession-id>/character.glb
```

Current wired professions:

```text
pathfinder -> public/models/characters/pathfinder/character.glb
warden     -> public/models/characters/warden/character.glb
```

These are also the supported manifest ids until more professions are wired into `ProfessionAvatar3D`.

The app loads the GLB first and falls back to the procedural Three.js rig when the file is missing.

Enable an exported model in `public/models/characters/manifest.json`:

```json
{
  "characters": {
    "pathfinder": true
  }
}
```

Use `true` for the default path, or provide a custom public URL string.

Check enabled exports with:

```text
npm run validate:characters
```

Or check a single file before enabling it:

```text
node scripts/validate-character-glb.mjs public/models/characters/pathfinder/character.glb
```

The validator reports node count, material names, texture/image counts, animation clip names, and weapon stage nodes.

## Blender Export Contract

- Export as binary glTF: `.glb`.
- Apply transforms before export.
- Character should face the camera in Three.js, with the visible front on local `+Z`.
- Keep the character centered on origin, feet near ground.
- Target visual height is normalized in code, so exact Blender scale can be approximate.
- Include baked or embedded textures when possible.

## Animation Clips

Preferred clip names:

```text
idle
preview_idle
stance
stage_0
stage_1
stage_2
stage_3
stage_4
```

The app plays the first idle-like clip it finds, then optionally blends a stage-specific clip for the current weapon tier.

## Weapon Stages

For mutually exclusive weapon or VFX meshes, include `stage` or `tier` plus a digit in the object name:

```text
weapon_stage_0
weapon_stage_1
weapon_stage_2
weapon_stage_3
weapon_stage_4
```

Only the object matching the current visual tier is visible.

## Notes

High-cost visual effects such as blue arcs, floating shards, additive glow, and slash trails can live either in the GLB as named stage meshes or later in Three.js as overlay particles.
