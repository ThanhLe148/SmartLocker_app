---
name: Luminous Intelligence
colors:
  surface: '#f8faf9'
  surface-dim: '#d8dada'
  surface-bright: '#f8faf9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f3'
  surface-container: '#eceeed'
  surface-container-high: '#e6e9e8'
  surface-container-highest: '#e1e3e2'
  on-surface: '#191c1c'
  on-surface-variant: '#424842'
  inverse-surface: '#2e3131'
  inverse-on-surface: '#eff1f0'
  outline: '#727972'
  outline-variant: '#c2c8c0'
  surface-tint: '#43664d'
  primary: '#43664d'
  on-primary: '#ffffff'
  primary-container: '#84a98c'
  on-primary-container: '#1c3e27'
  inverse-primary: '#aad0b1'
  secondary: '#516169'
  on-secondary: '#ffffff'
  secondary-container: '#d2e2ec'
  on-secondary-container: '#55656d'
  tertiary: '#596156'
  on-tertiary: '#ffffff'
  tertiary-container: '#9ba397'
  on-tertiary-container: '#323930'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c5eccc'
  primary-fixed-dim: '#aad0b1'
  on-primary-fixed: '#00210e'
  on-primary-fixed-variant: '#2c4e36'
  secondary-fixed: '#d5e5ef'
  secondary-fixed-dim: '#b9c9d3'
  on-secondary-fixed: '#0e1d25'
  on-secondary-fixed-variant: '#3a4951'
  tertiary-fixed: '#dde5d8'
  tertiary-fixed-dim: '#c1c9bc'
  on-tertiary-fixed: '#161d15'
  on-tertiary-fixed-variant: '#41493f'
  background: '#f8faf9'
  on-background: '#191c1c'
  surface-variant: '#e1e3e2'
typography:
  display-xl:
    fontFamily: Space Grotesk
    fontSize: 84px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-sm:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  section-padding: 120px
  container-max: 1280px
  gutter: 24px
  grid-columns: '12'
---

## Brand & Style

The design system is defined by a "Soft-Tech" aesthetic—a sophisticated blend of high-end minimalism and organic technicality. It targets a premium audience that values clarity, cutting-edge performance, and human-centric AI solutions. The brand personality is authoritative yet approachable, avoiding the aggressive "dark mode" tropes of the AI industry in favor of an airy, luminous, and professional environment.

The visual direction combines **Minimalism** with refined **Glassmorphism**. It utilizes heavy white space to allow high-impact typography to command attention, while using translucent layers and soft green accents to suggest growth, intelligence, and transparency.

## Colors

The palette is rooted in a "Neo-Natural" spectrum, replacing harsh blacks and whites with soft, tinted alternatives. 

- **Primary (Sage Green):** Used for actionable elements, highlights, and primary brand markers. It evokes a sense of calm reliability and organic growth.
- **Secondary (Deep Slate):** Reserved for high-impact typography and deep structural elements. It provides the necessary weight to anchor the airy design.
- **Tertiary (Misty Sage):** Used for subtle borders, secondary backgrounds, and disabled states.
- **Neutral (Off-White):** The foundation of the system, providing a soft canvas that reduces eye strain compared to pure white.

Accent colors should be used sparingly, primarily through the use of soft green gradients and glass-filtered backgrounds to maintain a polished, professional tone.

## Typography

The typographic strategy relies on the tension between a technical, geometric display font and a highly legible, refined sans-serif for functional text. 

**Space Grotesk** is used for all headlines and high-impact displays. Its idiosyncratic, futuristic letterforms provide the "AI" personality. For maximum impact, headlines should use tight letter spacing and bold weights.

**Manrope** provides a professional balance for body copy and UI labels. It offers a warmth and roundness that complements the soft shapes of the interface, ensuring the agency feels accessible rather than cold.

## Layout & Spacing

The design system employs a **Fixed Grid** model for desktop, centered within a generous max-width container to preserve white space. The layout rhythm is built on an 8px base unit, ensuring consistent vertical and horizontal cadence.

Sections are separated by significant vertical padding (120px+) to create a "gallery" feel, allowing each piece of content to breathe. Content cards and interactive elements should align to a 12-column grid, often utilizing offsets (e.g., a 6-column card centered in the grid) to create a sophisticated, editorial appearance.

## Elevation & Depth

Hierarchy is established through **Glassmorphism** and **Tonal Layers** rather than heavy shadows.

- **Surface Levels:** The base background is the most recessed. Active containers use a semi-transparent white (80% opacity) with a 20px backdrop blur to create a sense of floating layers.
- **Glass Effects:** Top-level interactive elements (like navigation bars or floating action buttons) use a thinner, 40% opacity glass with a subtle 1px inner border (white, 20% opacity) to simulate the edge of a glass pane.
- **Shadows:** When shadows are necessary for focus, use "Ambient Shadows"—diffused, low-opacity (5-10%) blurs that take on a slight tint of the primary green color, avoiding muddy grays.

## Shapes

The shape language is consistently **Rounded**, reflecting the organic nature of the soft green palette. 

Standard components (inputs, cards) use a 0.5rem (8px) radius. Larger containers and hero images utilize 1.5rem (24px) to create a friendlier, modern silhouette. This softness contrasts with the sharp, geometric terminals of the Space Grotesk headline font, creating a balanced visual interest.

## Components

- **Buttons:** Primary buttons are solid "Sage Green" with white text, using a slightly more rounded radius (Pill-shaped) for a distinct interactive feel. Secondary buttons use the "Glass" style with a 1px border.
- **Cards:** These are the centerpiece of the system. They feature a white-tinted glass background, subtle backdrop blur, and a soft 1px border. They should feel like physical glass plates resting on the misty green background.
- **Inputs:** Clean, minimal fields with a subtle background tint (#F0F4F1). Focus states should transition the border color to the primary green with a soft glow effect.
- **Chips:** Used for AI categories or tags. These are small, pill-shaped elements with low-opacity green backgrounds and dark green text.
- **Interactive Elements:** Hover states across all components should include a slight "lift" (Y-axis translation) and an increase in backdrop blur intensity to provide tactile feedback in a digital space.