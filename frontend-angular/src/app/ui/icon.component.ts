import { Component, computed, input } from '@angular/core';

/** Default size per icon, as each Icon* function in components/ui/Icons.tsx sets it. */
const SIZE: Record<string, number> = {
  dashboard: 18,
  folder: 18,
  list: 18,
  wrench: 18,
  bolt: 18,
  chat: 18,
  monitor: 18,
  plug: 18,
  settings: 18,
  refresh: 18,
  chevronLeft: 16,
  chevronRight: 16,
  close: 16,
  pulse: 14,
  info: 14,
  sun: 14,
  moon: 14,
  externalLink: 14,
  infoCircleLarge: 20,
  about: 18,
  download: 18,
};

/**
 * Port of components/ui/Icons.tsx: one attribute component on the real <svg>, so the DOM is the same element
 * React renders (base attributes, then the caller's props: class, width, height).
 * Generated from Icons.tsx -- keep the two in sync.
 */
@Component({
  selector: 'svg[ttIcon]',
  standalone: true,
  host: {
    '[attr.width]': 'w()',
    '[attr.height]': 'h()',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '1.8',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  },
  template: `
    @switch (ttIcon()) {
      @case ('dashboard') {<svg:rect x="3" y="3" width="7" height="9" rx="1.5" /><svg:rect x="14" y="3" width="7" height="5" rx="1.5" /><svg:rect x="14" y="12" width="7" height="9" rx="1.5" /><svg:rect x="3" y="16" width="7" height="5" rx="1.5" />}
      @case ('folder') {<svg:path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18Z" />}
      @case ('list') {<svg:path d="M8 6h13M8 12h13M8 18h13" /><svg:circle cx="3.5" cy="6" r="1.2" fill="currentColor" stroke="none" /><svg:circle cx="3.5" cy="12" r="1.2" fill="currentColor" stroke="none" /><svg:circle cx="3.5" cy="18" r="1.2" fill="currentColor" stroke="none" />}
      @case ('wrench') {<svg:path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2Z" />}
      @case ('bolt') {<svg:path d="M13 2 4 14h6l-1 8 9-12h-6z" />}
      @case ('chat') {<svg:path d="M21 12a8 8 0 1 1-3.4-6.5" /><svg:path d="M21 12c0 4.4-3.6 8-8 8a7.9 7.9 0 0 1-3.8-1L3 20l1.2-4.3" />}
      @case ('monitor') {<svg:rect x="3" y="4" width="18" height="12" rx="1.5" /><svg:path d="M8 20h8M12 16v4" />}
      @case ('plug') {<svg:path d="M9 3v6M15 3v6" /><svg:path d="M6 9h12v3a6 6 0 0 1-12 0Z" /><svg:path d="M12 18v3" />}
      @case ('settings') {<svg:circle cx="12" cy="12" r="3" /><svg:path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />}
      @case ('refresh') {<svg:path d="M3 12a9 9 0 0 1 15.4-6.4L21 8" /><svg:path d="M21 3v5h-5" /><svg:path d="M21 12a9 9 0 0 1-15.4 6.4L3 16" /><svg:path d="M3 21v-5h5" />}
      @case ('chevronLeft') {<svg:path d="M15 18l-6-6 6-6" />}
      @case ('chevronRight') {<svg:path d="M9 18l6-6-6-6" />}
      @case ('close') {<svg:path d="M18 6 6 18M6 6l12 12" />}
      @case ('pulse') {<svg:path d="M2 12h4l2-7 4 14 3-9 2 2h5" />}
      @case ('info') {<svg:circle cx="12" cy="12" r="9" /><svg:path d="M12 11v5M12 8h.01" />}
      @case ('sun') {<svg:circle cx="12" cy="12" r="4.5" /><svg:path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8l1.8-1.8M18 6l1.8-1.8" />}
      @case ('moon') {<svg:path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />}
      @case ('externalLink') {<svg:path d="M14 4h6v6M20 4 10 14M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6" />}
      @case ('infoCircleLarge') {<svg:circle cx="12" cy="12" r="9" /><svg:path d="M12 11v5M12 8h.01" />}
      @case ('about') {<svg:circle cx="12" cy="12" r="9" /><svg:path d="M12 11v5M12 8h.01" />}
      @case ('download') {<svg:path d="M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5" /><svg:path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />}
    }
  `,
})
export class IconComponent {
  readonly ttIcon = input.required<string>();
  readonly width = input<number | undefined>(undefined);
  readonly height = input<number | undefined>(undefined);
  readonly w = computed(() => this.width() ?? SIZE[this.ttIcon()] ?? 18);
  readonly h = computed(() => this.height() ?? SIZE[this.ttIcon()] ?? 18);
}
