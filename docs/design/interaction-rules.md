# DepthWizard — Interaction Rules

**Role:** Interaction behavior and UX guardrails  
**Status:** Working source of truth

---

# 1. Core Principle

> Every interaction should either help the analyst understand the terrain, perform an analysis, preserve evidence, or recover from an error.

---

# 2. Progressive Complexity

Do not expose every tool at once.

Primary hierarchy:

```text
Explore
  ↓
Measure
  ↓
Validate
  ↓
Report
```

---

# 3. Stable Workspace

Changing a tool should not reset:

- dataset,
- terrain,
- camera unless intentionally changed,
- measurements,
- validation,
- report selections.

---

# 4. Tool Activation

When a tool is activated:

```text
Tool name
+
one concise instruction
```

Example:

```text
Cross Section

Draw a line across the terrain.
```

Do not display long instructions inside the workspace.

---

# 5. Selection

Selection should have obvious visual feedback.

For point selection:

```text
Select point
```

For line selection:

```text
Select start
Select end
```

The interaction should clearly communicate what remains to be selected.

---

# 6. Measurement Feedback

Once complete, show the result immediately in the inspection panel.

Do not force the analyst to open another page to read a measurement.

---

# 7. Add to Report

Useful analysis results should have:

```text
Add to Report
```

This should be a lightweight action.

Use subtle confirmation rather than a blocking modal.

---

# 8. Layer Switching

Layer changes should preserve:

- current dataset,
- current camera where practical,
- selection where meaningful.

Do not reload the entire workspace for a simple layer switch.

---

# 9. Camera

Camera presets should be predictable.

Switching to a preset should not modify the underlying terrain.

---

# 10. First Person

Entering first-person should be explicit.

Provide a simple control hint on first use.

Do not keep a large instructional overlay permanently visible.

---

# 11. Hover

Hover can expose secondary information.

It should not be required for important information.

---

# 12. Click

Click is the primary selection action.

A selected object should provide a clear active state.

---

# 13. Keyboard

Where practical:

```text
Esc → cancel active tool
Esc → exit first-person
Delete / Backspace → remove selected report item where safe
```

Exact shortcuts may be expanded later.

---

# 14. Tool Cancellation

Every active analysis tool should be cancellable.

Example:

```text
Cross Section
[ Cancel ]
```

or:

```text
Esc
```

---

# 15. Destructive Actions

Do not make important deletion/reset actions one-click without a reasonable safeguard.

Examples:

- clear all report selections,
- discard unsaved report customization,
- remove dataset.

---

# 16. Loading

Loading should communicate the actual operation.

Examples:

```text
Reading imagery...
Generating terrain...
Computing slope...
Preparing report...
```

Never use fake progress.

---

# 17. Long Operations

For long-running operations:

- show current stage,
- show progress when meaningful,
- keep the interface responsive,
- allow safe cancellation where implemented.

---

# 18. Errors

Error messages should contain:

```text
What happened
+
What it means
+
What to do next
```

Example:

```text
Metric calibration failed.

The image could be processed, but a valid metric scale
could not be established.

[Continue with Relative Elevation]
[Retry Calibration]
```

---

# 19. Unavailable Capabilities

Prefer:

```text
Absolute elevation
Unavailable — metric calibration not available
```

over silently hiding a concept that the analyst may reasonably expect.

However, permanently future/unimplemented capabilities should not clutter the interface.

---

# 20. Relative / Absolute Language

Always distinguish:

```text
Relative elevation
```

from:

```text
Metric / calibrated elevation
```

Do not casually use "height in metres" when the result is relative.

---

# 21. Units

Units should come from the authoritative result.

Never hard-code a unit because it "looks right".

---

# 22. Confidence

Do not use:

```text
97% AI confidence
```

unless the backend's methodology genuinely defines that quantity.

Prefer terminology such as:

```text
Confidence
Confidence map
Confidence level
```

with the method documented elsewhere.

---

# 23. Validation

Validation should communicate whether it is:

```text
Available
Unavailable
Processing
Complete
Failed
```

Do not show empty metric placeholders.

---

# 24. Report Interaction

Default:

```text
Everything valid and available selected.
```

The user can customize.

Report selection should not destroy the underlying analysis.

---

# 25. Export Interaction

Export buttons should communicate:

```text
Preparing...
Ready
Failed
Unavailable
```

Do not trigger an export without meaningful feedback.

---

# 26. Notifications

Use small contextual confirmations.

Good:

```text
Added to report
```

Avoid persistent toast spam.

---

# 27. Modals

Use modals sparingly.

Good uses:

- destructive confirmation,
- important configuration,
- focused preview.

Bad uses:

- every measurement,
- every tool activation,
- simple state changes.

---

# 28. Accessibility

Do not rely solely on:

- color,
- hover,
- animation.

Important state should also be communicated through:

- text,
- labels,
- icons,
- structure.

---

# 29. Visual Interaction Priority

The analyst's eye should generally follow:

```text
Terrain
 ↓
Active analysis
 ↓
Measurement/result
 ↓
Supporting metadata
```

Not:

```text
Sidebar
 ↓
Cards
 ↓
Marketing text
 ↓
Terrain
```

---

# 30. Anti-AI-Slop Interaction Rule

If an interaction exists only because it makes the interface look "AI-like", remove it.

DepthWizard should earn its visual sophistication through:

- good hierarchy,
- useful spatial interaction,
- clear analytical feedback,
- precise data presentation,
- restrained motion.

Not through decorative effects.
