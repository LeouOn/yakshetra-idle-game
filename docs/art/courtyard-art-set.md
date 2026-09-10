# Courtyard Art Set Specification

This document specifies Yakshetra's first playable courtyard art set: visual targets, color palette, coordinate grid, sprite dimensions, anchor pivots for 2.5D depth sorting, collision footprints, multi-frame animation sheets, and the consolidated texture atlas.

---

## 1. Palette & Atmosphere

The visual direction translates the studio design language (`src/ui/studio-theme.ts`) into a 16-bit RPG pixel-art courtyard at lavender dusk:

| Color Family          | Hex Values                                 | Usage & Materiality                                                                                   |
| :-------------------- | :----------------------------------------- | :---------------------------------------------------------------------------------------------------- |
| **Deep Plum Shadows** | `#0c0a12`, `#161221`, `#3a314c`, `#6d4aa8` | Architectural outlines, curved roof tiles, tree bark crevices, fertile garden soil, ambient occlusion |
| **Jade Foliage**      | `#245844`, `#3d8b6e`, `#5dbb95`, `#d8fff0` | Medicinal mugwort, garden herbs, dense persimmon tree canopy, moss on flagstones                      |
| **Lavender Dusk**     | `#8f78b8`, `#b5a9c4`, `#c4a0ff`, `#f4eef8` | Atmospheric dusk light, granite flagstones, paper screen highlights, hemp practitioner tunic          |
| **Amber Light**       | `#945a18`, `#d49b38`, `#e8c56b`, `#f7d88b` | Stone pagoda lantern tallow flame, ripe autumn persimmons, candle glow through lattice windows        |

---

## 2. Spatial Grid & Coordinate Model

The courtyard uses a **2.5D Orthographic / 3/4 Top-Down perspective** (dimetric/cabinet projection with consistent vertical elevation):

- **Base Tile Unit**: `16 × 16 px` (logical grid unit) / `32 × 32 px` at 2x native display scaling.
- **Ground Plane Footprint**: Objects occupy integer tile bounds `(W × D)`.
- **Y-Sort Rule**: Depth sorting order is calculated from the entity's baseline anchor:
  $$\text{Depth Priority} = \text{Anchor}_Y + \text{WorldPosition}_Y$$
  Entities with greater `Depth Priority` render in front of entities further back.
- **Overhang Layering**: High elements (e.g., roof eaves, persimmon tree canopy) possess a higher visual height than their collision footprint, allowing characters to walk behind them with automatic occlusion.

---

## 3. Asset Registry & Sprite Metrics

| Asset Name              | Master Image            | Scaled Sprite                   | Grid Footprint     | Production Size      | Anchor Pivot $(X, Y)$ | Collision Box $(W \times H)$ | Interaction Zone                     |
| :---------------------- | :---------------------- | :------------------------------ | :----------------- | :------------------- | :-------------------- | :--------------------------- | :----------------------------------- |
| **Courtyard Pavilion**  | `home.png`              | `home_production.png`           | $5 \times 3$ tiles | $160 \times 144$ px  | $(0.50, 0.88)$        | $76 \times 36$ px            | Center threshold ($16 \times 8$ px)  |
| **Persimmon Tree**      | `persimmon_tree.png`    | `persimmon_tree_production.png` | $2 \times 2$ tiles | $96 \times 112$ px   | $(0.48, 0.90)$        | $24 \times 16$ px            | Base perimeter ($32 \times 24$ px)   |
| **Artisan Workbench**   | `workbench.png`         | `workbench_production.png`      | $2 \times 1$ tiles | $48 \times 48$ px    | $(0.50, 0.85)$        | $30 \times 14$ px            | Front work slot $(0.50, 0.95)$       |
| **Medicinal Garden**    | `garden.png`            | `garden_production.png`         | $3 \times 3$ tiles | $64 \times 64$ px    | $(0.50, 0.75)$        | $44 \times 40$ px            | Border perimeter ($48 \times 16$ px) |
| **Pagoda Lantern**      | `lantern.png`           | `lantern_production.png`        | $1 \times 1$ tile  | $24 \times 48$ px    | $(0.50, 0.90)$        | $14 \times 12$ px            | Lamp flame slot $(0.50, 0.42)$       |
| **Courtyard Cat**       | `cat.png`               | `cat_production.png`            | $1 \times 1$ tile  | $24 \times 20$ px    | $(0.50, 0.85)$        | None (soft bypass)           | Radial pet radius ($16$ px)          |
| **Practitioner Avatar** | `character.png`         | `character_production.png`      | $1 \times 1$ tile  | $32 \times 48$ px    | $(0.50, 0.92)$        | $12 \times 8$ px             | Facing vector ($16$ px cone)         |
| **Courtyard Preview**   | `courtyard_preview.jpg` | _N/A (Scene)_                   | Full Scene         | $1376 \times 768$ px | $(0.50, 0.50)$        | _N/A_                        | Composed scene reference             |

---

## 4. Multi-Frame Animation Sheets & Frame Registry

Animation sheets live in `assets/courtyard/sheets/` and individual extracted frames in `assets/courtyard/frames/`:

### A. Practitioner Character Walk Cycles (`character_walk_sheet.jpg`)

Four-directional walking cycles arranged in rows, with 4 frames per direction (stride, contact, pass, push-off):

- **South (Front)**: `character_walk_south_0` .. `3` ($32 \times 48$ px, anchor $(0.50, 0.92)$)
- **East (Right)**: `character_walk_east_0` .. `3` ($32 \times 48$ px, anchor $(0.50, 0.92)$)
- **North (Back)**: `character_walk_north_0` .. `3` ($32 \times 48$ px, anchor $(0.50, 0.92)$)
- **West (Left)**: `character_walk_west_0` .. `3` ($32 \times 48$ px, anchor $(0.50, 0.92)$)
- _Framerate_: 8–10 FPS continuous walk cycle.

### B. Artisan Workbench Tending (`artisan_work_sheet.jpg`)

Sequential 4-stage crafting loop at the wooden workbench:

- `artisan_prep`: Positioning timber and aligning chisel blade ($48 \times 48$ px).
- `artisan_strike`: Striking chisel with mallet, producing shaving particle ($48 \times 48$ px).
- `artisan_dust`: Blowing wood dust off the freshly planed surface ($48 \times 48$ px).
- `artisan_inspect`: Wiping brow and verifying grain alignment against dusk light ($48 \times 48$ px).
- _Framerate_: 6–8 FPS workbench activity loop.

### C. Pagoda Lantern Flame Pulse (`lantern_flicker_sheet.jpg`)

Organic tallow flame flicker and paper lattice illumination modulation:

- `lantern_flame_0`: Low, steady amber core flame.
- `lantern_flame_1`: Flaring flame illuminating vertical struts.
- `lantern_flame_2`: Curved wavering flame flickering in draft.
- `lantern_flame_3`: Radiant amber bloom casting a soft halo into courtyard gloom.
- _Framerate_: 8 FPS ping-pong loop (`0 → 1 → 2 → 3 → 2 → 1`).

### D. Courtyard Cat Sleep & Idle (`cat_animation_sheet.jpg`)

Curled calico cat resting on stone flagstone:

- `cat_sleep_0`: Curled tight in deep slumber.
- `cat_sleep_1`: Chest rise with tail curl tip extension (inhalation).
- `cat_sleep_2`: Subtle ear flick and whisker twitch.
- `cat_sleep_3`: Gentle exhale settling back into stillness.
- _Framerate_: 3–4 FPS ambient resting loop.

---

## 5. Consolidated Texture Atlas (`courtyard_atlas.png` & `.json`)

All static world props and animation frames are packed into a single $512 \times 512$ texture atlas located at `assets/courtyard/atlas/`:

- **Atlas File**: `assets/courtyard/atlas/courtyard_atlas.png`
- **Metadata Index**: `assets/courtyard/atlas/courtyard_atlas.json`
- **Total Packed Frames**: 32 distinct sprite frames with 4px bleed padding.
- **Built-in Animation Sequences**:
  - `character_walk_south`: 4 frames
  - `character_walk_east`: 4 frames
  - `character_walk_north`: 4 frames
  - `character_walk_west`: 4 frames
  - `lantern_flame`: 4 frames
  - `cat_sleep`: 4 frames
  - `artisan_tend`: 4 frames

### JSON Atlas Schema Reference

```json
{
  "meta": {
    "app": "Yakshetra Courtyard Art Pipeline",
    "version": "1.0.0",
    "image": "courtyard_atlas.png",
    "format": "RGBA8888",
    "size": { "w": 512, "h": 512 },
    "scale": "1"
  },
  "frames": {
    "frame_name": {
      "frame": { "x": 4, "y": 4, "w": 160, "h": 144 },
      "rotated": false,
      "trimmed": false,
      "spriteSourceSize": { "x": 0, "y": 0, "w": 160, "h": 144 },
      "sourceSize": { "w": 160, "h": 144 },
      "pivot": { "x": 0.5, "y": 0.88 }
    }
  },
  "animations": {
    "sequence_name": ["frame_name_0", "frame_name_1"]
  }
}
```

---

## 6. Pipeline Automation Script

The automated slicing and atlas packing pipeline can be re-run at any time via:

```bash
python scripts/build_courtyard_atlas.py
```
