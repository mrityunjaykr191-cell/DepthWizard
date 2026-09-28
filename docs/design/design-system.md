# DepthWizard — Design System

**Role:** Visual design direction  
**Status:** Working source of truth

---

# 1. Design Intent

DepthWizard should look like a serious geospatial instrument.

Reference mental models:

- professional GIS software,
- scientific visualization tools,
- engineering analysis software,
- modern developer tools.

It should not look like a generic AI startup landing page.

---

# 2. Anti-Slop Rules

Do not use by default:

- purple/blue AI gradients,
- neon glow,
- glowing blobs,
- glassmorphism everywhere,
- decorative 3D globes,
- particle backgrounds,
- oversized gradient text,
- excessive pill buttons,
- excessive rounded cards,
- generic feature-card grids,
- meaningless hover animations,
- fake AI chat UI,
- marketing buzzwords.

If a visual element does not improve understanding or interaction, remove it.

---

# 3. Visual Personality

Keywords:

```text
Precise
Restrained
Technical
Spatial
Quiet
Trustworthy
Modern
Analytical
```

---

# 4. Layout

Use a strong grid.

The workspace should prioritize:

```text
Viewport > controls > secondary information
```

Avoid centering everything into floating cards.

---

# 5. Typography

Use a clean modern sans-serif for primary UI.

Use a monospace face selectively for:

- coordinates,
- file metadata,
- measurements,
- IDs,
- technical values.

Do not use monospace for all interface text.

---

# 6. Color

Color should communicate meaning rather than decorate.

Suggested hierarchy:

```text
Neutral background
Strong text
Muted secondary text
Single restrained accent
Semantic status colors
Terrain visualization palette
```

Terrain layers may require their own visualization color scales.

Do not use the same accent color for every possible semantic state.

---

# 7. Borders and Surfaces

Prefer:

- subtle borders,
- clear separation,
- restrained elevation.

Avoid:

- excessive floating cards,
- thick decorative borders,
- layered glass panels.

---

# 8. Radius

Use modest corner radii.

Controls can be slightly rounded.

Large sections should generally use structural boundaries rather than rounded-card containers.

---

# 9. Buttons

Primary actions should be obvious.

Examples:

```text
Open Workspace
Process Imagery
Generate Report
Export
```

Avoid turning every action into a colorful CTA.

---

# 10. Information Density

The application should support high information density where useful, but not create visual noise.

Use hierarchy:

```text
Primary result
   ↓
Important measurement
   ↓
Supporting metadata
   ↓
Technical detail
```

---

# 11. Icons

Use icons to support recognition.

Do not use icons as decoration.

Labels should remain understandable without relying on icon interpretation.

---

# 12. Motion

Motion should explain state change.

Good uses:

- upload transition,
- processing progress,
- panel transition,
- layer change,
- measurement selection,
- terrain camera interaction.

Avoid:

- constant floating elements,
- decorative parallax,
- looping animations,
- attention-seeking effects.

---

# 13. Landing Page

The landing page should be:

- sparse,
- confident,
- typographic,
- informative,
- action-oriented.

Its job is to establish what the tool does and get the user into the workspace.

---

# 14. Workspace

The workspace should feel like an instrument:

```text
Stable shell
+
Large terrain viewport
+
Compact controls
+
Context-sensitive inspection
```

---

# 15. Data Presentation

Measurements should be readable at a glance.

Example:

```text
Elevation
412.6 m

Slope
8.2°
```

But units and reference status must always remain semantically correct.

---

# 16. Empty States

Empty states should teach the next action.

Example:

```text
Select a point on the terrain
to inspect elevation.
```

Avoid decorative empty illustrations.

---

# 17. Error States

Errors should look calm and technical.

Show:

- what failed,
- why where known,
- what the user can do next.

Avoid dramatic red full-screen alerts for recoverable errors.

---

# 18. Responsive Behavior

Desktop is the primary analytical environment.

On smaller widths:

- collapse secondary panels,
- preserve viewport priority,
- move inspection into drawers,
- retain readable controls.

---

# 19. Design Quality Test

Before accepting a UI screen, ask:

1. Does it help the analyst?
2. Is the primary action obvious?
3. Is the terrain still the focus?
4. Is information hierarchy clear?
5. Does anything look like generic AI SaaS?
6. Is anything decorative without purpose?
7. Are unavailable capabilities honestly represented?

If the answer to 5 or 6 is yes, simplify.
