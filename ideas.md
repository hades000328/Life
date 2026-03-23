# Your Life — Design Brainstorm

<response>
<probability>0.07</probability>
<text>
## Idea A: Brutalist Ledger

**Design Movement:** Swiss Brutalism / Editorial Print

**Core Principles:**
- Raw, unadorned structure — the graph IS the art
- Heavy typographic hierarchy with stark contrast
- Data as narrative: every node is a chapter
- Monochrome base with a single acid accent

**Color Philosophy:** Near-black background (#0e0e0e), off-white text (#f0ede6), acid yellow (#e8ff00) for active nodes and highlights. Evokes a redacted dossier.

**Layout Paradigm:** Full-bleed graph takes 80% of viewport height. Title stamped top-left in oversized condensed type. Input bar anchored to bottom edge like a terminal prompt.

**Signature Elements:**
- Thick horizontal rule lines as y-axis markers
- Monospaced timestamps on x-axis
- Node labels in uppercase condensed type, rotated 45°

**Interaction Philosophy:** Typing feels like entering a log entry. Submission causes a brief screen flash and the new node "stamps" into place.

**Animation:** Hard cuts, no easing. Node appearance: scale from 0 to 1 in 80ms. Line draws with a typewriter-style left-to-right stroke.

**Typography System:** Display — "Bebas Neue" (condensed, heavy). Body/labels — "JetBrains Mono" (monospaced). No mixing of weights; contrast comes from size alone.
</text>
</response>

<response>
<probability>0.06</probability>
<text>
## Idea B: Quiet Cartography

**Design Movement:** Minimalist Data Humanism / Infographic Poetry

**Core Principles:**
- Treat life data as a personal map, not a dashboard
- Generous breathing room; silence is meaningful
- Warm, paper-like surfaces instead of cold screens
- Handcrafted feel through irregular strokes

**Color Philosophy:** Warm cream (#faf6ef) background, deep ink (#1a1208) text, terracotta (#c0603a) for the life line, sage (#7a9e7e) for node markers. Feels like a field notebook.

**Layout Paradigm:** Centered single column, graph floats with generous vertical padding. X-axis labels written at a slight angle. Title in a delicate serif above, input below as a simple underline field.

**Signature Elements:**
- SVG line with slight hand-drawn waviness (feTurbulence filter)
- Circular node markers with an inner dot, like a cartographic pin
- Faint dot-grid background pattern

**Interaction Philosophy:** Submitting an entry feels like pressing a stamp into paper — a gentle haptic-like pulse animation.

**Animation:** Ease-out curves, 400–600ms. New nodes bloom from a dot outward. Line segment draws smoothly from previous node.

**Typography System:** Display — "Playfair Display" (serif, italic for the title). Labels — "DM Mono" (light weight). Body — "Lora" (readable serif).
</text>
</response>

<response>
<probability>0.05</probability>
<text>
## Idea C: Neon Depth (CHOSEN)

**Design Movement:** Dark Ambient / Synthwave Data Visualization

**Core Principles:**
- Deep dark canvas with luminous data elements
- Glow and bloom effects give depth without clutter
- Time feels continuous and alive — the graph breathes
- Minimal chrome; let the data glow speak

**Color Philosophy:** Near-black background (#080c14), electric blue (#4fc3f7) for the life line, soft violet (#a78bfa) for node dots, warm white (#f0f4ff) for text. Accent: neon mint (#00e5b0) for the input focus state. Evokes a late-night terminal watching your own story unfold.

**Layout Paradigm:** Full-viewport dark canvas. Graph centered with asymmetric padding (more left breathing room for y-axis labels). Title "Your Life" in large, slightly glowing text top-left. Input bar at bottom with a glowing border on focus.

**Signature Elements:**
- Glowing SVG line with a subtle drop-shadow filter (feGaussianBlur + feComposite)
- Node dots with a pulsing ring animation on the most recent point
- Faint horizontal grid lines that fade toward edges

**Interaction Philosophy:** Every submission feels like a moment crystallizing — the new node pulses once, the line extends with a smooth draw animation, and the label fades in above.

**Animation:** Smooth cubic-bezier easing. Line draw: 600ms stroke-dashoffset animation. Node entrance: scale + opacity, 300ms. Label: fade-up, 400ms delay after node.

**Typography System:** Display — "Space Grotesk" (geometric, medium weight for title). Labels — "Space Mono" (monospaced for timestamps). Input placeholder — "Space Grotesk" light.
</text>
</response>

---

## Selected: Idea C — Neon Depth

Dark ambient canvas, electric blue life line, glowing nodes, Space Grotesk + Space Mono typography.
