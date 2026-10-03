---
version: alpha
name: Know Your Tokens
description: Observability design system for AI coding agent token, request, tool, skill, client, and project telemetry.
colors:
  ink: "#111827"
  ink-soft: "#475569"
  canvas: "#F6F8FB"
  surface: "#FFFFFF"
  surface-muted: "#F1F5F9"
  line: "#DCE3EC"
  accent: "#6D5EF7"
  accent-strong: "#5848E8"
  accent-soft: "#EEEAFE"
  success: "#0F9D72"
  success-soft: "#E6F7F1"
  warning: "#C27A12"
  warning-soft: "#FFF4DF"
  danger: "#C53D4B"
  danger-soft: "#FDECEF"
  info: "#2878C8"
  info-soft: "#E9F3FF"
  on-accent: "#FFFFFF"
typography:
  display:
    fontFamily: Inter, ui-sans-serif, system-ui, sans-serif
    fontSize: 34px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.03em
  h1:
    fontFamily: Inter, ui-sans-serif, system-ui, sans-serif
    fontSize: 26px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter, ui-sans-serif, system-ui, sans-serif
    fontSize: 18px
    fontWeight: 650
    lineHeight: 1.3
  body:
    fontFamily: Inter, ui-sans-serif, system-ui, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: Inter, ui-sans-serif, system-ui, sans-serif
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.3
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  3xl: 48px
rounded:
  sm: 6px
  md: 10px
  lg: 14px
  xl: 18px
  full: 999px
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xl}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: 40px
---

## Overview

Know Your Tokens is an operational observability console for engineering teams. The visual language is precise, quiet, data-dense, and trustworthy: closer to an infrastructure control plane than a marketing dashboard. Use strong hierarchy, generous whitespace around major sections, and compact information rows inside analytical surfaces.

The UI should make high-volume token telemetry legible without visual noise. Primary actions use the single violet accent. Status colors communicate operational state only. Project-level views must feel independently scoped while preserving global navigation.

## Colors

Use ink for primary text, canvas for the application background, surface for cards and tables, and line for structural separation. Violet is the sole primary interaction color. Green, amber, red, and blue are semantic status colors and should not become decorative accents.

## Typography

Use Inter or a close system fallback. Keep headings compact and information-dense. Numeric telemetry should use tabular numerals where supported. Avoid excessive font-weight variation; hierarchy comes from size, spacing, and surface contrast.

## Layout

The application uses a persistent left navigation rail, a contextual top bar, and a responsive content canvas. Desktop content should target a 1440px working width with 24–32px gutters. Analytical pages use a 12-column grid. Project pages keep the selected project visible in the breadcrumb/header and scope every metric, table, and chart to that project.

## Elevation & Depth

Prefer borders and tonal layering over heavy shadows. Cards use a subtle 1px line and a very soft shadow only when they float above a dense table or command surface. Never use large decorative shadows.

## Shapes

Use restrained 6–18px radii. Keep controls, cards, tables, and dialogs within the same shape family. Pills are reserved for statuses, filters, and compact metadata.

## Components

Buttons have clear primary/secondary/tertiary hierarchy. Tables support hover, sorting, filtering, column density, and row expansion. Metric cards show a label, current value, delta, and optional microtrend. Tabs switch analytical surfaces without changing the page shell. Drawers and dialogs expose request, tool, skill, and session detail without losing context. Project cards expose project identity, activity, token volume, and health.

## Do's and Don'ts

- Do make the selected project scope explicit on project pages.
- Do provide global and project-specific navigation.
- Do preserve readable whitespace around major analytical groups.
- Do use semantic status colors only for status.
- Do show exact token categories separately: input, output, cache read, cache creation, and total.
- Do distinguish exact API usage from estimated attribution in labels.
- Don't create rainbow dashboards.
- Don't hide filters or project scope.
- Don't use decorative gradients for primary data surfaces.
- Don't overload a single chart with unrelated dimensions.
- Don't imply file/path token attribution is exact when it is estimated.
- Maintain WCAG AA contrast for normal text.
- Respect prefers-reduced-motion; transitions should be short and mechanical.


## Navigation behavior

The left navigation rail supports two states: expanded and minimized. Expanded mode shows labels and section headings; minimized mode keeps the rail at 76px and shows only icons/marks. The state persists locally so moving between pages does not reset the user's preference. The minimize control remains visible in the brand row.

## Telemetry accounting

Do not display cost or pricing columns in the primary telemetry UI. Cost is intentionally excluded because pricing depends on the applicable billing model and is not a reliable token-count metric. Primary metrics are token counts, cache categories, context utilization, requests, sessions, tools, skills, clients, and project activity.
