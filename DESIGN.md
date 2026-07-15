# Toworkboard design system

## Direction

An editorial forest field guide inside Obsidian: strong reading hierarchy, quiet rules, restrained surfaces, and one recognizable original mark. The interface should feel like a useful desktop instrument rather than a themed web page.

## Signature element

The **Canopy rail** is a thin vertical line connecting four small nodes: Notes, Mail, Tasks, and Signals. It is paired with an original letter **T** built from a canopy bar and a tree-trunk stem. It must not resemble or depict the animated Totoro character.

## Color tokens

### Light

- `--twb-canvas`: `#F3F5F3` — mist background
- `--twb-surface`: `#FBFCFA` — primary reading surface
- `--twb-ink`: `#17201A` — main text
- `--twb-muted`: `#667069` — supporting text
- `--twb-canopy`: `#183C2B` — primary action and mark
- `--twb-fern`: `#4E7D5B` — success and active states
- `--twb-rain`: `#7FA0A0` — secondary signal
- `--twb-persimmon`: `#C66A3D` — warnings only
- `--twb-line`: `#D6DDD6` — borders and dividers

### Dark

- `--twb-canvas`: `#111713`
- `--twb-surface`: `#18211B`
- `--twb-ink`: `#EEF3EF`
- `--twb-muted`: `#A9B4AC`
- `--twb-canopy`: `#B7D4BE`
- `--twb-fern`: `#78A486`
- `--twb-rain`: `#8FAFB1`
- `--twb-persimmon`: `#E08A61`
- `--twb-line`: `#344039`

Do not use gradients. Color supports hierarchy; it does not decorate empty space.

## Typography

- Interface and note titles: Obsidian's `--font-interface` / `--font-text` stack.
- Metadata and counters: Obsidian's `--font-monospace` stack.
- Use weight and spacing before increasing font size.
- Preserve note titles in their original language. Public interface copy is English.

## Shape and spacing

- Base spacing unit: `4px`.
- Main rhythm: `8 / 12 / 16 / 24 / 32px`.
- Border radius: `6px` controls, `10px` sections; avoid excessive pills.
- Shadows are subtle and reserved for floating controls or focus elevation.
- Borders and whitespace separate reading regions.

## Components

### Header

Product name, one-line purpose, date/time, and the original Canopy T mark. A user-supplied mascot image may replace the mark locally, but no mascot asset ships with the plugin.

### Search

One full-width field that searches titles, paths, tags, and Markdown text. Results show title, path, and a short matching excerpt.

### Frequent notes

Editorial rows, not button chips. The title is the reading focus; path, recency, and open count are secondary.

### Mailroom

Two independent equal-height panes. Each pane has its own fixed-height message viewport and scroll area, so a long Gmail list never stretches an empty QQ Mail pane. Mail is read-only and paged within the configured in-memory limit.

### Buttons

Sentence case, minimum 36px height, clear focus ring. Related actions share size and spacing. Destructive actions use text and warning color, not novelty styling.

## Responsive behavior

- Wide panes: two-column content where comparison helps.
- Narrow panes: one column with unchanged reading order.
- Mail panes keep independent scroll regions at every width.
- Controls wrap cleanly; no horizontal clipping.

## Motion

Use only short opacity/position transitions for state changes. Disable nonessential motion under `prefers-reduced-motion: reduce`.

## Brand and legal boundary

The author identity is **Totoro**. The project name, Canopy T mark, Canopy rail, screenshots, fixtures, and code are original. Do not bundle, trace, redraw, or imply endorsement by Studio Ghibli. A local custom-image setting is user-controlled and excluded from releases.

